const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const selectorParser = require('postcss-selector-parser');
const { runPostcssScope } = require('./helpers');
const {
  scopeSelector,
  isLeadingGlobalRule,
  stripLeadingGlobal,
  stripLeadingGlobalFromAllSelectors,
  appendScopeToSelector,
  selectorAlreadyScoped,
  stripMiddleGlobalPseudo,
  scopeSelectorBeforeMiddleGlobal,
} = require('../postcss/selector-scope');

/**
 * 将选择器字符串解析为 postcss-selector-parser 的 Selector 节点。
 * @param {string} input - 选择器文本
 * @returns {import('postcss-selector-parser').Selector}
 */
function parseSelector(input) {
  let selector;
  selectorParser((selectors) => {
    selectors.each((sel) => {
      selector = sel;
    });
  }).processSync(input);
  return selector;
}

describe('selector-scope 分支覆盖', () => {
  it('isLeadingGlobalRule 与 stripLeadingGlobal 处理裸 :global', () => {
    assert.equal(isLeadingGlobalRule(':global'), true);
    assert.equal(stripLeadingGlobal(':global', '.x'), '.x');
  });

  it('stripLeadingGlobalFromAllSelectors 去掉逗号列表中每段行首 :global', () => {
    const norm = (s) => s.replace(/,\s*/g, ', ');
    assert.equal(
      norm(stripLeadingGlobalFromAllSelectors(':global *, :global *::before, :global *::after')),
      '*, *::before, *::after'
    );
    assert.equal(
      norm(stripLeadingGlobalFromAllSelectors(':global html, :global body')),
      'html, body'
    );
    assert.equal(
      norm(stripLeadingGlobalFromAllSelectors('html, :global body')),
      'html, body'
    );
    assert.equal(stripLeadingGlobalFromAllSelectors('html, body'), 'html, body');
  });

  it('仅空白的选择器原样返回', () => {
    assert.equal(scopeSelector('   ', { id: 'v-w', isGlobal: false }), '   ');
  });

  it('isGlobal 时将 :scope 替换为 global attribute', () => {
    const out = scopeSelector(':scope .inner', { id: 'v-', isGlobal: true });
    assert.equal(out, '[class*=v-] .inner');
  });

  it('选择器已有 scope class 时跳过追加', () => {
    const out = scopeSelector('.btn.v-skip', { id: 'v-skip', isGlobal: false });
    assert.equal(out, '.btn.v-skip');
  });

  it('分隔式 :global 前插入 *.scopeId（兄弟组合符链）', () => {
    const out = scopeSelector('.a + .b :global .c', { id: 'v-plus', isGlobal: false });
    assert.equal(out, '.a + .b *.v-plus .c');
  });

  it('分隔式 :global 前插入 *.scopeId（子组合符）', () => {
    const out = scopeSelector('.parent > .child :global .ext', { id: 'v-gt', isGlobal: false });
    assert.equal(out, '.parent > .child *.v-gt .ext');
  });

  it('分隔式 :global 前插入 *.scopeId（相邻兄弟无空格）', () => {
    const out = scopeSelector('.a+.b :global .c', { id: 'v-adj', isGlobal: false });
    assert.equal(out, '.a+.b *.v-adj .c');
  });

  it('不对 @-moz-keyframes 内规则加作用域', async () => {
    const css = await runPostcssScope(
      '@-moz-keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
      { scoped: true, id: 'v-moz' }
    );
    assert.equal(css, '@-moz-keyframes fade { from { opacity: 0; } to { opacity: 1; } }');
  });

  it('global 模式跳过重复的 attribute scope', async () => {
    const css = await runPostcssScope('.box[class*="v-g"] { color: green; }', {
      scoped: true,
      global: true,
      id: 'v-g',
    });
    assert.equal((css.match(/\[class\*="v-g"\]/g) || []).length, 1);
  });

  it('selectorAlreadyScoped 使用 global attribute 的 raws.value', () => {
    const out = scopeSelector('.x[class*=v-raw] { }', {
      id: 'v-raw',
      isGlobal: true,
    });
    assert.equal(out, '.x[class*=v-raw] { }');
  });

  it('去掉无后缀节点的尾部 :global', () => {
    const out = scopeSelector('.panel :global', { id: 'v-tail', isGlobal: false });
    assert.equal(out, '.panel.v-tail');
  });

  it('global 模式 attribute value 与 id 一致时判定已作用域', () => {
    const sel = parseSelector('.x[class*=v-id]');
    assert.equal(selectorAlreadyScoped(sel, 'v-id', true), true);
    const out = scopeSelector('.x[class*=v-id]', { id: 'v-id', isGlobal: true });
    assert.equal((out.match(/\[class\*=v-id\]/g) || []).length, 1);
  });

  it('scoped 模式已有 scope class 时 selectorAlreadyScoped 为 true', () => {
    const sel = parseSelector('.btn.v-same');
    assert.equal(selectorAlreadyScoped(sel, 'v-same', false), true);
  });

  it('+ 组合符链上插入 scope 时在非空格 combinator 后补空格', () => {
    const out = scopeSelector('.a+.b', { id: 'v-adj-space', isGlobal: false });
    assert.equal(out, '.a+.b.v-adj-space');
  });

  it('首个 :global 前仅有组合符时去掉 :global 且不注入 scope', () => {
    const sel = parseSelector('+ :global .inner');
    scopeSelectorBeforeMiddleGlobal(sel, 'v-nopre', false);
    assert.equal(sel.toString(), ' .inner');
  });

  it('通过 scopeSelector 处理「+ :global」前缀为空时不注入 scope', () => {
    const out = scopeSelector('+ :global .inner', { id: 'v-nopre2', isGlobal: false });
    assert.equal(out, ' .inner');
  });

  it('stripMiddleGlobalPseudo 在 :global 位于首位时直接返回', () => {
    const sel = parseSelector(':global .x');
    stripMiddleGlobalPseudo(sel);
    assert.equal(sel.toString(), ':global .x');
  });

  it('replaceMiddleGlobalWithStar stripOnly 时分隔式 :global 仅剥离标记', () => {
    const { replaceMiddleGlobalWithStar } = require('../postcss/selector-scope');
    const sel = parseSelector('.a :global .b');
    replaceMiddleGlobalWithStar(sel, { stripOnly: true });
    assert.equal(sel.toString(), '.a .b');
  });

  it('replaceMiddleGlobalWithStar 分隔式 :global 插入 *.scopeId', () => {
    const { replaceMiddleGlobalWithStar } = require('../postcss/selector-scope');
    const sel = parseSelector('.a :global .b');
    replaceMiddleGlobalWithStar(sel, { stripOnly: false, id: 'v-star', isGlobal: false });
    assert.equal(sel.toString(), '.a *.v-star .b');
  });

  it('replaceMiddleGlobalWithStar stripOnly 时附着式 :global 仅剥离标记', () => {
    const { replaceMiddleGlobalWithStar } = require('../postcss/selector-scope');
    const sel = parseSelector('.card:global .title');
    replaceMiddleGlobalWithStar(sel, { stripOnly: true });
    assert.equal(sel.toString(), '.card .title');
  });

  it('replaceMiddleGlobalWithStar 附着式 :global 在前缀挂 scope', () => {
    const { replaceMiddleGlobalWithStar } = require('../postcss/selector-scope');
    const sel = parseSelector('.card:global .title');
    replaceMiddleGlobalWithStar(sel, { stripOnly: false, id: 'v-att', isGlobal: false });
    assert.equal(sel.toString(), '.card.v-att .title');
  });

  it('stripGlobalMarkersFromSelector 去掉附着式 .card:global', () => {
    const { stripGlobalMarkersFromSelector } = require('../postcss/selector-scope');
    const out = stripGlobalMarkersFromSelector('.card:global .title');
    assert.equal(out, '.card .title');
  });

  it('global 模式 node.value 命中时判定已作用域（raws 不一致）', () => {
    const sel = parseSelector('.x[class*=v-only]');
    const attr = sel.nodes.find((n) => n.type === 'attribute');
    attr.raws = { value: 'ignored-raws' };
    assert.equal(selectorAlreadyScoped(sel, 'v-only', true), true);
  });

  it('global 模式仅 raws.value 命中时判定已作用域', () => {
    const sel = parseSelector('.x[class*=other]');
    const attr = sel.nodes.find((n) => n.type === 'attribute');
    attr.value = 'other';
    attr.raws = { value: 'v-raws-only' };
    assert.equal(selectorAlreadyScoped(sel, 'v-raws-only', true), true);
  });

  it('namespace string 节点后插入 scope 时补空格', () => {
    const sel = selectorParser.selector({
      nodes: [
        selectorParser.string({ value: 'U' }),
        selectorParser.combinator({ value: '|' }),
        selectorParser.tag({ value: 'a' }),
      ],
    });
    appendScopeToSelector(sel, 'v-ns', false);
    assert.equal(sel.toString(), 'U|a.v-ns');
  });

  it('scopeSelectorBeforeMiddleGlobal 在 :global 位于首位时不处理', () => {
    const sel = parseSelector(':global .y');
    scopeSelectorBeforeMiddleGlobal(sel, 'v-y', false);
    assert.equal(sel.toString(), ':global .y');
  });

  it('属性选择器含 string 值时插入 scope 可补空格', () => {
    const out = scopeSelector('[data-foo="x"]+.target', { id: 'v-attr', isGlobal: false });
    assert.equal(out, '[data-foo="x"]+.target.v-attr');
  });
});
