const { transformSync } = require('@babel/core');
const { SCOPE_STYLE_QUERY_RE, processScopeStyleCss } = require('../lib/process-scope-css');
const {
  buildBabelTransformOptions,
  isTypeScriptFilename,
} = require('../lib/alias-config');

const STYLE_EXT_RE = /\.(css|scss|sass|less)(?:\?.*)?$/i;
const JS_EXT_RE = /\.(m?[jt]sx?)(?:\?.*)?$/i;

/**
 * Vite 插件：在构建时对 JSX/TSX 做 scope 转换，并对带 scope query 的样式走 PostCSS。
 * @param {import('../types').ScopeStyleOptions & { typescript?: boolean }} [userOptions={}] - preset 选项；`typescript` 控制是否处理 `.ts`/`.tsx`（默认 true）
 * @returns {import('vite').Plugin}
 */
function reactScopeStyle(userOptions = {}) {
  const { loadScopePreset } = require('../lib/resolve-preset');
  const preset = loadScopePreset();
  const {
    typescript: enableTypescript = true,
    ...presetOptions
  } = userOptions;

  return {
    name: 'react-scope-style',
    enforce: 'pre',
    async transform(code, id) {
      // Vite 虚拟模块 id 含 \0，跳过以免 Babel 解析路径失败
      if (id.includes('\0')) return null;

      const bareId = id.split('?')[0];
      if (JS_EXT_RE.test(id) && !bareId.replace(/\\/g, '/').includes('/node_modules/')) {
        // 关闭 typescript 时跳过 .ts/.tsx，交给 Vite 默认 TS 管线
        if (isTypeScriptFilename(bareId) && enableTypescript === false) {
          return null;
        }

        const result = transformSync(code, buildBabelTransformOptions({
          filename: id,
          preset,
          babelOptions: presetOptions,
          rootDir: process.cwd(),
          aliasConfig: false,
          sourceMaps: true,
          enableTypescript,
        }));
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
