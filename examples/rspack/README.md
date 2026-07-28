# Rspack example

Bundler-only package. App source: [`../shared/`](../shared/).

## Setup

```bash
cd examples/rspack
npm install
```

## Scripts

- `npm run dev` — http://localhost:3001
- `npm run build` — `dist/`

## Config

- `rspack.config.js` — `context: ../shared`，`resolveLoader` 指向本目录 `node_modules`（与 Webpack 示例相同的 loader 链）
- `../shared/package.json` — 声明样式文件 `sideEffects`，避免生产构建摇掉 `import '*.scss'`
- `babel.config.js` — preset + options from `../shared/scope-style-options.cjs`
- Loader order: `style-loader` → `css-loader` → scope loader → `sass-loader`

Optional: `require('babel-preset-react-scope-style/rspack').withReactScopeStyle(config)` appends a loader rule; this example inlines the chain explicitly (same as [Webpack](../webpack/)).
