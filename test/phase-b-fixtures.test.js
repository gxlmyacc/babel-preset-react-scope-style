/**
 * Phase B golden fixtures：以 Babel preset 输出为真相源，供未来 SWC 插件对齐。
 * 覆盖 scoped/global、classnames/clsx、双 importer 共享 CSS，以及 scopeFn 延期说明。
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  transformWithPreset,
  assertScopedEqual,
  extractScopeIdFromCode,
  transformImporterFile,
  runPostcssScope,
  multiScopeContexts,
  splitScopedCssBlocks,
} = require('./helpers');

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'phase-b');

/**
 * 读取 phase-b fixtures 目录下全部 JSON。
 * @returns {object[]} fixture 对象列表
 */
function loadFixtures() {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
      return { ...JSON.parse(raw), __file: name };
    });
}

describe('phase-b golden fixtures (Babel truth source)', () => {
  const fixtures = loadFixtures();

  fixtures.forEach((fixture) => {
    if (fixture.kind === 'unsupported') {
      it(`${fixture.id}: records deferred SWC feature (${fixture.feature})`, () => {
        assert.equal(fixture.swcPhase, 'deferred');
        assert.ok(fixture.notes);
      });
      return;
    }

    if (fixture.kind === 'multi-importer') {
      it(`${fixture.id}: ${fixture.description}`, async () => {
        const scopeIds = [];
        fixture.importers.forEach((importer) => {
          const code = transformImporterFile({
            filename: importer.filename,
            styleImport: fixture.styleImport,
            jsx: importer.jsx,
          });
          const id = extractScopeIdFromCode(code);
          assert.ok(id, `expected scope id for ${importer.filename}`);
          scopeIds.push(id);
          assert.match(
            code,
            new RegExp(`scope-style&scoped=true&id=${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
          );
        });
        assert.equal(new Set(scopeIds).size, scopeIds.length, 'each importer needs a distinct scope id');

        const css = await runPostcssScope(fixture.sharedCss, multiScopeContexts(scopeIds));
        scopeIds.forEach((id) => {
          assert.match(css, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        });
        const blocks = splitScopedCssBlocks(css);
        assert.ok(blocks.length >= 2, 'shared CSS should emit multiple scoped rule copies');
      });
      return;
    }

    it(`${fixture.id}: ${fixture.description}`, () => {
      const code = transformWithPreset(fixture.input, {
        filename: fixture.filename,
        pluginOptions: fixture.options || {},
      });
      if (fixture.expected.includes('{scopeId}')) {
        assertScopedEqual(code, fixture.expected);
      } else {
        assert.equal(code, fixture.expected);
      }
    });
  });
});
