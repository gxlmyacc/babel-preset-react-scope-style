const selectorParser = require('postcss-selector-parser');
const { unescapeValue } = require('postcss-selector-parser/dist/selectors/attribute');

/**
 * 判断该 Rule 是否应跳过作用域注入（如 @keyframes 内的关键帧）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function shouldSkipRule(rule) {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'atrule') {
      const name = parent.name;
      if (name === 'keyframes' || name === '-webkit-keyframes' || name === '-moz-keyframes') {
        return true;
      }
    }
    parent = parent.parent;
  }
  return false;
}

/**
 * 构建 global 模式下用于匹配 scope 前缀的 attribute 节点。
 * @param {string} id - 作用域 id
 * @param {object} [spaces] - 空格配置
 * @returns {import('postcss-selector-parser').Selector['nodes'][0]}
 */
function createGlobalScopeAttribute(id, spaces = {}) {
  const { quoteMark, unescaped: value } = unescapeValue(id);
  return selectorParser.attribute({
    attribute: 'class',
    value,
    operator: '*=',
    spaces,
    raws: { value: id },
    quoteMark,
  });
}

/**
 * 构建 scoped 模式下的 scope class 节点。
 * @param {string} id - 作用域 class 名（不含前导点）
 * @param {object} [spaces] - 空格配置
 * @returns {import('postcss-selector-parser').ClassName}
 */
function createScopedClassName(id, spaces = {}) {
  return selectorParser.className({ value: id, spaces });
}

/**
 * 选择器列表中是否已包含与当前模式一致的 scope 标记。
 * @param {import('postcss-selector-parser').Selector} selector - 单条复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否为 global 模式
 * @returns {boolean}
 */
function selectorAlreadyScoped(selector, id, isGlobal) {
  return selector.nodes.some((node) => {
    if (isGlobal) {
      return node.type === 'attribute'
        && node.attribute === 'class'
        && node.operator === '*='
        && (node.value === id || node.raws.value === id);
    }
    return node.type === 'class' && node.value === id;
  });
}

/**
 * 在复合选择器上插入 scope（默认加在最后一个可附着节点后；>>> 则加在深度组合符前一侧）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {void}
 */
function appendScopeToSelector(selector, id, isGlobal) {
  if (!selector.nodes.length || selectorAlreadyScoped(selector, id, isGlobal)) {
    return;
  }

  let idx = selector.nodes.findIndex((n) => n.type === 'combinator' && n.value === '>>>');
  let lastNode;
  if (idx < 0) {
    idx = selector.nodes.length - 1;
  } else {
    selector.nodes.splice(idx, 1);
    lastNode = selector.nodes[idx];
    idx -= 1;
  }

  for (; idx > -1; idx -= 1) {
    const node = selector.nodes[idx];
    if (node.type !== 'pseudo' && node.type !== 'combinator') {
      let afterSpace = '';
      if (lastNode) {
        if (lastNode.type === 'combinator' && lastNode.value !== ' ') afterSpace = ' ';
        else if (lastNode.type === 'string' && lastNode.value !== ' ') afterSpace = ' ';
        else if (lastNode.type !== 'pseudo' && lastNode.spaces.before === '') afterSpace = ' ';
      }
      const newNode = isGlobal
        ? createGlobalScopeAttribute(id, { after: afterSpace })
        : createScopedClassName(id, { after: afterSpace });
      const originNode = selector.nodes[idx];
      if (originNode.type !== newNode.type || originNode.value !== newNode.value) {
        selector.nodes.splice(idx + 1, 0, newNode);
      }
      break;
    }
    lastNode = node;
  }
}

/**
 * 将 :scope 伪类替换为 scope class 或 global attribute 选择器。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {boolean} 是否做过替换
 */
function replaceScopePseudo(selector, id, isGlobal) {
  let replaced = false;
  const replacement = isGlobal ? createGlobalScopeAttribute(id) : createScopedClassName(id);

  selector.walk((node) => {
    if (node.type !== 'pseudo' || node.value !== ':scope') return;
    const parent = node.parent;
    const index = parent.nodes.indexOf(node);
    parent.nodes.splice(index, 1, replacement);
    replaced = true;
  });

  return replaced;
}

/**
 * 是否为「整条规则不作用域」的行首 :global（仅支持 `:global` 或 `:global `，不支持 `:global(...)`）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isLeadingGlobalRule(selector) {
  return /^:global(?:\s+|$)/.test(selector.trim()) && !/^:global\s*\(/.test(selector.trim());
}

/**
 * 去掉行首 :global，得到不参与作用域的选择器（用于 `:global .reset` 等）。
 * @param {string} selector - 原始选择器
 * @param {string} [globalSelector=''] - 替换 `:global` 关键字的内容（一般为空）
 * @returns {string}
 */
function stripLeadingGlobal(selector, globalSelector = '') {
  return selector
    .trim()
    .replace(/^:global\s+/, '')
    .replace(/^:global$/, globalSelector)
    .replace(/^:global/, globalSelector)
    .trim();
}

/**
 * 查找复合选择器中作为「嵌套分界」的 :global 伪类下标（精确匹配 `:global`，不含 `:global(...)`）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @returns {number} 下标，不存在为 -1
 */
