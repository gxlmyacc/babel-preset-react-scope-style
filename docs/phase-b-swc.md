# Phase B: SWC / Turbopack (planning notes)

Status: **B1 delivered** — SWC plugin implements Babel `inject-scope` + `transform-class` parity (fixtures under `test/fixtures/phase-b/`); `examples/next-swc-poc` uses `withReactScopeStyle({ swcPlugin: true })` without Babel. Turbopack CSS is **B2** (query channel first).

## Why Phase B

Today Next.js integration requires:

1. **Babel** (`babel.config.js` with this preset) for JSX + `?scoped` / `?global` import rewrite
2. **Webpack loader** injection via `withReactScopeStyle` for CSS scoping

Goals:

| Stage | Goal |
|-------|------|
| **B1** | Pure SWC for JS (no `babel.config.js`); keep webpack CSS loader + **import query** |
| **B2** | Turbopack: prefer the same **query** channel; StyleScoped table / content markers only if query fails |

## Babel truth source

Golden fixtures live under [`test/fixtures/phase-b/`](../test/fixtures/phase-b/). They encode:

- `?scoped` / `?global` rewrite + JSX class injection
- `classnames` / `clsx` / `classNameLibrary`
- Two importers → two `scopeId`s + multi-copy CSS
- `scopeFn` marked **deferred** for SWC (keep Babel / esbuild libMode)

Runner: `node --test test/phase-b-fixtures.test.js` (also part of `npm test`).

SWC must match these fixtures (allowing whitespace / quote style diffs if normalized).

## Next.js + `experimental.swcPlugins`

```js
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    swcPlugins: [
      [
        // package name or absolute path to .wasm
        'swc-plugin-react-scope-style',
        { scopePrefix: 'v-', classNameLibrary: 'auto' },
      ],
    ],
  },
};
```

Notes:

- Second tuple element must be an object (use `{}` if no options).
- Presence of `babel.config.js` still forces Babel for JS; SWC-only demos must **omit** Babel config.
- Plugin WASM must be built with a `swc_core` ABI compatible with the **Next-embedded** SWC (not necessarily npm `@swc/core`). Use [plugins.swc.rs](https://plugins.swc.rs/) for the matrix.

## Target matrix (initial)

| Runtime | Example in repo | Notes |
|---------|-----------------|-------|
| Next.js **14.2.x** (webpack) | `examples/next-swc-poc` | B0 PoC / B1 primary |
| Next.js 15+ | TBD | May need a separate WASM build (different `swc_core`) |

Pin plugin releases to documented Next ranges; bump `swc_core` only when intentionally adding a Next major.

## ABI strategy

1. Document `swc_core` version used to compile each published WASM (`Cargo.toml` currently pins `0.90.37` for Next 14.2.x — verify on [plugins.swc.rs](https://plugins.swc.rs/) before B1 release).
2. CI builds WASM and smoke-loads it under the matrix Next version(s) once Rust is available in CI.
3. If Next bumps embedded SWC incompatibly, ship a new plugin minor/major rather than silently breaking.

## Query channel (B2 preference)

Preferred Turbopack CSS path (same as webpack today):

1. SWC rewrites `import './x.scss?scoped'` → `...?scope-style&scoped=true&id=v-…`
2. CSS pipeline reads query and runs existing PostCSS scope plugin
3. Distinct queries ⇒ distinct resources ⇒ multi-importer copies

Fallback only if Turbopack drops/dedupes query: Node-side StyleScoped registry (watch-safe) or content markers.

## Scaffold

- Rust crate: [`crates/swc-plugin-react-scope-style/`](../crates/swc-plugin-react-scope-style/)
- WASM output: [`swc/`](../swc/) (`swc_plugin_react_scope_style.wasm`, gitignored)
- Build: `npm run build:swc-plugin` (requires Rust + `wasm32-wasip1` or `wasm32-wasi`)
- Next helper: `withReactScopeStyle(nextConfig, { swcPlugin: true, swcPluginOptions })`
- Demo: [`examples/next-swc-poc/`](../examples/next-swc-poc/)

If `rustup` cannot reach `static.rust-lang.org`, use a mirror then retry:

```powershell
$env:RUSTUP_DIST_SERVER='https://mirrors.ustc.edu.cn/rust-static'
$env:RUSTUP_UPDATE_ROOT='https://mirrors.ustc.edu.cn/rust-static/rustup'
rustup default stable
rustup target add wasm32-wasip1
npm run build:swc-plugin
cd examples/next-swc-poc
npm install
npm run build
```

Without a compiled `.wasm`, fixtures/docs/crate sources still land; Next PoC build needs `swc/swc_plugin_react_scope_style.wasm`.

**Windows build tips**

- Prefer an ASCII `CARGO_TARGET_DIR` / staging dir (`npm run build:swc-plugin` copies the crate under `%TEMP%` when the repo path contains non-ASCII characters such as `文档`).
- Host linking for build-scripts needs a real MSVC `link.exe` (Visual Studio Build Tools) **or** the `x86_64-pc-windows-gnu` toolchain with MinGW. If Git/Cygwin’s `link.exe` is first on `PATH`, MSVC builds fail with `link: extra operand`.
- Example that worked in B0 on this machine: `RSS_CARGO_TOOLCHAIN=stable-x86_64-pc-windows-gnu npm run build:swc-plugin` after `rustup target add wasm32-wasip1 --toolchain stable-x86_64-pc-windows-gnu`.
- Pin `serde = "=1.0.203"` (see crate `Cargo.toml`) so `swc_common@0.33` can resolve `serde::__private`.
- Crate `.cargo/config.toml` passes `-C link-arg=--allow-undefined` so host imports (`__set_transform_result`, …) resolve at Next runtime.

## Non-goals (near term)

- Implementing `scopeFn` in SWC
- Replacing Vite/esbuild Babel usage with SWC
- Turbopack CSS (B2)
- Rewriting PostCSS scope logic in Rust
