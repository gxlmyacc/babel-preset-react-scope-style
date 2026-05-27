const { createScopeQuery, isFunction } = require('../src/utils');
const { shouldSkipRule, scopeSelector } = require('./selector-scope');

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
 * 规范化 @import 参数作为去重 key（去掉 scope-style query，同一资源只保留一条）。
 * @param {string} params - @import 的 params 字符串
 * @returns {string}
 */
function importParamsDedupeKey(params) {
  return params
    .replace(/\?scope-style[^'");\s]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 合并多份 scope 结果时，将 @import 规则排在前面并按资源路径去重。
 * @param {import('postcss').ChildNode[]} nodes - 根节点子列表
 * @returns {void}
 */
function normalizeNodes(nodes) {
  nodes.sort((a, b) => {
    const aImport = a.type === 'atrule' && a.name === 'import';
    const bImport = b.type === 'atrule' && b.name === 'import';
    if (aImport && !bImport) return -1;
    if (!aImport && bImport) return 1;
    return 0;
  });
  const map = {};
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.type === 'atrule' && node.name === 'import' && node.params) {
      const key = importParamsDedupeKey(node.params);
      if (map[key]) {
        /* c8 ignore next 2 — 合并多 scope 时去重重复 @import */
        nodes.splice(i, 1);
        continue;
      }
      map[key] = true;
    }
  }
}

/**
 * 从 CSS 文本中移除 @import（多 scope 克隆块不应重复携带 import）。
 * @param {string} cssText - 已作用域化的一份 CSS 文本
 * @returns {string}
 */
function stripImportAtRules(cssText) {
  if (!cssText || !cssText.includes('@import')) return cssText;
  const postcss = require('postcss');
  const root = postcss.parse(cssText, { from: undefined });
  root.walkAtRules('import', (rule) => rule.remove());
  return root.toString().trim();
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
        /* c8 ignore next — scopeFn 未改写时保留原 matched */
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
  root.walkRules((rule) => {
    if (!rule.selector || shouldSkipRule(rule)) return;
    rule.selector = scopeSelector(rule.selector, {
      id: scopeOpts.id,
      isGlobal: scopeOpts.isGlobal,
      globalSelector: scopeOpts.globalSelector,
    });
  });
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
 * PostCSS 作用域插件核心工厂（与 PostCSS 版本无关）。
 * @param {PluginOptions|PluginOptions[]|((root: import('postcss').Root) => PluginOptions|PluginOptions[])} pluginOptions - 插件参数
 * @returns {(root: import('postcss').Root, helpers?: { parse?: (css: string) => import('postcss').Root }) => void}
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
    const scopeTemplateList = [];

    opts.forEach((opt) => {
      const { scoped, id = '', global: isGlobal, globalSelector = '' } = opt;
      const scopeTemplate = scopeTemplateList[0];

      if (scopeTemplate) {
        scopeTemplateList.push({
          opt,
          result: scopeTemplate.result.replaceAll(scopeTemplate.opt.id, id),
        });
        return;
      }

      const { scopeRegx } = options;
      const scopeFn = options.scopeFn || (isFunction(options.scope) ? options.scope : null);

      rewriteImportUrls(root, { id, isGlobal, scopeRegx, scopeFn });

      if (!scoped || !id) return;

      rewriteAllSelectors(root, { id, isGlobal, globalSelector });

      if (opt.id && !opt.global) {
        scopeTemplateList.push({ opt, result: root.toString() });
      }
    });

    if (scopeTemplateList.length > 1) {
      const appendResult = scopeTemplateList
        .map((v, i) => (i ? stripImportAtRules(v.result) : ''))
        .filter(Boolean)
        .join('\n')
        .trim();
      const parse = (helpers && helpers.parse)
        || require('postcss').parse;
      const nodes = parse(`\n${appendResult}`);
      root.nodes = root.nodes.concat(nodes.nodes);
      normalizeNodes(root.nodes);
    }
  };
};

plugin.id = 'postcss-scope-style-add-id';
plugin.normalizeNodes = normalizeNodes;

module.exports = plugin;
