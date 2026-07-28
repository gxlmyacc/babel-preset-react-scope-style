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
    const css = await postcss(plugins).process(
      '@import "@assets/theme.css";\n.a{background:url(@assets/logo.png)}',
      { from: filePath }
    );
    assert.match(css.css, /theme\.css/);
    assert.match(css.css, /logo\.png/);

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

  it('resolveScopePresetOptions / entry 绝对路径 / libMode alias 剥离', () => {
    const {
      resolveBuildConfig,
      resolveScopePresetOptions,
      resolveEntryPoints,
      toEsbuildOptions,
      resolveConfigFile,
    } = require('../esbuild/resolve-config');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-rc-'));
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'demo', namespace: 'from-pkg' })
    );
    const src = path.join(tmp, 'src');
    fs.mkdirSync(src);
    fs.writeFileSync(path.join(src, 'a.ts'), 'export const a = 1;');
    fs.writeFileSync(path.join(src, 'b.js'), 'export const b = 1;');

    const absEntry = path.join(tmp, 'src', 'b.js');
    assert.equal(
      resolveEntryPoints({
        rootDir: tmp,
        entry: absEntry,
        libMode: false,
      }),
      absEntry
    );

    const libFiles = resolveEntryPoints({
      rootDir: tmp,
      entry: null,
      libMode: true,
      src: 'src',
      ignore: ['**/a.ts'],
      typescript: true,
    });
    assert.ok(Array.isArray(libFiles));
    assert.ok(libFiles.some((f) => f.endsWith('b.js')));

    const cfg = resolveBuildConfig('build', {
      root: tmp,
      entry: 'src/b.js',
      bundle: true,
      servedir: './public',
      outdir: './out-alt',
      scopeStyleOptions: { scopePrefix: 'v-' },
    });
    assert.match(cfg.servedir.replace(/\\/g, '/'), /public$/);
    const preset = resolveScopePresetOptions(cfg);
    assert.equal(preset.scopePrefix, 'v-');
    assert.equal(preset.pkg.name, 'demo');

    const noPkg = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-nopkg-'));
    const presetEmpty = resolveScopePresetOptions({
      rootDir: noPkg,
      scopeStyle: true,
      scopeStyleVersion: false,
      scopeNamespace: '',
      scopeStyleOptions: {},
    });
    assert.equal(presetEmpty.pkg, null);

    const libOpts = toEsbuildOptions({
      rootDir: tmp,
      outDir: path.join(tmp, 'esm'),
      srcDir: src,
      entry: null,
      libMode: true,
      src: 'src',
      ignore: [],
      typescript: false,
      format: 'esm',
      jsx: 'automatic',
      sourcemap: false,
      define: {},
      external: [],
      alias: { react: path.join(tmp, 'node_modules/react') },
      esbuild: {},
    });
    assert.equal(libOpts.alias, undefined);
    assert.equal(libOpts.outbase, src);

    assert.ok(resolveConfigFile(tmp, 'package.json', false));
    assert.equal(resolveConfigFile(tmp, undefined, true), null);
  });
});

describe('esbuild coverage — index branches', () => {
  /**
   * 在临时目录写入可被 require.resolve 找到的假 sass/less 包。
   * @param {string} root - 项目根
   * @param {'sass'|'less'} name - 包名
   * @param {string} source - 模块源码
   * @returns {void}
   */
  function writeFakePkg(root, name, source) {
    const dir = path.join(root, 'node_modules', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name, main: 'index.js' })
    );
    fs.writeFileSync(path.join(dir, 'index.js'), source);
  }

  it('compileStylePreprocessor 成功编译 scss/less', async () => {
    const { compileStylePreprocessor } = require('../esbuild/index');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-pp-ok-'));
    writeFakePkg(
      tmp,
      'sass',
      'module.exports = { compile() { return { css: ".from-sass{}" }; } };'
    );
    writeFakePkg(
      tmp,
      'less',
      'module.exports = { render() { return Promise.resolve({ css: ".from-less{}" }); } };'
    );

    const scss = path.join(tmp, 'a.scss');
    const lessFile = path.join(tmp, 'a.less');
    fs.writeFileSync(scss, '$c:red;.a{color:$c}');
    fs.writeFileSync(lessFile, '.a{color:red}');

    assert.equal(await compileStylePreprocessor(scss, ''), '.from-sass{}');
    assert.equal(await compileStylePreprocessor(lessFile, '.a{}'), '.from-less{}');
  });

  it('onLoad 非脚本后缀返回 null；样式 load 无 query / 非样式文件', async () => {
    const reactScopeStyle = require('../esbuild/index');
    const plugin = reactScopeStyle({ scopePrefix: 'v-' });
    const { onLoad, onResolve } = collectPluginHandlers(plugin);
    const jsHandler = onLoad.find((h) => !h.namespace).handler;
    const styleLoad = onLoad.find((h) => h.namespace === 'react-scope-style').handler;
    const resolveHandler = onResolve[0].handler;

    assert.equal(await jsHandler({ path: path.join(os.tmpdir(), 'not-js.txt') }), null);
    assert.equal(await styleLoad({ path: path.join(os.tmpdir(), 'x.txt'), pluginData: {} }), null);

    const plainCss = path.join(os.tmpdir(), `rss-plain-${Date.now()}.css`);
    fs.writeFileSync(plainCss, '.z{color:red}');
    assert.equal(
      await styleLoad({
        path: plainCss,
        pluginData: { query: '' },
        suffix: '',
      }),
      null
    );

    const absCss = path.join(os.tmpdir(), `rss-abs-${Date.now()}.css`);
    fs.writeFileSync(absCss, '.z{}');
    const resolvedAbs = resolveHandler({
      path: absCss,
      resolveDir: os.tmpdir(),
      query: '?scope-style&scoped=true&id=v-z',
    });
    assert.ok(resolvedAbs);
    assert.equal(resolvedAbs.path, absCss);
  });

  it('libMode resolve 跳过 node_modules 与缺失源文件', () => {
    const reactScopeStyle = require('../esbuild/index');
    const { createStyleScopedMap } = require('../esbuild/lib-scope-bridge');
    const styleScoped = createStyleScopedMap();
    const plugin = reactScopeStyle({
      libMode: true,
      styleScoped,
      rootDir: os.tmpdir(),
    });
    const { onResolve } = collectPluginHandlers(plugin);
    const resolveHandler = onResolve[0].handler;

    const nmDir = path.join(os.tmpdir(), `rss-nm-${Date.now()}`, 'node_modules', 'pkg');
    fs.mkdirSync(nmDir, { recursive: true });
    const nmCss = path.join(nmDir, 'pkg.css');
    fs.writeFileSync(nmCss, '.a{}');

    assert.equal(
      resolveHandler({
        path: './pkg.css',
        resolveDir: nmDir,
        query: '',
      }),
      null
    );
    assert.equal(
      resolveHandler({
        path: './missing-style.css',
        resolveDir: os.tmpdir(),
        query: '',
      }),
      null
    );
  });
});

