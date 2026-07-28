# swc/

Compiled SWC WASM for [babel-preset-react-scope-style](../README.md) (Phase B1).

- Source: [`crates/swc-plugin-react-scope-style/`](../crates/swc-plugin-react-scope-style/)
- Wire via `withReactScopeStyle(nextConfig, { swcPlugin: true })`
- `.wasm` is gitignored; build from repo root:

```bash
npm run build:swc-plugin
```

Docs: [docs/phase-b-swc.md](../docs/phase-b-swc.md).
