/** 已改写为 scope-style 的 import，不再检查 typo / ?global */
const SCOPE_STYLE_IMPORT_RE = /scope-style&/;

/** 样式内 @import 误写 ?scope（非 ?scoped / ?scope-style） */
const SCOPED_TYPO_RE = /\?scope(?!d|-)/;

/** 样式内 @import 手写 ?global（不支持） */
const IMPORT_GLOBAL_QUERY_RE = /\?global(?:\b|[&=])/;

/**
 * @import params 是否已为 scope-style 改写结果。
 * @param {string} params - @import 的 params
 * @returns {boolean}
 */
function isScopeStyleImportParams(params) {
  return SCOPE_STYLE_IMPORT_RE.test(params);
}

/**
 * params 是否含 ?scope 拼写错误。
 * @param {string} params - @import 的 params 或 url 片段
 * @returns {boolean}
 */
function hasScopedQueryTypo(params) {
  if (!params || isScopeStyleImportParams(params)) return false;
  return SCOPED_TYPO_RE.test(params);
}

/**
 * params 是否含不支持的 ?global。
 * @param {string} params - @import 的 params
 * @returns {boolean}
 */
function hasUnsupportedImportGlobalQuery(params) {
  if (!params || isScopeStyleImportParams(params)) return false;
  return IMPORT_GLOBAL_QUERY_RE.test(params) || /\bglobal=true\b/.test(params);
}

module.exports = {
  hasScopedQueryTypo,
  hasUnsupportedImportGlobalQuery,
  isScopeStyleImportParams,
};
