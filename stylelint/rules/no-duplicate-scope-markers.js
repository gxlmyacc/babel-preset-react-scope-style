const stylelint = require('stylelint');
const {
  countMarkersInSelectorList,
  countAncestorGlobalWrappers,
  countAncestorScopeWrappers,
  isGlobalNestingWrapperRule,
  isScopeNestingWrapperRule,
} = require('../utils/scope-markers');

const ruleName = 'react-scope-style/no-duplicate-scope-markers';

const messages = stylelint.utils.ruleMessages(ruleName, {
  multipleGlobalInSelector: (count) => `Found ${count} :global markers in one selector; use a single nesting boundary`,
  multipleScopeInSelector: (count) => `Found ${count} :scope markers in one selector; use a single scope anchor`,
  nestedGlobalWrapper: 'Nested :global wrapper blocks are redundant; inner :global is usually unnecessary',
  nestedScopeWrapper: 'Nested :scope wrapper blocks are redundant; inner :scope is usually unnecessary',
});

const meta = {
  url: 'https://github.com/gxlmyacc/babel-preset-react-scope-style#scope--global',
  fixable: false,
};

/**
 * 校验扁平/嵌套选择器中是否出现多个 :global 或 :scope。
 * @param {boolean} primary - 是否启用规则
 * @returns {import('postcss').Plugin} PostCSS 插件函数
 */
function rule(primary) {
  return (root, result) => {
    if (!primary) return;

    root.walkRules((ruleNode) => {
      const counts = countMarkersInSelectorList(ruleNode.selector);
      if (counts) {
        if (counts.global > 1) {
          stylelint.utils.report({
            message: messages.multipleGlobalInSelector(counts.global),
            node: ruleNode,
            result,
            ruleName,
          });
        }
        if (counts.scope > 1) {
          stylelint.utils.report({
            message: messages.multipleScopeInSelector(counts.scope),
            node: ruleNode,
            result,
            ruleName,
          });
        }
      }

      if (isGlobalNestingWrapperRule(ruleNode) && countAncestorGlobalWrappers(ruleNode) > 0) {
        stylelint.utils.report({
          message: messages.nestedGlobalWrapper,
          node: ruleNode,
          result,
          ruleName,
        });
      }

      if (isScopeNestingWrapperRule(ruleNode) && countAncestorScopeWrappers(ruleNode) > 0) {
        stylelint.utils.report({
          message: messages.nestedScopeWrapper,
          node: ruleNode,
          result,
          ruleName,
        });
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
