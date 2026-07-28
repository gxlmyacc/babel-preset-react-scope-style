# Rspack 示例

## [English](./README.md)

仅 bundler 配置包。应用源码：[`../shared/`](../shared/)。

## 安装

```bash
cd examples/rspack
npm install
```

## 脚本

- `npm run dev` — http://localhost:3001
- `npm run build` — `dist/`

## 配置

- `rspack.config.js` — `context: ../shared`，`resolveLoader` 指向本目录 `node_modules`（与 Webpack 示例相同的 loader 链）
- `../shared/package.json` — 声明样式文件 `sideEffects`，避免生产构建摇掉 `import '*.scss'`
- `babel.config.js` — preset + options 来自 `../shared/scope-style-options.cjs`
- Loader 顺序：`style-loader` → `css-loader` → scope loader → `sass-loader`

可选：`require('babel-preset-react-scope-style/rspack').withReactScopeStyle(config)` 会追加 loader 规则；本示例与 [Webpack](../webpack/) 一样显式内联整条链。
