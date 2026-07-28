# next-swc-poc

Phase **B1** 示例：Next.js App Router，**无** `babel.config.js`。

- 通过 `withReactScopeStyle({ swcPlugin: true })` 加载 SWC WASM
- 重写 `?scoped` / `?global` import，并注入 scope `className`
- CSS 仍走 Webpack loader + PostCSS scope（Turbopack 为 B2）

## 准备

仓库根目录（重新编译 WASM 需要 Rust）：

```bash
# Windows（路径含非 ASCII）：按 docs/phase-b-swc.md 使用 GNU toolchain
npm run build:swc-plugin
cd examples/next-swc-poc
npm install
npm run build
npm run dev
```

开发服务：[http://localhost:3005](http://localhost:3005)。

## 说明

- 不要放 `babel.config.js`，否则 Next 会走 Babel 而非纯 SWC。
- 修改 `crates/swc-plugin-react-scope-style/` 后需重新 `npm run build:swc-plugin`。
- 详见 [docs/phase-b-swc.md](../../docs/phase-b-swc.md)。
