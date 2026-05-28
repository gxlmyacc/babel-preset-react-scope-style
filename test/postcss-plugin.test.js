const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runPostcssScope, multiScopeContexts, resetScopeOptions } = require('./helpers');

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

  it('扁平选择器将 scope class 插在伪类（如 :hover）之前', async () => {
    const css = await runPostcssScope(
      [
        '.btn:hover { color: red; }',
        '.btn:focus-visible { outline: none; }',
        '.link:active, .link:visited { text-decoration: underline; }',
      ].join('\n'),
      { scoped: true, id: 'v-ph' }
    );
    assert.equal(
      css,
      [
        '.btn.v-ph:hover { color: red; }',
        '.btn.v-ph:focus-visible { outline: none; }',
        '.link.v-ph:active, .link.v-ph:visited { text-decoration: underline; }',
      ].join('\n')
    );
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

  it('附着式 .透传-class:scope 命中子组件内部选择器（扁平写法，className 透传）', async () => {
    const css = await runPostcssScope(
      [
        '.skin-a:scope .child-card__body { background: #e8f5ff; }',
        '.skin-b:scope .child-card__body { background: #ffebe9; }',
      ].join('\n'),
      { scoped: true, id: 'v-pass' }
    );
    assert.equal(
      css,
      [
        '.skin-a.v-pass .child-card__body { background: #e8f5ff; }',
        '.skin-b.v-pass .child-card__body { background: #ffebe9; }',
      ].join('\n')
    );
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

  it('嵌套中分隔式 :global 插入 *.scopeId', async () => {
    const css = await runPostcssScope('.container :global .ant-btn { color: red; }', {
      scoped: true,
      id: 'v-n',
    });
    assert.equal(css, '.container *.v-n .ant-btn { color: red; }');
  });

  describe('扁平中间 :global 与 &:global 嵌套对比', () => {
    it('对比：.container :global .ant-btn vs &:global 嵌套', async () => {
      const flat = await runPostcssScope('.container :global .ant-btn { color: red; }', {
        scoped: true,
        id: 'v-n',
      });
      const ampersand = await runPostcssScope(
        '.container { &:global { .ant-btn { color: red; } } }',
        { scoped: true, id: 'v-n' }
      );
      assert.equal(flat, '.container *.v-n .ant-btn { color: red; }');
      assert.equal(ampersand, '.container { &.v-n { .ant-btn { color: red; } } }');
      assert.notEqual(flat, ampersand);
    });

    it('对比：多段 :global 扁平 vs &:global 嵌套', async () => {
      const flat = await runPostcssScope('.outer :global .mid :global .inner { color: red; }', {
        scoped: true,
        id: 'v-multi-global',
      });
      const ampersand = await runPostcssScope(
        '.outer { &:global { .mid { &:global { .inner { color: red; } } } } }',
        { scoped: true, id: 'v-multi-global' }
      );
      assert.equal(flat, '.outer *.v-multi-global .mid *.v-multi-global .inner { color: red; }');
      assert.equal(
        ampersand,
        '.outer { &.v-multi-global { .mid { &.v-multi-global { .inner { color: red; } } } } }'
      );
      assert.notEqual(flat, ampersand);
    });

    it('对比：:scope + :global 扁平 vs &:global 嵌套', async () => {
      const flat = await runPostcssScope('.wrap:scope :global .ext { color: blue; }', {
        scoped: true,
        id: 'v-s',
      });
      const ampersand = await runPostcssScope(
        '.wrap:scope { &:global { .ext { color: blue; } } }',
        { scoped: true, id: 'v-s' }
      );
      assert.equal(flat, '.wrap.v-s .ext { color: blue; }');
      assert.equal(ampersand, '.wrap.v-s { &.v-s { .ext { color: blue; } } }');
      assert.notEqual(flat, ampersand);
    });

    it('对比：.card.cell :global .inner vs &:global 嵌套', async () => {
      const flat = await runPostcssScope('.card.cell :global .inner { color: teal; }', {
        scoped: true,
        id: 'v-cell',
      });
      const ampersand = await runPostcssScope(
        '.card.cell { &:global { .inner { color: teal; } } }',
        { scoped: true, id: 'v-cell' }
      );
      assert.equal(flat, '.card.cell *.v-cell .inner { color: teal; }');
      assert.equal(ampersand, '.card.cell { &.v-cell { .inner { color: teal; } } }');
      assert.notEqual(flat, ampersand);
    });
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
      assert.equal(css, '.outer *.v-multi-global .mid *.v-multi-global .inner { color: red; }');
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
      assert.equal(css, '.a *.v-mix .b .c { color: green; }');
    });

    it('组合符链中在第一个 :global 前加作用域', async () => {
      const css = await runPostcssScope('.a + .b :global .c { color: navy; }', {
        scoped: true,
        id: 'v-seg',
      });
      assert.equal(css, '.a + .b *.v-seg .c { color: navy; }');
    });

    it('对 :global 前的多 class 片段加作用域', async () => {
      const css = await runPostcssScope('.card.cell :global .inner { color: teal; }', {
        scoped: true,
        id: 'v-cell',
      });
      assert.equal(css, '.card.cell *.v-cell .inner { color: teal; }');
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
    });

    it('首份 scoped 块留在根节点并追加克隆块', async () => {
      const css = await runPostcssScope('.only { opacity: 1; }', multiScopeContexts([importerA, importerB]));
      assert.equal(
        css,
        [
          `.only.${importerA} { opacity: 1; }`,
          `.only.${importerB} { opacity: 1; }`,
        ].join('\n')
      );
    });

    it('合并多 scope 时 @import 仅保留在文件头部一份', async () => {
      const input = [
        '@import \'./vars.css\';',
        '@import \'./theme.css\';',
        '.btn { color: red; }',
      ].join('\n');
      const css = await runPostcssScope(input, multiScopeContexts([importerA, importerB]));
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

    it('合并多 scope 时 @import url 的 ?scoped 按各 scope id 各生成一条 scope-style import', async () => {
      resetScopeOptions();
      const input = [
        "@import url('./partial.scss?scoped');",
        "@import './theme.css';",
        '.btn { color: red; }',
      ].join('\n');
      const css = await runPostcssScope(input, multiScopeContexts([importerA, importerB]));
      assert.equal(
        css,
        [
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerA}');`,
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerB}');`,
          "@import './theme.css';",
          `.btn.${importerA} { color: red; }`,
          `.btn.${importerB} { color: red; }`,
        ].join('\n')
      );
    });

    it('?scoped 的 @import 不在首位时，各 scope 的 scope-style import 仍插在源位置', async () => {
      resetScopeOptions();
      const input = [
        "@import './vars.css';",
        "@import url('./partial.scss?scoped');",
        "@import './theme.css';",
        '.btn { color: red; }',
      ].join('\n');
      const css = await runPostcssScope(input, multiScopeContexts([importerA, importerB]));
      assert.equal(
        css,
        [
          "@import './vars.css';",
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerA}');`,
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerB}');`,
          "@import './theme.css';",
          `.btn.${importerA} { color: red; }`,
          `.btn.${importerB} { color: red; }`,
        ].join('\n')
      );
    });

    it('同时存在 global 与 local scope 时，?scoped 的 @import 按各上下文分别改写', async () => {
      resetScopeOptions();
      const input = [
        "@import url('./partial.scss?scoped');",
        '.g { color: red; }',
      ].join('\n');
      const css = await runPostcssScope(input, [
        { scoped: true, global: true, id: 'v-' },
        { scoped: true, global: false, id: importerA },
        { scoped: true, global: false, id: importerB },
      ]);
      assert.equal(
        css,
        [
          "@import url('./partial.scss?scope-style&scoped=true&global=true&id=v-');",
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerA}');`,
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerB}');`,
          '.g[class*=v-] { color: red; }',
          `.g.${importerA} { color: red; }`,
          `.g.${importerB} { color: red; }`,
        ].join('\n')
      );
    });

    it('global 与 local 混排且 ?scoped 不在首位时，scope-style import 插在 vars 与 theme 之间', async () => {
      resetScopeOptions();
      const input = [
        "@import './vars.css';",
        "@import url('./partial.scss?scoped');",
        "@import './theme.css';",
        '.g { color: red; }',
      ].join('\n');
      const css = await runPostcssScope(input, [
        { scoped: true, global: true, id: 'v-' },
        { scoped: true, global: false, id: importerA },
        { scoped: true, global: false, id: importerB },
      ]);
      assert.equal(
        css,
        [
          "@import './vars.css';",
          "@import url('./partial.scss?scope-style&scoped=true&global=true&id=v-');",
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerA}');`,
          `@import url('./partial.scss?scope-style&scoped=true&id=${importerB}');`,
          "@import './theme.css';",
          '.g[class*=v-] { color: red; }',
          `.g.${importerA} { color: red; }`,
          `.g.${importerB} { color: red; }`,
        ].join('\n')
      );
    });
  });
});
