const stylelint = require('stylelint');
const { hasScopedPseudoTypo } = require('../utils/selector-utils');
const { hasScopedQueryTypo } = require('../utils/import-query-utils');

const ruleName = 'react-scope-style/no-scope-typo';

const messages = stylelint.utils.ruleMessages(ruleName, {
  scopedPseudo: 'Did you mean :scope instead of :scoped?',
  scopedQuery: 'Did you mean ?scoped on @import (only ?scoped is recognized in stylesheets)?',
});

const meta = {
  url: 'https://github.com/gxlmyacc/babel-preset-react-scope-style#scope--global',
  fixable: false,
};

/**
 * 检测 :scoped、?scope 等常见拼写错误。
 * @param {boolean} primary - 是否启用规则
 * @returns {import('postcss').Plugin} PostCSS 插件函数
 */
function rule(primary) {
  return (root, result) => {
    if (!primary) return;

    root.walkRules((ruleNode) => {
      if (!ruleNode.selector) return;
      if (!hasScopedPseudoTypo(ruleNode.selector)) return;

      stylelint.utils.report({
        message: messages.scopedPseudo,
        node: ruleNode,
        result,
        ruleName,
      });
    });

    root.walkAtRules('import', (atRule) => {
      const params = atRule.params || '';
      if (!hasScopedQueryTypo(params)) return;

      stylelint.utils.report({
        message: messages.scopedQuery,
        node: atRule,
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
