# Rspack example

## [中文说明](./README_CN.md)

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

- `rspack.config.js` — `context: ../shared`, `resolveLoader` points at this folder’s `node_modules` (same loader chain as the Webpack example)
- `../shared/package.json` — declares style `sideEffects` so production builds keep `import '*.scss'`
- `babel.config.js` — preset + options from `../shared/scope-style-options.cjs`
- Loader order: `style-loader` → `css-loader` → scope loader → `sass-loader`

Optional: `require('babel-preset-react-scope-style/rspack').withReactScopeStyle(config)` appends a loader rule; this example inlines the chain explicitly (same as [Webpack](../webpack/)).
