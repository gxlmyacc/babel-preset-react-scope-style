const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lintWarnings } = require('./stylelint/helpers');

describe('stylelint integration', () => {
  it('reports multiple rules on one snippet', async () => {
    const warnings = await lintWarnings(
      '.a:scoped { }\n@import url("./p.scss?scope");\n.card { .w { :global { :global { .x {} } } } }',
    );
    const rules = new Set(warnings.map((w) => w.rule));
    assert.ok(rules.has('react-scope-style/no-scope-typo'));
    assert.ok(rules.has('react-scope-style/no-duplicate-scope-markers'));
    assert.ok(warnings.length >= 2);
  });
});
