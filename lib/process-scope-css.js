const postcss = require('postcss');
const scopePlugin = require('../postcss');
const {
  SCOPE_STYLE_QUERY_RE,
  parseScopeStyleQuery,
} = require('./parse-scope-style-query');

/**
 * 使用 scope PostCSS 插件处理已带 scope query 的样式内容。
 * @param {string} content - 原始 CSS 文本
 * @param {string} queryString - URL query（可含前导 `?`）
 * @returns {Promise<string>} 处理后的 CSS
 */
async function processScopeStyleCss(content, queryString) {
  const pluginOptions = parseScopeStyleQuery(queryString);
  if (!pluginOptions) {
    throw new Error(`Invalid scope-style query: ${queryString}`);
  }
  const result = await postcss([scopePlugin(pluginOptions)]).process(content, { from: undefined });
  return result.css;
}

module.exports = {
  SCOPE_STYLE_QUERY_RE,
  processScopeStyleCss,
  parseScopeStyleQuery,
};
