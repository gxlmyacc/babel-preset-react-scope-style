const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

describe('lib/glob-sync', () => {
  it('能匹配仓库根目录 package.json', () => {
    const { globSync } = require('../lib/glob-sync');
    const root = path.join(__dirname, '..');
    const files = globSync('package.json', { cwd: root, absolute: true });
    assert.ok(files.some((file) => /package\.json$/i.test(file)));
  });
});
