# Webpack example

## [中文说明](./README_CN.md)

Bundler-only package. App source: [`../shared/`](../shared/).

## Setup

```bash
cd examples/webpack
npm install
```

## Scripts

- `npm run dev` — http://localhost:3000
- `npm run build` — `dist/`

## Config

- `webpack.config.js` — `ReactScopeStyleWebpackPlugin` auto-injects the scope loader and Babel preset
- `babel.config.js` — only `@babel/preset-env` / `@babel/preset-react` (the scope preset is injected by the plugin)
- Loader order after plugin injection: `style-loader` → `css-loader` → scope loader → `sass-loader`
