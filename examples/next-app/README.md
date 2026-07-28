# Next.js App Router example

## [中文说明](./README_CN.md)

Bundler-only package. App source: [`../shared/`](../shared/).

This demo uses the **App Router** (`app/`) with the same Babel + webpack requirements as the Pages example.

## Requirements

- `babel.config.js` with `next/babel` + this preset (Next switches from SWC-only to Babel)
- `withReactScopeStyle` in `next.config.js` (injects the scope webpack loader)
- **Do not** use `next dev --turbo` (Turbopack is not supported)

## Setup

```bash
cd examples/next-app
npm install
```

## Scripts

- `npm run dev` — http://localhost:3004
- `npm run build` — production build
- `npm run start` — serve production build

## Config

- `next.config.js` — `withReactScopeStyle()` from `babel-preset-react-scope-style/next`
- `babel.config.js` — `next/babel` + preset (options from `../shared/scope-style-options.cjs`)
- `app/page.js` — Client Component wrapping `shared/src/App`

> App Router tip: do **not** alias `react` / `react-dom` to absolute file paths in webpack — that breaks the `react-server` export condition (`cache is not a function`). Prefer `resolve.modules` instead.

Pages Router demo: [`../next/`](../next/) (port 3003).
