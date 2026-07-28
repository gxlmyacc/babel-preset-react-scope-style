const withReactScopeStyle = require('babel-preset-react-scope-style/next');

/**
 * Phase B1：无 babel.config，SWC 插件做 JS 作用域变换，webpack loader 做 CSS scope。
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
