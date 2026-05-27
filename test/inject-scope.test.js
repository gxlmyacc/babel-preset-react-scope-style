const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset, assertScopedEqual } = require('./helpers');

describe('inject-scope 插件', () => {
  it('改写 ?scoped 样式 import 并向 JSX 注入 scope class', () => {
    const code = transformWithPreset(`
import React from 'react';
import './button.scss?scoped';

export function Button() {
  return <button className="btn">OK</button>;
}
`);
    assertScopedEqual(
      code,
      `import React from 'react';
import "./button.scss?scope-style&scoped=true&id={scopeId}";
export function Button() {
  return <button className="{scopeId} btn">OK</button>;
}`
    );
  });

  it('改写 ?global 样式 import 并带 global 前缀', () => {
    const code = transformWithPreset(`
import React from 'react';
import './theme.scss?global';

export function App() {
  return <div className="wrap">x</div>;
}
`);
    assert.equal(
      code,
      `import React from 'react';
import "./theme.scss?scope-style&scoped=true&global=true&id=v-";
export function App() {
  return <div className="wrap">x</div>;
}`
    );
  });

  it('将 scope id 合并进 classnames() 调用', () => {
    const code = transformWithPreset(`
import React from 'react';
import classnames from 'classnames';
import './a.scss?scoped';

export function Box({ on }) {
  return <div className={classnames({ active: on })} />;
}
`);
    assertScopedEqual(
      code,
      `import React from 'react';
import classnames from 'classnames';
import "./a.scss?scope-style&scoped=true&id={scopeId}";
export function Box({
  on
}) {
  return <div className={classnames(["{scopeId}", {
    active: on
  }])} />;
}`
    );
  });

  it('已 import clsx 时将 scope id 合并进 clsx()', () => {
    const code = transformWithPreset(`
import React from 'react';
import clsx from 'clsx';
import './a.scss?scoped';

export function Box({ on }) {
  return <div className={clsx({ active: on })} />;
}
`, { pluginOptions: { classNameLibrary: 'auto' } });
    assertScopedEqual(
      code,
      `import React from 'react';
import clsx from 'clsx';
import "./a.scss?scope-style&scoped=true&id={scopeId}";
export function Box({
  on
}) {
  return <div className={clsx(["{scopeId}", {
    active: on
  }])} />;
}`
    );
  });
});