function findMiddleGlobalIndex(selector) {
  return selector.nodes.findIndex(
    (n) => n.type === 'pseudo' && n.value === ':global'
  );
}

/**
 * 去掉节点列表末尾的组合符。
 * @param {import('postcss-selector-parser').Selector['nodes']} nodes - 选择器片段节点
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function trimTrailingCombinators(nodes) {
  const copy = [...nodes];
  while (copy.length && copy[copy.length - 1].type === 'combinator') {
    copy.pop();
  }
  return copy;
}

/**
 * 去掉节点列表开头的组合符。
 * @param {import('postcss-selector-parser').Selector['nodes']} nodes - 选择器片段节点
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function trimLeadingCombinators(nodes) {
  const copy = [...nodes];
  while (copy.length && copy[0].type === 'combinator') {
    copy.shift();
  }
  return copy;
}

/**
 * 合并已作用域的前缀与 :global 之后的后缀（中间仅保留一个空格组合符）。
 * @param {import('postcss-selector-parser').Selector['nodes']} beforeNodes - :global 之前（已加 scope）
 * @param {import('postcss-selector-parser').Selector['nodes']} afterNodes - :global 之后
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function mergeScopedBeforeAndGlobalAfter(beforeNodes, afterNodes) {
  const merged = [...beforeNodes];
  const rest = trimLeadingCombinators(afterNodes);
  if (!rest.length) return merged;
  merged.push(selectorParser.combinator({ value: ' ' }));
  merged.push(...rest);
  return merged;
}

/**
 * 处理第一个中间 :global：仅对第一个 :global 之前的前缀加 scope，其后片段原样保留（不含 :global）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {void}
 */
function scopeSelectorBeforeMiddleGlobal(selector, id, isGlobal) {
  const globalIdx = findMiddleGlobalIndex(selector);
  if (globalIdx <= 0) return;

  const beforeNodes = trimTrailingCombinators(selector.nodes.slice(0, globalIdx));
  const afterNodes = selector.nodes.slice(globalIdx + 1);

  if (!beforeNodes.length) return;

  const beforePart = selectorParser.selector({ value: '', nodes: beforeNodes });
  if (!replaceScopePseudo(beforePart, id, isGlobal)) {
    appendScopeToSelector(beforePart, id, isGlobal);
  }

  selector.nodes = mergeScopedBeforeAndGlobalAfter(beforePart.nodes, afterNodes);
}

/**
 * 去掉中间的 :global 标记（不改动前后片段，不追加 scope）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @returns {void}
 */
function stripMiddleGlobalPseudo(selector) {
  const globalIdx = findMiddleGlobalIndex(selector);
  if (globalIdx <= 0) return;

  const beforeNodes = trimTrailingCombinators(selector.nodes.slice(0, globalIdx));
  const afterNodes = selector.nodes.slice(globalIdx + 1);
  selector.nodes = mergeScopedBeforeAndGlobalAfter(beforeNodes, afterNodes);
}

/**
 * 对单条复合选择器施加作用域（:scope 优先；否则处理中间 :global 或默认末尾追加）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {{ id: string, isGlobal: boolean }} options - 作用域选项
 * @returns {void}
 */
function scopeCompoundSelector(selector, options) {
  const { id, isGlobal } = options;
  const hasScope = selector.nodes.some((n) => n.type === 'pseudo' && n.value === ':scope');

  if (hasScope) {
    replaceScopePseudo(selector, id, isGlobal);
    while (findMiddleGlobalIndex(selector) > 0) {
      stripMiddleGlobalPseudo(selector);
    }
    return;
  }

  if (findMiddleGlobalIndex(selector) > 0) {
    scopeSelectorBeforeMiddleGlobal(selector, id, isGlobal);
    while (findMiddleGlobalIndex(selector) > 0) {
      stripMiddleGlobalPseudo(selector);
    }
    return;
  }

  appendScopeToSelector(selector, id, isGlobal);
}

/**
 * 对单条 CSS 选择器字符串施加作用域（含 :scope、:global、>>>）。
 * @param {string} selector - 选择器文本
 * @param {{ id: string, isGlobal: boolean, globalSelector?: string }} options - 作用域选项
 * @returns {string}
 */
function scopeSelector(selector, options) {
  const { id, isGlobal, globalSelector = '' } = options;
  const normalized = selector.replace(/> > >/g, '>>>').trim();
  if (!normalized) return selector;

  if (isLeadingGlobalRule(normalized)) {
    return stripLeadingGlobal(normalized, globalSelector);
  }

  return selectorParser((selectors) => {
    selectors.each((sel) => {
      scopeCompoundSelector(sel, { id, isGlobal });
    });
  }).processSync(normalized);
}

module.exports = {
  shouldSkipRule,
  scopeSelector,
  isLeadingGlobalRule,
  stripLeadingGlobal,
  /** @internal 供单测覆盖内部分支 */
  appendScopeToSelector,
  selectorAlreadyScoped,
  stripMiddleGlobalPseudo,
  scopeSelectorBeforeMiddleGlobal,
};
