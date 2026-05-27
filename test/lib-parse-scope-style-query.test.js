const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  hasScopeStyleQuery,
  parseScopeStyleQuery,
  getLoaderResourceQuery,
  normalizeQueryString,
  SCOPE_STYLE_QUERY_RE,
} = require('../lib/parse-scope-style-query');

describe('lib/parse-scope-style-query 查询解析', () => {
  it('SCOPE_STYLE_QUERY_RE 匹配 scoped 标记', () => {
    assert.ok(SCOPE_STYLE_QUERY_RE.test('scope-style&scoped=true&id=v-1'));
  });

  it('hasScopeStyleQuery 要求包含 id', () => {
    assert.equal(hasScopeStyleQuery('?scope-style&scoped=true&id=v-abc'), true);
    assert.equal(hasScopeStyleQuery('scope-style&scoped=true'), false);
    assert.equal(hasScopeStyleQuery('?other=1'), false);
  });

  it('parseScopeStyleQuery 返回规范化插件选项', () => {
    const opts = parseScopeStyleQuery('?scope-style&scoped=true&id=v-x');
    assert.deepEqual(opts, { scoped: true, global: false, id: 'v-x' });
  });

  it('存在 global 时 parseScopeStyleQuery 设置 global', () => {
    const opts = parseScopeStyleQuery('scope-style&scoped=true&global=true&id=v-');
    assert.deepEqual(opts, { scoped: true, global: true, id: 'v-' });
  });

  it('无 id 时 parseScopeStyleQuery 返回 null', () => {
    assert.equal(parseScopeStyleQuery('scope-style&scoped=true'), null);
  });

  it('normalizeQueryString 处理空输入', () => {
    assert.equal(normalizeQueryString(), '');
    assert.equal(normalizeQueryString('?scope-style&scoped=true&id=v-1'), 'scope-style&scoped=true&id=v-1');
  });

  it('qs 解析的 id 非字符串时返回 null', () => {
    const q = 'scope-style&scoped=true&id=a&id=b';
    assert.equal(hasScopeStyleQuery(q), true);
    assert.equal(parseScopeStyleQuery(q), null);
  });

  it('getLoaderResourceQuery 优先 resourceQuery', () => {
    const q = getLoaderResourceQuery({
      resourceQuery: '?scope-style&scoped=true&id=v-rq',
      request: '/path/file.css?other=1',
    });
    assert.equal(q, '?scope-style&scoped=true&id=v-rq');
  });

  it('getLoaderResourceQuery 回退到 request', () => {
    const q = getLoaderResourceQuery({
      request: 'E:/proj/a.css?scope-style&scoped=true&id=v-req',
    });
    assert.equal(q, '?scope-style&scoped=true&id=v-req');
  });

  it('request 无 query 时返回空字符串', () => {
    assert.equal(getLoaderResourceQuery({ request: 'E:/proj/a.css' }), '');
    assert.equal(getLoaderResourceQuery({}), '');
  });
});
