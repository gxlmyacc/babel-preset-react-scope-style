const postcss = require('postcss');
const postcssPkg = require('postcss/package.json');
const { getRemainingRequest, getOptions, getCurrentRequest } = require('loader-utils');

const {
  resolvePostcssMapOption,
  resolveLoaderSourceMap,
  emitPostcssWarnings,
  pickPostcssResultCss,
} = require('../lib/webpack-source-map');
const {
  hasScopeStyleQuery,
  parseScopeStyleQuery,
  getLoaderResourceQuery,
} = require('../lib/parse-scope-style-query');

/**
 * Webpack / Rspack loader：对带 `scope-style&scoped=true&id=...` query 的样式执行 PostCSS 作用域。
 * @param {string|import('postcss').Root} content - CSS 文本或上游 PostCSS AST root
 * @param {object|null|undefined} map - 上游 source map
 * @param {{ ast?: { type: string, version: string, root: import('postcss').Root } }} [meta] - 上游 loader meta
 * @returns {void}
 */
module.exports = function scopeStyleLoader(content, map, meta) {
  const options = getOptions(this) || {};
  const callback = this.async();

  const resourceQuery = getLoaderResourceQuery(this);
  if (!hasScopeStyleQuery(resourceQuery)) {
    return callback(null, content, map, meta);
  }

  const pluginOptions = parseScopeStyleQuery(resourceQuery);
  if (!pluginOptions) {
    return callback(null, content, map, meta);
  }

  if (meta && meta.ast) {
    const { ast } = meta;
    if (ast.type === 'postcss' && ast.version === postcssPkg.version) {
      // eslint-disable-next-line no-param-reassign
      content = ast.root;
    }
  }

  const createScopePlugin = require('../postcss');
  const plugins = [createScopePlugin(pluginOptions)];

  postcss(plugins)
    .process(content, {
      from: getRemainingRequest(this)
        .split('!')
        .pop(),
      to: getCurrentRequest(this)
        .split('!')
        .pop(),
      map: resolvePostcssMapOption(options.sourceMap, map),
    })
    .then((result) => {
      emitPostcssWarnings(result, (warning) => this.emitWarning(warning));

      const outMap = resolveLoaderSourceMap(result, options, this.context);

      const ast = {
        type: 'react-scope-style/loader',
        version: result.processor.version,
        root: result.root,
      };
      return callback(null, pickPostcssResultCss(result), outMap, { ast });
    })
    .catch(callback);
};
