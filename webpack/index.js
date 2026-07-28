const {
  injectScopeLoader,
  getScopeLoaderPath,
} = require('../lib/inject-scope-loader');
const { injectBabelPreset, getScopePresetPath } = require('../lib/inject-babel-preset');

/**
 * 归一化 Webpack 插件选项。
 * @param {object} [options={}] - 原始选项
 * @returns {{ babel: boolean|object, loaderOptions: object }}
 */
function normalizePluginOptions(options = {}) {
  const { babel = true, loaderOptions, ...rest } = options;
  return {
    babel,
    loaderOptions: loaderOptions != null ? loaderOptions : rest,
  };
}

/**
 * 向 webpack 配置注入 scope loader，并按需注入 Babel preset。
 * @param {import('webpack').Configuration} config - webpack 配置
 * @param {object} [options={}] - 插件选项
 * @param {boolean|object} [options.babel=true] - false 关闭 Babel 注入；对象为 preset 选项
 * @param {object} [options.loaderOptions] - 传给 scope loader 的 options；未传时其余字段视为 loaderOptions
 * @returns {import('webpack').Configuration}
 */
function applyReactScopeStyle(config, options = {}) {
  const { babel, loaderOptions } = normalizePluginOptions(options);
  injectScopeLoader(config, loaderOptions);
  injectBabelPreset(config, babel);
  return config;
}

/**
 * Webpack 插件：自动注入 scope-style loader，并向 babel-loader 注入本 Babel preset。
 * 若用户已手动配置 loader / preset（含 babel.config / configFile），则跳过对应注入。
 */
class ReactScopeStyleWebpackPlugin {

  /**
   * @param {object} [options={}] - 见 {@link normalizePluginOptions}
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 注册到 webpack compiler，在构建前完成注入。
   * @param {import('webpack').Compiler} compiler - webpack compiler
   * @returns {void}
   */
  apply(compiler) {
    applyReactScopeStyle(compiler.options, this.options);
  }

}

/**
 * 配置辅助：等价于插件的注入逻辑（不挂载插件实例）。
 * @param {import('webpack').Configuration} config - webpack 配置对象
 * @param {object} [options={}] - 同插件构造参数
 * @returns {import('webpack').Configuration} 原 config（便于链式调用）
 */
function withReactScopeStyle(config, options = {}) {
  return applyReactScopeStyle(config, options);
}

module.exports = ReactScopeStyleWebpackPlugin;
module.exports.default = ReactScopeStyleWebpackPlugin;
module.exports.ReactScopeStyleWebpackPlugin = ReactScopeStyleWebpackPlugin;
module.exports.withReactScopeStyle = withReactScopeStyle;
module.exports.applyReactScopeStyle = applyReactScopeStyle;
module.exports.normalizePluginOptions = normalizePluginOptions;
module.exports.injectScopeLoader = injectScopeLoader;
module.exports.injectBabelPreset = injectBabelPreset;
module.exports.getScopeLoaderPath = getScopeLoaderPath;
module.exports.getScopePresetPath = getScopePresetPath;
