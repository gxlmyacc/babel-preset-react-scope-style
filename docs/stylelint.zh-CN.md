# Stylelint

本包提供可选 **Stylelint 插件**（`babel-preset-react-scope-style/stylelint`），与 PostCSS 语义一致。规则**报告文案为英文**；用例见 `test/stylelint-*.test.js`。

### 安装

在业务项目中将 Stylelint 安装为开发依赖（本 preset 不内置 stylelint 可执行文件）：

```bash
npm install -D stylelint
```

### 配置

新建或扩展 `.stylelintrc.cjs`（或复制本仓库 [`stylelint.config.cjs`](../stylelint.config.cjs)）：

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

### 规则一览

| 规则 | 级别 | 说明 |
|------|------|------|
| `no-global-paren` | error | 不支持 `:global(...)`（CSS Modules） |
| `no-import-global-query` | error | 样式内 `@import` 的 `?global` 不会生效 |
| `no-scope-typo` | error | 拼写错误：`:scoped`、`?scope` 等 |
| `prefer-ampersand-scope-wrapper` | warning | 深层嵌套建议用 `&:global` / `&:scope` 替代裸包装块 |
| `no-duplicate-scope-markers` | warning | 同选择器或嵌套中重复的 `:global` / `:scope` |

**说明：** Stylelint 只检查样式文件，不检查 JS 里的 `import './x.scss?scope'`。`:global(...)` 由 `no-global-paren` 报错，不由 `no-duplicate-scope-markers` 处理。

### 在本仓库中运行

```bash
npm run lint:style
npm test
```
