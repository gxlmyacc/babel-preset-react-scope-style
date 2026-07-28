# Next.js example

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

- `next.config.js` — `withReactScopeStyle()` from `babel-preset-react-scope-style/next`，注入 webpack scope loader
- `babel.config.js` — `next/babel` + preset（options from `../shared/scope-style-options.cjs`）
- Pages Router demo: [examples/next](../examples/next/) (port 3003).
