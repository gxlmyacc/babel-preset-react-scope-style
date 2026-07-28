const scopeStyleOptions = require('../shared/scope-style-options.cjs');

/**
 * Next App Router 示例 Babel 配置：next/babel + react-scope-style preset。
 * 存在本文件时 Next 会改用 Babel（而非仅 SWC），以便运行本 preset。
 */
module.exports = {
  presets: [
    'next/babel',
    [require.resolve('babel-preset-react-scope-style'), scopeStyleOptions],
  ],
};
