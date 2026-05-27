const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  runPostcssScope,
  multiScopeContexts,
  splitScopedCssBlocks,
} = require('./helpers');

describe('PostCSS 作用域插件', () => {
  it('为选择器追加组件 scope class', async () => {
    const css = await runPostcssScope('.btn { color: red; }', {
      scoped: true,
      id: 'v-test123',
    });
    assert.equal(css, '.btn.v-test123 { color: red; }');
  });

  it('处理逗号分隔的多选择器', async () => {
    const css = await runPostcssScope('.a, .b { color: red; }', {
      scoped: true,
      id: 'v-x',
    });
    assert.equal(css, '.a.v-x, .b.v-x { color: red; }');
  });

  it('global 作用域使用 attribute 选择器', async () => {
    const css = await runPostcssScope('.btn { color: blue; }', {
      scoped: true,
      global: true,
      id: 'v-',
    });
    assert.equal(css, '.btn[class*=v-] { color: blue; }');
  });

  it('将 :scope 替换为 scope class', async () => {
    const css = await runPostcssScope(':scope .inner { margin: 0; }', {
      scoped: true,
      id: 'v-abc',
    });
    assert.equal(css, '.v-abc .inner { margin: 0; }');
  });

  it('将附着式 :scope 伪类替换为 scope class', async () => {
    const css = await runPostcssScope('.container:scope .btn { color: red; }', {
      scoped: true,
      id: 'v-abc',
    });
    assert.equal(css, '.container.v-abc .btn { color: red; }');
  });

  it('为 @media 内规则加作用域', async () => {
    const css = await runPostcssScope('@media (min-width: 768px) { .panel { display: block; } }', {
      scoped: true,
      id: 'v-m',
    });
    assert.equal(css, '@media (min-width: 768px) { .panel.v-m { display: block; } }');
  });

  it('为 @supports 内规则加作用域', async () => {
    const css = await runPostcssScope('@supports (display: grid) { .grid { display: grid; } }', {
      scoped: true,
      id: 'v-g',
    });
    assert.equal(css, '@supports (display: grid) { .grid.v-g { display: grid; } }');
  });

  it('不对 @keyframes 关键帧步骤加作用域', async () => {
    const css = await runPostcssScope('@keyframes fade { from { opacity: 0; } to { opacity: 1; } }', {
      scoped: true,
      id: 'v-k',
    });
    assert.equal(css, '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }');
  });

  it('去掉行首 :global 后规则不参与作用域', async () => {
    const css = await runPostcssScope(':global .utility { margin: 0; }', {
      scoped: true,
      id: 'v-z',
    });
    assert.equal(css, '.utility { margin: 0; }');
  });

  it('不支持 :global(...) 语法', async () => {
    const css = await runPostcssScope(':global(.reset) { margin: 0; }', {
      scoped: true,
      id: 'v-z',
    });
    assert.equal(css, ':global(.reset) { margin: 0; }');
  });

  it('嵌套中仅对第一个 :global 前的部分加作用域', async () => {
    const css = await runPostcssScope('.container :global .ant-btn { color: red; }', {
      scoped: true,
      id: 'v-n',
    });
    assert.equal(css, '.container.v-n .ant-btn { color: red; }');
  });

  it('同时存在 :scope 与 :global 时以 :scope 为准', async () => {
    const css = await runPostcssScope('.wrap:scope :global .ext { color: blue; }', {
      scoped: true,
      id: 'v-s',
    });
    assert.equal(css, '.wrap.v-s .ext { color: blue; }');
  });

  describe('单选择器内多个 :scope / :global（嵌套扁平化）', () => {
    it('同一复合选择器内替换所有 :scope', async () => {
      const css = await runPostcssScope('.a:scope .b:scope .c { color: red; }', {
        scoped: true,
        id: 'v-multi-scope',
      });
      assert.equal(css, '.a.v-multi-scope .b.v-multi-scope .c { color: red; }');
    });

    it('仅作用域第一个 :global 前前缀并去掉其余 :global', async () => {
      const css = await runPostcssScope('.outer :global .mid :global .inner { color: red; }', {
        scoped: true,
        id: 'v-multi-global',
      });
      assert.equal(css, '.outer.v-multi-global .mid .inner { color: red; }');
    });

    it('存在 :scope 时去掉所有中间 :global', async () => {
      const css = await runPostcssScope('.wrap:scope :global .x :global .y { color: blue; }', {
        scoped: true,
        id: 'v-both',
      });
      assert.equal(css, '.wrap.v-both .x .y { color: blue; }');
    });

    it(':scope 标记作用域位置，:global 仅剥离后缀', async () => {
      const css = await runPostcssScope('.a :scope .b :global .c { color: green; }', {
        scoped: true,
        id: 'v-mix',
      });
      assert.equal(css, '.a .v-mix .b .c { color: green; }');
    });

    it('组合符链中在第一个 :global 前加作用域', async () => {
      const css = await runPostcssScope('.a + .b :global .c { color: navy; }', {
        scoped: true,
        id: 'v-seg',
      });
      assert.equal(css, '.a + .b.v-seg .c { color: navy; }');
    });

    it('对 :global 前的多 class 片段加作用域', async () => {
      const css = await runPostcssScope('.card.cell :global .inner { color: teal; }', {
        scoped: true,
        id: 'v-cell',
      });
      assert.equal(css, '.card.cell.v-cell .inner { color: teal; }');
    });

    it('逗号分隔的每个选择器独立应用 :scope', async () => {
      const css = await runPostcssScope(
        '.x:scope .y, .p:scope .q { margin: 0; }',
        { scoped: true, id: 'v-comma' }
      );
      assert.equal(css, '.x.v-comma .y, .p.v-comma .q { margin: 0; }');
    });
  });

  it('导出 PostCSS 8 兼容的插件形态', () => {
    const pluginFactory = require('../postcss');
    const instance = pluginFactory({ scoped: true, id: 'v-1' });
    assert.equal(instance.postcss, true);
    assert.equal(instance().postcssPlugin, 'postcss-scope-style-add-id');
  });

  describe('多 scope（共享样式表、多引用方）', () => {
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

    it('同一输出文件为每个引用方生成一份 scoped 副本', async () => {
      const css = await runPostcssScope(sharedCss, multiScopeContexts([importerA, importerB]));
      const blocks = splitScopedCssBlocks(css);

      assert.equal(blocks.length, 4);
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

    it('支持三个引用方引用同一 CSS', async () => {
      const ids = ['v-aaa111', 'v-bbb222', 'v-ccc333'];
      const css = await runPostcssScope('.chip { padding: 4px; }', multiScopeContexts(ids));

      assert.equal(
        css,
        [
          '.chip.v-aaa111 { padding: 4px; }',
          '.chip.v-bbb222 { padding: 4px; }',
          '.chip.v-ccc333 { padding: 4px; }',
        ].join('\n')
      );
      assert.equal(splitScopedCssBlocks(css).length, 3);
    });

    it('为每个 scope 上下文复制 @media 规则', async () => {
      const input = '@media (min-width: 768px) { .panel { display: flex; } }';
      const css = await runPostcssScope(input, multiScopeContexts([importerA, importerB]));

      assert.equal(
        css,
        [
          '@media (min-width: 768px) { .panel.v-7f3a9c2e { display: flex; } }',
          '@media (min-width: 768px) { .panel.v-1b8d4e60 { display: flex; } }',
        ].join('\n')
      );
    });

    it('对重复 import 的相同 scope id 去重', async () => {
      const css = await runPostcssScope(
        '.box { margin: 0; }',
        multiScopeContexts([importerA, importerA])
      );

      assert.equal(css, '.box.v-7f3a9c2e { margin: 0; }');
      assert.equal(splitScopedCssBlocks(css).length, 1);
    });

    it('首份 scoped 块留在根节点并追加克隆块', async () => {
      const css = await runPostcssScope('.only { opacity: 1; }', multiScopeContexts([importerA, importerB]));
      const idxA = css.indexOf(`.only.${importerA}`);
      const idxB = css.indexOf(`.only.${importerB}`);

      assert.ok(idxA >= 0 && idxB > idxA, 'importer B block should follow importer A');
    });

    it('合并多 scope 时 @import 仅保留在文件头部一份', async () => {
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
      assert.equal(
        css,
        [
          "@import './vars.css';",
          "@import './theme.css';",
          `.btn.${importerA} { color: red; }`,
          `.btn.${importerB} { color: red; }`,
        ].join('\n')
      );
    });
  });
});
