const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assertScopedEqual, extractScopeIdFromCode } = require('./helpers');

const SCOPED_IMPORT = "import './scoped.scss?scoped';";

/**
 * 在启用 scoped 样式的前提下编译 JSX。
 * @param {string} jsx - 组件 JSX 片段
 * @param {Partial<import('../src/options-default')>} [pluginOptions] - preset 配置
 * @param {string} [extraImports] - 额外 import（默认不注入 classnames/clsx）
 * @returns {string}
 */
function transformScopedJsx(jsx, pluginOptions = {}, extraImports = '') {
  const { transformWithPreset } = require('./helpers');
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

describe('classAttrs — className 属性', () => {
  it('为无 class 属性的元素创建 className', () => {
    const code = transformScopedJsx(`
      <>
        <div />
        <span />
      </>
    `);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <>
        <div className="{scopeId}" />
        <span className="{scopeId}" />
      </>;
}`
    );
  });

  it('在已有字符串 className 前追加 scope id', () => {
    const code = transformScopedJsx('<div className="btn primary" />');
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className="{scopeId} btn primary" />;
}`
    );
  });

  it('将 scope id 合并进已有 className 表达式', () => {
    const code = transformScopedJsx('<div className={active ? "on" : "off"} />');
    assertScopedEqual(
      code,
      `import classNames from "classnames";
import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={classNames(["{scopeId}", active ? "on" : "off"])} />;
}`
    );
  });

  it('为树中每个未排除元素注入 className', () => {
    const code = transformScopedJsx(`
      <section>
        <header className="hd" />
        <p />
      </section>
    `);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <section className="{scopeId}">
        <header className="{scopeId} hd" />
        <p className="{scopeId}" />
      </section>;
}`
    );
  });

  it('通过 classNames 包装合并模板字符串 className', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const code = transformScopedJsx('<div className={`btn-${kind}`} />');
    assertScopedEqual(
      code,
      `import classNames from "classnames";
import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={classNames(["{scopeId}", \`btn-\${kind}\`])} />;
}`
    );
  });

  it('将 scope 合并进数组表达式 className', () => {
    const code = transformScopedJsx("<div className={['base', isActive && 'on']} />");
    assertScopedEqual(
      code,
      `import classNames from "classnames";
import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={classNames(["{scopeId}", ['base', isActive && 'on']])} />;
}`
    );
  });

  it('在已有 classNames() 首参前追加 scope', () => {
    const code = transformScopedJsx(
      "<div className={classNames('size', { active: on })} />",
      {},
      "import classNames from 'classnames';"
    );
    assertScopedEqual(
      code,
      `import React from 'react';
import classNames from 'classnames';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={classNames(["{scopeId}", 'size'], {
    active: on
  })} />;
}`
    );
    assert.equal((code.match(/classNames\(/g) || []).length, 1);
  });

  it('仅 import clsx 时在 clsx() 首参前追加 scope', () => {
    const code = transformScopedJsx(
      "<div className={clsx('a', cond && 'b')} />",
      { classNameLibrary: 'clsx' },
      "import clsx from 'clsx';"
    );
    assertScopedEqual(
      code,
      `import React from 'react';
import clsx from 'clsx';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={clsx(["{scopeId}", 'a'], cond && 'b')} />;
}`
    );
    assert.equal(code.includes("from 'classnames'"), false);
  });

  it('auto 且仅 clsx 时在 clsx() 首参前追加 scope', () => {
    const code = transformScopedJsx(
      "<div className={clsx('only-clsx')} />",
      { classNameLibrary: 'auto' },
      "import clsx from 'clsx';"
    );
    assertScopedEqual(
      code,
      `import React from 'react';
import clsx from 'clsx';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={clsx(["{scopeId}", 'only-clsx'])} />;
}`
    );
    assert.equal(code.includes("from 'classnames'"), false);
  });

  it('auto 且同时 import 两库时用 classNames 包装 clsx', () => {
    const code = transformScopedJsx(
      "<div className={clsx('x')} />",
      { classNameLibrary: 'auto' },
      "import clsx from 'clsx';\nimport classNames from 'classnames';"
    );
    assertScopedEqual(
      code,
      `import React from 'react';
import clsx from 'clsx';
import classNames from 'classnames';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={classNames(["{scopeId}", clsx('x')])} />;
}`
    );
  });

  it('不重复包装 classNames() 调用', () => {
    const code = transformScopedJsx(
      "<div className={classNames(['inner'])} />",
      {},
      "import classNames from 'classnames';"
    );
    assertScopedEqual(
      code,
      `import React from 'react';
import classNames from 'classnames';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className={classNames(["{scopeId}", ['inner']])} />;
}`
    );
    assert.equal((code.match(/classNames\(/g) || []).length, 1);
  });

  it('不向 template 或 slot 注入 className', () => {
    const code = transformScopedJsx(`
      <>
        <template><div className="inner" /></template>
        <slot />
      </>
    `);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <>
        <template><div className="{scopeId} inner" /></template>
        <slot />
      </>;
}`
    );
    assert.equal(code.includes('<template className='), false);
    assert.equal(code.includes('<slot className='), false);
  });
});

describe('classAttrs — 非 className 属性', () => {
  const dataClassOnly = {
    classAttrs: ['className', 'data-class'],
  };

  it('仅当元素已有 data-class 时更新 data-class', () => {
    const code = transformScopedJsx('<div data-class="badge" />', dataClassOnly);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className="{scopeId}" data-class="{scopeId} badge" />;
}`
    );
  });

  it('元素无 data-class 时不创建', () => {
    const code = transformScopedJsx('<div className="only" />', dataClassOnly);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className="{scopeId} only" />;
}`
    );
    assert.equal(code.includes('data-class='), false);
  });

  it('仅有 data-class 无 className 时仍创建 className', () => {
    const code = transformScopedJsx('<label data-class="lbl" />', dataClassOnly);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <label className="{scopeId}" data-class="{scopeId} lbl" />;
}`
    );
  });

  it('无 data-class 的兄弟节点除 className 外不变', () => {
    const code = transformScopedJsx(`
      <>
        <span data-class="a" />
        <span className="b" />
        <span />
      </>
    `, dataClassOnly);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <>
        <span className="{scopeId}" data-class="{scopeId} a" />
        <span className="{scopeId} b" />
        <span className="{scopeId}" />
      </>;
}`
    );
    const scopeId = extractScopeIdFromCode(code);
    assert.equal(code.includes(`data-class="${scopeId} b"`), false);
  });

  it('通过 classAttrs 列表支持自定义属性名', () => {
    const code = transformScopedJsx(
      '<button custom-class="cta" />',
      { classAttrs: ['className', 'custom-class'] }
    );
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <button className="{scopeId}" custom-class="{scopeId} cta" />;
}`
    );
  });

  it('属性不存在时不创建 custom-class', () => {
    const code = transformScopedJsx('<button />', {
      classAttrs: ['className', 'custom-class'],
    });
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <button className="{scopeId}" />;
}`
    );
    assert.equal(code.includes('custom-class='), false);
  });
});

describe('classAttrs — 函数 matcher', () => {
  it('仅当 matcher 对 attr 与 tag 返回 true 时应用 scope', () => {
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
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <>
        <Button className="{scopeId}" data-class="{scopeId} primary" />
        <div className="{scopeId}" data-class="ignored" />
      </>;
}`
    );
    assert.equal(code.includes('data-class="{scopeId} ignored"'), false);
  });
});

describe('classAttrs — 默认配置', () => {
  it('未自定义 classAttrs 时仅使用 className', () => {
    const code = transformScopedJsx('<div data-class="x" />');
    assertScopedEqual(
      code,
      `import React from 'react';
import "./scoped.scss?scope-style&scoped=true&id={scopeId}";
export function Demo() {
  return <div className="{scopeId}" data-class="x" />;
}`
    );
    assert.equal(code.includes('data-class="v-'), false);
  });
});
