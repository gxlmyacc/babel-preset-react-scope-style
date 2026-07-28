# Stylelint

This package ships optional **Stylelint plugins** (`babel-preset-react-scope-style/stylelint`) aligned with PostCSS semantics. Rule messages are in **English**. Test cases live under `test/stylelint-*.test.js`.

### Install

In your app or library repo, install Stylelint as a dev dependency (this preset does not bundle Stylelint):

```bash
npm install -D stylelint
```

### Configure

Create or extend `.stylelintrc.cjs` (or copy [`stylelint.config.cjs`](../stylelint.config.cjs) from this repo):

```javascript
module.exports = {
  plugins: ['babel-preset-react-scope-style/stylelint'],
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
```

### Rules

| Rule | Severity | Purpose |
|------|----------|---------|
| `no-global-paren` | error | `:global(...)` (CSS Modules) is not supported |
| `no-import-global-query` | error | `?global` on `@import` in stylesheets is ignored |
| `no-scope-typo` | error | Typos such as `:scoped` or `?scope` instead of `:scope` / `?scoped` |
| `prefer-ampersand-scope-wrapper` | warning | Deep nesting: prefer `&:global` / `&:scope` over bare `:global` / `:scope` wrappers |
| `no-duplicate-scope-markers` | warning | Multiple `:global` or `:scope` in one selector or nested wrappers |

**Notes:**

- Stylelint only scans stylesheets, not JS `import './x.scss?scope'` (fix those in the bundler import).
- `no-duplicate-scope-markers` does not apply to `:global(...)`; use `no-global-paren` instead.

### Lint in this repository

```bash
npm run lint:style
npm test
```
