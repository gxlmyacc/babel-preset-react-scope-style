const stylelint = require('stylelint');
const noDuplicateScopeMarkers = require('./rules/no-duplicate-scope-markers');
const noGlobalParen = require('./rules/no-global-paren');
const noImportGlobalQuery = require('./rules/no-import-global-query');
const noScopeTypo = require('./rules/no-scope-typo');
const preferAmpersandScopeWrapper = require('./rules/prefer-ampersand-scope-wrapper');

const rules = {
  'no-duplicate-scope-markers': noDuplicateScopeMarkers,
  'no-global-paren': noGlobalParen,
  'no-import-global-query': noImportGlobalQuery,
  'no-scope-typo': noScopeTypo,
  'prefer-ampersand-scope-wrapper': preferAmpersandScopeWrapper,
};

/**
 * 为单条规则创建 stylelint 插件实例。
 * @param {typeof noDuplicateScopeMarkers} ruleFn - 规则函数
 * @returns {import('stylelint').Plugin}
 */
function createRulePlugin(ruleFn) {
  return stylelint.createPlugin(ruleFn.ruleName, ruleFn);
}

const plugins = Object.values(rules).map(createRulePlugin);

module.exports = plugins;
module.exports.rules = rules;
module.exports.ruleNames = Object.keys(rules).map((name) => `react-scope-style/${name}`);
module.exports.createRulePlugin = createRulePlugin;
