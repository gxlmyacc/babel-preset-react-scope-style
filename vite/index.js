const { transformSync } = require('@babel/core');
const { SCOPE_STYLE_QUERY_RE, processScopeStyleCss } = require('../lib/process-scope-css');

const STYLE_EXT_RE = /\.(css|scss|sass|less)(?:\?.*)?$/i;
const JS_EXT_RE = /\.(m?[jt]sx?)$/;

/**
 * Vite 插件：在构建时对 JSX 做 scope 转换，并对带 scope query 的样式走 PostCSS。
 * @param {import('../types').ScopeStyleOptions} [userOptions={}] - 与 Babel preset 相同的配置项
 * @returns {import('vite').Plugin}
 */
function reactScopeStyle(userOptions = {}) {
  const preset = require('../src/index');

  return {
    name: 'react-scope-style',
    enforce: 'pre',
    async transform(code, id) {
      if (JS_EXT_RE.test(id) && !id.includes('node_modules')) {
        const result = transformSync(code, {
          filename: id,
          presets: [[preset, userOptions]],
          babelrc: false,
          configFile: false,
          sourceMaps: true,
        });
        /* c8 ignore next — transformSync 在有效源码下总会返回 code */
        if (!result || result.code == null) return null;
        return { code: result.code, map: result.map };
      }

      if (STYLE_EXT_RE.test(id) && SCOPE_STYLE_QUERY_RE.test(id)) {
        /* c8 ignore next — 进入本分支时 id 已含 `?` */
        const query = id.includes('?') ? id.slice(id.indexOf('?')) : '';
        const css = await processScopeStyleCss(code, query);
        return { code: css, map: null };
      }

      return null;
    },
  };
}

module.exports = reactScopeStyle;
module.exports.default = reactScopeStyle;
