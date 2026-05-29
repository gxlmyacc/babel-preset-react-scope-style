const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * 收集 esbuild 插件 setup 中注册的 onLoad / onResolve 回调。
 * @param {import('esbuild').Plugin} plugin - esbuild 插件实例
 * @returns {{ onLoad: Array<{ filter: RegExp, namespace?: string, handler: Function }>, onResolve: Array<{ filter: RegExp, handler: Function }> }}
 */
function collectPluginHandlers(plugin) {
  const onLoad = [];
  const onResolve = [];
  plugin.setup({
    initialOptions: { sourcemap: true },
    onLoad(options, handler) {
      onLoad.push({ filter: options.filter, namespace: options.namespace, handler });
    },
    onResolve(options, handler) {
      onResolve.push({ filter: options.filter, handler });
    },
  });
  return { onLoad, onResolve };
}

/**
 * 按 filter 匹配查找第一个 onResolve handler。
 * @param {Array<{ filter: RegExp, handler: Function }>} handlers - onResolve 列表
 * @param {string} samplePath - 用于测试 filter 的样例路径
 * @returns {Function|undefined}
 */
function findResolveHandler(handlers, samplePath) {
  const matched = handlers.find(({ filter }) => filter.test(samplePath));
  return matched && matched.handler;
}

describe('esbuild 插件', () => {
  it('splitPathQuery 拆分路径与 query', () => {
    const { splitPathQuery } = require('../esbuild/index');
    assert.deepEqual(splitPathQuery('/a/b.scss?scope-style&id=v-1'), {
      filePath: '/a/b.scss',
      query: '?scope-style&id=v-1',
    });
    assert.deepEqual(splitPathQuery('/a/b.jsx'), {
      filePath: '/a/b.jsx',
      query: '',
    });
  });

  it('导出 default 别名', () => {
    const esbuildPlugin = require('../esbuild/index');
    assert.equal(esbuildPlugin, esbuildPlugin.default);
  });

  it('onLoad 转换 JSX 与 scoped CSS', async () => {
    const reactScopeStyle = require('../esbuild/index');
    const plugin = reactScopeStyle({ scopePrefix: 'v-' });
    const { onLoad, onResolve } = collectPluginHandlers(plugin);
    const jsHandler = onLoad.find((h) => !h.namespace && h.filter.test('/project/src/C.jsx')).handler;
    const cssHandler = onLoad.find((h) => h.namespace === 'react-scope-style').handler;
    const resolveHandler = findResolveHandler(onResolve, '/project/src/c.css?scope-style');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-'));
    const jsxFile = path.join(tmpDir, 'C.jsx');
    const cssFile = path.join(tmpDir, 'c.css');
    fs.writeFileSync(
      jsxFile,
      `
import React from 'react';
import './c.css?scoped';
export function C() { return <div className="c" />; }
`
    );
    fs.writeFileSync(cssFile, '.c { color: cyan; }');

    const jsxResult = await jsHandler({ path: jsxFile });
    assert.ok(jsxResult && jsxResult.contents);
    assert.equal(jsxResult.contents.includes('scope-style&scoped=true'), true);
    assert.equal(jsxResult.loader, 'jsx');

    const resolved = resolveHandler({
      path: `${cssFile}?scope-style&scoped=true&id=v-abc`,
      resolveDir: tmpDir,
    });
    assert.equal(resolved.namespace, 'react-scope-style');

    const cssResult = await cssHandler({
      path: cssFile,
      namespace: 'react-scope-style',
      suffix: '?scope-style&scoped=true&id=v-abc',
      pluginData: { query: '?scope-style&scoped=true&id=v-abc' },
    });
    assert.ok(cssResult);
    assert.equal(cssResult.contents.trim(), '.c.v-abc { color: cyan; }');
    assert.equal(cssResult.loader, 'css');

    const skipNodeModules = await jsHandler({
      path: '/project/node_modules/react/index.js',
    });
    assert.equal(skipNodeModules, null);
  });

  it('esbuild build 端到端改写 scoped 样式 import', async () => {
    const esbuild = require('esbuild');
    const reactScopeStyle = require('../esbuild/index');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-build-'));
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir);

    fs.writeFileSync(path.join(srcDir, 'app.css'), '.box { color: red; }');
    fs.writeFileSync(
      path.join(srcDir, 'main.js'),
      `import './app.css?scoped';\nexport const ok = true;\n`
    );

    const outFile = path.join(tmpDir, 'bundle.js');
    await esbuild.build({
      absWorkingDir: tmpDir,
      entryPoints: ['src/main.js'],
      outfile: outFile,
      bundle: true,
      plugins: [reactScopeStyle({ scopePrefix: 'v-' })],
      write: true,
      logLevel: 'silent',
    });

    const cssFile = path.join(tmpDir, 'bundle.css');
    assert.ok(fs.existsSync(cssFile), 'expected separate bundle.css output');
    const cssBundle = fs.readFileSync(cssFile, 'utf8');
    assert.match(cssBundle, /\.box\.v-[a-z0-9-]+\s*\{\s*color:\s*red/);
  });
});
