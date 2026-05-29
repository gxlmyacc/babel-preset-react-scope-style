const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

describe('esbuild lib-alias-plugin', () => {
  it('resolveAliasRequest 解析包名与子路径', () => {
    const { resolveAliasRequest } = require('../esbuild/lib-alias-plugin');
    const alias = {
      react: '/proj/node_modules/react',
      'react-dom': '/proj/node_modules/react-dom',
    };
    assert.equal(resolveAliasRequest('react', alias), '/proj/node_modules/react');
    assert.equal(
      resolveAliasRequest('react-dom/client', alias),
      path.join('/proj/node_modules/react-dom', 'client')
    );
    assert.equal(resolveAliasRequest('./local', alias), null);
  });

  it('createEsbuildAliasPlugin 未配置时返回 null', () => {
    const { createEsbuildAliasPlugin } = require('../esbuild/lib-alias-plugin');
    assert.equal(createEsbuildAliasPlugin({}), null);
    assert.equal(createEsbuildAliasPlugin(null), null);
  });
});
