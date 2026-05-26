const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset } = require('./helpers');

const SCOPED_IMPORT = "import './scoped.scss?scoped';";

/**
 * 在启用 scoped 样式的前提下编译 JSX。
 * @param {string} jsx - 组件 JSX 片段
 * @param {Partial<import('../src/options-default')>} [pluginOptions] - preset 配置
 * @param {string} [extraImports] - 额外 import（默认不注入 classnames/clsx）
 * @returns {string}
 */
function transformScopedJsx(jsx, pluginOptions = {}, extraImports = '') {
  const code = transformWithPreset(`
import React from 'react';
${extraImports}
${SCOPED_IMPORT}

export function Demo() {
  return (
${jsx}
  );
}
`, { pluginOptions });
  return code;
}

describe('classAttrs — className', () => {
  it('creates className on elements that have no class attribute', () => {
    const code = transformScopedJsx(`
      <>
        <div />
        <span />
      </>
    `);
    assert.match(code, /<div className="v-[^"]+"/);
    assert.match(code, /<span className="v-[^"]+"/);
  });

  it('prepends scope id to existing string className', () => {
    const code = transformScopedJsx('<div className="btn primary" />');
    assert.match(code, /className="v-[^"]+ btn primary"/);
  });

  it('merges scope id into existing className expression', () => {
    const code = transformScopedJsx('<div className={active ? "on" : "off"} />');
    assert.match(code, /className=\{classNames\(\["v-[^"]+",\s*active \? "on" : "off"\]\)\}/);
  });

  it('injects className on every non-excluded element in the tree', () => {
    const code = transformScopedJsx(`
      <section>
        <header className="hd" />
        <p />
      </section>
    `);
    assert.match(code, /<section className="v-[^"]+"/);
    assert.match(code, /className="v-[^"]+ hd"/);
    assert.match(code, /<p className="v-[^"]+"/);
  });

  it('merges scope into template literal className via classNames wrapper', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const code = transformScopedJsx('<div className={`btn-${kind}`} />');
    assert.match(code, /className=\{classNames\(\["v-[^"]+",\s*`btn-\$\{kind\}`\]\)\}/);
  });

  it('merges scope into array expression className', () => {
    const code = transformScopedJsx("<div className={['base', isActive && 'on']} />");
    assert.match(
      code,
      /className=\{classNames\(\["v-[^"]+",\s*\['base', isActive && 'on'\]\]\)\}/
    );
  });

  it('prepends scope to the first argument of existing classNames() call', () => {
    const code = transformScopedJsx(
      "<div className={classNames('size', { active: on })} />",
      {},
      "import classNames from 'classnames';"
    );
    assert.match(
      code,
      /className=\{classNames\(\["v-[^"]+",\s*'size'\],\s*\{\s*active:\s*on\s*\}\)\}/
    );
    assert.doesNotMatch(code, /classNames\(\["v-[^"]+",\s*classNames/);
  });

  it('prepends scope to the first argument of existing clsx() when only clsx is imported', () => {
    const code = transformScopedJsx(
      "<div className={clsx('a', cond && 'b')} />",
      { classNameLibrary: 'clsx' },
      "import clsx from 'clsx';"
    );
    assert.match(
      code,
      /className=\{clsx\(\["v-[^"]+",\s*'a'\],\s*cond && 'b'\)\}/
    );
    assert.doesNotMatch(code, /from ['"]classnames['"]/);
  });

  it('prepends scope to clsx() first argument when only clsx is imported (auto)', () => {
    const code = transformScopedJsx(
      "<div className={clsx('only-clsx')} />",
      { classNameLibrary: 'auto' },
      "import clsx from 'clsx';"
    );
    assert.match(code, /className=\{clsx\(\["v-[^"]+",\s*'only-clsx'\]\)\}/);
    assert.doesNotMatch(code, /from ['"]classnames['"]/);
  });

  it('wraps clsx() in classNames when both libraries are imported (auto prefers classnames)', () => {
    const code = transformScopedJsx(
      "<div className={clsx('x')} />",
      { classNameLibrary: 'auto' },
      "import clsx from 'clsx';\nimport classNames from 'classnames';"
    );
    assert.match(
      code,
      /className=\{classNames\(\["v-[^"]+",\s*clsx\('x'\)\]\)\}/
    );
  });

  it('does not double-wrap classNames() call', () => {
    const code = transformScopedJsx(
      "<div className={classNames(['inner'])} />",
      {},
      "import classNames from 'classnames';"
    );
    assert.match(code, /classNames\(\["v-[^"]+",\s*\['inner'\]\]\)/);
    assert.equal((code.match(/classNames\(/g) || []).length, 1);
  });

  it('does not inject className on template or slot', () => {
    const code = transformScopedJsx(`
      <>
        <template><div className="inner" /></template>
        <slot />
      </>
    `);
    assert.doesNotMatch(code, /<template className=/);
    assert.doesNotMatch(code, /<slot className=/);
    assert.match(code, /<div className="v-[^"]+ inner"/);
  });
});

describe('classAttrs — non-className attributes', () => {
  const dataClassOnly = {
    classAttrs: ['className', 'data-class'],
  };

  it('updates data-class only when the element already has data-class', () => {
    const code = transformScopedJsx(
      '<div data-class="badge" />',
      dataClassOnly
    );
    assert.match(code, /data-class="v-[^"]+ badge"/);
    assert.match(code, /<div className="v-[^"]+"/);
  });

  it('does not create data-class when the element lacks it', () => {
    const code = transformScopedJsx('<div className="only" />', dataClassOnly);
    assert.match(code, /className="v-[^"]+ only"/);
    assert.doesNotMatch(code, /data-class=/);
  });

  it('still creates className on elements with only data-class and no className', () => {
    const code = transformScopedJsx('<label data-class="lbl" />', dataClassOnly);
    assert.match(code, /data-class="v-[^"]+ lbl"/);
    assert.match(code, /<label className="v-[^"]+"/);
  });

  it('leaves sibling without data-class unchanged except for className', () => {
    const code = transformScopedJsx(`
      <>
        <span data-class="a" />
        <span className="b" />
        <span />
      </>
    `, dataClassOnly);
    assert.match(code, /data-class="v-[^"]+ a"/);
    assert.doesNotMatch(code, /<span data-class="v-[^"]+ b"/);
    assert.match(code, /className="v-[^"]+ b"/);
    const plainSpan = code.match(/<span className="v-[^"]+"\s*\/>/g);
    assert.ok(plainSpan && plainSpan.length >= 1);
  });

  it('supports custom attribute name via classAttrs list', () => {
    const code = transformScopedJsx(
      '<button custom-class="cta" />',
      { classAttrs: ['className', 'custom-class'] }
    );
    assert.match(code, /custom-class="v-[^"]+ cta"/);
    assert.match(code, /<button className="v-[^"]+"/);
  });

  it('does not create custom-class when attribute is absent', () => {
    const code = transformScopedJsx('<button />', {
      classAttrs: ['className', 'custom-class'],
    });
    assert.match(code, /<button className="v-[^"]+"/);
    assert.doesNotMatch(code, /custom-class=/);
  });
});

describe('classAttrs — function matcher', () => {
  it('applies scope only when matcher returns true for attr and tag', () => {
    const code = transformScopedJsx(
      `
      <>
        <Button data-class="primary" />
        <div data-class="ignored" />
      </>
      `,
      {
        classAttrs: [
          'className',
          (attrName, tagName) => attrName === 'data-class' && tagName === 'Button',
        ],
      }
    );
    assert.match(code, /<Button className="v-[^"]+" data-class="v-[^"]+ primary"/);
    assert.match(code, /<div className="v-[^"]+" data-class="ignored"/);
    assert.doesNotMatch(code, /data-class="v-[^"]+ ignored"/);
    assert.match(code, /<Button className="v-[^"]+"/);
    assert.match(code, /<div className="v-[^"]+"/);
  });
});

describe('classAttrs — default options', () => {
  it('uses only className when classAttrs is not customized', () => {
    const code = transformScopedJsx('<div data-class="x" />');
    assert.match(code, /<div className="v-[^"]+"/);
    assert.equal(code.includes('data-class='), true);
    assert.doesNotMatch(code, /data-class="v-/);
  });
});
