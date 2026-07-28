# Phase B golden fixtures

Babel preset outputs in this directory are the **truth source** for the future SWC plugin (`swc-plugin-react-scope-style`).

| Kind | Files | Purpose |
|------|-------|---------|
| Default | `*.json` with `input` / `expected` | Single-file JS transform parity (`{scopeId}` placeholder allowed) |
| `multi-importer` | `multi-importer-shared-css.json` | Two JS files → distinct ids + PostCSS multi-copy CSS |
| `unsupported` | `scope-fn-unsupported-note.json` | Features deferred past SWC B1 (e.g. `scopeFn`) |

Runner: [`../phase-b-fixtures.test.js`](../phase-b-fixtures.test.js).

See [docs/phase-b-swc.md](../../docs/phase-b-swc.md).
