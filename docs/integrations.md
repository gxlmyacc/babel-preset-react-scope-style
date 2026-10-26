# Build tool integrations

See also:

- [Usage](./usage.md) · [Configuration](./configuration.md) · [Support matrix](./support-matrix.md)
- [中文文档](./integrations.zh-CN.md)

The same import syntax (`?scoped`, `?global`) and Babel options apply across toolchains. Only the **CSS pipeline** differs.

| Tool | Babel / JSX | CSS scoping |
|------|-------------|-------------|
| **Webpack** | preset in `babel.config.js` | `babel-preset-react-scope-style/webpack` plugin auto-inject, or manual `.../loader` |
| **Vite** | `babel-preset-react-scope-style/vite` plugin | handled by the Vite plugin (PostCSS internally) |
| **esbuild** | `babel-preset-react-scope-style/esbuild` plugin | handled by the esbuild plugin (PostCSS internally; optional `sass` / `less`) |
| **Next.js** | Babel (`next/babel` + this preset) or SWC plugin (`swcPlugin: true`); **not Turbopack yet** | `babel-preset-react-scope-style/next` injects the webpack loader |
| **Rspack** | preset in `babel.config.js` or plugin `babel` option | `ReactScopeStyleRspackPlugin` (same inject logic as Webpack) |
| **Custom** | preset or `@babel/core` API | `babel-preset-react-scope-style/postcss` with explicit options |

Full support matrix (App Router, Turbopack, CSS Modules limits): [support-matrix.md](./support-matrix.md).

### Package entry points

| Import path | Purpose |
|-------------|---------|
| `babel-preset-react-scope-style` | Babel preset (JSX + import rewriting) |
| `babel-preset-react-scope-style/loader` | Webpack / Rspack / Next loader |
| `babel-preset-react-scope-style/webpack` | Webpack plugin (auto-injects loader + optional Babel preset) |
| `babel-preset-react-scope-style/postcss` | PostCSS 8 plugin |
| `babel-preset-react-scope-style/vite` | Vite plugin |
| `babel-preset-react-scope-style/esbuild` | esbuild plugin |
| `babel-preset-react-scope-style/esbuild/cli` | esbuild CLI (`react-scope-style` bin) |
| `babel-preset-react-scope-style/next` | Next.js `withReactScopeStyle` config wrapper |
| `babel-preset-react-scope-style/rspack` | Rspack plugin (same inject logic as Webpack) |

### Vite

Install peers: `@babel/core`, and `classnames` or `clsx` if you use dynamic `className` expressions.

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactScopeStyle from 'babel-preset-react-scope-style/vite';

export default defineConfig({
  plugins: [
    // Run before @vitejs/plugin-react so JSX/TSX is scoped first
    reactScopeStyle({
      scopePrefix: 'v-',
      classNameLibrary: 'auto', // prefer classnames, then clsx if imported; default inject classnames
    }),
    react(),
  ],
});
```

**How it works**

1. The Vite plugin runs Babel on `.js` / `.jsx` / `.ts` / `.tsx` with this preset. For `.ts` / `.tsx` it injects `@babel/preset-typescript` by default (`typescript: true`). Set `typescript: false` to skip those files (Vite’s own TS pipeline handles them). Uses `babelrc: false`, so it does **not** stack with a project-level `@babel/preset-typescript`. JS and TS can coexist in one project.
2. Style imports like `import './Button.scss?scoped'` are rewritten to include `scope-style&scoped=true&id=v-xxx`.
3. When Vite processes CSS/SCSS/Less/Sass modules whose URL contains that query, the plugin runs the PostCSS scope transform.

**Usage in components** (unchanged):

```javascript
import './Button.scss?scoped';
import './theme.scss?global';
```

SCSS/Less still use Vite’s normal preprocessor settings (`css.preprocessorOptions`); no extra PostCSS config is required for scoping.

### esbuild

Install peers: `@babel/core`, `esbuild`, and `classnames` or `clsx` when using dynamic `className` expressions. For `.scss` / `.sass`, install `sass`; for `.less`, install `less`.

#### Pure CLI (recommended, aligned with build-react-esm-project)

After install, use the `react-scope-style` bin (or `npx react-scope-style`):

```bash
# App bundle (SPA)
react-scope-style build \
  --bundle \
  --entry src/main.jsx \
  --out ./dist \
  --scope-style \
  --scope-namespace my-app \
  --sourcemap

