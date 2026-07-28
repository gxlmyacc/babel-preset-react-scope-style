const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactScopeStyleWebpackPlugin = require('babel-preset-react-scope-style/webpack');

const sharedRoot = path.resolve(__dirname, '../shared');
const webpackModules = path.resolve(__dirname, 'node_modules');
const scopeStyleOptions = require('../shared/scope-style-options.cjs');

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
    modules: [webpackModules, 'node_modules'],
  },
  resolveLoader: {
    modules: [webpackModules, 'node_modules'],
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
            // env / react 仍走本地 babel.config；scope preset 由插件注入
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
    new ReactScopeStyleWebpackPlugin({
      sourceMap: true,
      babel: scopeStyleOptions,
    }),
    new HtmlWebpackPlugin({
      template: path.join(sharedRoot, 'public/index.html'),
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    open: false,
  },
  devtool: 'source-map',
};
