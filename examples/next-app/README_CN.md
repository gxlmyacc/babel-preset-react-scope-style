# Next.js App Router 示例

## [English](./README.md)

仅 bundler 配置包。应用源码：[`../shared/`](../shared/)。

本演示使用 **App Router**（`app/`），Babel + webpack 要求与 Pages 示例相同。

## 要求

- `babel.config.js` 含 `next/babel` + 本 preset（Next 从纯 SWC 切到 Babel）
- `next.config.js` 使用 `withReactScopeStyle`（注入 scope webpack loader）
- **不要**使用 `next dev --turbo`（不支持 Turbopack）

## 安装

```bash
cd examples/next-app
npm install
```

## 脚本

- `npm run dev` — http://localhost:3004
- `npm run build` — 生产构建
- `npm run start` — 启动生产构建

## 配置

- `next.config.js` — `withReactScopeStyle()`（`babel-preset-react-scope-style/next`）
- `babel.config.js` — `next/babel` + preset（选项来自 `../shared/scope-style-options.cjs`）
- `app/page.js` — Client Component，包装 `shared/src/App`

> App Router 提示：不要在 webpack 里把 `react` / `react-dom` alias 到绝对路径 — 会破坏 `react-server` 导出条件（`cache is not a function`）。优先用 `resolve.modules`。

Pages Router 演示见 [`../next/`](../next/)（端口 3003）。