# Dev watch + serve
react-scope-style start \
  --config esbuild-scope.config.js \
  --scope-style \
  --serve-port 3002

# Library mode (default: multi-file ESM, like react-esm-project)
react-scope-style build \
  --src ./src \
  --out ./esm \
  --scope-style \
  --scope-style-version \
  --typescript \
  --sourcemap
```

Optional config file `esbuild-scope.config.js`:

```javascript
module.exports = {
  entry: { main: 'src/main.jsx' },
  out: './dist',
  bundle: true,
  scopeStyle: true,
  scopeNamespace: 'my-app',
  scopeStyleOptions: { scopePrefix: 'v-', classNameLibrary: 'auto' },
  jsx: 'automatic',
  sourcemap: true,
  servedir: 'public',
  servePort: 3002,
};
```

| CLI flag | Purpose |
|----------|---------|
| `--root` | Project root |
| `--config` | Config file path |
| `--entry` | Entry (bundle mode) |
| `--src` / `--out` | Source / output dirs |
| `--bundle` | SPA bundle mode (default: lib / no-bundle) |
| `--no-config` | Skip `esbuild-scope.config.js` auto-discovery |
| `--scope-style` | Enable JSX + CSS scoping (default: on) |
| `--no-scope-style` | Disable JSX + CSS scoping |
| `--scope-style-version` | Include package version in scope id |
| `--scope-namespace` | Namespace prefix |
| `--sourcemap` | Emit sourcemaps |
| `--typescript` | Include ts/tsx in lib glob |
| `--serve-port` / `--servedir` | Static server for `start` |

Exports: `babel-preset-react-scope-style/esbuild/cli`, `babel-preset-react-scope-style/esbuild/run`

#### Programmatic plugin

```javascript
// esbuild.config.mjs
import * as esbuild from 'esbuild';
import reactScopeStyle from 'babel-preset-react-scope-style/esbuild';

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  jsx: 'automatic',
  plugins: [
    reactScopeStyle({
      scopePrefix: 'v-',
      classNameLibrary: 'auto',
    }),
  ],
});
```

**How it works (bundle mode)**

1. The esbuild plugin runs Babel on `.js` / `.jsx` / `.ts` / `.tsx` with this preset; `.ts` / `.tsx` get `@babel/preset-typescript` when plugin option `typescript` is not `false` (default `true`). That flag is separate from CLI lib-mode `--typescript` (glob). Mixed JS/TS entries are fine.
2. Style imports like `import './Button.scss?scoped'` are rewritten to include `scope-style&scoped=true&id=v-xxx`.
3. When esbuild loads CSS/SCSS/Less/Sass whose URL contains that query, the plugin compiles preprocessors (if needed) and runs the PostCSS scope transform.

**Library mode (default)**: pre-scans JS to fill a `StyleScoped` bridge (same idea as Gulp `build-react-esm-project`), rewrites imports to plain `.css`, and scopes styles via that map. Use `--bundle` for SPA bundle mode.

**Path aliases**: the `alias` field is esbuild’s **native alias** (same as in `esbuild-scope.config.js`). In **bundle** mode it is passed to esbuild directly; in **lib** mode it is applied via an `onResolve` plugin plus PostCSS for styles. When [`babel-plugin-alias-config`](https://github.com/gxlmyacc/babel-plugin-alias-config) and [`postcss-alias-config`](https://github.com/gxlmyacc/postcss-alias-config) are also installed in the target project, they **supplement** native `alias` by resolving `alias.config.js`, `jsconfig.json`, etc. (`aliasConfig: true`, `findConfig: true` by default). Set `aliasConfig: false` to disable only those packages.

Component imports are unchanged: `import './Button.scss?scoped'`, `import './theme.scss?global'`.

esbuild emits bundled CSS as a separate file (e.g. `main.css`); reference it from your HTML or ensure your entry graph imports it.

Runnable demos: [examples/esbuild-bundle](../examples/esbuild-bundle/) (SPA, port 3002), [examples/esbuild-lib](../examples/esbuild-lib/) (library mode).

### Rspack

Rspack supports Webpack-style loaders. **Recommended:** use `ReactScopeStyleRspackPlugin` (same injection logic as the Webpack plugin):

```javascript
// rspack.config.js
const ReactScopeStyleRspackPlugin = require('babel-preset-react-scope-style/rspack');

