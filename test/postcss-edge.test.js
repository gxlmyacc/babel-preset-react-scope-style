const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { runPostcssScope, multiScopeContexts, resetScopeOptions } = require('./helpers');

describe('postcss edge cases', () => {
  it('rewrites scoped url inside @import', async () => {
    resetScopeOptions();
    const css = await runPostcssScope(
      '@import url("./partial.scss?scoped");\n.main { color: black; }',
      { scoped: true, id: 'v-import' }
    );
    assert.match(css, /scope-style&scoped=true&id=v-import/);
    assert.match(css, /\.main\.v-import/);
  });

  it('scopeFn in options rewrites nested import url', async () => {
    resetScopeOptions({
      scopeFn: (p1, query) => (query ? `${p1}${query}` : `${p1}?custom`),
    });
    const css = await runPostcssScope(
      '@import url("./part.scss?global");\n.x { }',
      { scoped: true, id: 'v-z' }
    );
    assert.match(css, /part\.scss\?custom/);
  });

  it('scopeFn with scope id on scoped nested import', async () => {
    resetScopeOptions({
      scopeFn: (p1, query, meta) => {
        assert.ok(meta.scopeId);
        return p1 + query;
      },
    });
    await runPostcssScope(
      '@import url("./p.scss?scoped");\n.a { color: red; }',
      { scoped: true, id: 'v-fn' }
    );
  });

  it('plugin options as factory function', async () => {
    const css = await runPostcssScope('.a { }', () => ({
      scoped: true,
      id: 'v-factory',
    }));
    assert.match(css, /\.a\.v-factory/);
  });

  it('ignores opts without scoped id', async () => {
    const css = await runPostcssScope('.a { color: red; }', [
      { scoped: false, id: 'v-skip' },
      { scoped: true, id: 'v-ok' },
    ]);
    assert.match(css, /\.a\.v-ok/);
    assert.doesNotMatch(css, /\.v-skip/);
  });

  it('factory returning falsy skips processing', async () => {
    const css = await runPostcssScope('.a { color: red; }', () => null);
    assert.equal(css, '.a { color: red; }');
  });

  it('normalizeNodes removes duplicate @import nodes', () => {
    const postcss = require('postcss');
    const { normalizeNodes } = require('../postcss/plugin');
    const nodes = [
      postcss.atRule({ name: 'import', params: '"dup.css"' }),
      postcss.rule({ selector: '.a', nodes: [] }),
      postcss.atRule({ name: 'import', params: '"dup.css"' }),
    ];
    normalizeNodes(nodes);
    assert.equal(nodes.filter((n) => n.type === 'atrule' && n.name === 'import').length, 1);
  });

  it('leaves non-scoped import url when scopeFn is absent', async () => {
    resetScopeOptions();
    const css = await runPostcssScope(
      '@import url("./only-global.scss?global");\n.z { }',
      { scoped: true, id: 'v-plain' }
    );
    assert.match(css, /only-global\.scss\?global/);
    assert.doesNotMatch(css, /scope-style/);
  });

  it('scopeFn on import url without scoped suffix', async () => {
    resetScopeOptions({
      scopeFn: (p1) => `${p1}?custom`,
    });
    const css = await runPostcssScope(
      '@import url("./token.scss?global");\n.z { }',
      { scoped: true, id: 'v-tok' }
    );
    assert.match(css, /token\.scss\?custom/);
  });

  it('dedupes duplicate @import when merging scopes', async () => {
    const input = '@import "./dup.css";\n.btn { color: red; }';
    const css = await runPostcssScope(input, multiScopeContexts(['v-a', 'v-b']));
    assert.equal((css.match(/@import/g) || []).length, 1);
  });

  it('dedupes global scope contexts in normalizeOpts', async () => {
    const css = await runPostcssScope('.g { }', [
      { scoped: true, global: true, id: 'v-' },
      { scoped: true, global: true, id: 'v-' },
      { scoped: true, id: 'v-local' },
    ]);
    assert.match(css, /\.g\[class\*=v-\]\.v-local/);
  });

  it('options.scope function acts as scopeFn', async () => {
    resetScopeOptions({
      scope: (p1, query) => (query ? `${p1}${query}` : `${p1}?fn`),
    });
    const css = await runPostcssScope(
      '@import url("./fn.scss?scoped");\n.r { }',
      { scoped: true, id: 'v-fn2' }
    );
    assert.match(css, /fn\.scss\?scope-style/);
  });

  it('selector-scope handles empty selector and pre-scoped global attribute', async () => {
    const { scopeSelector } = require('../postcss/selector-scope');
    assert.equal(scopeSelector('   ', { id: 'v-e', isGlobal: false }), '   ');
    const css = await runPostcssScope('.box[class*="v-g"] { color: green; }', {
      scoped: true,
      global: true,
      id: 'v-g',
    });
    assert.match(css, /\[class\*="v-g"\]/);
    assert.equal((css.match(/\[class\*="v-g"\]/g) || []).length, 1);
  });

  it('skips webkit-keyframes inner rules', async () => {
    const css = await runPostcssScope(
      '@-webkit-keyframes spin { from { transform: rotate(0); } }',
      { scoped: true, id: 'v-wk' }
    );
    assert.doesNotMatch(css, /\.v-wk/);
  });

  it('selectorAlreadyScoped skips duplicate scope class', async () => {
    const css = await runPostcssScope('.btn.v-x { color: red; }', {
      scoped: true,
      id: 'v-x',
    });
    assert.equal(css.match(/\.v-x/g).length, 1);
  });

  describe('postcss v7 wrapper', () => {
    let pkgPath;
    let indexPath;
    let originalPkg;

    before(() => {
      pkgPath = require.resolve('postcss/package.json');
      indexPath = require.resolve('../postcss/index');
      originalPkg = require(pkgPath);
    });

    after(() => {
      require.cache[pkgPath] = { id: pkgPath, filename: pkgPath, loaded: true, exports: originalPkg };
      delete require.cache[indexPath];
    });

    it('uses postcss.plugin when major version is 7', async () => {
      require.cache[pkgPath] = {
        id: pkgPath,
        filename: pkgPath,
        loaded: true,
        exports: { ...originalPkg, version: '7.0.34' },
      };
      delete require.cache[indexPath];
      const createPlugin = require('../postcss/index');
      const wrapped = createPlugin({ scoped: true, id: 'v-seven' });
      assert.ok(typeof wrapped === 'function');
      assert.ok(wrapped.postcssPlugin || wrapped.postcss);
      const css = '.p { padding: 0; }';
      const postcss = require('postcss');
      const result = await postcss([wrapped]).process(css, { from: undefined });
      assert.match(result.css, /\.p\.v-seven/);
      delete require.cache[indexPath];
    });
  });
});
