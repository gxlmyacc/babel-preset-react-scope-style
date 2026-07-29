const { createScopeQuery, isFunction } = require('../src/utils');
const { parseScopeStyleQuery } = require('../lib/parse-scope-style-query');
const { scopeSelector, stripGlobalMarkersFromSelector } = require('./selector-scope');
const {
  runNestingPrepass,
  shouldApplyScope,
  hasExplicitScopeControl,
  isInGlobalSubtree,
  isGlobalNestingWrapperSelector,
  replaceBareNestingMarkersWithAmpersand,
  unwrapRootBareGlobalWrappers,
  unwrapAllConsecutiveGlobalWrappers,
  removeEmptyGlobalMarkerRules,
  removeEffectivelyEmptyRules,
} = require('./nesting-scope');

const URL_PATTERNS = [
  /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g,
];

/**
 * 从 PostCSS 节点上读取源文件路径。
 * @param {import('postcss').Node} node - PostCSS 节点
 * @returns {string|undefined}
 */
function getNodePathFile(node) {
  return node.source && node.source.input && node.source.input.file;
}

/**
 * 对 scope 配置项排序并去重（global 优先，同 id 只保留一份）。
 * @param {Array<{ scoped?: boolean, global?: boolean, id?: string }>} opts - 配置列表
 * @returns {void}
 */
function normalizeOpts(opts) {
  const calcOrder = (opt) => {
    if (!opt.scoped || !opt.id) return -1;
    return opt.global ? 0 : 1;
  };
  opts.sort((a, b) => calcOrder(a) - calcOrder(b));
  const map = {};
  let findGlobal = false;
  for (let i = opts.length - 1; i >= 0; i--) {
    const item = opts[i];
    if (map[item.id] || (item.global && findGlobal)) {
      opts.splice(i, 1);
      continue;
    }
    if (item.global) findGlobal = true;
    map[item.id] = true;
  }
}

/**
 * 判断 @import 是否已注入 scope-style（由样式内 ?scoped 改写而来）。
 * @param {string} params - @import 的 params 字符串
 * @returns {boolean}
 */
function importHasScopeStyle(params) {
  return /\?scope-style/.test(params);
}

/**
 * 规范化 @import 参数作为去重 key。
 * 普通 import 去掉 scope-style 后按资源路径去重；已带 scope-style 的 import 按完整 params 区分（多 scope 时每个 id 各保留一条）。
 * @param {string} params - @import 的 params 字符串
 * @returns {string}
 */
function importParamsDedupeKey(params) {
  if (importHasScopeStyle(params)) {
    return params.replace(/\s+/g, ' ').trim();
  }
  return params
    .replace(/\?scope-style[^'");\s]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 比较两条 @import 的排序权重：保持合并前在 AST 中的先后顺序（含 ?scoped 与普通 import 混排）。
 * @param {import('postcss').AtRule} a - @import 节点
 * @param {import('postcss').AtRule} b - @import 节点
 * @param {Map<import('postcss').AtRule, number>} importOrder - 各节点首次出现下标
 * @returns {number}
 */
function compareImportAtRules(a, b, importOrder) {
  return importOrder.get(a) - importOrder.get(b);
}

/**
 * 合并多份 scope 结果时，将 @import 规则排在前面并按资源路径去重。
 * @param {import('postcss').ChildNode[]} nodes - 根节点子列表
 * @returns {void}
 */
function normalizeNodes(nodes) {
  const map = {};
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.type === 'atrule' && node.name === 'import' && node.params) {
      const key = importParamsDedupeKey(node.params);
      if (map[key]) {
        nodes.splice(i, 1);
        continue;
      }
      map[key] = true;
    }
  }

  const imports = [];
  const rest = [];
  const importOrder = new Map();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'atrule' && node.name === 'import') {
      imports.push(node);
      if (!importOrder.has(node)) importOrder.set(node, i);
    } else {
      rest.push(node);
    }
  }
  imports.sort((a, b) => compareImportAtRules(a, b, importOrder));
  nodes.length = 0;
  nodes.push(...imports, ...rest);
}

/**
 * 取 @import 的资源路径 key（去掉 scope-style query，用于定位同一 ?scoped 资源槽位）。
 * @param {string} params - @import 的 params 字符串
 * @returns {string}
 */
