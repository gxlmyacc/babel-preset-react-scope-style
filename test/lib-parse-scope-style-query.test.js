const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  hasScopeStyleQuery,
  parseScopeStyleQuery,
  getLoaderResourceQuery,
  normalizeQueryString,
  SCOPE_STYLE_QUERY_RE,
} = require('../lib/parse-scope-style-query');

describe('lib/parse-scope-style-query', () => {
  it('SCOPE_STYLE_QUERY_RE matches scoped marker', () => {
    assert.ok(SCOPE_STYLE_QUERY_RE.test('scope-style&scoped=true&id=v-1'));
  });

  it('hasScopeStyleQuery requires id', () => {
    assert.equal(hasScopeStyleQuery('?scope-style&scoped=true&id=v-abc'), true);
    assert.equal(hasScopeStyleQuery('scope-style&scoped=true'), false);
    assert.equal(hasScopeStyleQuery('?other=1'), false);
  });

  it('parseScopeStyleQuery returns normalized plugin options', () => {
    const opts = parseScopeStyleQuery('?scope-style&scoped=true&id=v-x');
    assert.deepEqual(opts, { scoped: true, global: false, id: 'v-x' });
  });

  it('parseScopeStyleQuery sets global when present', () => {
    const opts = parseScopeStyleQuery('scope-style&scoped=true&global=true&id=v-');
    assert.deepEqual(opts, { scoped: true, global: true, id: 'v-' });
  });

  it('parseScopeStyleQuery returns null without id', () => {
    assert.equal(parseScopeStyleQuery('scope-style&scoped=true'), null);
  });

  it('normalizeQueryString handles empty input', () => {
    assert.equal(normalizeQueryString(), '');
    assert.equal(normalizeQueryString('?scope-style&scoped=true&id=v-1'), 'scope-style&scoped=true&id=v-1');
  });

  it('parseScopeStyleQuery returns null when qs id is not a string', () => {
    const q = 'scope-style&scoped=true&id=a&id=b';
    assert.equal(hasScopeStyleQuery(q), true);
    assert.equal(parseScopeStyleQuery(q), null);
  });

  it('getLoaderResourceQuery prefers resourceQuery', () => {
    const q = getLoaderResourceQuery({
      resourceQuery: '?scope-style&scoped=true&id=v-rq',
      request: '/path/file.css?other=1',
    });
    assert.equal(q, '?scope-style&scoped=true&id=v-rq');
  });

  it('getLoaderResourceQuery falls back to request', () => {
    const q = getLoaderResourceQuery({
      request: 'E:/proj/a.css?scope-style&scoped=true&id=v-req',
    });
    assert.equal(q, '?scope-style&scoped=true&id=v-req');
  });

  it('getLoaderResourceQuery returns empty when request has no query', () => {
    assert.equal(getLoaderResourceQuery({ request: 'E:/proj/a.css' }), '');
    assert.equal(getLoaderResourceQuery({}), '');
  });
});
