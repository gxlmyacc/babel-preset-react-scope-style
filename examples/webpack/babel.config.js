const path = require('path');

const scopeStyleOptions = require(path.join(__dirname, '../shared/scope-style-options.cjs'));

module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    ['babel-preset-react-scope-style', scopeStyleOptions],
  ],
};
