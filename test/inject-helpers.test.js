const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('inject-scope-loader / inject-babel-preset 边界', () => {
  it('injectScopeLoader 覆盖 type:css、rule.loader 与仅 css-loader 插入点', () => {
    const {
      injectScopeLoader,
      getScopeLoaderPath,
      isStyleRule,
      normalizeUses,
      resolveInsertIndex,
    } = require('../lib/inject-scope-loader');
    const loaderPath = getScopeLoaderPath();

    const byType = {
      module: {
        rules: [
          {
            type: 'css/auto',
            use: ['css-loader'],
          },
        ],
      },
    };
    injectScopeLoader(byType);
    assert.equal(byType.module.rules[0].use[1].loader, loaderPath);

    const byLoaderField = {
      module: {
        rules: [
          {
            test: /\.css$/i,
            loader: 'css-loader',
            options: { modules: false },
          },
        ],
      },
    };
    injectScopeLoader(byLoaderField);
    assert.equal(byLoaderField.module.rules[0].use[1].loader, loaderPath);
    assert.equal(byLoaderField.module.rules[0].loader, undefined);

    assert.equal(isStyleRule({ type: 'css' }), true);
    assert.equal(isStyleRule({ test: /\.scss$/i, use: ['css-loader'] }), true);
    assert.equal(isStyleRule({ test: 'file.scss' }), true);
    assert.deepEqual(normalizeUses({ use: 'css-loader' }), ['css-loader']);
    assert.equal(resolveInsertIndex(['css-loader']), 1);
    assert.equal(resolveInsertIndex(['style-loader']), -1);

    const nested = {
      module: {
        rules: [
          {
            rules: [
              {
                test: /\.css$/i,
                use: ['css-loader'],
              },
            ],
          },
        ],
      },
    };
    injectScopeLoader(nested);
    assert.equal(nested.module.rules[0].rules[0].use[1].loader, loaderPath);

    const emptyModule = {};
    injectScopeLoader(emptyModule, { sourceMap: true });
    assert.ok(emptyModule.module);
    assert.deepEqual(emptyModule.module.rules, []);
  });

  it('injectBabelPreset 支持 oneOf / rules 嵌套与空 module', () => {
    const {
      injectBabelPreset,
      getScopePresetPath,
      getPresetName,
      hasScopePreset,
      projectBabelHasScopePreset,
      configFileHasScopePreset,
    } = require('../lib/inject-babel-preset');
    const presetPath = getScopePresetPath();

    const empty = {};
    injectBabelPreset(empty, true);
    assert.deepEqual(empty.module.rules, []);

    const isolatedContext = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-babel-iso-'));
    const config = {
      context: isolatedContext,
      module: {
        rules: [
          {
            oneOf: [
              {
                test: /\.js$/,
                use: ['babel-loader'],
              },
            ],
          },
          {
            rules: [
              {
                test: /\.jsx$/,
                use: [{ loader: 'babel-loader', options: {} }],
              },
            ],
          },
          {
            test: /\.ts$/,
            use: ['other-loader'],
          },
        ],
      },
    };
    injectBabelPreset(config, { scopePrefix: 'v-' });
    assert.deepEqual(config.module.rules[0].oneOf[0].use[0].options.presets, [
      [presetPath, { scopePrefix: 'v-' }],
    ]);
    assert.deepEqual(config.module.rules[1].rules[0].use[0].options.presets, [
      [presetPath, { scopePrefix: 'v-' }],
    ]);
    assert.deepEqual(config.module.rules[2].use, ['other-loader']);

    assert.equal(getPresetName(null), '');
    assert.equal(getPresetName(['x']), 'x');
    /**
     * 仅用于覆盖 getPresetName 对函数 preset 的解析。
     * 无入参。
     * @returns {void}
     */
    function NamedPreset() {}
    assert.equal(getPresetName(NamedPreset), 'NamedPreset');
    assert.equal(getPresetName([NamedPreset]), 'NamedPreset');
    assert.equal(getPresetName([{}]), '');
    assert.equal(getPresetName({}), '');
    assert.equal(hasScopePreset(null), false);
    assert.equal(configFileHasScopePreset(''), false);
    assert.equal(projectBabelHasScopePreset(''), false);
  });

  it('projectBabelHasScopePreset 识别 babel.config.json 与损坏配置', () => {
    const {
      projectBabelHasScopePreset,
      configFileHasScopePreset,
    } = require('../lib/inject-babel-preset');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-babel-proj-'));
    fs.writeFileSync(
      path.join(dir, 'babel.config.json'),
      JSON.stringify({ presets: ['babel-preset-react-scope-style'] })
    );
    assert.equal(projectBabelHasScopePreset(dir), true);

    const broken = path.join(dir, 'broken.js');
    fs.writeFileSync(broken, 'throw new Error("boom");\n');
    assert.equal(configFileHasScopePreset(broken), false);

    const noPresetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-babel-empty-'));
    fs.writeFileSync(
      path.join(noPresetDir, '.babelrc'),
      '{ not-json but babel-preset-react-scope-style }'
    );
    assert.equal(projectBabelHasScopePreset(noPresetDir), true);
  });

  it('babelrc 探测命中时跳过注入', () => {
    const { injectBabelPreset } = require('../lib/inject-babel-preset');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-babel-skip-'));
    fs.writeFileSync(
      path.join(dir, 'babel.config.js'),
      'module.exports = { presets: ["babel-preset-react-scope-style"] };\n'
    );
    const config = {
      context: dir,
      module: {
        rules: [
          {
            test: /\.js$/,
            use: [{ loader: 'babel-loader', options: {} }],
          },
        ],
      },
    };
    injectBabelPreset(config, true);
    assert.equal(config.module.rules[0].use[0].options.presets, undefined);
  });
});

describe('run-postcss-plugins', () => {
  it('空插件列表原样返回；有插件时执行转换', async () => {
    const { runPostcssPlugins } = require('../lib/run-postcss-plugins');
    const css = '.a { color: red; }';
    assert.equal(await runPostcssPlugins(css, []), css);

    const plugin = () => ({
      postcssPlugin: 'demo-upper-noop',
      Once(root) {
        root.walkDecls((decl) => {
          // eslint-disable-next-line no-param-reassign
          decl.value = 'blue';
        });
      },
    });
    plugin.postcss = true;
    const out = await runPostcssPlugins(css, [plugin], { from: 'x.css' });
    assert.match(out, /blue/);
  });
});

describe('resolve-preset', () => {
  it('getScopePresetPath / loadScopePreset 指向同一 src 入口', () => {
    const { getScopePresetPath, loadScopePreset } = require('../lib/resolve-preset');
    const p = getScopePresetPath();
    assert.match(p.replace(/\\/g, '/'), /src\/index\.js$/);
    const preset = loadScopePreset();
    assert.equal(typeof preset, 'function');
  });
});
