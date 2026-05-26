const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  runPostcssScope,
  multiScopeContexts,
  splitScopedCssBlocks,
} = require('./helpers');

describe('postcss scope plugin', () => {
  it('appends component scope class to selector', async () => {
    const css = await runPostcssScope('.btn { color: red; }', {
      scoped: true,
      id: 'v-test123',
    });
    assert.equal(css, '.btn.v-test123 { color: red; }');
  });

  it('scopes comma-separated selectors', async () => {
    const css = await runPostcssScope('.a, .b { color: red; }', {
      scoped: true,
      id: 'v-x',
    });
    assert.equal(css, '.a.v-x, .b.v-x { color: red; }');
  });

  it('uses attribute selector for global scope', async () => {
    const css = await runPostcssScope('.btn { color: blue; }', {
      scoped: true,
      global: true,
      id: 'v-',
    });
    assert.match(css, /\[class\*=/);
  });

  it('replaces :scope with scope class', async () => {
    const css = await runPostcssScope(':scope .inner { margin: 0; }', {
      scoped: true,
      id: 'v-abc',
    });
    assert.match(css, /\.v-abc/);
    assert.doesNotMatch(css, /:scope/);
  });

  it('replaces attached :scope pseudo', async () => {
    const css = await runPostcssScope('.container:scope .btn { color: red; }', {
      scoped: true,
      id: 'v-abc',
    });
    assert.match(css, /\.container\.v-abc/);
    assert.doesNotMatch(css, /:scope/);
  });

  it('scopes rules inside @media', async () => {
    const css = await runPostcssScope('@media (min-width: 768px) { .panel { display: block; } }', {
      scoped: true,
      id: 'v-m',
    });
    assert.match(css, /\.panel\.v-m/);
  });

  it('scopes rules inside @supports', async () => {
    const css = await runPostcssScope('@supports (display: grid) { .grid { display: grid; } }', {
      scoped: true,
      id: 'v-g',
    });
    assert.match(css, /\.grid\.v-g/);
  });

  it('does not scope @keyframes steps', async () => {
    const css = await runPostcssScope('@keyframes fade { from { opacity: 0; } to { opacity: 1; } }', {
      scoped: true,
      id: 'v-k',
    });
    assert.match(css, /from\s*\{\s*opacity:\s*0/);
    assert.doesNotMatch(css, /\.v-k/);
  });

  it('strips leading :global so the rule is not scoped', async () => {
    const css = await runPostcssScope(':global .utility { margin: 0; }', {
      scoped: true,
      id: 'v-z',
    });
    assert.equal(css, '.utility { margin: 0; }');
  });

  it('does not treat :global(...) as supported syntax', async () => {
    const css = await runPostcssScope(':global(.reset) { margin: 0; }', {
      scoped: true,
      id: 'v-z',
    });
    assert.equal(css, ':global(.reset) { margin: 0; }');
  });

  it('scopes the part before middle :global from nesting', async () => {
    const css = await runPostcssScope('.container :global .ant-btn { color: red; }', {
      scoped: true,
      id: 'v-n',
    });
    assert.equal(css, '.container.v-n .ant-btn { color: red; }');
  });

  it('uses :scope instead of middle :global when both appear', async () => {
    const css = await runPostcssScope('.wrap:scope :global .ext { color: blue; }', {
      scoped: true,
      id: 'v-s',
    });
    assert.match(css, /\.wrap\.v-s/);
    assert.doesNotMatch(css, /:global/);
    assert.match(css, /\.ext/);
  });

  describe('multiple :scope / :global in one selector (nested flatten)', () => {
    it('replaces every :scope in the same compound selector', async () => {
      const css = await runPostcssScope('.a:scope .b:scope .c { color: red; }', {
        scoped: true,
        id: 'v-multi-scope',
      });
      assert.equal(css, '.a.v-multi-scope .b.v-multi-scope .c { color: red; }');
      assert.doesNotMatch(css, /:scope/);
    });

    it('scopes only prefix before first :global and strips the rest', async () => {
      const css = await runPostcssScope('.outer :global .mid :global .inner { color: red; }', {
        scoped: true,
        id: 'v-multi-global',
      });
      assert.equal(css, '.outer.v-multi-global .mid .inner { color: red; }');
      assert.doesNotMatch(css, /:global/);
    });

    it('with :scope present, strips all middle :global markers', async () => {
      const css = await runPostcssScope('.wrap:scope :global .x :global .y { color: blue; }', {
        scoped: true,
        id: 'v-both',
      });
      assert.equal(css, '.wrap.v-both .x .y { color: blue; }');
      assert.doesNotMatch(css, /:scope|:global/);
    });

    it(':scope marks scope position; :global only strips (suffix stays unscoped)', async () => {
      const css = await runPostcssScope('.a :scope .b :global .c { color: green; }', {
        scoped: true,
        id: 'v-mix',
      });
      assert.equal(css, '.a .v-mix .b .c { color: green; }');
      assert.doesNotMatch(css, /:scope|:global/);
    });

    it('scopes prefix before first :global in combinator chains', async () => {
      const css = await runPostcssScope('.a + .b :global .c { color: navy; }', {
        scoped: true,
        id: 'v-seg',
      });
      assert.equal(css, '.a + .b.v-seg .c { color: navy; }');
    });

    it('scopes a multi-class segment before :global', async () => {
      const css = await runPostcssScope('.card.cell :global .inner { color: teal; }', {
        scoped: true,
        id: 'v-cell',
      });
      assert.equal(css, '.card.cell.v-cell .inner { color: teal; }');
    });

    it('applies :scope independently per comma-separated selector', async () => {
      const css = await runPostcssScope(
        '.x:scope .y, .p:scope .q { margin: 0; }',
        { scoped: true, id: 'v-comma' }
      );
      assert.equal(css, '.x.v-comma .y, .p.v-comma .q { margin: 0; }');
    });
  });

  it('handles >>> deep combinator', async () => {
    const css = await runPostcssScope('.wrap >>> .deep { color: green; }', {
      scoped: true,
      id: 'v-d',
    });
    assert.match(css, /\.wrap\.v-d\s+\.deep/);
  });

  it('exports postcss 8 compatible plugin shape', () => {
    const pluginFactory = require('../postcss');
    const instance = pluginFactory({ scoped: true, id: 'v-1' });
    assert.equal(instance.postcss, true);
    assert.equal(instance().postcssPlugin, 'postcss-scope-style-add-id');
  });

  describe('multi-scope (shared stylesheet, multiple importers)', () => {
    const sharedCss = [
      '.btn { color: red; }',
      '.title { font-size: 14px; }',
    ].join('\n');

    /**
     * 模拟两个组件文件引用同一 scoped 样式后，构建合并传入的 scope id。
     * 对应 inject-scope 为 /src/Button.jsx 与 /src/Card.jsx 生成的不同 hash。
     */
    const importerA = 'v-7f3a9c2e';
    const importerB = 'v-1b8d4e60';

    it('emits one scoped copy per importer in the same output file', async () => {
      const css = await runPostcssScope(sharedCss, multiScopeContexts([importerA, importerB]));
      const blocks = splitScopedCssBlocks(css);

      assert.equal(blocks.length, 4);
      assert.match(css, new RegExp(`\\.btn\\.${importerA}`));
      assert.match(css, new RegExp(`\\.title\\.${importerA}`));
      assert.match(css, new RegExp(`\\.btn\\.${importerB}`));
      assert.match(css, new RegExp(`\\.title\\.${importerB}`));
      assert.equal(
        css,
        [
          `.btn.${importerA} { color: red; }`,
          `.title.${importerA} { font-size: 14px; }`,
          `.btn.${importerB} { color: red; }`,
          `.title.${importerB} { font-size: 14px; }`,
        ].join('\n')
      );
    });

    it('supports three importers referencing the same css', async () => {
      const ids = ['v-aaa111', 'v-bbb222', 'v-ccc333'];
      const css = await runPostcssScope('.chip { padding: 4px; }', multiScopeContexts(ids));

      ids.forEach((id) => {
        assert.match(css, new RegExp(`\\.chip\\.${id}`));
      });
      assert.equal(splitScopedCssBlocks(css).length, 3);
    });

    it('duplicates @media rules for each scope context', async () => {
      const input = '@media (min-width: 768px) { .panel { display: flex; } }';
      const css = await runPostcssScope(input, multiScopeContexts([importerA, importerB]));

      assert.equal((css.match(/@media/g) || []).length, 2);
      assert.match(css, new RegExp(`\\.panel\\.${importerA}`));
      assert.match(css, new RegExp(`\\.panel\\.${importerB}`));
    });

    it('deduplicates identical scope ids from repeated imports', async () => {
      const css = await runPostcssScope(
        '.box { margin: 0; }',
        multiScopeContexts([importerA, importerA])
      );

      assert.equal(splitScopedCssBlocks(css).length, 1);
      assert.match(css, new RegExp(`\\.box\\.${importerA}`));
      assert.equal((css.match(new RegExp(`\\.box\\.${importerA}`, 'g')) || []).length, 1);
    });

    it('keeps first scoped block in root and appends clones (template replaceAll)', async () => {
      const css = await runPostcssScope('.only { opacity: 1; }', multiScopeContexts([importerA, importerB]));
      const idxA = css.indexOf(`.only.${importerA}`);
      const idxB = css.indexOf(`.only.${importerB}`);

      assert.ok(idxA >= 0 && idxB > idxA, 'importer B block should follow importer A');
    });

    it('places @import at file head once when merging multi-scope copies', async () => {
      const input = [
        '@import \'./vars.css\';',
        '@import \'./theme.css\';',
        '.btn { color: red; }',
      ].join('\n');
      const css = await runPostcssScope(input, multiScopeContexts([importerA, importerB]));
      const blocks = splitScopedCssBlocks(css);

      assert.equal((css.match(/@import/g) || []).length, 2);
      assert.equal(blocks[0], '@import \'./vars.css\';');
      assert.equal(blocks[1], '@import \'./theme.css\';');
      assert.ok(
        blocks.findIndex((line) => line.startsWith('.btn.')) > 1,
        'scoped rules should follow all @import lines'
      );
      assert.match(css, new RegExp(`\\.btn\\.${importerA}`));
      assert.match(css, new RegExp(`\\.btn\\.${importerB}`));
    });
  });
});