describe('esbuild coverage — lib-scope-bridge more', () => {
  it('resolveStyleScopedKey 相对 source；preScan / buildLibStyles / copy', async () => {
    const {
      resolveStyleScopedKey,
      createStyleScopedMap,
      preScanJsForStyleScoped,
      buildLibStyles,
      copyLibStaticAssets,
    } = require('../esbuild/lib-scope-bridge');

    const jsFile = path.join('/proj/src', 'Btn.jsx');
    const keyRel = resolveStyleScopedKey({
      filename: jsFile,
      source: '../shared/theme.scss?scoped',
      global: true,
    }, '/proj');
    assert.match(keyRel.replace(/\\/g, '/'), /theme\.css$/);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-bridge-'));
    const src = path.join(tmp, 'src');
    fs.mkdirSync(path.join(src, 'assets'), { recursive: true });
    fs.writeFileSync(
      path.join(src, 'Box.jsx'),
      "import './Box.css?scoped';\nexport function Box(){ return <div className=\"box\" />; }\n"
    );
    fs.writeFileSync(path.join(src, 'Box.css'), '.box { color: red; }');
    fs.writeFileSync(path.join(src, 'assets', 'meta.json'), '{"ok":1}');

    const styleScoped = createStyleScopedMap();
    preScanJsForStyleScoped({
      rootDir: tmp,
      srcDir: 'src',
      typescript: false,
      ignore: ['**/assets/**'],
      presetOptions: { scopePrefix: 'v-' },
      styleScoped,
    });
    assert.ok(styleScoped.size >= 1);

    await buildLibStyles({
      rootDir: tmp,
      styleSrcDir: src,
      styleOutDir: path.join(tmp, 'out'),
      aliasConfig: true,
      alias: {},
    }, styleScoped);

    const outCss = path.join(tmp, 'out', 'Box.css');
    assert.ok(fs.existsSync(outCss));
    assert.match(fs.readFileSync(outCss, 'utf8'), /\.box/);

    copyLibStaticAssets({
      rootDir: tmp,
      srcDir: src,
      outDir: path.join(tmp, 'out'),
      ignore: ['**/skip/**'],
    });
    assert.ok(fs.existsSync(path.join(tmp, 'out', 'assets', 'meta.json')));
  });
});

describe('esbuild coverage — lib-alias exact', () => {
  it('resolveAliasRequest 精确键命中；replace 相对路径无点前缀', () => {
    const {
      resolveAliasRequest,
      replaceStyleAliasInValue,
      sortAliasEntries,
    } = require('../esbuild/lib-alias-plugin');

    assert.deepEqual(sortAliasEntries(null), []);
    assert.equal(resolveAliasRequest('react', { react: '/proj/node_modules/react' }), '/proj/node_modules/react');
    assert.equal(resolveAliasRequest('', { a: '/x' }), null);

    const fromDir = '/proj/src';
    const value = replaceStyleAliasInValue(
      'url(@assets/x.png)',
      fromDir,
      { '@assets': '/proj/src/assets' }
    );
    assert.match(value, /assets/);
  });
});
