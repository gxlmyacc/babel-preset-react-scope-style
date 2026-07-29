# Phase B: SWC / Turbopack (planning notes)

Status: **B1 delivered**; **B2 infrastructure landed, Next 14.2 Turbopack end-to-end blocked**.

- **B1**: SWC `inject-scope` + `transform-class`; `withReactScopeStyle({ swcPlugin: true })` + Webpack CSS loader ([`examples/next-swc-poc`](../examples/next-swc-poc/)).
- **B2**: PostCSS **from-query** + `turbopack: true` stub + TURBOPACK-gated `postcss.config.js`. Full Turbopack app path on Next **14.2** is **not runnable** yet (see spike below). StyleScoped fallback and Next 15/16 matrix are follow-ups.

## Why Phase B

Today Next.js integration requires:

1. **Babel** (`babel.config.js` with this preset) for JSX + `?scoped` / `?global` import rewrite — **or** SWC WASM (B1, Webpack)
2. **Webpack loader** injection via `withReactScopeStyle` for CSS scoping — Turbopack cannot use that loader

Goals:

| Stage | Goal |
|-------|------|
| **B1** | Pure SWC for JS (no `babel.config.js`); keep webpack CSS loader + **import query** |
| **B2** | Turbopack: prefer the same **query** channel via PostCSS `from`; StyleScoped only if query fails |

## Babel truth source

Golden fixtures live under [`test/fixtures/phase-b/`](../test/fixtures/phase-b/). They encode:

- `?scoped` / `?global` rewrite + JSX class injection
- `classnames` / `clsx` / `classNameLibrary`
- Two importers → two `scopeId`s + multi-copy CSS
- `scopeFn` marked **deferred** for SWC (keep Babel / esbuild libMode)

Runner: `node --test test/phase-b-fixtures.test.js` (also part of `npm test`).

## Next.js + `experimental.swcPlugins`

```js
const withReactScopeStyle = require('babel-preset-react-scope-style/next');

module.exports = withReactScopeStyle(nextConfig, {
  swcPlugin: true,
  swcPluginOptions: { scopePrefix: 'v-', pkg: { name: 'my-app' } },
  // Turbopack stub + docs; CSS still needs PostCSS from-query when TURBOPACK=1
  turbopack: true,
});
```

Notes:

- Second tuple element must be an object (use `{}` if no options).
- Presence of `babel.config.js` still forces Babel for JS; SWC-only demos must **omit** Babel config.
- Plugin WASM must be built with a `swc_core` ABI compatible with the **Next-embedded** SWC. Use [plugins.swc.rs](https://plugins.swc.rs/) for the matrix.

## Target matrix

| Runtime | Example | Notes |
|---------|---------|-------|
| Next.js **14.2.x** (webpack) | `examples/next-swc-poc` | **Supported** (B1) |
| Next.js **14.2.x** (`--turbo`) | same | **Blocked** — see B2 spike |
| Next.js 15+ / 16 (default Turbopack) | TBD | Needs SWC ABI re-pin + re-spike |

## B2 spike results (Next 14.2.35)

Constraint: Turbopack **does not** allow custom loaders that transform stylesheets — cannot reuse [`loader/index.js`](../loader/index.js). Planned path: SWC/Babel rewrite query → built-in Sass/CSS → PostCSS reads `id` from `result.opts.from`.

| Attempt | Outcome |
|---------|---------|
| `next dev --turbo` + `experimental.swcPlugins` (our WASM) | Runtime error: `Expected to find module` (SWC plugin load under Turbopack) |
| `next dev --turbo` + `babel.config.js` (preset rewrite) | Next exits: **Babel is not yet supported** with Turbopack on 14.2 |
| Webpack `next build` / `next dev` | Still green (B1 unchanged). Note: a leftover `TURBOPACK=1` in the shell makes Next 14.2 treat build as turbo and fail — unset it before webpack builds. |

Therefore: **do not claim Turbopack support for Next 14.2**. Infrastructure for when the host can run a JS rewriter under Turbopack:

1. PostCSS plugin resolves scope from `from` query when no explicit `{ id }` ([`postcss/plugin.js`](../postcss/plugin.js))
2. Example `postcss.config.js` registers the plugin **only if** `process.env.TURBOPACK` (avoids double-scope with Webpack loader)
3. `withReactScopeStyle({ turbopack: true })` marks intent / enables docs helpers — it does **not** write `experimental.turbo` (on Next 14.2 that makes `next build` fail with “doesn't support turbopack yet”)
4. Helper: `createTurbopackPostcssPlugins()` / `babel-preset-react-scope-style/postcss/turbopack`

### Follow-ups

- **StyleScoped / content-marker** fallback if query is stripped once a Turbopack host can rewrite JS
- **Next 15/16** matrix: default Turbopack + compatible `swc_core` WASM build
- Re-spike `from` query preservation under PostCSS when SWC plugins work with Turbopack

## Query channel (design)

```text
JS:  import './x.scss?scoped'
  → SWC/Babel: './x.scss?scope-style&scoped=true&id=v-…'
CSS:
  Webpack → scope loader (resourceQuery) → PostCSS with explicit options
  Turbopack → built-in pipeline → PostCSS with from-query (no CSS loader)
```

`selectorAlreadyScoped` still guards accidental double application of the same id.

## Scaffold

- Rust crate: [`crates/swc-plugin-react-scope-style/`](../crates/swc-plugin-react-scope-style/)
- WASM output: [`swc/`](../swc/) (`swc_plugin_react_scope_style.wasm`, gitignored)
- Build: `npm run build:swc-plugin`
- Next helper: `withReactScopeStyle(nextConfig, { swcPlugin, turbopack, swcPluginOptions })`
- Demo: [`examples/next-swc-poc/`](../examples/next-swc-poc/)

**Windows build tips** — see prior B0 notes (ASCII staging, GNU toolchain, `serde = "=1.0.203"`, `--allow-undefined`).

## Non-goals (near term)

- Implementing `scopeFn` in SWC (arbitrary JS callbacks cannot cross WASM)
- Replacing Vite/esbuild Babel usage with SWC
- Claiming Next 14.2 Turbopack app support before host fixes
- Rewriting PostCSS scope logic in Rust
