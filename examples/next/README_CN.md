# Next.js 示例（Pages Router）

## [English](./README.md)

仅 bundler 配置包。应用源码：[`../shared/`](../shared/)。

## 安装

```bash
cd examples/next
npm install
```

## 脚本

- `npm run dev` — http://localhost:3003
- `npm run build` — 生产构建
- `npm run start` — 启动生产构建

## 配置

- `next.config.js` — `withReactScopeStyle()`（`babel-preset-react-scope-style/next`）注入 webpack scope loader
- `babel.config.js` — `next/babel` + preset（选项来自 `../shared/scope-style-options.cjs`）
- Pages Router 演示，端口 3003

App Router 演示见 [`../next-app/`](../next-app/)（端口 3004）。
