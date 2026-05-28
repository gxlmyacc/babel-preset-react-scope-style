const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lintCode, lintWithRule } = require('./stylelint/helpers');

const RULE = 'react-scope-style/no-duplicate-scope-markers';

describe(`stylelint ${RULE}`, () => {
  it('valid selectors and single-level nesting pass', async () => {
    const cases = [
      '.btn { color: red; }',
      '.container :global .ext { margin: 0; }',
      '.card:scope .title { padding: 0; }',
      '.card { :global { .ext { color: red; } } }',
      '.card { :scope { .inner { margin: 0; } } }',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const code of cases) {
      // eslint-disable-next-line no-await-in-loop
      const warning = await lintWithRule(
        code,
        RULE,
        [true, { severity: 'warning' }],
      );
      assert.equal(warning, undefined, `should pass: ${code}`);
    }
  });

  it('flags multiple :global in flat selector', async () => {
    const warning = await lintWithRule(
      '.a :global .b :global .c { color: red; }',
      RULE,
      [true, { severity: 'warning' }],
    );
    assert.ok(warning);
    assert.equal(warning.severity, 'warning');
    assert.match(warning.text, /:global/i);
  });

  it('flags multiple :scope in flat selector', async () => {
    const warning = await lintWithRule(
      '.a:scope .b:scope { color: red; }',
      RULE,
      [true, { severity: 'warning' }],
    );
    assert.ok(warning);
    assert.equal(warning.severity, 'warning');
    assert.match(warning.text, /:scope/i);
  });

  it('flags nested duplicate :global wrappers', async () => {
    const warning = await lintWithRule(
      '.card { :global { :global { .reset { color: red; } } } }',
      RULE,
      [true, { severity: 'warning' }],
    );
    assert.ok(warning);
    assert.equal(warning.severity, 'warning');
    assert.match(warning.text, /redundant|:global/i);
  });

  it('flags nested duplicate :scope wrappers', async () => {
    const warning = await lintWithRule(
      '.card { :scope { :scope { .inner { margin: 0; } } } }',
      RULE,
      [true, { severity: 'warning' }],
    );
    assert.ok(warning);
    assert.equal(warning.severity, 'warning');
    assert.match(warning.text, /redundant|:scope/i);
  });

  it('uses warning severity in full config', async () => {
    const warning = await lintCode('.x :global .y :global .z {}', RULE);
    assert.equal(warning?.severity, 'warning');
  });
});
