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

describe('webpack loader', () => {
  it('passes through when query has no scope-style', async () => {
    const input = '.a { color: red; }';
    const { css } = await runWebpackLoader(input, 'a.css?other=1');
    assert.equal(css, input);
  });

  it('passes through when scope regex matches but parse fails', async () => {
    const input = '.dup { margin: 0; }';
    const ambiguous = '?scope-style&scoped=true&id=a&id=b';
    const { css } = await runWebpackLoader(input, 'dup.css?other=1', {}, null, null, {
      resourceQuery: ambiguous,
    });
    assert.equal(css, input);
  });

  it('transforms css when scope-style query present', async () => {
    const query = 'scope-style&scoped=true&id=v-loader';
    const { css, meta } = await runWebpackLoader('.box { margin: 0; }', `box.css?${query}`);
    assert.match(css, /\.box\.v-loader/);
    assert.equal(meta.ast.type, 'react-scope-style/loader');
  });

  it('uses postcss ast root when meta provides matching version', async () => {
    const postcssPkg = require('postcss/package.json');
    const postcss = require('postcss');
    const root = postcss.parse('.x { color: blue; }');
    const query = 'scope-style&scoped=true&id=v-ast';
    const { css } = await runWebpackLoader(root, `x.css?${query}`, {}, {
      ast: { type: 'postcss', version: postcssPkg.version, root },
    });
    assert.match(css, /\.x\.v-ast/);
  });

  it('runs with sourceMap option and normalizes map', async () => {
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
    assert.match(css, /\.m\.v-map/);
    assert.equal(map, undefined);
  });

  it('processes without sourceMap option', async () => {
    const query = 'scope-style&scoped=true&id=v-nomap';
    const { css, map } = await runWebpackLoader('.p { }', `p.css?${query}`, {});
    assert.match(css, /\.p\.v-nomap/);
    assert.equal(map, undefined);
  });

  it('scopes css with global=true in resourceQuery', async () => {
    const query = 'scope-style&scoped=true&global=true&id=v-';
    const { css } = await runWebpackLoader('.g { color: green; }', `g.css?${query}`);
    assert.match(css, /\[class\*=v-\]/);
    assert.doesNotMatch(css, /\.g\.v-/);
  });

  it('uses resourceQuery when request query differs', async () => {
    const scopeQuery = '?scope-style&scoped=true&id=v-rqonly';
    const { css } = await runWebpackLoader(
      '.rq { padding: 0; }',
      'rq.css?other=deprecated',
      {},
      null,
      null,
      { resourceQuery: scopeQuery }
    );
    assert.match(css, /\.rq\.v-rqonly/);
  });

  it('accepts postcss 7 ast meta without using root as content', async () => {
    const postcss = require('postcss');
    const root = postcss.parse('.y { color: yellow; }');
    const query = 'scope-style&scoped=true&id=v-p7';
    const { css } = await runWebpackLoader(
      '.y { color: yellow; }',
      `y.css?${query}`,
      {},
      { ast: { type: 'postcss', version: '7.0.0', root } }
    );
    assert.match(css, /\.y\.v-p7/);
  });
});

describe('vite plugin', () => {
  it('transforms jsx and scoped css modules', async () => {
    const reactScopeStyle = require('../vite/index');
    const plugin = reactScopeStyle({ scopePrefix: 'v-' });
    const jsx = `
import React from 'react';
import './c.scss?scoped';
export function C() { return <div className="c" />; }
`;
    const jsxResult = await plugin.transform(jsx, '/project/src/C.jsx');
    assert.ok(jsxResult && jsxResult.code);
    assert.match(jsxResult.code, /scope-style&scoped=true/);

    const cssResult = await plugin.transform(
      '.c { color: cyan; }',
      '/project/src/c.scss?scope-style&scoped=true&id=v-abc'
    );
    assert.ok(cssResult);
    assert.match(cssResult.code, /\.c\.v-abc/);

    const skip = await plugin.transform('code', '/project/node_modules/pkg/index.js');
    assert.equal(skip, null);
    const skipCss = await plugin.transform('.x{}', '/project/x.css');
    assert.equal(skipCss, null);

    const scopedNoQuery = await plugin.transform('.y { }', '/project/src/y.scss');
    assert.equal(scopedNoQuery, null);
  });

  it('exports default alias', () => {
    const vite = require('../vite/index');
    assert.equal(vite, vite.default);
  });
});

describe('rspack helper', () => {
  it('withReactScopeStyle appends loader rule', () => {
    const rspack = require('../rspack/index');
    const withReactScopeStyle = rspack.default || rspack;
    const config = withReactScopeStyle({});
    assert.ok(config.module.rules.length >= 1);
    assert.match(config.module.rules[0].use[0].loader, /loader[\\/]index\.js$/);
    const chained = withReactScopeStyle({ module: { rules: [] } }, { sourceMap: true });
    assert.equal(chained.module.rules.length, 1);
    assert.equal(chained.module.rules[0].use[0].options.sourceMap, true);
    assert.equal(rspack.default || rspack, withReactScopeStyle);
  });
});

describe('lib/process-scope-css', () => {
  it('processScopeStyleCss handles query string', async () => {
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
    assert.match(out, /\.lib\.v-lib/);
  });

  it('processScopeStyleCss throws on invalid query', async () => {
    const { processScopeStyleCss } = require('../lib/process-scope-css');
    await assert.rejects(
      () => processScopeStyleCss('.x { }', '?scope-style&scoped=true'),
      /Invalid scope-style query/
    );
  });
});

describe('transform-class edge', () => {
  it('skips transform when react is not imported', async () => {
    const { transformWithPreset } = require('./helpers');
    const code = transformWithPreset(`
import './x.scss?scoped';
export function A() { return <div className={['a']} />; }
`, { filename: '/p/NoReact.js' });
    assert.doesNotMatch(code, /classnames/i);
    assert.doesNotMatch(code, /clsx/i);
  });
});
