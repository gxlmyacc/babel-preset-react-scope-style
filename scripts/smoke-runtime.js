/**
 * Node >=14.17 运行时冒烟：验证主入口可加载且 PostCSS / Babel preset 可执行。
 * 不依赖 `node:test`（需 Node 18+），供 CI 在 Node 14.17 上校验 engines 声明。
 * 无入参。
 * @returns {void}
 */
function main() {
  const assert = require('assert');
  const path = require('path');

  const preset = require('../src/index');
  assert.equal(typeof preset, 'function');

  const { globSync } = require('../lib/glob-sync');
  const selfMatches = globSync('package.json', {
    cwd: path.join(__dirname, '..'),
    absolute: true,
  });
  assert.ok(selfMatches.length >= 1, 'globSync should find package.json');

  const postcssPlugin = require('../postcss/postcss8');
  assert.equal(typeof postcssPlugin, 'function');

  const webpackApi = require('../webpack');
  assert.equal(typeof webpackApi, 'function');
  assert.equal(typeof webpackApi.withReactScopeStyle, 'function');

  const rspackApi = require('../rspack');
  assert.equal(typeof rspackApi, 'function');
  assert.equal(typeof rspackApi.withReactScopeStyle, 'function');

  const nextApi = require('../next');
  assert.equal(typeof nextApi, 'function');

  const viteApi = require('../vite');
  assert.equal(typeof viteApi, 'function');

  const esbuildApi = require('../esbuild');
  assert.equal(typeof esbuildApi, 'function');

  // eslint-disable-next-line no-console
  console.log('[smoke-runtime] ok — Node', process.version);
}

main();
