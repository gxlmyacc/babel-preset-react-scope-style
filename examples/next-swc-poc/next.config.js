const withReactScopeStyle = require('babel-preset-react-scope-style/next');

/**
 * Phase B1+B2 接线：
 * - Webpack（默认 next build / next dev）：SWC WASM + scope loader
 * - Turbopack（next dev --turbo）：Next 14.2 上 SWC WASM / Babel 均不可用，见 README；
 *   仍声明 turbopack stub，PostCSS from-query 仅在 TURBOPACK=1 时启用（基础设施已就绪）
 */
module.exports = withReactScopeStyle(
  {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
  },
  {
    swcPlugin: true,
    turbopack: true,
    swcPluginOptions: {
      scopePrefix: 'v-',
      classNameLibrary: 'auto',
      pkg: { name: 'react-scope-style-next-swc-poc', version: '0.0.0' },
    },
    loaderOptions: {
      sourceMap: true,
    },
  }
);
