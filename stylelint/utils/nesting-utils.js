const { ruleHasChildRule } = require('./scope-markers');

/**
 * 统计当前 rule 向上的 rule 祖先数量。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {number}
 */
function countRuleAncestors(rule) {
  let count = 0;
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'rule') count += 1;
    parent = parent.parent;
  }
  return count;
}

/**
 * 是否为裸 :global 或 :scope 包装块（精确选择器且含子 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {'global' | 'scope' | null}
 */
function getBareWrapperMarkerKind(rule) {
  if (!rule.selector || !ruleHasChildRule(rule)) return null;
  const s = rule.selector.trim();
  if (s === ':global') return 'global';
  if (s === ':scope') return 'scope';
  return null;
}

module.exports = {
  countRuleAncestors,
  getBareWrapperMarkerKind,
};
