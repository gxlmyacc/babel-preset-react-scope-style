/**
 * Webpack 示例 Babel 配置：仅 env / react。
 * scope preset 由 ReactScopeStyleWebpackPlugin 注入到 babel-loader。
 */
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
  ],
};
