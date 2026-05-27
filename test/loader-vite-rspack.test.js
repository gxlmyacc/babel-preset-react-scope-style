const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

/**
 * 以 webpack loader 上下文执行 scope loader。
 * @param {string} content - CSS 内容或 PostCSS root
 * @param {string} request - 含 query 的 resource request
 * @param {object} [loaderOptions] - loader options
 * @param {object|null} [meta] - 上游 loader meta
 * @param {object|null} [inputMap] - 上游 source map
 * @param {object} [ctxOverrides] - 覆盖 loader 上下文字段（如 resourceQuery）
 * @returns {Promise<{ css: string, map?: object, meta?: object }>}
 */
function runWebpackLoader(
  content,
  request,
  loaderOptions = {},
  meta = null,
  inputMap = null,
  ctxOverrides = {}
) {
  const loader = require('../loader/index');
  const dir = path.join(process.cwd(), 'fixtures');
  const resource = request.split('?')[0];
  const absolute = path.isAbsolute(resource) ? resource : path.join(dir, resource);

  const queryPart = request.includes('?') ? request.slice(request.indexOf('?')) : '';
  const fullRequest = `${absolute}${queryPart}`;

  return new Promise((resolve, reject) => {
    const done = (err, code, map, outMeta) => {
      if (err) reject(err);
      else resolve({ css: code, map, meta: outMeta });
    };
    const ctx = {
      context: dir,
      rootContext: process.cwd(),
      resourcePath: absolute,
      resource: fullRequest,
      resourceQuery: queryPart,
      request: fullRequest,
      loaderIndex: 0,
      loaders: [{ request: fullRequest, path: path.join(__dirname, '../loader/index.js') }],
      remainingRequest: absolute,
      getOptions: () => loaderOptions,
      emitWarning() {},
      async() {
        return done;
      },
      callback: done,
      ...ctxOverrides,
    };
    loader.call(ctx, content, inputMap, meta);
  });
}

describe('Webpack loader', () => {
  it('无 scope-style query 时原样透传', async () => {
    const input = '.a { color: red; }';
    const { css } = await runWebpackLoader(input, 'a.css?other=1');
    assert.equal(css, input);
  });

  it('正则匹配但解析失败时原样透传', async () => {
    const input = '.dup { margin: 0; }';
    const ambiguous = '?scope-style&scoped=true&id=a&id=b';
    const { css } = await runWebpackLoader(input, 'dup.css?other=1', {}, null, null, {
      resourceQuery: ambiguous,
    });
    assert.equal(css, input);
  });

  it('存在 scope-style query 时转换 CSS', async () => {
    const query = 'scope-style&scoped=true&id=v-loader';
    const { css, meta } = await runWebpackLoader('.box { margin: 0; }', `box.css?${query}`);
    assert.equal(css, '.box.v-loader { margin: 0; }');
    assert.equal(meta.ast.type, 'react-scope-style/loader');
  });

  it('meta 中 PostCSS 版本匹配时复用 AST root', async () => {
    const postcssPkg = require('postcss/package.json');
    const postcss = require('postcss');
    const root = postcss.parse('.x { color: blue; }');
    const query = 'scope-style&scoped=true&id=v-ast';
    const { css } = await runWebpackLoader(root, `x.css?${query}`, {}, {
      ast: { type: 'postcss', version: postcssPkg.version, root },
    });
    assert.equal(css, '.x.v-ast { color: blue; }');
  });

  it('启用 sourceMap 选项并规范化 map', async () => {
    const query = 'scope-style&scoped=true&id=v-map';
    const prevMap = {
      version: 3,
      sources: ['./ref.css'],
      mappings: 'AAAA',
    };
    const { css, map } = await runWebpackLoader(
      [
        '.m { margin: 0; }',
        '.n { padding: 1px; }',
        '/* third line */',
      ].join('\n'),
      `m.css?${query}`,
      { sourceMap: true },
      null,
      prevMap
    );
    assert.equal(
      css,
      '.m.v-map { margin: 0; }\n.n.v-map { padding: 1px; }\n/* third line */'
    );
    assert.equal(map, undefined);
  });

  it('未启用 sourceMap 时正常处理', async () => {
    const query = 'scope-style&scoped=true&id=v-nomap';
    const { css, map } = await runWebpackLoader('.p { }', `p.css?${query}`, {});
    assert.equal(css, '.p.v-nomap { }');
    assert.equal(map, undefined);
  });

  it('resourceQuery 含 global=true 时按 global 作用域', async () => {
    const query = 'scope-style&scoped=true&global=true&id=v-';
    const { css } = await runWebpackLoader('.g { color: green; }', `g.css?${query}`);
    assert.equal(css, '.g[class*=v-] { color: green; }');
  });

  it('request query 不同时优先使用 resourceQuery', async () => {
    const scopeQuery = '?scope-style&scoped=true&id=v-rqonly';
    const { css } = await runWebpackLoader(
      '.rq { padding: 0; }',
      'rq.css?other=deprecated',
      {},
      null,
      null,
      { resourceQuery: scopeQuery }
    );
    assert.equal(css, '.rq.v-rqonly { padding: 0; }');
  });

  it('接受 PostCSS 7 的 ast meta 但不复用 root 为内容', async () => {
    const postcss = require('postcss');
    const root = postcss.parse('.y { color: yellow; }');
    const query = 'scope-style&scoped=true&id=v-p7';
    const { css } = await runWebpackLoader(
      '.y { color: yellow; }',
      `y.css?${query}`,
      {},
      { ast: { type: 'postcss', version: '7.0.0', root } }
    );
    assert.equal(css, '.y.v-p7 { color: yellow; }');
  });
});

