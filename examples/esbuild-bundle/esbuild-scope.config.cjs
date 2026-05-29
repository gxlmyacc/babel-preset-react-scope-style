const path = require('node:path');

const sharedRoot = path.resolve(__dirname, '../shared');
const scopeStyleOptions = require(path.join(__dirname, '../shared/scope-style-options.cjs'));
const bundlerModules = path.resolve(__dirname, 'node_modules');

/** @type {import('babel-preset-react-scope-style/esbuild/resolve-config').EsbuildScopeConfig} */
module.exports = {
  // 源码在 shared 示例目录，输出到本示例的 public
  root: sharedRoot,
  entry: { main: path.join(sharedRoot, 'src/main.jsx') },
  out: path.resolve(__dirname, 'public'),
  // 仅配置 scopeStyleOptions 即可自动启用 scopeStyle
  scopeStyleOptions,
  // shared 源码依赖由本示例 node_modules 提供
  alias: {
    react: path.join(bundlerModules, 'react'),
    'react-dom': path.join(bundlerModules, 'react-dom'),
    classnames: path.join(bundlerModules, 'classnames'),
  },

  // SPA 打包模式（库模式为 CLI 默认，bundle 示例需显式开启）
  bundle: true,
  // format: 'esm',
  // jsx: 'automatic',
  // sourcemap: false,
  // scopeStyle: true, // 有 scopeStyleOptions 时自动为 true
  // servedir: 与 out 相同
  // servePort: 3002,
};
