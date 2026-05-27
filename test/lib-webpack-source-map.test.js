const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  getURLType,
  normalizeSourceMapAfterPostcss,
  resolvePostcssMapOption,
  resolveLoaderSourceMap,
  emitPostcssWarnings,
  pickPostcssResultCss,
} = require('../lib/webpack-source-map');

describe('lib/webpack-source-map 源映射', () => {
  it('分类 URL 类型', () => {
    assert.equal(getURLType('//cdn.example.com/a.css'), 'scheme-relative');
    assert.equal(getURLType('/absolute/path.css'), 'path-absolute');
    assert.equal(getURLType('e:\\win\\path.css'), 'path-absolute');
    assert.equal(getURLType('https://example.com/a.css'), 'absolute');
    assert.equal(getURLType('./relative.css'), 'path-relative');
  });

  it('规范化 PostCSS source map 的 sources', () => {
    const ctx = path.join(process.cwd(), 'fixtures');
    const map = normalizeSourceMapAfterPostcss({
      version: 3,
      file: 'out.css',
      sourceRoot: 'old',
      sources: [
        '<input css inline>',
        './rel.css',
        'https://example.com/a.css',
        '//cdn.com/b.css',
      ],
      mappings: '',
    }, ctx);

    assert.equal(map.file, undefined);
    assert.equal(map.sourceRoot, '');
    assert.equal(map.sources[0], '<input css inline>');
    assert.equal(map.sources[1], path.resolve(ctx, './rel.css'));
    assert.equal(map.sources[2], 'https://example.com/a.css');
  });

  it('禁用时 resolvePostcssMapOption 返回 null', () => {
    assert.equal(resolvePostcssMapOption(false, { version: 3 }), null);
  });

  it('resolvePostcssMapOption 返回 webpack 兼容的 map 配置', () => {
    const prev = { version: 3 };
    const opt = resolvePostcssMapOption(true, prev);
    assert.equal(opt.prev, prev);
    assert.equal(opt.inline, false);
    assert.equal(opt.annotation, false);
  });

  it('存在 map 时 resolveLoaderSourceMap 做规范化', () => {
    const ctx = path.join(process.cwd(), 'fixtures');
    const json = {
      version: 3,
      file: 'out.css',
      sources: ['./rel.css'],
      mappings: '',
    };
    const out = resolveLoaderSourceMap(
      { map: { toJSON: () => json } },
      { sourceMap: true },
      ctx
    );
    assert.equal(out.file, undefined);
    assert.equal(out.sources[0], path.resolve(ctx, './rel.css'));
  });

  it('无 result map 时 resolveLoaderSourceMap 返回 undefined', () => {
    assert.equal(
      resolveLoaderSourceMap({ map: null }, { sourceMap: true }, '/ctx'),
      undefined
    );
  });

  it('pickPostcssResultCss 回退到 content', () => {
    assert.equal(pickPostcssResultCss({ content: '.x{}' }), '.x{}');
    assert.equal(pickPostcssResultCss({ css: '.y{}', content: '.z{}' }), '.y{}');
  });

  it('emitPostcssWarnings 转发每条警告', () => {
    const collected = [];
    const warn = { text: 'test-warn' };
    emitPostcssWarnings({
      warnings: () => [warn],
    }, (w) => collected.push(w));
    assert.deepEqual(collected, [warn]);
  });
});
