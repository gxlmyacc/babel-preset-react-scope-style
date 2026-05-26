const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runPostcssScope } = require('./helpers');
const {
  scopeSelector,
  isLeadingGlobalRule,
  stripLeadingGlobal,
} = require('../postcss/selector-scope');

describe('selector-scope branch coverage', () => {
  it('isLeadingGlobalRule and stripLeadingGlobal handle bare :global', () => {
    assert.equal(isLeadingGlobalRule(':global'), true);
    assert.equal(stripLeadingGlobal(':global', '.x'), '.x');
  });

  it('returns whitespace-only selector unchanged', () => {
    assert.equal(scopeSelector('   ', { id: 'v-w', isGlobal: false }), '   ');
  });

  it('replaces :scope with global attribute when isGlobal', () => {
    const out = scopeSelector(':scope .inner', { id: 'v-', isGlobal: true });
    assert.match(out, /\[class\*=v-\]/);
    assert.doesNotMatch(out, /:scope/);
  });

  it('skips append when selector already has scope class', () => {
    const out = scopeSelector('.btn.v-skip', { id: 'v-skip', isGlobal: false });
    assert.equal(out, '.btn.v-skip');
  });

  it('scopes sibling combinator chains before first :global', () => {
    const out = scopeSelector('.a + .b :global .c', { id: 'v-plus', isGlobal: false });
    assert.equal(out, '.a + .b.v-plus .c');
  });

  it('scopes child combinator before first :global', () => {
    const out = scopeSelector('.parent > .child :global .ext', { id: 'v-gt', isGlobal: false });
    assert.equal(out, '.parent > .child.v-gt .ext');
  });

  it('scopes adjacent sibling without space combinator', () => {
    const out = scopeSelector('.a+.b :global .c', { id: 'v-adj', isGlobal: false });
    assert.match(out, /\.b\.v-adj/);
    assert.doesNotMatch(out, /:global/);
  });

  it('does not scope rules inside @-moz-keyframes', async () => {
    const css = await runPostcssScope(
      '@-moz-keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
      { scoped: true, id: 'v-moz' }
    );
    assert.doesNotMatch(css, /\.v-moz/);
  });

  it('global mode skips duplicate attribute scope', async () => {
    const css = await runPostcssScope('.box[class*="v-g"] { color: green; }', {
      scoped: true,
      global: true,
      id: 'v-g',
    });
    assert.equal((css.match(/\[class\*="v-g"\]/g) || []).length, 1);
  });

  it('uses global attribute raws.value for selectorAlreadyScoped', () => {
    const out = scopeSelector('.x[class*=v-raw] { }', {
      id: 'v-raw',
      isGlobal: true,
    });
    assert.match(out, /\[class\*=v-raw\]/);
    assert.equal((out.match(/\[class\*=v-raw\]/g) || []).length, 1);
  });

  it('strips trailing :global without suffix nodes', () => {
    const out = scopeSelector('.panel :global', { id: 'v-tail', isGlobal: false });
    assert.equal(out, '.panel.v-tail');
    assert.doesNotMatch(out, /:global/);
  });
});
