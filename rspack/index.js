const {
  applyReactScopeStyle,
  normalizePluginOptions,
  injectScopeLoader,
  injectBabelPreset,
  getScopeLoaderPath,
  getScopePresetPath,
} = require('../webpack');

/**
 * Rspack 插件：与 Webpack 插件共用注入逻辑（scope loader + Babel preset）。
 * 若用户已手动配置 loader / preset（含 babel.config / configFile），则跳过对应注入。
 */
class ReactScopeStyleRspackPlugin {

  /**
   * @param {object} [options={}] - 同 Webpack 插件：`babel`、`loaderOptions` 等
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 注册到 Rspack/webpack-compatible compiler，在构建前完成注入。
   * @param {{ options: import('@rspack/core').Configuration }} compiler - Rspack compiler
   * @returns {void}
   */
  apply(compiler) {
    applyReactScopeStyle(compiler.options, this.options);
  }

}

/**
 * 配置辅助：等价于插件的注入逻辑（不挂载插件实例）。
 * @param {import('@rspack/core').Configuration} config - Rspack 配置对象
 * @param {object} [options={}] - 同插件构造参数
 * @returns {import('@rspack/core').Configuration} 原 config（便于链式调用）
 */
function withReactScopeStyle(config, options = {}) {
  return applyReactScopeStyle(config, options);
}

module.exports = ReactScopeStyleRspackPlugin;
module.exports.default = ReactScopeStyleRspackPlugin;
module.exports.ReactScopeStyleRspackPlugin = ReactScopeStyleRspackPlugin;
module.exports.withReactScopeStyle = withReactScopeStyle;
module.exports.applyReactScopeStyle = applyReactScopeStyle;
module.exports.normalizePluginOptions = normalizePluginOptions;
module.exports.injectScopeLoader = injectScopeLoader;
module.exports.injectBabelPreset = injectBabelPreset;
module.exports.getScopeLoaderPath = getScopeLoaderPath;
module.exports.getScopePresetPath = getScopePresetPath;
