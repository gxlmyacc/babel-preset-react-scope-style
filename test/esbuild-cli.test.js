const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('esbuild resolve-config', () => {
  it('resolveBuildConfig 合并 CLI 与 scope 选项', () => {
    const { resolveBuildConfig, resolveScopePresetOptions } = require('../esbuild/resolve-config');
    const config = resolveBuildConfig('build', {
      root: '.',
      entry: 'src/main.jsx',
      out: './dist',
      bundle: true,
      scopeStyle: true,
      scopeNamespace: 'demo',
    });
    assert.equal(config.scopeStyle, true);
    assert.equal(config.scopeNamespace, 'demo');
    assert.equal(config.bundle, true);
    assert.equal(config.libMode, false);

    const preset = resolveScopePresetOptions(config);
    assert.equal(preset.scope, true);
    assert.equal(preset.scopeNamespace, 'demo');
  });

  it('默认启用 libMode 与 scopeStyle', () => {
    const { resolveBuildConfig } = require('../esbuild/resolve-config');
    const config = resolveBuildConfig('build', {
      root: '.',
      src: './src',
      out: './esm',
    });
    assert.equal(config.bundle, false);
    assert.equal(config.libMode, true);
    assert.equal(config.scopeStyle, true);
  });

  it('配置文件 bundle:true 不被 CLI 未传 --bundle 覆盖', () => {
    const { resolveBuildConfig } = require('../esbuild/resolve-config');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-cfg2-'));
    fs.writeFileSync(
      path.join(tmp, 'esbuild-scope.config.js'),
      'module.exports = { entry: "src/index.js", out: "./dist", bundle: true, scopeStyle: true };'
    );
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(path.join(tmp, 'src', 'index.js'), 'export const x = 1;');

    const fromFile = resolveBuildConfig('build', {
      root: tmp,
      config: 'esbuild-scope.config.js',
    });
    assert.equal(fromFile.bundle, true);
    assert.equal(fromFile.libMode, false);
  });

  it('配置文件 root 不被 CLI 默认 cwd 覆盖', () => {
    const { resolveBuildConfig } = require('../esbuild/resolve-config');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-root-'));
    const shared = path.join(tmp, 'shared');
    const src = path.join(shared, 'src');
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, 'index.js'), 'export const x = 1;');
    fs.writeFileSync(
      path.join(tmp, 'lib-scope.config.cjs'),
      `module.exports = { root: ${JSON.stringify(shared)}, src: './src', out: './esm', bundle: false };`
    );

    const prevCwd = process.cwd();
    process.chdir(tmp);
    try {
      const fromFile = resolveBuildConfig('build', {
        config: 'lib-scope.config.cjs',
      });
      assert.equal(fromFile.rootDir, shared);
      assert.equal(fromFile.srcDir, path.join(shared, 'src'));
    } finally {
      process.chdir(prevCwd);
    }
  });

  it('加载 esbuild-scope.config.js', () => {
    const { resolveBuildConfig } = require('../esbuild/resolve-config');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-cfg-'));
    fs.writeFileSync(
      path.join(tmp, 'esbuild-scope.config.js'),
      'module.exports = { entry: \'src/index.js\', out: \'./lib\', bundle: true, scopeStyle: true, scopeNamespace: \'cfg\' };'
    );
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(path.join(tmp, 'src/index.js'), 'export const x = 1;');

    const config = resolveBuildConfig('build', { root: tmp });
    assert.equal(config.scopeStyle, true);
    assert.equal(config.scopeNamespace, 'cfg');
    assert.equal(config.outDir, path.join(tmp, 'lib'));
  });

  it('--no-config 跳过配置文件自动发现', () => {
    const { resolveBuildConfig, resolveConfigFile } = require('../esbuild/resolve-config');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-nocfg-'));
    fs.writeFileSync(
      path.join(tmp, 'esbuild-scope.config.js'),
      'module.exports = { bundle: false, out: "./esm", scopeStyle: true };'
    );
    fs.mkdirSync(path.join(tmp, 'src'));
    fs.writeFileSync(path.join(tmp, 'src', 'index.js'), 'export const x = 1;');

    assert.equal(resolveConfigFile(tmp, undefined, true), null);

    const config = resolveBuildConfig('build', {
      root: tmp,
      config: false,
    });
    assert.equal(config.bundle, false);
    assert.equal(config.scopeStyle, true);
    assert.equal(config.outDir, path.join(tmp, 'dist'));
  });
});

