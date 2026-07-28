const { injectScopeLoader } = require('../lib/inject-scope-loader');

/**
 * Next.js 配置包装器：向 webpack 样式链路注入 scope-style loader。
 * 需同时配置 `babel.config.js`（含 `next/babel` 与本 preset），Next 才会走 Babel。
 * @param {object} [nextConfig={}] - 原始 next.config 对象
 * @param {object} [options={}] - 集成选项
 * @param {object} [options.loaderOptions] - 传给 scope loader 的 options（如 sourceMap）
 * @returns {object} 包装后的 Next.js 配置
 */
function withReactScopeStyle(nextConfig = {}, options = {}) {
  const { loaderOptions = {} } = options;

  return {
    ...nextConfig,
    /**
     * 合并用户 webpack 钩子并注入 scope loader。
     * @param {import('webpack').Configuration} config - Next 生成的 webpack 配置
     * @param {object} webpackOptions - Next webpack 上下文
     * @returns {import('webpack').Configuration}
     */
    webpack(config, webpackOptions) {
      injectScopeLoader(config, loaderOptions);

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, webpackOptions);
      }
      return config;
    },
  };
}

module.exports = withReactScopeStyle;
module.exports.default = withReactScopeStyle;
module.exports.withReactScopeStyle = withReactScopeStyle;
module.exports.injectScopeLoader = injectScopeLoader;
