const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const scopeLoader = require.resolve('babel-preset-react-scope-style/loader');
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
          { loader: scopeLoader },
          'sass-loader',
        ],
      },
      {
        test: /\.css$/i,
        sideEffects: true,
        use: [
          'style-loader',
          'css-loader',
          { loader: scopeLoader },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(sharedRoot, 'public/index.html'),
    }),
  ],
  devServer: {
    port: 3001,
    hot: true,
    open: false,
  },
  devtool: 'source-map',
};
