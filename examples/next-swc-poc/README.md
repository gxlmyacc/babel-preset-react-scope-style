# next-swc-poc

Phase **B1** demo: Next.js App Router **without** `babel.config.js`.

- Loads the SWC WASM via `withReactScopeStyle({ swcPlugin: true })`
- Rewrites `?scoped` / `?global` imports and injects scope `className`
- Webpack CSS loader still applies PostCSS scope (not Turbopack — that is B2)

## Setup

From the repo root (requires Rust for a fresh WASM build):

```bash
# Windows (non-ASCII path): use GNU toolchain as documented in docs/phase-b-swc.md
npm run build:swc-plugin
cd examples/next-swc-poc
npm install
npm run build
npm run dev
```

Dev server: [http://localhost:3005](http://localhost:3005).

## Notes

- Omit `babel.config.js` so Next uses SWC for JS.
- Rebuild WASM after changing `crates/swc-plugin-react-scope-style/`.
- See [docs/phase-b-swc.md](../../docs/phase-b-swc.md).
