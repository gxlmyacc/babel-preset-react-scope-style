const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const postcss = require('postcss');

/**
 * 收集 esbuild 插件 setup 中的 onLoad / onResolve。
 * @param {import('esbuild').Plugin} plugin - 插件
 * @returns {{ onLoad: Array<object>, onResolve: Array<object> }}
 */
function collectPluginHandlers(plugin) {
  const onLoad = [];
  const onResolve = [];
  plugin.setup({
    initialOptions: { sourcemap: false },
    onLoad(options, handler) {
      onLoad.push({ filter: options.filter, namespace: options.namespace, handler });
    },
    onResolve(options, handler) {
      onResolve.push({ filter: options.filter, handler });
    },
  });
  return { onLoad, onResolve };
}

describe('esbuild coverage — index helpers', () => {
  it('resolveScriptLoader 按扩展名返回 loader', () => {
    const { resolveScriptLoader } = require('../esbuild/index');
    assert.equal(resolveScriptLoader('a.tsx'), 'tsx');
    assert.equal(resolveScriptLoader('a.ts'), 'ts');
    assert.equal(resolveScriptLoader('a.jsx'), 'jsx');
    assert.equal(resolveScriptLoader('a.js'), 'js');
  });

  it('compileStylePreprocessor 对 css 原样返回；缺 sass/less 时抛错', async () => {
    const { compileStylePreprocessor } = require('../esbuild/index');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-pp-'));
    const cssFile = path.join(tmp, 'a.css');
    fs.writeFileSync(cssFile, '.a{color:red}');
    assert.equal(await compileStylePreprocessor(cssFile, '.a{color:red}'), '.a{color:red}');

    await assert.rejects(
      () => compileStylePreprocessor(path.join(tmp, 'x.scss'), ''),
      /需要安装 `sass`/
    );
    await assert.rejects(
      () => compileStylePreprocessor(path.join(tmp, 'x.less'), ''),
      /需要安装 `less`/
    );
  });

  it('libMode 缺少 styleScoped 时抛错', () => {
    const reactScopeStyle = require('../esbuild/index');
    assert.throws(
      () => reactScopeStyle({ libMode: true }),
      /libMode 需要传入 styleScoped/
    );
  });

  it('libMode onResolve/onLoad 处理 plain css 与桥接表', async () => {
    const reactScopeStyle = require('../esbuild/index');
    const {
      createStyleScopedMap,
      createLibScopeFn,
    } = require('../esbuild/lib-scope-bridge');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-libmode-'));
    const cssFile = path.join(tmp, 'Box.css');
    fs.writeFileSync(cssFile, '.box { margin: 0; }');

    const styleScoped = createStyleScopedMap();
    const scopeFn = createLibScopeFn(styleScoped, tmp);
    scopeFn('./Box.css', '?scoped', {
      filename: path.join(tmp, 'Box.jsx'),
      source: './Box.css',
      scopeId: 'v-box',
      global: false,
    });

    const plugin = reactScopeStyle({
      libMode: true,
      styleScoped,
      rootDir: tmp,
      scopePrefix: 'v-',
    });
    const { onLoad, onResolve } = collectPluginHandlers(plugin);
    const resolveHandler = onResolve.find((h) => h.filter.test('Box.css')).handler;
    const styleLoad = onLoad.find((h) => h.namespace === 'react-scope-style').handler;

    const resolved = resolveHandler({
      path: './Box.css',
      resolveDir: tmp,
      query: '',
    });
    assert.ok(resolved);
    assert.equal(resolved.namespace, 'react-scope-style');
    assert.equal(resolved.pluginData.libMode, true);

    const loaded = await styleLoad({
      path: cssFile,
      pluginData: resolved.pluginData,
    });
    assert.match(loaded.contents, /\.box\.v-box/);
    assert.equal(loaded.loader, 'css');

    const emptyMap = createStyleScopedMap();
    const pluginEmpty = reactScopeStyle({
      libMode: true,
      styleScoped: emptyMap,
      rootDir: tmp,
    });
    const { onLoad: onLoadEmpty, onResolve: onResolveEmpty } = collectPluginHandlers(pluginEmpty);
    const resolveEmpty = onResolveEmpty.find((h) => h.filter.test('Box.css')).handler;
    const loadEmpty = onLoadEmpty.find((h) => h.namespace === 'react-scope-style').handler;
    const r2 = resolveEmpty({ path: './Box.css', resolveDir: tmp, query: '' });
    const out2 = await loadEmpty({ path: cssFile, pluginData: r2.pluginData });
    assert.equal(out2.contents.includes('v-box'), false);
    assert.match(out2.contents, /\.box/);
  });

  it('onLoad 跳过 node_modules；无 scope query 的样式 resolve 返回 null', async () => {
    const reactScopeStyle = require('../esbuild/index');
    const plugin = reactScopeStyle({ scopePrefix: 'v-' });
    const { onLoad, onResolve } = collectPluginHandlers(plugin);
    const jsHandler = onLoad.find((h) => !h.namespace).handler;
    const resolveHandler = onResolve.find((h) => h.filter.test('a.css')).handler;

    assert.equal(
      await jsHandler({ path: path.join(process.cwd(), 'node_modules', 'pkg', 'x.js') }),
      null
    );
    assert.equal(
      resolveHandler({ path: './plain.css', resolveDir: '/tmp', query: '' }),
      null
    );
  });
});