describe('Vite 插件', () => {
  it('转换 JSX 与 scoped CSS 模块', async () => {
    const reactScopeStyle = require('../vite/index');
    const plugin = reactScopeStyle({ scopePrefix: 'v-' });
    const jsx = `
import React from 'react';
import './c.scss?scoped';
export function C() { return <div className="c" />; }
`;
    const jsxResult = await plugin.transform(jsx, '/project/src/C.jsx');
    assert.ok(jsxResult && jsxResult.code);
    assert.equal(jsxResult.code.includes('scope-style&scoped=true'), true);

    const cssResult = await plugin.transform(
      '.c { color: cyan; }',
      '/project/src/c.scss?scope-style&scoped=true&id=v-abc'
    );
    assert.ok(cssResult);
    assert.equal(cssResult.code.trim(), '.c.v-abc { color: cyan; }');

    const skip = await plugin.transform('code', '/project/node_modules/pkg/index.js');
    assert.equal(skip, null);
    const skipCss = await plugin.transform('.x{}', '/project/x.css');
    assert.equal(skipCss, null);

    const scopedNoQuery = await plugin.transform('.y { }', '/project/src/y.scss');
    assert.equal(scopedNoQuery, null);
  });

  it('导出 default 别名', () => {
    const vite = require('../vite/index');
    assert.equal(vite, vite.default);
  });
});

describe('Rspack 辅助函数', () => {
  it('withReactScopeStyle 追加 loader 规则', () => {
    const rspack = require('../rspack/index');
    const withReactScopeStyle = rspack.default || rspack;
    const config = withReactScopeStyle({});
    assert.ok(config.module.rules.length >= 1);
    assert.equal(
      /loader[\\/]index\.js$/.test(config.module.rules[0].use[0].loader),
      true
    );
    const chained = withReactScopeStyle({ module: { rules: [] } }, { sourceMap: true });
    assert.equal(chained.module.rules.length, 1);
    assert.equal(chained.module.rules[0].use[0].options.sourceMap, true);
    assert.equal(rspack.default || rspack, withReactScopeStyle);
  });
});

describe('lib/process-scope-css 处理', () => {
  it('processScopeStyleCss 处理 query 字符串', async () => {
    const {
      processScopeStyleCss,
      SCOPE_STYLE_QUERY_RE,
      parseScopeStyleQuery,
    } = require('../lib/process-scope-css');
    assert.ok(SCOPE_STYLE_QUERY_RE.test('scope-style&scoped=true&id=v-lib'));
    assert.deepEqual(parseScopeStyleQuery('?scope-style&scoped=true&id=v-lib'), {
      scoped: true,
      global: false,
      id: 'v-lib',
    });
    const out = await processScopeStyleCss(
      '.lib { float: left; }',
      '?scope-style&scoped=true&id=v-lib'
    );
    assert.equal(out.trim(), '.lib.v-lib { float: left; }');
  });

  it('无效 query 时 processScopeStyleCss 抛错', async () => {
    const { processScopeStyleCss } = require('../lib/process-scope-css');
    await assert.rejects(
      () => processScopeStyleCss('.x { }', '?scope-style&scoped=true'),
      /Invalid scope-style query/
    );
  });
});

describe('transform-class 边界情况', () => {
  it('未 import React 时跳过 transform-class', async () => {
    const { transformWithPreset } = require('./helpers');
    const code = transformWithPreset(`
import './x.scss?scoped';
export function A() { return <div className={['a']} />; }
`, { filename: '/p/NoReact.js' });
    assert.equal(/classnames/i.test(code), false);
    assert.equal(/clsx/i.test(code), false);
  });
});
