const selectorParser = require('postcss-selector-parser');

/**
 * 判断 rule 是否包含至少一个嵌套子 rule。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function ruleHasChildRule(rule) {
  let found = false;
  rule.each((child) => {
    if (child.type === 'rule') found = true;
  });
  return found;
}

/**
 * 是否为 global 嵌套包装块选择器（裸 :global、&:global 等，非 :global(...)）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isGlobalNestingWrapperSelector(selector) {
  const s = selector.trim();
  return s === ':global' || s === '&:global' || s === '& :global';
}

/**
 * 是否为 :scope 嵌套包装块选择器（裸 :scope、&:scope 等）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isScopeNestingWrapperSelector(selector) {
  const s = selector.trim();
  return s === ':scope' || s === '&:scope' || s === '& :scope';
}

/**
 * 是否为附着式 .prefix:global 的 global 嵌套包装 rule。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isAttachedGlobalNestingWrapper(rule) {
  if (!rule.selector) return false;
  const s = rule.selector.trim();
  if (isGlobalNestingWrapperSelector(s)) return false;
  if (/^:global\s*\(/.test(s)) return false;
  if (!/^.+:global$/.test(s)) return false;
  return ruleHasChildRule(rule);
}

/**
 * 是否为附着式 .prefix:scope 的 scope 嵌套包装 rule。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isAttachedScopeNestingWrapper(rule) {
  if (!rule.selector) return false;
  const s = rule.selector.trim();
  if (isScopeNestingWrapperSelector(s)) return false;
  if (!/^.+:scope$/.test(s)) return false;
  return ruleHasChildRule(rule);
}

/**
 * 是否为 :global 嵌套包装 rule（裸或附着式）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isGlobalNestingWrapperRule(rule) {
  if (!rule.selector) return false;
  if (isGlobalNestingWrapperSelector(rule.selector) && ruleHasChildRule(rule)) {
    return true;
  }
  return isAttachedGlobalNestingWrapper(rule);
}

/**
 * 是否为 :scope 嵌套包装 rule（裸或附着式）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isScopeNestingWrapperRule(rule) {
  if (!rule.selector) return false;
  if (isScopeNestingWrapperSelector(rule.selector) && ruleHasChildRule(rule)) {
    return true;
  }
  return isAttachedScopeNestingWrapper(rule);
}

/**
 * 统计单条复合选择器内 :global / :scope 伪类数量（不含 :global(...)）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器 AST
 * @returns {{ global: number, scope: number }}
 */
function countMarkersInCompoundSelector(selector) {
  let global = 0;
  let scope = 0;
  selector.walk((node) => {
    if (node.type !== 'pseudo') return;
    if (node.value === ':scope') {
      scope += 1;
      return;
    }
    if (node.value === ':global') {
      if (node.nodes && node.nodes.length > 0) return;
      global += 1;
    }
  });
  return { global, scope };
}

/**
 * 解析选择器字符串并统计各复合选择器中的 :global / :scope 数量。
 * @param {string} selectorText - 逗号分隔的选择器文本
 * @returns {{ global: number, scope: number } | null} 各复合选择器中的最大计数；解析失败为 null
 */
function countMarkersInSelectorList(selectorText) {
  if (!selectorText || !selectorText.trim()) {
    return { global: 0, scope: 0 };
  }
  let maxGlobal = 0;
  let maxScope = 0;
  try {
    const parsed = selectorParser((selectors) => {
      selectors.each((compound) => {
        const { global, scope } = countMarkersInCompoundSelector(compound);
        if (global > maxGlobal) maxGlobal = global;
        if (scope > maxScope) maxScope = scope;
      });
    }).processSync(selectorText);
    if (!parsed) return null;
  } catch (err) {
    return null;
  }
  return { global: maxGlobal, scope: maxScope };
}

/**
 * 统计祖先链上 :global 嵌套包装层数（不含当前 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {number}
 */
function countAncestorGlobalWrappers(rule) {
  let count = 0;
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'rule' && isGlobalNestingWrapperRule(parent)) {
      count += 1;
    }
    parent = parent.parent;
  }
  return count;
}

/**
 * 统计祖先链上 :scope 嵌套包装层数（不含当前 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {number}
 */
function countAncestorScopeWrappers(rule) {
  let count = 0;
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'rule' && isScopeNestingWrapperRule(parent)) {
      count += 1;
    }
    parent = parent.parent;
  }
  return count;
}

module.exports = {
  ruleHasChildRule,
  countMarkersInSelectorList,
  countAncestorGlobalWrappers,
  countAncestorScopeWrappers,
  isGlobalNestingWrapperRule,
  isScopeNestingWrapperRule,
};
