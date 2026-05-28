const path = require('node:path');
const stylelint = require('stylelint');

const defaultConfigFile = path.join(__dirname, '..', '..', 'stylelint.config.cjs');

/**
 * 对 CSS 源码执行 stylelint。
 * @param {string} code - CSS 源码
 * @param {{ configFile?: string, rules?: Record<string, unknown> }} [options] - 配置选项
 * @returns {Promise<import('stylelint').LintResult['warnings']>}
 */
async function lintWarnings(code, options = {}) {
  const { configFile = defaultConfigFile, rules } = options;
  const config = rules
    ? { plugins: ['./stylelint'], rules }
    : undefined;

  const { results } = await stylelint.lint({
    code,
    configFile: rules ? undefined : configFile,
    config,
  });
  return results[0]?.warnings ?? [];
}

/**
 * 返回匹配指定规则的第一条告警。
 * @param {string} code - CSS 源码
 * @param {string} ruleName - 规则全名
 * @param {{ configFile?: string, rules?: Record<string, unknown> }} [options] - 配置选项
 * @returns {Promise<import('stylelint').Warning | undefined>}
 */
async function lintCode(code, ruleName, options = {}) {
  const warnings = await lintWarnings(code, options);
  return warnings.find((w) => w.rule === ruleName);
}

/**
 * 仅启用指定规则进行 lint（隔离其它规则）。
 * @param {string} code - CSS 源码
 * @param {string} ruleName - 规则全名（react-scope-style/...）
 * @param {boolean | [boolean, object]} ruleValue - 规则配置值
 * @returns {Promise<import('stylelint').Warning | undefined>}
 */
async function lintWithRule(code, ruleName, ruleValue = true) {
  return lintCode(code, ruleName, { rules: { [ruleName]: ruleValue } });
}

module.exports = {
  defaultConfigFile,
  lintWarnings,
  lintCode,
  lintWithRule,
};