describe('esbuild lib-scope-bridge', () => {
  it('createLibScopeFn 记录 scope 并返回 plain .css', () => {
    const {
      createStyleScopedMap,
      createLibScopeFn,
      resolveStyleScopedKey,
    } = require('../esbuild/lib-scope-bridge');

    const map = createStyleScopedMap();
    const scopeFn = createLibScopeFn(map, '/project');
    const jsFile = '/project/src/Button.jsx';

    scopeFn('./Button.scss', '', {
      filename: jsFile,
      source: './Button.scss',
      scopeId: 'v-btn',
      global: false,
    });

    const key = resolveStyleScopedKey({
      filename: jsFile,
      source: './Button.scss',
      scopeId: 'v-btn',
      global: false,
    }, '/project');
    assert.ok(map.has(key));
    assert.equal(map.get(key).list[0].scopeId, 'v-btn');
    assert.equal(scopeFn('./Button.scss', '?ignored', {
      filename: jsFile,
      source: './Button.scss',
      scopeId: 'v-btn',
    }), './Button.css');
  });
});

describe('esbuild CLI run-build', () => {
  it('libMode build 输出 scoped css', async () => {
    const { runBuild } = require('../esbuild/run-build');
    const { resolveBuildConfig } = require('../esbuild/resolve-config');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-lib-'));
    const src = path.join(tmp, 'src');
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ sideEffects: true }));
    fs.mkdirSync(src);

    fs.writeFileSync(
      path.join(src, 'index.js'),
      "import './index.css?scoped';\nexport const ok = true;\n"
    );
    fs.writeFileSync(path.join(src, 'index.css'), '.box { color: blue; }');

    const config = resolveBuildConfig('build', {
      root: tmp,
      src: './src',
      out: './esm',
      scopeStyle: true,
      scopeNamespace: 'lib',
      disableClean: false,
    });

    await runBuild(config);

    const outJs = path.join(tmp, 'esm', 'index.js');
    assert.ok(fs.existsSync(outJs));
    const js = fs.readFileSync(outJs, 'utf8');
    assert.match(js, /index\.css/);
    assert.doesNotMatch(js, /scope-style/);

    const outCss = path.join(tmp, 'esm', 'index.css');
    assert.ok(fs.existsSync(outCss));
    const css = fs.readFileSync(outCss, 'utf8');
    assert.match(css, /\.box\.v-lib-[a-z0-9-]+\s*\{/);
  });

  it('libMode build 复制 json/txt/png 等静态资源', async () => {
    const { runBuild } = require('../esbuild/run-build');
    const { resolveBuildConfig } = require('../esbuild/resolve-config');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-esbuild-assets-'));
    const src = path.join(tmp, 'src');
    const assets = path.join(src, 'assets');
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ sideEffects: true }));
    fs.mkdirSync(assets, { recursive: true });
    fs.writeFileSync(path.join(src, 'index.js'), 'export const ok = true;\n');
    fs.writeFileSync(
      path.join(assets, 'meta.json'),
      JSON.stringify({ copied: true })
    );
    fs.writeFileSync(path.join(assets, 'note.txt'), 'static copy');
    fs.writeFileSync(
      path.join(assets, 'logo.png'),
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      )
    );

    const config = resolveBuildConfig('build', {
      root: tmp,
      src: './src',
      out: './esm',
      scopeStyle: false,
      disableClean: false,
    });

    await runBuild(config);

    const outJson = path.join(tmp, 'esm', 'assets', 'meta.json');
    const outTxt = path.join(tmp, 'esm', 'assets', 'note.txt');
    const outPng = path.join(tmp, 'esm', 'assets', 'logo.png');
    assert.ok(fs.existsSync(outJson));
    assert.ok(fs.existsSync(outTxt));
    assert.ok(fs.existsSync(outPng));
    assert.equal(JSON.parse(fs.readFileSync(outJson, 'utf8')).copied, true);
    assert.equal(fs.readFileSync(outTxt, 'utf8'), 'static copy');
    assert.ok(fs.readFileSync(outPng).length > 0);
  });
});
