# Webpack 示例

## [English](./README.md)

仅 bundler 配置包。应用源码：[`../shared/`](../shared/)。

## 安装

```bash
cd examples/webpack
npm install
```

## 脚本

- `npm run dev` — http://localhost:3000
- `npm run build` — `dist/`

## 配置

- `webpack.config.js` — `ReactScopeStyleWebpackPlugin` 自动注入 scope loader + Babel preset
- `babel.config.js` — 仅 `@babel/preset-env` / `@babel/preset-react`（scope preset 由插件注入）
- 插件注入后的 loader 顺序：`style-loader` → `css-loader` → scope loader → `sass-loader`
