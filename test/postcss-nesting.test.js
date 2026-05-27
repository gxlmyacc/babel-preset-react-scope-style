const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runPostcssScope } = require('./helpers');
const {
  shouldApplyScope,
  isRuleTreeLeaf,
  isInGlobalSubtree,
} = require('../postcss/nesting-scope');

const scopeOpts = { scoped: true, id: 'v-nest' };

describe('原生 CSS 嵌套作用域', () => {
  it('嵌套 .card { .title {} } 仅叶子挂 scope', async () => {
    const css = await runPostcssScope(
      `.card { color: red; }
.card { .title { font-size: 14px; } }
.card { &:hover { opacity: 0.9; } }`,
      scopeOpts
    );
    assert.equal(
      css,
      `.card.v-nest { color: red; }
.card { .title.v-nest { font-size: 14px; } }
.card { &.v-nest:hover { opacity: 0.9; } }`
    );
  });

  it('扁平 .card .title 与嵌套展开语义一致', async () => {
    const flat = await runPostcssScope('.card .title { color: blue; }', scopeOpts);
    const nested = await runPostcssScope('.card { .title { color: blue; } }', scopeOpts);

    assert.equal(flat, '.card .title.v-nest { color: blue; }');
    assert.equal(nested, '.card { .title.v-nest { color: blue; } }');
  });

  it('非叶子 block 含声明时自动包入 &:scope', async () => {
    const css = await runPostcssScope(
      '.card { color: cyan; .title { margin: 0; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { color: cyan; } .title.v-nest { margin: 0; } }'
    );
  });

  it(':global 块内子选择器不挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { :global { .ext { color: red; } } .local { color: blue; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { & { .ext { color: red; } } .local.v-nest { color: blue; } }'
    );
  });

  it('嵌套 :global 与展平后平坦链作用域一致', async () => {
    const nested = await runPostcssScope(
      '.card { :global { .ext { color: red; } } .local { color: blue; } }',
      scopeOpts
    );
    const flatLocal = await runPostcssScope('.card .local { color: blue; }', scopeOpts);

    assert.equal(nested, '.card { & { .ext { color: red; } } .local.v-nest { color: blue; } }');
    // 展平概念：.card .ext 无 scope（global 段）+ .card .local.v-nest；后者与扁平 rule 相同
    assert.equal(flatLocal, '.card .local.v-nest { color: blue; }');
  });

  it('嵌套裸 :global 包装均改为 & 占位（不合并去掉内层）', async () => {
    const css = await runPostcssScope(
      '.card { :global { :global { .reset { color: red; } } } }',
      scopeOpts
    );
    assert.equal(css, '.card { & { & { .reset { color: red; } } } }');
  });

  it(':global 内 :scope 子块仍生成 scope', async () => {
    const css = await runPostcssScope(
      '.card { :global { :scope { .scoped { color: red; } } } }',
      scopeOpts
    );
    assert.equal(css, '.card { & { &.v-nest { .scoped { color: red; } } } }');
  });

  it('&:global 嵌套块改为 & 占位，子规则不挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { &:global { .ext { color: red; } .local { color: blue; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { & { .ext { color: red; } .local { color: blue; } } }'
    );
  });

  it('附着式 .wrap:global 嵌套块去掉 :global，子规则不挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { .wrap:global { .ext { color: red; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { .wrap { .ext { color: red; } } }'
    );
  });

  it('&:scope 显式块替换为 &.v-nest', async () => {
    const css = await runPostcssScope(
      '.card { &:scope { color: cyan; .inner { margin: 0; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { color: cyan; .inner { margin: 0; } } }'
    );
  });

  it('附着式 .wrap:scope 嵌套块', async () => {
    const css = await runPostcssScope(
      '.card { .wrap:scope { .inner { margin: 0; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { .wrap.v-nest { .inner { margin: 0; } } }'
    );
  });

  it('&:global 内再嵌套裸 :global 均保留为 & 占位', async () => {
    const css = await runPostcssScope(
      '.card { &:global { :global { .ext { color: red; } } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { & { & { .ext { color: red; } } } }'
    );
  });

  it('&:scope 锚点下多层嵌套叶子不再挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { &:scope { .middle { .deep { border: 0; } } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { .middle { .deep { border: 0; } } } }'
    );
  });

  it('&:scope 块内 :global 与嵌套 :scope', async () => {
    const css = await runPostcssScope(
      `.card {
  &:scope {
    color: cyan;
    .inner { margin: 0; }
    :global { .ext { padding: 0; } }
    :scope { .deep { border: 0; } }
  }
}`,
      scopeOpts
    );
    assert.equal(
      css,
      `.card {
  &.v-nest {
    color: cyan;
    .inner { margin: 0; }
    & { .ext { padding: 0; } }
    &.v-nest { .deep { border: 0; } }
  }
}`
    );
  });

  it('@media 内嵌套 rule 仅叶子 scope', async () => {
    const css = await runPostcssScope(
      '@media (min-width: 768px) { .card { .title { color: red; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '@media (min-width: 768px) { .card { .title.v-nest { color: red; } } }'
    );
  });

  it('shouldApplyScope：非叶子不 scope，global 子树叶子不 scope', () => {
    const postcss = require('postcss');
    const root = postcss.parse('.a { .b { color: red; } }');
    const outer = root.first;
    const inner = outer.nodes.find((n) => n.type === 'rule');
    assert.equal(isRuleTreeLeaf(outer), false);
    assert.equal(isRuleTreeLeaf(inner), true);
    assert.equal(shouldApplyScope(outer), false);
    assert.equal(shouldApplyScope(inner), true);

    const globalRoot = postcss.parse('.card { :global { .ext {} } }');
    const card = globalRoot.first;
    const globalWrap = card.nodes.find((n) => n.type === 'rule');
    const ext = globalWrap.nodes.find((n) => n.type === 'rule');
    assert.equal(isInGlobalSubtree(ext), true);
    assert.equal(shouldApplyScope(ext), false);
  });
});
