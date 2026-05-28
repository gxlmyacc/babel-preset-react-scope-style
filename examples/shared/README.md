# Shared demo app

React demo source used by both [webpack](../webpack/) and [vite](../vite/) examples.

- `src/` — application code (demos, components, styles)
- `scope-style-options.cjs` — shared `babel-preset-react-scope-style` options
- `package.json` — `sideEffects` for `*.scss` / `*.css` (Webpack 不会摇掉样式 import)
- `index.html` — Vite entry HTML
- `public/index.html` — Webpack HTML template

Do not run `npm install` here; install dependencies in `webpack/` or `vite/`.
