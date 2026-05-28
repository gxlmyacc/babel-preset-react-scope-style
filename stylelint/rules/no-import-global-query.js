const stylelint = require('stylelint');
const { hasUnsupportedImportGlobalQuery } = require('../utils/import-query-utils');

const ruleName = 'react-scope-style/no-import-global-query';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: '?global on @import in stylesheets is not supported; use JS ?global or leading :global in selectors',
});

const meta = {
  url: 'https://github.com/gxlmyacc/babel-preset-react-scope-style#scope--global',
  fixable: false,
};

/**
 * 禁止在样式文件 @import 中使用 ?global。
 * @param {boolean} primary - 是否启用规则
 * @returns {import('postcss').Plugin} PostCSS 插件函数
 */
function rule(primary) {
  return (root, result) => {
    if (!primary) return;

    root.walkAtRules('import', (atRule) => {
      const params = atRule.params || '';
      if (!hasUnsupportedImportGlobalQuery(params)) return;

      stylelint.utils.report({
        message: messages.rejected,
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
