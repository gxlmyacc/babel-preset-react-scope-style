const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

describe('alias-config 集成', () => {
  it('未安装 alias 包时返回空插件列表', () => {
    const {
      createBabelAliasPlugins,
      createPostcssAliasPlugins,
      isAliasConfigEnabled,
    } = require('../lib/alias-config');

    const tmp = path.join(require('os').tmpdir(), 'no-alias-pkg-test');
    assert.equal(isAliasConfigEnabled(true), true);
    assert.equal(isAliasConfigEnabled(false), false);
    assert.deepEqual(createBabelAliasPlugins(tmp, true), []);
    assert.deepEqual(createPostcssAliasPlugins(tmp, path.join(tmp, 'a.css'), true), []);
  });

  it('buildBabelTransformOptions 组装 preset 与可选 alias 插件', () => {
    const { buildBabelTransformOptions } = require('../lib/alias-config');
    const preset = () => ({ plugins: [] });
    const opts = buildBabelTransformOptions({
      filename: '/proj/src/App.jsx',
      preset,
      babelOptions: { scope: true },
      rootDir: '/proj',
      aliasConfig: false,
      sourceMaps: false,
    });
    assert.equal(opts.filename, '/proj/src/App.jsx');
    assert.equal(opts.plugins, undefined);
    assert.equal(opts.presets.length, 1);
    assert.equal(opts.presets[0][0], preset);
  });

  it('TS/TSX 文件自动附加 @babel/preset-typescript', () => {
    const {
      buildBabelTransformOptions,
      isTypeScriptFilename,
    } = require('../lib/alias-config');
    const preset = () => ({ plugins: [] });
    assert.equal(isTypeScriptFilename('/a/App.tsx?t=1'), true);
    assert.equal(isTypeScriptFilename('/a/App.jsx'), false);

    const tsxOpts = buildBabelTransformOptions({
      filename: '/proj/src/App.tsx?v=1',
      preset,
      babelOptions: {},
      rootDir: '/proj',
      aliasConfig: false,
      sourceMaps: false,
    });
    assert.equal(tsxOpts.filename, '/proj/src/App.tsx');
    assert.equal(tsxOpts.presets.length, 2);
    assert.equal(tsxOpts.presets[1][1].isTSX, true);

    const tsOpts = buildBabelTransformOptions({
      filename: '/proj/src/util.ts',
      preset,
      babelOptions: {},
      rootDir: '/proj',
      aliasConfig: false,
      sourceMaps: false,
    });
    assert.equal(tsOpts.presets[1][1].isTSX, false);

    const jsOpts = buildBabelTransformOptions({
      filename: '/proj/src/App.js',
      preset,
      babelOptions: {},
      rootDir: '/proj',
      aliasConfig: false,
      sourceMaps: false,
    });
    assert.equal(jsOpts.presets.length, 1);

    const disabled = buildBabelTransformOptions({
      filename: '/proj/src/App.tsx',
      preset,
      babelOptions: {},
      rootDir: '/proj',
      aliasConfig: false,
      sourceMaps: false,
      enableTypescript: false,
    });
    assert.equal(disabled.presets.length, 1);
  });
});
