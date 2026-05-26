const postcss = require('postcss');
const postcssPkg = require('postcss/package.json');
const pluginCore = require('./plugin');

const majorVersion = parseInt(
  String(postcssPkg.version).split('.')[0],
);

/**
 * 根据已安装的 PostCSS 主版本返回对应 API 形态的插件。
 * PostCSS 8+ 使用 postcssPlugin + Once；PostCSS 7 使用 postcss.plugin 包装。
 * @param {import('./plugin').PluginOptions|import('./plugin').PluginOptions[]} [opts] - 插件参数
 * @returns {import('postcss').Plugin | { postcssPlugin: string, Once: Function }}
 */
function createScopePostcssPlugin(opts) {
  const runner = pluginCore(opts);

  if (majorVersion >= 8) {
    return Object.assign(
      () => ({
        postcssPlugin: pluginCore.id,
        Once(root, helpers) {
          return runner(root, helpers);
        },
      }),
      { postcss: true }
    );
  }

  return postcss.plugin(pluginCore.id, () => runner);
}

module.exports = createScopePostcssPlugin;
module.exports.postcss = true;
module.exports.postcssPlugin = pluginCore.id;
