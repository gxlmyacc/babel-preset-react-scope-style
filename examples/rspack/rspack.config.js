const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactScopeStyleRspackPlugin = require('babel-preset-react-scope-style/rspack');

const sharedRoot = path.resolve(__dirname, '../shared');
const rspackModules = path.resolve(__dirname, 'node_modules');

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  context: sharedRoot,
  entry: './src/main.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash:8].js',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    modules: [rspackModules, 'node_modules'],
  },
  resolveLoader: {
    modules: [rspackModules, 'node_modules'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        sideEffects: true,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: path.resolve(__dirname, 'babel.config.js'),
          },
        },
      },
      {
        test: /\.s[ac]ss$/i,
        sideEffects: true,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.css$/i,
        sideEffects: true,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(sharedRoot, 'public/index.html'),
    }),
    // babel: false — 本示例已在 babel.config.js 配置 preset，插件只注入 scope loader
    new ReactScopeStyleRspackPlugin({
      sourceMap: true,
      babel: false,
    }),
  ],
  devServer: {
    port: 3001,
    hot: true,
    open: false,
  },
  devtool: 'source-map',
};
