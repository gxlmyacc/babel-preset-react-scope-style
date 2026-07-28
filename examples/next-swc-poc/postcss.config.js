/**
 * Next 示例本地 PostCSS 配置，避免继承仓库根目录的 postcss.config.js。
 * 作用域转换由 babel-preset-react-scope-style/loader 完成，无需在此注册 PostCSS 插件。
 */
module.exports = {
  plugins: {},
};
