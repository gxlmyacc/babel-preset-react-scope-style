# Next.js example (Pages Router)

## [中文说明](./README_CN.md)

Bundler-only package. App source: [`../shared/`](../shared/).

## Setup

```bash
cd examples/next
npm install
```

## Scripts

- `npm run dev` — http://localhost:3003
- `npm run build` — production build
- `npm run start` — serve production build

## Config

- `next.config.js` — `withReactScopeStyle()` from `babel-preset-react-scope-style/next` injects the webpack scope loader
- `babel.config.js` — `next/babel` + preset (options from `../shared/scope-style-options.cjs`)
- Pages Router demo on port 3003

App Router demo: [`../next-app/`](../next-app/) (port 3004).
