const postcss = require('postcss');
const postcssPkg = require('postcss/package.json');
const { getRemainingRequest, getOptions, getCurrentRequest } = require('loader-utils');
const qs = require('qs');
// const pkg = require('../package.json');

const REGX = new RegExp('scope-style&scoped=true(?:&global=true)?&id=([a-z0-9-]+)');

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

      return callback(
        null,
        result.content,
        meta
      );
    })
    .catch(callback);
};
