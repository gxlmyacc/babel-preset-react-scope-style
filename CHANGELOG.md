# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed

- Removed unused root `npm run build` (`babel src -d esm`); package runtime is `src/` only.
- Package `description` clarified as Babel preset + PostCSS toolkit.
- Examples setup no longer requires a root compile step.
- README slimmed to quick start + docs index; long sections moved under `docs/` (EN + zh-CN).
- Fixed esbuild PostCSS alias plugin (`createPostcssAliasPluginsFromMap`): object plugins must not set `postcss: true` (that marks a creator function).

### Added

- CI `examples-build` job (webpack / vite / next-app / esbuild-bundle / esbuild-lib).
- Coverage gate includes `esbuild/**` (excluding CLI `esbuild/cli.js` and `esbuild/run-build.js`); expanded unit tests for branch coverage.
- Phase B0: Babel golden fixtures under `test/fixtures/phase-b/`, [docs/phase-b-swc.md](docs/phase-b-swc.md), SWC noop plugin crate + `examples/next-swc-poc`.
- Phase B1: SWC plugin implements `inject-scope` + `transform-class` parity; `withReactScopeStyle({ swcPlugin: true })` for Next SWC-only (webpack CSS still required).
- SWC WASM output flattened to `swc/` (removed unused `packages/` monorepo layer).
- Phase B2: PostCSS from-query (scope id from `result.opts.from`); `withReactScopeStyle({ turbopack: true })`; TURBOPACK-gated PostCSS in `next-swc-poc`. Next 14.2 Turbopack e2e blocked (no Babel; SWC WASM fails) — documented in [docs/phase-b-swc.md](docs/phase-b-swc.md).

## [0.1.0-alpha.4] - 2026-07-28

### Changed

- Package `main` / `exports["."]` now point to `src/index.js` so Babel, PostCSS, Vite, esbuild, and Webpack/Rspack share one options singleton (no split `src` vs `esm` runtime).
- Rspack API aligned with Webpack: `ReactScopeStyleRspackPlugin` + `withReactScopeStyle` reuse the same loader/Babel injection helpers.
- Subpath `exports` include `types` conditions; optional peers added for `vite`, `@rspack/core`, and `stylelint`.
- Coverage gate now includes `webpack`, `next`, `rspack`, and `stylelint` (in addition to existing core paths).
- Removed `prepare` → `esm` publish requirement; `yarn.lock` dropped in favor of `package-lock.json`.
- `engines.node` set to `>=14.17`. Runtime deps for Node 14.17+: `glob@^10.3.14`, `commander@^9`; added `lib/glob-sync` adapter.

### Added

- GitHub Actions CI (lint, test on Node 18/20/22; coverage on 20/22; Node 14.17 runtime smoke; stylelint job).
- [docs/support-matrix.md](docs/support-matrix.md) — toolchain support matrix (Next/SWC/Turbopack limits).
- Extra unit tests for inject helpers, `run-postcss-plugins`, and Rspack plugin parity.
- Next.js **App Router** example ([examples/next-app](examples/next-app/)) with Babel + `withReactScopeStyle`; docs mark App Router as Supported (Babel required).

### Docs

- README / integrations: Rspack plugin usage; Next.js Babel / App Router / Turbopack caveats.
- Document Node >=14.17 runtime vs Node 18+ test suite requirements.

## [0.1.0-alpha.3] - 2026-05

- esbuild integration and CLI (`react-scope-style`).
- Examples matrix (webpack / rspack / vite / esbuild / next).
- Stylelint plugin rules; nesting selector support; expanded tests.
