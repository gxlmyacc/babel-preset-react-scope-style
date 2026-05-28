/**
 * 示例应用共用的 babel-preset-react-scope-style 配置。
 * @type {import('babel-preset-react-scope-style').ScopeStyleOptions}
 */
module.exports = {
  scopePrefix: 'ex-',
  classNameLibrary: 'auto',
  classAttrs: ['className', 'wrapClassName', 'overlayClassName'],
};
