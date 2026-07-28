const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Webpack ReactScopeStyleWebpackPlugin', () => {
  it('导出插件类与 withReactScopeStyle 辅助函数', () => {
    const webpackApi = require('../webpack');
    assert.equal(typeof webpackApi, 'function');
    assert.equal(webpackApi, webpackApi.default);
    assert.equal(webpackApi, webpackApi.ReactScopeStyleWebpackPlugin);
    assert.equal(typeof webpackApi.withReactScopeStyle, 'function');
    assert.equal(typeof webpackApi.injectScopeLoader, 'function');
    assert.equal(typeof webpackApi.injectBabelPreset, 'function');
  });

  it('apply 时同时注入 scope loader 与 Babel preset', () => {
    const ReactScopeStyleWebpackPlugin = require('../webpack');
    const loaderPath = path.join(__dirname, '../loader/index.js');
    const presetPath = path.join(__dirname, '../src/index.js');
    const plugin = new ReactScopeStyleWebpackPlugin({
      sourceMap: true,
      babel: { scopePrefix: 'v-' },
    });

    const compiler = {
      options: {
        context: path.join(os.tmpdir(), 'rss-webpack-empty'),
        module: {
          rules: [
            {
              test: /\.scss$/i,
              use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
              test: /\.js$/,
              use: ['babel-loader'],
            },
          ],
        },
      },
    };

    plugin.apply(compiler);

    const styleRule = compiler.options.module.rules[0];
    assert.equal(styleRule.use.length, 4);
    assert.equal(styleRule.use[2].loader, loaderPath);
    assert.equal(styleRule.use[2].options.sourceMap, true);

    const jsRule = compiler.options.module.rules[1];
    assert.equal(jsRule.use[0].loader, 'babel-loader');
    assert.deepEqual(jsRule.use[0].options.presets, [
      [presetPath, { scopePrefix: 'v-' }],
    ]);
  });

  it('babel-loader presets 已含本包时跳过 Babel 注入', () => {
    const { withReactScopeStyle, getScopePresetPath } = require('../webpack');
    const presetPath = getScopePresetPath();
    const config = {
      module: {
        rules: [
          {
            test: /\.js$/,
            use: [{
              loader: 'babel-loader',
              options: {
                presets: [['babel-preset-react-scope-style', { scopePrefix: 'x-' }]],
              },
            }],
          },
        ],
      },
    };
    withReactScopeStyle(config, { babel: { scopePrefix: 'v-' } });
    assert.equal(config.module.rules[0].use[0].options.presets.length, 1);
    assert.equal(
      config.module.rules[0].use[0].options.presets[0][0],
      'babel-preset-react-scope-style'
    );
    assert.notEqual(
      config.module.rules[0].use[0].options.presets[0][0],
      presetPath
    );
  });

  it('configFile 已配置本 preset 时跳过 Babel 注入', () => {
    const { withReactScopeStyle } = require('../webpack');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-babel-'));
    const configFile = path.join(dir, 'babel.config.js');
    fs.writeFileSync(
      configFile,
      'module.exports = { presets: ["babel-preset-react-scope-style"] };\n'
    );

    const config = {
      context: dir,
      module: {
        rules: [
          {
            test: /\.js$/,
            use: [{
              loader: 'babel-loader',
              options: { configFile },
            }],
          },
        ],
      },
    };
    withReactScopeStyle(config, { babel: true });
    assert.equal(config.module.rules[0].use[0].options.presets, undefined);
  });

  it('babel: false 时只注入 loader', () => {
    const { withReactScopeStyle, getScopeLoaderPath } = require('../webpack');
    const config = {
      module: {
        rules: [
          {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.js$/,
            use: ['babel-loader'],
          },
        ],
      },
    };
    withReactScopeStyle(config, { babel: false, sourceMap: true });
    assert.equal(config.module.rules[0].use[2].loader, getScopeLoaderPath());
    assert.equal(config.module.rules[1].use[0], 'babel-loader');
  });
});
