const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lintCode, lintWithRule } = require('./stylelint/helpers');

const RULE = 'react-scope-style/prefer-ampersand-scope-wrapper';

describe(`stylelint ${RULE}`, () => {
  it('warns on deeply nested bare :global / :scope', async () => {
    const globalWarn = await lintWithRule(
      '.card { .wrap { :global { .ext { color: red; } } } }',
      RULE,
      [true, { severity: 'warning', minRuleAncestors: 2 }],
    );
    assert.ok(globalWarn);
    assert.equal(globalWarn.severity, 'warning');
    assert.match(globalWarn.text, /&:global|bare :global/i);

    const scopeWarn = await lintWithRule(
      '.card { .wrap { :scope { .inner { margin: 0; } } } }',
      RULE,
      [true, { severity: 'warning', minRuleAncestors: 2 }],
    );
    assert.ok(scopeWarn);
    assert.equal(scopeWarn.severity, 'warning');
    assert.match(scopeWarn.text, /&:scope|bare :scope/i);
  });

  it('allows single-level bare wrappers and &: forms', async () => {
    const cases = [
      '.card { :global { .ext { color: red; } } }',
      '.card { :scope { .inner { margin: 0; } } }',
      '.card { &:global { .ext { color: red; } } }',
      '.card { .wrap:global { .ext { color: red; } } }',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const code of cases) {
      // eslint-disable-next-line no-await-in-loop
      const warning = await lintWithRule(
        code,
        RULE,
        [true, { severity: 'warning', minRuleAncestors: 2 }],
      );
      assert.equal(warning, undefined, code);
    }
  });

  it('respects minRuleAncestors: 3', async () => {
    const shallow = await lintWithRule(
      '.card { .a { :global { .x {} } } }',
      RULE,
      [true, { severity: 'warning', minRuleAncestors: 3 }],
    );
    assert.equal(shallow, undefined);

    const deep = await lintWithRule(
      '.card { .a { .b { :global { .x {} } } } }',
      RULE,
      [true, { severity: 'warning', minRuleAncestors: 3 }],
    );
    assert.ok(deep);
  });

  it('uses warning severity in full config', async () => {
    const warning = await lintCode('.card { .wrap { :global { .ext {} } } }', RULE);
    assert.equal(warning?.severity, 'warning');
  });
});
