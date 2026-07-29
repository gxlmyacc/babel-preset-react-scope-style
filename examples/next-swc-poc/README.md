# next-swc-poc

Phase **B1** demo (supported): Next.js App Router **without** `babel.config.js`, Webpack CSS.

- Loads SWC WASM via `withReactScopeStyle({ swcPlugin: true })`
- Rewrites `?scoped` / `?global` and injects scope `className`
- Webpack loader applies PostCSS scope

## Setup

```bash
npm run build:swc-plugin   # from repo root (Rust required)
cd examples/next-swc-poc
npm install
npm run build
npm run dev
```

Dev server: [http://localhost:3005](http://localhost:3005).

## Turbopack (Phase B2 spike — Next 14.2)

`npm run dev:turbo` is **not supported yet** on Next 14.2 with this package:

| Combo | Result on 14.2.35 |
|-------|-------------------|
| Turbopack + `experimental.swcPlugins` (our WASM) | `Expected to find module` |
| Turbopack + `babel.config.js` | Next exits: Babel not supported with Turbopack |

Infrastructure landed for when the host supports it:

- PostCSS **from-query** (`result.opts.from` carries `?scope-style&id=…`)
- `postcss.config.js` registers the plugin only when `process.env.TURBOPACK` is set (avoids double-scope with the Webpack loader)
- `withReactScopeStyle({ turbopack: true })` declares the turbo stub

See [docs/phase-b-swc.md](../../docs/phase-b-swc.md). Next 15+/16 matrix (default Turbopack + SWC ABI) is a follow-up.

## Notes

- Omit `babel.config.js` for the Webpack + SWC path.
- Rebuild WASM after changing `crates/swc-plugin-react-scope-style/`.
