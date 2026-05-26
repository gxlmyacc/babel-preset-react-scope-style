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

describe('lib/webpack-source-map', () => {
  it('classifies URL types', () => {
    assert.equal(getURLType('//cdn.example.com/a.css'), 'scheme-relative');
    assert.equal(getURLType('/absolute/path.css'), 'path-absolute');
    assert.equal(getURLType('e:\\win\\path.css'), 'path-absolute');
    assert.equal(getURLType('https://example.com/a.css'), 'absolute');
    assert.equal(getURLType('./relative.css'), 'path-relative');
  });

  it('normalizes postcss source map sources', () => {
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

  it('resolvePostcssMapOption returns null when disabled', () => {
    assert.equal(resolvePostcssMapOption(false, { version: 3 }), null);
  });

  it('resolvePostcssMapOption returns webpack-compatible map config', () => {
    const prev = { version: 3 };
    const opt = resolvePostcssMapOption(true, prev);
    assert.equal(opt.prev, prev);
    assert.equal(opt.inline, false);
    assert.equal(opt.annotation, false);
  });

  it('resolveLoaderSourceMap normalizes when map present', () => {
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

  it('resolveLoaderSourceMap returns undefined without result map', () => {
    assert.equal(
      resolveLoaderSourceMap({ map: null }, { sourceMap: true }, '/ctx'),
      undefined
    );
  });

  it('pickPostcssResultCss falls back to content', () => {
    assert.equal(pickPostcssResultCss({ content: '.x{}' }), '.x{}');
    assert.equal(pickPostcssResultCss({ css: '.y{}', content: '.z{}' }), '.y{}');
  });

  it('emitPostcssWarnings forwards each warning', () => {
    const collected = [];
    const warn = { text: 'test-warn' };
    emitPostcssWarnings({
      warnings: () => [warn],
    }, (w) => collected.push(w));
    assert.deepEqual(collected, [warn]);
  });
});
