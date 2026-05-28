const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lintCode, lintWithRule } = require('./stylelint/helpers');

const RULE = 'react-scope-style/no-scope-typo';

describe(`stylelint ${RULE}`, () => {
  it('flags :scoped pseudo', async () => {
    const warning = await lintWithRule('.btn:scoped { color: red; }', RULE);
    assert.ok(warning);
    assert.equal(warning.severity, 'error');
    assert.match(warning.text, /:scope/i);
  });

  it('flags ?scope on @import', async () => {
    const warning = await lintWithRule('@import url("./p.scss?scope");', RULE);
    assert.ok(warning);
    assert.equal(warning.severity, 'error');
    assert.match(warning.text, /\?scoped/i);
  });

  it('allows :scope, ?scoped, class names, scope-style url', async () => {
    const cases = [
      '.btn:scope { color: red; }',
      '@import url("./p.scss?scoped");',
      '.is-scoped { color: red; }',
      '@import url("./p.scss?scope-style&scoped=true&id=v-x");',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const code of cases) {
      // eslint-disable-next-line no-await-in-loop
      const warning = await lintWithRule(code, RULE);
      assert.equal(warning, undefined, code);
    }
  });

  it('uses error severity in full config', async () => {
    const warning = await lintCode('.x:scoped { }', RULE);
    assert.equal(warning?.severity, 'error');
  });
});
