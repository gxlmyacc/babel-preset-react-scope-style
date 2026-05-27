const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset, assertScopedEqual } = require('./helpers');

describe('transform-class 插件', () => {
  it('用 classnames 包装数组 className 表达式', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';

export function Card() {
  return <div className={['a', 'b']} />;
}
`);
    assertScopedEqual(
      code,
      `import classNames from "classnames";
import React from 'react';
import "./x.scss?scope-style&scoped=true&id={scopeId}";
export function Card() {
  return <div className={classNames(["{scopeId}", ['a', 'b']])} />;
}`
    );
  });

  it('classNameLibrary 为 clsx 时用 clsx 包装数组 className', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';

export function Card() {
  return <div className={['a', 'b']} />;
}
`, { pluginOptions: { classNameLibrary: 'clsx' } });
    assertScopedEqual(
      code,
      `import clsx from "clsx";
import React from 'react';
import "./x.scss?scope-style&scoped=true&id={scopeId}";
export function Card() {
  return <div className={clsx(["{scopeId}", ['a', 'b']])} />;
}`
    );
    assert.equal(code.includes("from 'classnames'"), false);
  });

  it('scope 关闭时不包装模板字符串 className', () => {
    const code = transformWithPreset(`
import React from 'react';

export function Card() {
  return <div className={\`static-\${1}\`} />;
}
`, { pluginOptions: { scope: false } });
    assert.equal(
      code,
      `import React from 'react';
export function Card() {
  return <div className={\`static-\${1}\`} />;
}`
    );
    assert.equal(/classnames/i.test(code), false);
  });

  it('不包装字符串字面量 className', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';

export function Card() {
  return <div className="static" />;
}
`);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./x.scss?scope-style&scoped=true&id={scopeId}";
export function Card() {
  return <div className="{scopeId} static" />;
}`
    );
    assert.equal(/classnames\(\{/.test(code), false);
  });
});
