# Webpack example

Bundler-only package. App source: [`../shared/`](../shared/).

## Setup

```bash
# repository root
npm run build
cd examples/webpack
npm install
```

## Scripts

- `npm run dev` — http://localhost:3000
- `npm run build` — `dist/`

## Config

- `webpack.config.js` — `ReactScopeStyleWebpackPlugin` 自动注入 scope loader + Babel preset
- `babel.config.js` — 仅 `@babel/preset-env` / `@babel/preset-react`（scope preset 由插件注入）
- 插件注入后的 loader 顺序：`style-loader` → `css-loader` → scope loader → `sass-loader`