module.exports = {
  module: {
    rules: [
      { test: /\.(js|jsx)$/, use: 'babel-loader' },
      { test: /\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new ReactScopeStyleRspackPlugin({
      sourceMap: true,
      babel: { scopePrefix: 'v-', classNameLibrary: 'auto' },
    }),
  ],
};
```

Or call `withReactScopeStyle(config, options)`. Manual loader order remains: `style-loader` → `css-loader` → **`babel-preset-react-scope-style/loader`** → `sass-loader` (if any).

`webpack` is an optional peer dependency; install it only when using the loader (Webpack or Rspack).

### Next.js

Peers: `next`, `@babel/core`; add `classnames` or `clsx` for dynamic `className`, and `sass` for SCSS.

**Requirements / limits**

- **Babel path (default):** a `babel.config.js` with `next/babel` **and** this preset so Next uses Babel.
- **SWC-only path (Phase B1):** omit Babel config and use `withReactScopeStyle(nextConfig, { swcPlugin: true })` — see [phase-b-swc.md](./phase-b-swc.md) / [examples/next-swc-poc](../examples/next-swc-poc/).
- **Pages Router and App Router** are supported with Babel + webpack, or SWC plugin + webpack.
- **Turbopack** (`next dev --turbo`) is **not** supported on Next 14.2 yet (B2 spike: no Babel under Turbopack; SWC WASM fails). PostCSS from-query helpers exist for a future matrix — [phase-b-swc.md](./phase-b-swc.md).
- See [support-matrix.md](./support-matrix.md).

Configure Babel, then wrap `next.config.js` with `withReactScopeStyle`:

```javascript
// babel.config.js
module.exports = {
  presets: [
    'next/babel',
    ['babel-preset-react-scope-style', { scopePrefix: 'v-', classNameLibrary: 'auto' }],
  ],
};
```

```javascript
// next.config.js
const withReactScopeStyle = require('babel-preset-react-scope-style/next');

module.exports = withReactScopeStyle(
  {
    // your Next config
  },
  {
    loaderOptions: { sourceMap: true },
  }
);
```

The helper injects `babel-preset-react-scope-style/loader` into Next’s webpack style rules (before preprocessors). Component imports stay the same: `import './Button.scss?scoped'`.

Runnable demos:

- Pages Router: [examples/next](../examples/next/) (port 3003)
- App Router: [examples/next-app](../examples/next-app/) (port 3004)

### Pure PostCSS (standalone)

Use this when you process CSS yourself (custom scripts, Gulp, other bundlers) **without** the Webpack loader or Vite plugin.

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('babel-preset-react-scope-style/postcss')({
      scoped: true,
      global: false,
      id: 'v-your-scope-id', // must match the scope class injected into JSX
    }),
  ],
};
```

**Important**

- With **Webpack / Vite**, the Babel preset rewrites imports and injects scope IDs; the loader/plugin passes `scoped`, `global`, and `id` to PostCSS **automatically** — you do **not** add this plugin to `postcss.config.js`.
- With **standalone PostCSS**, by default, set `scoped`, `global`, and `id` yourself and keep `id` in sync with the Babel-generated scope class on your components. For styles without scope identifiers, set `injectScope: false` and omit `id`.

Plugin options (reference):

```javascript
{
  scoped: true,       // enable scoping
  global: false,      // true → [class*=id] attribute selectors
  id: 'v-abc123',     // scope id (same as injected JSX class)
  // globalSelector: '', // replacement for :global
  // injectScope: true,  // false processes markers without injecting an id
  // selectorPrefix: '', // optional, e.g. '.history-snapshot'
  // selectorPrefixExclude: ['html', 'head', 'body', ':root'], // omit the prefix
  // transformSelector(selector, { filename }) { return selector; },
}
```

See also: [Usage](./usage.md), [Configuration](./configuration.md).


**Plugin order:** `babel-preset-react-scope-style/postcss` must run on the **nested Rule tree** (PostCSS 8+ native nesting). If you add `postcss-nesting` to emit flat selectors for legacy browsers, list it **after** the scope plugin so scoping uses the same leaf-gate rules, then nesting only flattens output.

### Generate styles without scope identifiers

For historical DOM snapshots, run PostCSS independently without running Babel or rebuilding JavaScript. Compile SCSS with Sass first:

```javascript
const sass = require('sass');
const postcss = require('postcss');
const scopeStyle = require('babel-preset-react-scope-style/postcss');

const filename = 'src/TableSummaryCell.scss';
const compiled = sass.compile(filename);
const result = await postcss([
  scopeStyle({
    scoped: true,
    injectScope: false,
    selectorPrefix: '.history-snapshot',
    // selectorPrefixExclude: ['html', 'head', 'body', ':root'], // defaults; customizable
    transformSelector(selector, { filename: sourceFile }) {
      return sourceFile.endsWith('TableSummaryCell.scss')
        ? `.table-summary ${selector}`
        : selector;
    },
  }),
]).process(compiled.css, { from: filename, map: false });
// Write result.css to the desired CSS or SCSS entry; the content is plain CSS.
```

- `injectScope` defaults to `true`. With `false`, `id` is optional: `:scope` / `:global` are still processed, but no scope class or `[class*=id]` is injected. This is a PostCSS-only option and does not change Babel/JSX behavior.
- Attached `.table:scope` becomes `.table`; standalone `:scope` retains `*`, nested `&:scope` retains `&`, and bare/spaced nesting markers retain their descendant `*` placeholder. Functional `:global(...)` remains unsupported.
- Optional `selectorPrefix` adds a container prefix after the custom callback to selectors of outermost rules, including converted global rules, except branches matching `selectorPrefixExclude`. Multiple comma-separated containers are supported. Native nested rules inherit the outer prefix without repeating it. An empty string disables prefixing.
- `selectorPrefixExclude` defaults to `['html', 'head', 'body', ':root']`. A selector containing a matching top-level simple selector keeps its original form, e.g. `body, .table` becomes `body, .history-snapshot .table`. Excluded document roots retain global matching; they are not mapped to the container. Only prefixing is skipped: scope-id processing and the custom callback still apply.
- A custom exclusion array replaces the defaults; `[]` prefixes everything. Entries are simple selectors (tag, class, ID, attribute, or pseudo-class), e.g. `['html', 'head', 'body', ':root', '.external']`, not compound selectors. Matching does not descend into functions or attributes: `.body`, `[data-name="body"]` and `:not(body)` are not mistaken for `body`.
- `:global` itself does not bypass prefixing; exclusions decide whether it is skipped. Prefixing does not rename keyframes or rewrite selectorless at-rules such as `@font-face`.
- Optional `transformSelector` runs after marker conversion, once per comma-separated selector. Commas inside functions or attributes are preserved. Return a non-empty string; callback errors propagate to the caller.
- Context `filename` is the current rule's source path, or `''` when unavailable. Rules merged as PostCSS ASTs retain their own sources. Alternatively, process each source file before concatenating CSS text.
- The callback includes global rules and rules inside `@media` / `@supports`, but skips keyframe selectors. Native nesting passes the current relative selector (such as `&`); customize it as appropriate for the application.
- The callback also works with normal injection, receiving scoped selectors, and runs separately for each scope context. These options are preserved when scope is inferred from the `from` query.
- File collection, style ordering, merging and deduplication remain the caller's responsibility; regular scoped component builds can remain unchanged.
