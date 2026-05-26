const path = require('path');

/**
 * 为 Rspack 配置追加 scope-style loader 规则（与 Webpack 链式顺序一致）。
 * @param {import('@rspack/core').Configuration} config - Rspack 配置对象
 * @param {object} [loaderOptions={}] - 传给 loader 的 options
 * @returns {import('@rspack/core').Configuration} 原 config（便于链式调用）
 */
function withReactScopeStyle(config, loaderOptions = {}) {
  const loaderPath = path.join(__dirname, '../loader/index.js');
  const rule = {
    test: /\.(css|scss|sass|less)$/i,
    use: [
      {
        loader: loaderPath,
        options: loaderOptions,
      },
    ],
  };

  if (!config.module) config.module = {};
  if (!config.module.rules) config.module.rules = [];
  config.module.rules.push(rule);
  return config;
}

module.exports = withReactScopeStyle;
module.exports.default = withReactScopeStyle;