describe('esbuild coverage — lib-alias-plugin', () => {
  it('createEsbuildAliasPlugin 命中与未命中', () => {
    const { createEsbuildAliasPlugin } = require('../esbuild/lib-alias-plugin');
    const plugin = createEsbuildAliasPlugin({
      '@': '/proj/src',
      react: '/proj/node_modules/react',
    });
    assert.ok(plugin);
    const handlers = [];
    plugin.setup({
      onResolve(opts, handler) {
        handlers.push(handler);
      },
    });
    assert.deepEqual(
      handlers[0]({ path: '@/foo' }),
      { path: path.resolve('/proj/src/foo') }
    );
    assert.equal(handlers[0]({ path: './local' }), null);
  });

  it('createPostcssAliasPluginsFromMap 改写 @import 与 url()', async () => {
    const {
      createPostcssAliasPluginsFromMap,
      replaceStyleAliasInValue,
    } = require('../esbuild/lib-alias-plugin');
    assert.deepEqual(createPostcssAliasPluginsFromMap({}, '/a.css'), []);
    assert.deepEqual(createPostcssAliasPluginsFromMap({ '@': '/x' }, ''), []);

    const filePath = path.join('/proj/src/styles', 'a.css');
    const plugins = createPostcssAliasPluginsFromMap({ '@assets': '/proj/assets' }, filePath);
    assert.equal(plugins.length, 1);
    const root = postcss.parse(
      '@import "@assets/theme.css";\n.a{background:url(@assets/logo.png)}'
    );
    plugins[0].Once(root);
    const css = root.toString();
    assert.match(css, /theme\.css/);
    assert.match(css, /logo\.png/);

    const replaced = replaceStyleAliasInValue(
      'url(@assets/x.png)',
      '/proj/src',
      { '@assets': '/proj/assets' }
    );
    assert.match(replaced, /assets/);
  });
});

describe('esbuild coverage — lib-scope-bridge', () => {
  it('resolveStyleScopedKey 处理绝对/相对 source 与扩展名', () => {
    const { resolveStyleScopedKey } = require('../esbuild/lib-scope-bridge');
    const jsFile = path.join('/proj/src', 'Btn.jsx');
    const key1 = resolveStyleScopedKey({
      filename: jsFile,
      source: './Btn.scss?scoped',
      global: false,
    }, '/proj');
    assert.match(key1.replace(/\\/g, '/'), /Btn\.css$/);

    const key2 = resolveStyleScopedKey({
      filename: jsFile,
      source: 'theme.less',
      global: true,
    }, '/proj');
    assert.match(key2.replace(/\\/g, '/'), /theme\.css$/);
  });

  it('applyStyleScopedToCss 依次应用 scoped/global', async () => {
    const { applyStyleScopedToCss } = require('../esbuild/lib-scope-bridge');
    const { processScopeStyleCss } = require('../lib/process-scope-css');
    const scopedItem = {
      list: [
        { scopeId: 'v-a', global: false },
        { scopeId: 'v-b', global: true },
      ],
      handled: false,
    };
    const out = await applyStyleScopedToCss('.x{color:red}', scopedItem, processScopeStyleCss);
    assert.match(out, /v-a/);
    assert.equal(scopedItem.handled, true);
  });

  it('resolveStyleSourcePath 回退到 scss', () => {
    const { resolveStyleSourcePath } = require('../esbuild/lib-scope-bridge');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-style-src-'));
    const cssPath = path.join(tmp, 'a.css');
    const scssPath = path.join(tmp, 'a.scss');
    fs.writeFileSync(scssPath, '.a{}');
    assert.equal(resolveStyleSourcePath(scssPath), scssPath);
    assert.equal(resolveStyleSourcePath(cssPath), scssPath);
    assert.equal(resolveStyleSourcePath(path.join(tmp, 'missing.css')), null);
  });
});

describe('esbuild coverage — resolve-config', () => {
  it('ignore 字符串拆分；entry 对象；缺入口抛错', () => {
    const {
      resolveBuildConfig,
      resolveEntryPoints,
      toEsbuildOptions,
    } = require('../esbuild/resolve-config');

    const cfg = resolveBuildConfig('build', {
      root: '.',
      entry: 'src/main.js',
      ignore: 'tmp,dist',
      bundle: true,
    });
    assert.deepEqual(cfg.ignore, ['tmp', 'dist']);

    const multi = resolveEntryPoints({
      ...cfg,
      entry: { app: 'src/a.js', admin: 'src/b.js' },
    });
    assert.ok(multi.app);
    assert.ok(multi.admin);

    assert.throws(
      () => resolveEntryPoints({
        rootDir: process.cwd(),
        entry: null,
        libMode: false,
        src: 'src',
        ignore: [],
      }),
      /缺少入口/
    );

    const emptyLibRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-empty-lib-'));
    assert.throws(
      () => resolveEntryPoints({
        rootDir: emptyLibRoot,
        entry: null,
        libMode: true,
        src: 'src',
        ignore: [],
        typescript: false,
      }),
      /未找到入口文件/
    );

    const withOutfile = toEsbuildOptions({
      ...cfg,
      rootDir: process.cwd(),
      outDir: path.join(process.cwd(), 'dist'),
      outfile: 'dist/bundle.js',
      libMode: false,
      bundle: true,
      format: 'esm',
      jsx: 'automatic',
      sourcemap: true,
      define: {},
      external: [],
      alias: {},
      srcDir: path.join(process.cwd(), 'src'),
    });
    assert.ok(withOutfile.outfile);
    assert.equal(withOutfile.outdir, undefined);
  });
});