function importResourceKey(params) {
  return importParamsDedupeKey(
    params.replace(/\?scope-style[^'");\s]*/g, '')
  );
}

/**
 * 将追加 scope 块中的 scope-style @import 插入到根 AST 上同名资源的 import 组末尾（保持源文件中的相对位置）。
 * @param {import('postcss').Root} root - 合并后的根节点
 * @param {import('postcss').AtRule} rule - 待插入的 @import 节点
 * @returns {void}
 */
function insertScopeStyleImportAfterAnchor(root, rule) {
  const resourceKey = importResourceKey(rule.params);
  let anchorIdx = -1;
  for (let j = 0; j < root.nodes.length; j++) {
    const node = root.nodes[j];
    if (
      anchorIdx === -1
      && node.type === 'atrule'
      && node.name === 'import'
      && importResourceKey(node.params) === resourceKey
    ) {
      anchorIdx = j;
    }
  }
  const cloned = rule.clone();
  cloned.raws.before = '\n';
  if (anchorIdx === -1) {
    root.prepend(cloned);
    return;
  }
  let insertAfterIdx = anchorIdx;
  while (insertAfterIdx + 1 < root.nodes.length) {
    const next = root.nodes[insertAfterIdx + 1];
    if (
      next.type === 'atrule'
      && next.name === 'import'
      && importResourceKey(next.params) === resourceKey
    ) {
      insertAfterIdx++;
    } else {
      break;
    }
  }
  root.insertAfter(root.nodes[insertAfterIdx], cloned);
}

/**
 * 在 @import 的 url() 中改写带 ?scoped 的样式路径。
 * 样式内的 ?scoped 表示沿用当前文件的作用域（非 JS import 的 ?scoped 字面含义）：
 * 父文件为组件 scoped 时注入 local scope-style；父文件为 global 时注入带 global=true 的 query。
 * 仅识别 ?scoped 后缀；?global 等其它 query 不在此处理。
 * @param {import('postcss').Root} root - CSS 根节点
 * @param {object} ctx - 改写上下文
 * @param {string} ctx.id - 作用域 id
 * @param {boolean} ctx.isGlobal - 是否 global
 * @param {RegExp} ctx.scopeRegx - 路径匹配正则
 * @param {Function|null} ctx.scopeFn - 自定义改写函数
 * @returns {void}
 */
function rewriteImportUrls(root, ctx) {
  const { id, isGlobal, scopeRegx, scopeFn } = ctx;

  root.walkAtRules('import', (rule) => {
    const key = 'params';
    const pattern = URL_PATTERNS.find((p) => p.test(rule[key]));
    if (!pattern) return;

    rule[key] = rule[key].replace(pattern, (matched, before, url, after) => {
      const [, , scoped] = url.match(scopeRegx) || [];
      if (!scoped) return matched;

      if (!id || scoped !== '?scoped') {
        if (scopeFn) {
          const nextUrl = url.replace(scopeRegx, (match, p1) => scopeFn(p1, '', {
            filename: getNodePathFile(rule),
            source: url,
            scopeId: '',
          }));
          return `${before}${nextUrl}${after}`;
        }
        return matched;
      }

      const query = createScopeQuery(id, isGlobal);
      const newUrl = url.replace(scopeRegx, (match, p1) => {
        if (!scopeFn) {
          return p1 + query;
        }
        return scopeFn(p1, query, {
          filename: getNodePathFile(rule),
          source: url,
          scopeId: id,
          global: isGlobal,
        });
      });
      return `${before}${newUrl}${after}`;
    });
  });
}

/**
 * 遍历所有规则并改写选择器（含 @media / @supports 等嵌套）。
 * @param {import('postcss').Root} root - CSS 根节点
 * @param {{ id: string, isGlobal: boolean, globalSelector?: string }} scopeOpts - 作用域参数
 * @returns {void}
 */
function rewriteAllSelectors(root, scopeOpts) {
  runNestingPrepass(root);
  removeEmptyGlobalMarkerRules(root);

  root.walkRules((rule) => {
    if (!rule.selector) return;
    if (isInGlobalSubtree(rule)) {
      const marker = rule.selector.trim();
      if (
        !isGlobalNestingWrapperSelector(marker)
        && hasExplicitScopeControl(rule.selector)
      ) {
        rule.selector = stripGlobalMarkersFromSelector(
          rule.selector,
          scopeOpts.globalSelector
        );
      }
      return;
    }
    if (!shouldApplyScope(rule, scopeOpts)) return;
    rule.selector = scopeSelector(rule.selector, {
      id: scopeOpts.id,
      isGlobal: scopeOpts.isGlobal,
      globalSelector: scopeOpts.globalSelector,
    });
  });

  unwrapAllConsecutiveGlobalWrappers(root);
  unwrapRootBareGlobalWrappers(root);
  replaceBareNestingMarkersWithAmpersand(root, scopeOpts);
  removeEffectivelyEmptyRules(root);
}

/**
 * 对一份 AST 按单个 scope 上下文改写 @import 与选择器。
 * @param {import('postcss').Root} root - CSS 根节点
 * @param {PluginOptions} opt - 单个 scope 配置
 * @param {object} options - 包级 options（scopeRegx、scopeFn）
 * @returns {void}
 */
function applyScopeOptionToRoot(root, opt, options) {
  const { scoped, id = '', global: isGlobal, globalSelector = '' } = opt;
  rewriteImportUrls(root, {
    id,
    isGlobal,
    scopeRegx: options.scopeRegx,
    scopeFn: options.scopeFn || null,
  });
  if (!scoped || !id) return;
  rewriteAllSelectors(root, { id, isGlobal, globalSelector });
}


/**
 * @typedef {{
 *   scoped?: boolean,
 *   global?: boolean,
 *   id?: string,
 *   globalSelector?: string,
 * }} PluginOptions
 */

/**
 * 从 PostCSS 处理上下文解析资源路径（含可能的 query）。
 * @param {import('postcss').Root} root - CSS 根节点
 * @param {{ result?: { opts?: { from?: string } } }} [helpers] - PostCSS helpers
 * @returns {string}
 */
function resolveResourceFrom(root, helpers) {
  if (helpers && helpers.result && helpers.result.opts && helpers.result.opts.from) {
    return String(helpers.result.opts.from);
  }
  if (root.source && root.source.input) {
    const input = root.source.input;
    if (input.file) return String(input.file);
    if (input.from) return String(input.from);
  }
  return '';
}

/**
 * 从路径字符串取出 query（含前导 `?`）。
 * @param {string} resourcePath - 可能含 query 的路径
 * @returns {string}
 */
function extractQueryFromPath(resourcePath) {
  if (!resourcePath) return '';
  const idx = resourcePath.indexOf('?');
  return idx >= 0 ? resourcePath.slice(idx) : '';
}

/**
 * 在无显式 `{ scoped, id }` 时，尝试从 `from` URL query 解析 scope（Turbopack PostCSS 通道）。
 * @param {PluginOptions[]} opts - 已规范化的配置列表
 * @param {import('postcss').Root} root - CSS 根节点
 * @param {{ result?: { opts?: { from?: string } } }} [helpers] - PostCSS helpers
 * @returns {PluginOptions[]}
 */
function resolveEffectiveScopeOpts(opts, root, helpers) {
  const explicit = opts.filter((o) => o && o.scoped && o.id);
  if (explicit.length) return explicit;

  const from = resolveResourceFrom(root, helpers);
  const parsed = parseScopeStyleQuery(extractQueryFromPath(from));
  return parsed ? [parsed] : [];
}

/**
 * PostCSS 作用域插件核心工厂（与 PostCSS 版本无关）。
 * @param {PluginOptions|PluginOptions[]|((root: import('postcss').Root) => PluginOptions|PluginOptions[])} pluginOptions - 插件参数
 * @returns {(root: import('postcss').Root, helpers?: { parse?: (css: string) => import('postcss').Root, result?: object }) => void}
 */
const plugin = function (pluginOptions) {
  pluginOptions = pluginOptions || {};
  return function runScopePlugin(root, helpers) {
    let opts = typeof pluginOptions === 'function'
      ? pluginOptions(root)
      : pluginOptions;
    if (!opts) return;
    if (!Array.isArray(opts)) opts = [opts];

    normalizeOpts(opts);

    const options = require('../src/options');
    const packageOptions = {
      scopeRegx: options.scopeRegx,
      scopeFn: options.scopeFn || (isFunction(options.scope) ? options.scope : null),
    };

    const effectiveOpts = resolveEffectiveScopeOpts(opts, root, helpers);

    if (effectiveOpts.length <= 1) {
      if (effectiveOpts[0]) applyScopeOptionToRoot(root, effectiveOpts[0], packageOptions);
      return;
    }

    const postcss = require('postcss');
    const parse = (helpers && helpers.parse) || postcss.parse;
    const baseline = root.clone();
    const scopedRoots = effectiveOpts.map((opt) => {
      const work = baseline.clone();
      applyScopeOptionToRoot(work, opt, packageOptions);
      return work;
    });

    root.removeAll();
    scopedRoots[0].each((node) => {
      root.append(node.clone());
    });

    for (let i = 1; i < scopedRoots.length; i++) {
      const work = scopedRoots[i];
      work.walkAtRules('import', (rule) => {
        if (!importHasScopeStyle(rule.params)) return;
        insertScopeStyleImportAfterAnchor(root, rule);
      });
      const rulesOnly = [];
      work.each((node) => {
        if (node.type === 'atrule' && node.name === 'import') return;
        rulesOnly.push(node.toString());
      });
      if (rulesOnly.length) {
        const fragment = parse(`\n${rulesOnly.join('\n')}`);
        fragment.each((node) => {
          root.append(node);
        });
      }
    }

    normalizeNodes(root.nodes);
  };
};

plugin.id = 'postcss-scope-style-add-id';
plugin.normalizeNodes = normalizeNodes;
plugin.insertScopeStyleImportAfterAnchor = insertScopeStyleImportAfterAnchor;
plugin.applyScopeOptionToRoot = applyScopeOptionToRoot;
plugin.resolveResourceFrom = resolveResourceFrom;
plugin.extractQueryFromPath = extractQueryFromPath;
plugin.resolveEffectiveScopeOpts = resolveEffectiveScopeOpts;

module.exports = plugin;
