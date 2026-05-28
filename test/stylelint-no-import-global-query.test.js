const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lintCode, lintWithRule } = require('./stylelint/helpers');

const RULE = 'react-scope-style/no-import-global-query';

describe(`stylelint ${RULE}`, () => {
  it('flags @import with ?global', async () => {
    const cases = [
      '@import url("./a.scss?global");',
      '@import "./b.css?global";',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const code of cases) {
      // eslint-disable-next-line no-await-in-loop
      const warning = await lintWithRule(code, RULE);
      assert.ok(warning, code);
      assert.equal(warning.severity, 'error');
      assert.match(warning.text, /\?global/i);
    }
  });

  it('allows ?scoped and scope-style rewritten imports', async () => {
    const cases = [
      '@import url("./a.scss?scoped");',
      '@import url("./a.scss?scope-style&scoped=true&id=v-1");',
      '@import url("./plain.css");',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const code of cases) {
      // eslint-disable-next-line no-await-in-loop
      const warning = await lintWithRule(code, RULE);
      assert.equal(warning, undefined, code);
    }
  });

  it('uses error severity in full config', async () => {
    const warning = await lintCode('@import url("./x.scss?global");', RULE);
    assert.equal(warning?.severity, 'error');
  });
});
