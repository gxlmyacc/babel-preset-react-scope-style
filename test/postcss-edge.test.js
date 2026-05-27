const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { runPostcssScope, multiScopeContexts, resetScopeOptions } = require('./helpers');

describe('PostCSS 边界情况', () => {
  /**
   * 样式内 @import 的 `?scoped` 与 JS import 的 `?scoped` 含义不同：
   * 仅表示「沿用当前正在被处理的这份样式文件的作用域」。
   * 子文件无法单独生成 JS hash，故只支持 `?scoped` 这一种后缀参与改写。
   */
  describe('@import url ?scoped（沿用当前样式文件作用域）', () => {
    it('父文件为组件 scoped 时，子 import 的 ?scoped 等价于 JS 的 ?scoped', async () => {
      resetScopeOptions();
      const css = await runPostcssScope(
        '@import url("./partial.scss?scoped");\n.main { color: black; }',
        { scoped: true, global: false, id: 'v-parent-scoped' }
      );
      assert.match(
        css,
        /partial\.scss\?scope-style&scoped=true&id=v-parent-scoped/
      );
      assert.doesNotMatch(css, /scope-style&scoped=true&global=true/);
      assert.match(css, /\.main\.v-parent-scoped/);
    });

    it('父文件为 global 时，子 import 的 ?scoped 等价于 JS 的 ?global', async () => {
      resetScopeOptions();
      const css = await runPostcssScope(
        '@import url("./shared.scss?scoped");\n.util { margin: 0; }',
        { scoped: true, global: true, id: 'v-parent-global' }
      );
      assert.match(
        css,
        /shared\.scss\?scope-style&scoped=true&global=true&id=v-parent-global/
      );
      assert.match(css, /\.util\[class\*=v-parent-global\]/);
    });

    it('import 仅识别 ?scoped 后缀，?global 不会注入 scope-style', async () => {
      resetScopeOptions();
      const css = await runPostcssScope(
        [
          '@import url("./keep-global.scss?global");',
          '@import url("./plain.scss");',
          '.z { }',
        ].join('\n'),
        { scoped: true, id: 'v-plain' }
      );
      assert.match(css, /keep-global\.scss\?global/);
      assert.match(css, /plain\.scss/);
      assert.doesNotMatch(css, /scope-style/);
    });

    it('无 scopeFn 时非 ?scoped 的 import 保持原样', async () => {
      resetScopeOptions();
      const css = await runPostcssScope(
        '@import url("./only-global.scss?global");\n.z { }',
        { scoped: true, id: 'v-plain' }
      );
      assert.match(css, /only-global\.scss\?global/);
      assert.doesNotMatch(css, /scope-style/);
    });
  });

  it('options.scopeFn 改写嵌套 import 的 url', async () => {
    resetScopeOptions({
      scopeFn: (p1, query) => (query ? `${p1}${query}` : `${p1}?custom`),
    });
    const css = await runPostcssScope(
      '@import url("./part.scss?global");\n.x { }',
      { scoped: true, id: 'v-z' }
    );
    assert.match(css, /part\.scss\?custom/);
  });

  it('嵌套 ?scoped import 时 scopeFn 收到 scopeId', async () => {
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

  it('父文件为 global 时 scopeFn 收到 global:true', async () => {
    resetScopeOptions({
      scopeFn: (p1, query, meta) => {
        assert.equal(meta.global, true);
        assert.equal(meta.scopeId, 'v-g-parent');
        return p1 + query;
      },
    });
    await runPostcssScope(
      '@import url("./child.scss?scoped");\n.a { }',
      { scoped: true, global: true, id: 'v-g-parent' }
    );
  });

  it('插件 options 可为工厂函数', async () => {
    const css = await runPostcssScope('.a { }', () => ({
      scoped: true,
      id: 'v-factory',
    }));
    assert.match(css, /\.a\.v-factory/);
  });

  it('忽略无 scoped/id 的配置项', async () => {
    const css = await runPostcssScope('.a { color: red; }', [
      { scoped: false, id: 'v-skip' },
      { scoped: true, id: 'v-ok' },
    ]);
    assert.match(css, /\.a\.v-ok/);
    assert.doesNotMatch(css, /\.v-skip/);
  });

  it('工厂返回假值时跳过处理', async () => {
    const css = await runPostcssScope('.a { color: red; }', () => null);
    assert.equal(css, '.a { color: red; }');
  });

  it('normalizeNodes 去重重复的 @import', () => {
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

  it('无 ?scoped 后缀时 scopeFn 仍可改写 import url', async () => {
    resetScopeOptions({
      scopeFn: (p1) => `${p1}?custom`,
    });
    const css = await runPostcssScope(
      '@import url("./token.scss?global");\n.z { }',
      { scoped: true, id: 'v-tok' }
    );
    assert.match(css, /token\.scss\?custom/);
  });

  it('合并多 scope 时对重复 @import 去重', async () => {
    const input = '@import "./dup.css";\n.btn { color: red; }';
    const css = await runPostcssScope(input, multiScopeContexts(['v-a', 'v-b']));
    assert.equal((css.match(/@import/g) || []).length, 1);
  });

  it('normalizeOpts 对重复 global scope 去重', async () => {
    const css = await runPostcssScope('.g { }', [
      { scoped: true, global: true, id: 'v-' },
      { scoped: true, global: true, id: 'v-' },
      { scoped: true, id: 'v-local' },
    ]);
    assert.match(css, /\.g\[class\*=v-\]\.v-local/);
  });

  it('options.scope 函数充当 scopeFn', async () => {
    resetScopeOptions({
      scope: (p1, query) => (query ? `${p1}${query}` : `${p1}?fn`),
    });
    const css = await runPostcssScope(
      '@import url("./fn.scss?scoped");\n.r { }',
      { scoped: true, id: 'v-fn2' }
    );
    assert.match(css, /fn\.scss\?scope-style/);
  });

  it('selector-scope 处理空选择器与已带 global 属性的选择器', async () => {
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

  it('跳过 @-webkit-keyframes 内部规则', async () => {
    const css = await runPostcssScope(
      '@-webkit-keyframes spin { from { transform: rotate(0); } }',
      { scoped: true, id: 'v-wk' }
    );
    assert.doesNotMatch(css, /\.v-wk/);
  });

  it('selectorAlreadyScoped 避免重复追加 scope class', async () => {
    const css = await runPostcssScope('.btn.v-x { color: red; }', {
      scoped: true,
      id: 'v-x',
    });
    assert.equal(css.match(/\.v-x/g).length, 1);
  });

  describe('PostCSS 7 包装层', () => {
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

    it('PostCSS 7 主版本时使用 postcss.plugin 包装', async () => {
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
