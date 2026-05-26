const qs = require('qs');

/** 是否包含 scope-style 作用域标记（不要求带 id） */
const SCOPE_STYLE_QUERY_RE = /scope-style&scoped=true/;

/** 完整 scope query：含 scoped、可选 global、id */
const SCOPE_STYLE_ID_RE = /scope-style&scoped=true(?:&global=true)?&id=([a-z0-9-]+)/;

/**
 * 去掉 query 前导 `?`。
 * @param {string} [queryString] - URL query
 * @returns {string}
 */
function normalizeQueryString(queryString) {
  if (!queryString) return '';
  return String(queryString).replace(/^\?/, '');
}

/**
 * 判断 query 是否为可用的 scope-style 参数（必须含 id）。
 * @param {string} [queryString] - URL query，可含前导 `?`
 * @returns {boolean}
 */
function hasScopeStyleQuery(queryString) {
  return SCOPE_STYLE_ID_RE.test(normalizeQueryString(queryString));
}

/**
 * 将 scope-style URL query 解析为 PostCSS 插件选项。
 * @param {string} [queryString] - URL query，可含前导 `?`
 * @returns {{ scoped: boolean, global: boolean, id: string }|null} 非 scope query 时返回 null
 */
function parseScopeStyleQuery(queryString) {
  const normalized = normalizeQueryString(queryString);
  if (!SCOPE_STYLE_ID_RE.test(normalized)) return null;

  const parsed = qs.parse(normalized);
  const id = typeof parsed.id === 'string' ? parsed.id : '';
  if (!id) return null;

  return {
    scoped: true,
    global: parsed.global === 'true' || parsed.global === true,
    id,
  };
}

/**
 * 从 webpack loader 上下文读取 resource query（优先 `resourceQuery`）。
 * @param {{ resourceQuery?: string, request?: string }} loaderContext - loader 上下文
 * @returns {string} 含前导 `?` 或空字符串
 */
function getLoaderResourceQuery(loaderContext) {
  if (loaderContext.resourceQuery) {
    return loaderContext.resourceQuery;
  }
  if (!loaderContext.request) return '';
  const matched = loaderContext.request.match(/\?([^?!]+)$/);
  return matched ? `?${matched[1]}` : '';
}

module.exports = {
  SCOPE_STYLE_QUERY_RE,
  SCOPE_STYLE_ID_RE,
  normalizeQueryString,
  hasScopeStyleQuery,
  parseScopeStyleQuery,
  getLoaderResourceQuery,
};
