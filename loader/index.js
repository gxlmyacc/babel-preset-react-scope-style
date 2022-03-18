const postcss = require('postcss');
const postcssPkg = require('postcss/package.json');
const { getRemainingRequest, getOptions, getCurrentRequest } = require('loader-utils');
const qs = require('qs');
const path = require('path');
// const pkg = require('../package.json');

const REGX = new RegExp('scope-style&scoped=true(?:&global=true)?&id=([a-z0-9-]+)');

const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;
const ABSOLUTE_SCHEME = /^[a-z0-9+\-.]+:/i;

function getURLType(source) {
  if (source[0] === "/") {
    if (source[1] === "/") {
      return "scheme-relative";
    }

    return "path-absolute";
  }

  if (IS_NATIVE_WIN32_PATH.test(source)) {
    return "path-absolute";
  }

  return ABSOLUTE_SCHEME.test(source) ? "absolute" : "path-relative";
}

function normalizeSourceMapAfterPostcss(map, resourceContext) {
  const newMap = map; // result.map.file is an optional property that provides the output filename.
  // Since we don't know the final filename in the webpack build chain yet, it makes no sense to have it.
  // eslint-disable-next-line no-param-reassign

  delete newMap.file; // eslint-disable-next-line no-param-reassign

  newMap.sourceRoot = ""; // eslint-disable-next-line no-param-reassign

  newMap.sources = newMap.sources.map(source => {
    if (source.indexOf("<") === 0) {
      return source;
    }

    const sourceType = getURLType(source); // Do no touch `scheme-relative`, `path-absolute` and `absolute` types

    if (sourceType === "path-relative") {
      return path.resolve(resourceContext, source);
    }

    return source;
  });
  return newMap;
}

module.exports = function loader(content, map, meta) {
  const options = getOptions(this) || {};

  const callback = this.async();

  let [, _query] = (this.request.match(/\?([a-z0-9-&=!]+)$/i) || []);
  if (!_query) return this.callback(null, content, map, meta);
  const matched = _query.match(REGX);
  if (!matched) return this.callback(null, content, map, meta);


  let isPostcss8 = false;
  if (meta) {
    const { ast } = meta;

    if (ast) {
      if (ast.type === 'postcss' && ast.version === postcssPkg.version) {
        // eslint-disable-next-line no-param-reassign
        content = ast.root;
      }
      isPostcss8 = ast.version.startsWith('8');
    }
  }

  const plugins = [
    isPostcss8
      ? require('../postcss/postcss8')(qs.parse(_query))
      : require('../postcss')(qs.parse(_query))
  ];

  postcss(plugins)
    .process(content, {
      from: getRemainingRequest(this)
        .split('!')
        .pop(),
      to: getCurrentRequest(this)
        .split('!')
        .pop(),
      map: options.sourceMap
        ? {
          prev: map,
          inline: false,
          annotation: false,
        }
        : null,
    })
    .then(result => {
      result
        .warnings()
        .forEach(warning => this.emitWarning(warning));

        let map = result.map ? result.map.toJSON() : undefined;

        if (map && options.sourceMap) {
          map = normalizeSourceMapAfterPostcss(map, this.context);
        }

        const ast = {
          type: "react-scope-style/loader",
          version: result.processor.version,
          root: result.root
        };
        return callback(null, result.css || result.content, map, {
          ast
        });
    })
    .catch(callback);
};
