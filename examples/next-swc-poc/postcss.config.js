/**
 * Next 示例本地 PostCSS 配置，避免继承仓库根目录的 postcss.config.js。
 * - Webpack：作用域由 babel-preset-react-scope-style/loader 完成，此处不注册插件（防双重 scope）。
 * - Turbopack：无 webpack loader，改走 PostCSS from-query（Next 会设 process.env.TURBOPACK）。
 *   注意：Next 14.2 上 Turbopack + 本包 SWC/Babel 尚不可用，见 README。
 */
const isTurbopack = Boolean(process.env.TURBOPACK);

module.exports = isTurbopack
  ? require('babel-preset-react-scope-style/next').createTurbopackPostcssPlugins()
  : { plugins: {} };
