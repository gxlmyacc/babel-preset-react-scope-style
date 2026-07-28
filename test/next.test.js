const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

describe('Next.js withReactScopeStyle', () => {
  it('导出 default 与 withReactScopeStyle 别名', () => {
    const next = require('../next');
    assert.equal(typeof next, 'function');
    assert.equal(next, next.default);
    assert.equal(next, next.withReactScopeStyle);
  });

  it('webpack 钩子向样式规则注入 scope loader', () => {
    const withReactScopeStyle = require('../next');
    const loaderPath = path.join(__dirname, '../loader/index.js');

    const wrapped = withReactScopeStyle(
      {
        reactStrictMode: true,
        /**
         * 用户自定义 webpack 钩子，应在注入后继续调用。
         * @param {object} config - webpack 配置
         * @returns {object}
         */
        webpack(config) {
          // eslint-disable-next-line no-param-reassign
          config.__userWebpackCalled = true;
          return config;
        },
      },
      { loaderOptions: { sourceMap: true } }
    );

    assert.equal(wrapped.reactStrictMode, true);

    const config = {
      module: {
        rules: [
          {
            oneOf: [
              {
                test: /\.scss$/i,
                use: [
                  'style-loader',
                  'css-loader',
                  'sass-loader',
                ],
              },
              {
                test: /\.js$/,
                use: ['babel-loader'],
              },
            ],
          },
        ],
      },
    };

    const result = wrapped.webpack(config, { dev: true, isServer: false });
    assert.equal(result.__userWebpackCalled, true);

    const styleRule = result.module.rules[0].oneOf[0];
    assert.equal(styleRule.use.length, 4);
    assert.equal(styleRule.use[2].loader, loaderPath);
    assert.equal(styleRule.use[2].options.sourceMap, true);
    assert.equal(styleRule.use[3], 'sass-loader');

    const jsRule = result.module.rules[0].oneOf[1];
    assert.deepEqual(jsRule.use, ['babel-loader']);
  });

  it('无用户 webpack 钩子时仍注入并返回 config', () => {
    const withReactScopeStyle = require('../next');
    const loaderPath = path.join(__dirname, '../loader/index.js');
    const wrapped = withReactScopeStyle({ reactStrictMode: true });
    const config = {
      module: {
        rules: [
          {
            test: /\.css$/i,
            use: ['css-loader'],
          },
        ],
      },
    };
    const result = wrapped.webpack(config, { dev: false, isServer: true });
    assert.equal(result, config);
    assert.equal(result.module.rules[0].use[1].loader, loaderPath);
  });

  it('重复注入时不会追加第二个 scope loader', () => {
    const { injectScopeLoader } = require('../lib/inject-scope-loader');
    const loaderPath = path.join(__dirname, '../loader/index.js');
    const config = {
      module: {
        rules: [
          {
            test: /\.css$/i,
            use: [
              'css-loader',
              { loader: loaderPath, options: {} },
            ],
          },
        ],
      },
    };
    injectScopeLoader(config);
    assert.equal(config.module.rules[0].use.length, 2);
  });

  it('swcPlugin: true 时注入 experimental.swcPlugins', () => {
    const withReactScopeStyle = require('../next');
    const wasmPath = withReactScopeStyle.resolveBundledSwcPluginPath();
    if (!wasmPath) {
      // WASM 未构建时跳过（CI 无 Rust 时仍可通过其它用例）
      return;
    }
    const wrapped = withReactScopeStyle(
      { reactStrictMode: true },
      {
        swcPlugin: true,
        swcPluginOptions: {
          scopePrefix: 'v-',
          pkg: { name: 'test-app', version: '0.0.0' },
        },
      }
    );
    assert.ok(Array.isArray(wrapped.experimental.swcPlugins));
    assert.equal(wrapped.experimental.swcPlugins.length, 1);
    assert.equal(wrapped.experimental.swcPlugins[0][0], wasmPath);
    assert.equal(wrapped.experimental.swcPlugins[0][1].scopePrefix, 'v-');
    assert.equal(wrapped.experimental.swcPlugins[0][1].pkg.name, 'test-app');
  });

  it('swcPlugin 不会重复追加同一 WASM', () => {
    const withReactScopeStyle = require('../next');
    const wasmPath = withReactScopeStyle.resolveBundledSwcPluginPath();
    if (!wasmPath) return;
    const wrapped = withReactScopeStyle(
      {
        experimental: {
          swcPlugins: [[wasmPath, { scopePrefix: 'x-' }]],
        },
      },
      { swcPlugin: true }
    );
    assert.equal(wrapped.experimental.swcPlugins.length, 1);
    assert.equal(wrapped.experimental.swcPlugins[0][1].scopePrefix, 'x-');
  });
});
