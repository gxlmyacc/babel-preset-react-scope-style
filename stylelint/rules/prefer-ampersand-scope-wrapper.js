const stylelint = require('stylelint');
const { countRuleAncestors, getBareWrapperMarkerKind } = require('../utils/nesting-utils');

const ruleName = 'react-scope-style/prefer-ampersand-scope-wrapper';

const messages = stylelint.utils.ruleMessages(ruleName, {
  preferGlobal: 'Prefer &:global over bare :global when nested deeply to attach to the parent selector',
  preferScope: 'Prefer &:scope over bare :scope when nested deeply to attach to the parent selector',
});

const meta = {
  url: 'https://github.com/gxlmyacc/babel-preset-react-scope-style#scope--global',
  fixable: false,
};

/**
 * 深层嵌套时建议用 &:global / &:scope 替代裸包装块。
 * @param {boolean} primary - 是否启用规则
 * @param {{ minRuleAncestors?: number }} [secondaryOptions] - 次要选项
 * @returns {import('postcss').Plugin} PostCSS 插件函数
 */
function rule(primary, secondaryOptions = {}) {
  const minRuleAncestors = secondaryOptions.minRuleAncestors ?? 2;

  return (root, result) => {
    if (!primary) return;

    root.walkRules((ruleNode) => {
      const kind = getBareWrapperMarkerKind(ruleNode);
      if (!kind) return;
      if (countRuleAncestors(ruleNode) < minRuleAncestors) return;

      stylelint.utils.report({
        message: kind === 'global' ? messages.preferGlobal : messages.preferScope,
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
