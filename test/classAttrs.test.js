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

describe('classAttrs — className 属性', () => {
  it('为无 class 属性的元素创建 className', () => {
    const code = transformScopedJsx(`
      <>
        <div />
        <span />
      </>
    `);
    assert.match(code, /<div className="v-[^"]+"/);
    assert.match(code, /<span className="v-[^"]+"/);
  });

  it('在已有字符串 className 前追加 scope id', () => {
    const code = transformScopedJsx('<div className="btn primary" />');
    assert.match(code, /className="v-[^"]+ btn primary"/);
  });

  it('将 scope id 合并进已有 className 表达式', () => {
    const code = transformScopedJsx('<div className={active ? "on" : "off"} />');
    assert.match(code, /className=\{classNames\(\["v-[^"]+",\s*active \? "on" : "off"\]\)\}/);
  });

  it('为树中每个未排除元素注入 className', () => {
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

  it('通过 classNames 包装合并模板字符串 className', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const code = transformScopedJsx('<div className={`btn-${kind}`} />');
    assert.match(code, /className=\{classNames\(\["v-[^"]+",\s*`btn-\$\{kind\}`\]\)\}/);
  });

  it('将 scope 合并进数组表达式 className', () => {
    const code = transformScopedJsx("<div className={['base', isActive && 'on']} />");
    assert.match(
      code,
      /className=\{classNames\(\["v-[^"]+",\s*\['base', isActive && 'on'\]\]\)\}/
    );
  });

  it('在已有 classNames() 首参前追加 scope', () => {
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

  it('仅 import clsx 时在 clsx() 首参前追加 scope', () => {
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

  it('auto 且仅 clsx 时在 clsx() 首参前追加 scope', () => {
    const code = transformScopedJsx(
      "<div className={clsx('only-clsx')} />",
      { classNameLibrary: 'auto' },
      "import clsx from 'clsx';"
    );
    assert.match(code, /className=\{clsx\(\["v-[^"]+",\s*'only-clsx'\]\)\}/);
    assert.doesNotMatch(code, /from ['"]classnames['"]/);
  });

  it('auto 且同时 import 两库时用 classNames 包装 clsx', () => {
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

  it('不重复包装 classNames() 调用', () => {
    const code = transformScopedJsx(
      "<div className={classNames(['inner'])} />",
      {},
      "import classNames from 'classnames';"
    );
    assert.match(code, /classNames\(\["v-[^"]+",\s*\['inner'\]\]\)/);
    assert.equal((code.match(/classNames\(/g) || []).length, 1);
  });

  it('不向 template 或 slot 注入 className', () => {
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

describe('classAttrs — 非 className 属性', () => {
  const dataClassOnly = {
    classAttrs: ['className', 'data-class'],
  };

  it('仅当元素已有 data-class 时更新 data-class', () => {
    const code = transformScopedJsx(
      '<div data-class="badge" />',
      dataClassOnly
    );
    assert.match(code, /data-class="v-[^"]+ badge"/);
    assert.match(code, /<div className="v-[^"]+"/);
  });

  it('元素无 data-class 时不创建', () => {
    const code = transformScopedJsx('<div className="only" />', dataClassOnly);
    assert.match(code, /className="v-[^"]+ only"/);
    assert.doesNotMatch(code, /data-class=/);
  });

  it('仅有 data-class 无 className 时仍创建 className', () => {
    const code = transformScopedJsx('<label data-class="lbl" />', dataClassOnly);
    assert.match(code, /data-class="v-[^"]+ lbl"/);
    assert.match(code, /<label className="v-[^"]+"/);
  });

  it('无 data-class 的兄弟节点除 className 外不变', () => {
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

  it('通过 classAttrs 列表支持自定义属性名', () => {
    const code = transformScopedJsx(
      '<button custom-class="cta" />',
      { classAttrs: ['className', 'custom-class'] }
    );
    assert.match(code, /custom-class="v-[^"]+ cta"/);
    assert.match(code, /<button className="v-[^"]+"/);
  });

  it('属性不存在时不创建 custom-class', () => {
    const code = transformScopedJsx('<button />', {
      classAttrs: ['className', 'custom-class'],
    });
    assert.match(code, /<button className="v-[^"]+"/);
    assert.doesNotMatch(code, /custom-class=/);
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
    assert.match(code, /<Button className="v-[^"]+" data-class="v-[^"]+ primary"/);
    assert.match(code, /<div className="v-[^"]+" data-class="ignored"/);
    assert.doesNotMatch(code, /data-class="v-[^"]+ ignored"/);
    assert.match(code, /<Button className="v-[^"]+"/);
    assert.match(code, /<div className="v-[^"]+"/);
  });
});

describe('classAttrs — 默认配置', () => {
  it('未自定义 classAttrs 时仅使用 className', () => {
    const code = transformScopedJsx('<div data-class="x" />');
    assert.match(code, /<div className="v-[^"]+"/);
    assert.equal(code.includes('data-class='), true);
    assert.doesNotMatch(code, /data-class="v-/);
  });
});
