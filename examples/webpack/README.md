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

- `webpack.config.js` — `context: ../shared`，`resolveLoader` 指向本目录 `node_modules`
- `../shared/package.json` — 声明样式文件 `sideEffects`，避免生产构建摇掉 `import '*.scss'`
- `babel.config.js` — preset + options from `../shared/scope-style-options.cjs`
- Loader order: `style-loader` → `css-loader` → scope loader → `sass-loader`
