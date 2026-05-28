const stylelint = require('stylelint');
const { hasFunctionalGlobal } = require('../utils/selector-utils');

const ruleName = 'react-scope-style/no-global-paren';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: 'CSS Modules :global(...) is not supported; use leading :global or a nested :global boundary',
});

const meta = {
  url: 'https://github.com/gxlmyacc/babel-preset-react-scope-style#scope--global',
  fixable: false,
};

/**
 * 禁止 CSS Modules 形式的 :global(...)。
 * @param {boolean} primary - 是否启用规则
 * @returns {import('postcss').Plugin} PostCSS 插件函数
 */
function rule(primary) {
  return (root, result) => {
    if (!primary) return;

    root.walkRules((ruleNode) => {
      if (!ruleNode.selector) return;
      if (!hasFunctionalGlobal(ruleNode.selector)) return;

      stylelint.utils.report({
        message: messages.rejected,
        node: ruleNode,
        result,
        ruleName,
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
