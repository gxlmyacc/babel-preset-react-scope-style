# Vite example

Bundler-only package. App source: [`../shared/`](../shared/).

## Setup

```bash
# repository root
npm run build
cd examples/vite
npm install
```

## Scripts

- `npm run dev` — http://localhost:5173
- `npm run build` — `dist/` (under this folder)
- `npm run preview` — preview production build

## Config

- `vite.config.js` — `root: ../shared`, `reactScopeStyle()` from `../shared/scope-style-options.cjs`
- No `babel.config.js` — JSX scoping runs in the Vite plugin
