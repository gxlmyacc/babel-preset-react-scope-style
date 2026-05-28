const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lintCode, lintWithRule } = require('./stylelint/helpers');

const RULE = 'react-scope-style/no-global-paren';

describe(`stylelint ${RULE}`, () => {
  it('flags :global(...)', async () => {
    const warning = await lintWithRule(':global(.reset) { margin: 0; }', RULE);
    assert.ok(warning);
    assert.equal(warning.severity, 'error');
    assert.match(warning.text, /:global/i);
  });

  it('flags middle :global(...)', async () => {
    const warning = await lintWithRule('.x :global(.y) { color: red; }', RULE);
    assert.ok(warning);
    assert.equal(warning.severity, 'error');
  });

  it('allows leading :global and nested bare :global', async () => {
    const cases = [
      ':global .reset { margin: 0; }',
      '.card { :global { .ext { color: red; } } }',
      '.wrap:global { .ext { color: red; } }',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const code of cases) {
      // eslint-disable-next-line no-await-in-loop
      const warning = await lintWithRule(code, RULE);
      assert.equal(warning, undefined, `should pass: ${code}`);
    }
  });

  it('uses error severity in full config', async () => {
    const warning = await lintCode(':global(.x) { }', RULE);
    assert.equal(warning?.severity, 'error');
  });
});
