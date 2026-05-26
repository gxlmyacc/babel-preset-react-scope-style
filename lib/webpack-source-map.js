const path = require('path');

const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;
const ABSOLUTE_SCHEME = /^[a-z0-9+\-.]+:/i;

/**
 * 判断 source map 中 source 路径的类型。
 * @param {string} source - source 路径
 * @returns {'scheme-relative'|'path-absolute'|'absolute'|'path-relative'}
 */
function getURLType(source) {
  if (source[0] === '/') {
    if (source[1] === '/') {
      return 'scheme-relative';
    }
    return 'path-absolute';
  }

  if (IS_NATIVE_WIN32_PATH.test(source)) {
    return 'path-absolute';
  }

  return ABSOLUTE_SCHEME.test(source) ? 'absolute' : 'path-relative';
}

/**
 * 规范化 PostCSS 输出的 source map，便于 webpack 继续处理。
 * @param {object} map - source map 对象
 * @param {string} resourceContext - loader context 目录
 * @returns {object}
 */
function normalizeSourceMapAfterPostcss(map, resourceContext) {
  const newMap = map;
  delete newMap.file;
  newMap.sourceRoot = '';
  newMap.sources = newMap.sources.map((source) => {
    if (source.indexOf('<') === 0) {
      return source;
    }
    const sourceType = getURLType(source);
    if (sourceType === 'path-relative') {
      return path.resolve(resourceContext, source);
    }
    return source;
  });
  return newMap;
}

/**
 * 构建传给 PostCSS 的 map 选项（与 webpack loader 约定一致）。
 * @param {boolean} enabled - 是否启用 source map
 * @param {object|null|undefined} prevMap - 上游 loader 传入的 map
 * @returns {object|null}
 */
function resolvePostcssMapOption(enabled, prevMap) {
  if (!enabled) return null;
  return {
    prev: prevMap,
    inline: false,
    annotation: false,
  };
}

/**
 * 将 PostCSS 处理结果转为 webpack 可用的 source map。
 * @param {{ map?: { toJSON: () => object } }} result - PostCSS 处理结果
 * @param {{ sourceMap?: boolean }} options - loader 选项
 * @param {string} resourceContext - loader context 目录
 * @returns {object|undefined}
 */
function resolveLoaderSourceMap(result, options, resourceContext) {
  let map = result.map ? result.map.toJSON() : undefined;
  if (map && options.sourceMap) {
    map = normalizeSourceMapAfterPostcss(map, resourceContext);
  }
  return map;
}

/**
 * 将 PostCSS 警告转发给 webpack。
 * @param {{ warnings: () => Iterable<{ text?: string }> }} result - PostCSS 处理结果
 * @param {(warning: object) => void} emitWarning - webpack emitWarning
 * @returns {void}
 */
function emitPostcssWarnings(result, emitWarning) {
  result.warnings().forEach((warning) => emitWarning(warning));
}

/**
 * 从 PostCSS process 结果中取出 CSS 文本（兼容仅有 content 的结果）。
 * @param {{ css?: string, content?: string }} result - PostCSS 处理结果
 * @returns {string|undefined}
 */
function pickPostcssResultCss(result) {
  return result.css || result.content;
}

module.exports = {
  getURLType,
  normalizeSourceMapAfterPostcss,
  resolvePostcssMapOption,
  resolveLoaderSourceMap,
  emitPostcssWarnings,
  pickPostcssResultCss,
};
