const path = require('node:path');

const sharedRoot = path.resolve(__dirname, '../shared');
const scopeStyleOptions = require(path.join(sharedRoot, 'scope-style-options.cjs'));

/** @type {import('babel-preset-react-scope-style/esbuild/resolve-config').EsbuildScopeConfig} */
module.exports = {
  // 源码在 shared，输出到本示例的 esm
  root: sharedRoot,
  src: './src',
  out: path.resolve(__dirname, 'esm'),
  scopeStyleOptions,
};
