/** @type {import('stylelint').Config} */
module.exports = {
  plugins: ['./stylelint'],
  rules: {
    'react-scope-style/no-global-paren': true,
    'react-scope-style/no-import-global-query': true,
    'react-scope-style/no-scope-typo': true,
    'react-scope-style/prefer-ampersand-scope-wrapper': [
      true,
      { severity: 'warning', minRuleAncestors: 2 },
    ],
    'react-scope-style/no-duplicate-scope-markers': [
      true,
      { severity: 'warning' },
    ],
  },
};
