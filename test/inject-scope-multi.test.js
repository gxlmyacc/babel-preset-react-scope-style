const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const injectScope = require('../src/plugins/inject-scope');
const {
  extractScopeIdFromCode,
  transformImporterFile,
  postcssForSharedCssFromImporters,
  splitScopedCssBlocks,
} = require('./helpers');

describe('inject-scope multi-file (shared stylesheet)', () => {
  const styleImport = './styles/shared.scss?scoped';

  it('assigns different scope ids per importer file path', () => {
    const button = transformImporterFile({
      filename: '/project/src/Button.jsx',
      styleImport,
    });
    const card = transformImporterFile({
      filename: '/project/src/Card.jsx',
      styleImport,
    });

    const idButton = extractScopeIdFromCode(button);
    const idCard = extractScopeIdFromCode(card);

    assert.ok(idButton && idCard, 'both imports should carry scope id');
    assert.notEqual(idButton, idCard, 'scope id should depend on importer filename hash');

    assert.match(button, new RegExp(`shared\\.scss\\?scope-style&scoped=true&id=${idButton}`));
    assert.match(card, new RegExp(`shared\\.scss\\?scope-style&scoped=true&id=${idCard}`));
  });

  it('injects scope class on JSX matching each file scope id', () => {
    const button = transformImporterFile({
      filename: '/project/src/Button.jsx',
      styleImport,
      jsx: 'export function Button() { return <button className="btn">OK</button>; }',
    });
    const card = transformImporterFile({
      filename: '/project/src/Card.jsx',
      styleImport,
      jsx: 'export function Card() { return <div className="card">Hi</div>; }',
    });

    const idButton = extractScopeIdFromCode(button);
    const idCard = extractScopeIdFromCode(card);

    assert.match(button, new RegExp(`className="${idButton} btn"`));
    assert.match(card, new RegExp(`className="${idCard} card"`));
    assert.doesNotMatch(button, new RegExp(idCard));
    assert.doesNotMatch(card, new RegExp(idButton));
  });

  it('reuses the same scope id when transforming the same importer twice', () => {
    const opts = { filename: '/project/src/Page.tsx', styleImport };
    const first = extractScopeIdFromCode(transformImporterFile(opts));
    const second = extractScopeIdFromCode(transformImporterFile(opts));

    assert.equal(first, second);
    assert.equal(
      Object.keys(injectScope.scopeIds).filter((k) => k.includes('Page.tsx')).length,
      1
    );
  });

  it('feeds babel-derived scope ids into postcss multi-scope for shared css', async () => {
    const sharedCss = '@import \'./vars.css\';\n.panel { display: block; }';
    const { css, scopeIds } = await postcssForSharedCssFromImporters(sharedCss, [
      '/project/src/Button.jsx',
      '/project/src/Card.jsx',
    ]);

    assert.equal(scopeIds.length, 2);
    scopeIds.forEach((id) => {
      assert.match(css, new RegExp(`\\.panel\\.${id}`));
    });

    const blocks = splitScopedCssBlocks(css);
    assert.equal(blocks[0], '@import \'./vars.css\';');
    assert.equal((css.match(/@import/g) || []).length, 1);
    assert.ok(blocks.findIndex((line) => line.includes(`.panel.${scopeIds[0]}`)) < blocks.findIndex(
      (line) => line.includes(`.panel.${scopeIds[1]}`)
    ));
  });
});
