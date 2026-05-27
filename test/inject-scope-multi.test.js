const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const injectScope = require('../src/plugins/inject-scope');
const {
  extractScopeIdFromCode,
  transformImporterFile,
  postcssForSharedCssFromImporters,
  splitScopedCssBlocks,
} = require('./helpers');

describe('inject-scope 多文件（共享样式表）', () => {
  const styleImport = './styles/shared.scss?scoped';

  it('按引用方文件路径分配不同 scope id', () => {
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

  it('向 JSX 注入与各文件 scope id 匹配的 class', () => {
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

  it('同一引用方重复编译时复用相同 scope id', () => {
    const opts = { filename: '/project/src/Page.tsx', styleImport };
    const first = extractScopeIdFromCode(transformImporterFile(opts));
    const second = extractScopeIdFromCode(transformImporterFile(opts));

    assert.equal(first, second);
    assert.equal(
      Object.keys(injectScope.scopeIds).filter((k) => k.includes('Page.tsx')).length,
      1
    );
  });

  it('共享 CSS 时将 Babel 生成的 scope id 传入 PostCSS 多 scope', async () => {
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
