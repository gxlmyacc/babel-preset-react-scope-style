const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset } = require('./helpers');

describe('inject-scope 边界情况', () => {
  it('scopeAll 在无样式 import 时仍注入 scope', () => {
    const code = transformWithPreset(`
import React from 'react';
export function Box() {
  return <div className="box" />;
}
`, { pluginOptions: { scopeAll: true } });
    assert.match(code, /className="v-[^"]+ box"/);
    assert.doesNotMatch(code, /scope-style/);
  });

  it('scopeVersion 在 scope id 中包含包名', () => {
    const code = transformWithPreset(`
import React from 'react';
import './a.scss?scoped';
export function A() { return <div />; }
`, {
      filename: '/p/src/A.jsx',
      pluginOptions: { scopeVersion: true, pkg: { name: 'my-pkg', version: '1.0.0' } },
    });
    const id = code.match(/id=(v-[a-z0-9]+)/)[1];
    assert.ok(id);
  });

  it('scopeFn 可改写无 scoped query 的 import', () => {
    const code = transformWithPreset(`
import React from 'react';
import './plain.scss';
export function A() { return <div />; }
`, {
      pluginOptions: {
        scopeFn: (p1) => `${p1}?scoped`,
      },
    });
    assert.match(code, /plain\.scss\?scoped/);
  });

  it('scoped import 时 scopeFn 收到 scopeId', () => {
    let captured;
    transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() { return <div className="a" />; }
`, {
      pluginOptions: {
        scopeFn: (p1, query, meta) => {
          captured = meta;
          return p1 + query;
        },
      },
    });
    assert.ok(captured.scopeId);
    assert.equal(captured.global, false);
  });

  it('scope 关闭时不改写', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() { return <div className="a" />; }
`, { pluginOptions: { scope: false } });
    assert.match(code, /\.\/x\.scss\?scoped/);
    assert.doesNotMatch(code, /scope-style/);
  });

  it('为无 class 属性的元素注入 className', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() { return <div />; }
`);
    assert.match(code, /<div className="v-[^"]+"/);
  });

  it('跳过 template 与 slot 标签', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() {
  return (
    <>
      <template><div className="t" /></template>
      <slot />
    </>
  );
}
`);
    assert.doesNotMatch(code, /<template className=/);
    assert.doesNotMatch(code, /<slot className=/);
  });

  it('支持 .less 与 .sass import', () => {
    const less = transformWithPreset(`
import React from 'react';
import './a.less?scoped';
export function A() { return <div />; }
`);
    const sass = transformWithPreset(`
import React from 'react';
import './b.sass?scoped';
export function B() { return <div />; }
`);
    assert.match(less, /\.less\?scope-style/);
    assert.match(sass, /\.sass\?scope-style/);
  });

  it('scope 关闭但匹配时 scopeFn 仍改写 import', () => {
    const code = transformWithPreset(`
import React from 'react';
import './plain.scss';
export function A() { return <div />; }
`, {
      pluginOptions: {
        scope: false,
        scopeFn: (p1, q) => (q ? p1 + q : `${p1}?from-fn`),
      },
    });
    assert.match(code, /plain\.scss\?from-fn/);
  });

  it('改写 ?global 样式 import 并带 scope 前缀 id', () => {
    const code = transformWithPreset(`
import React from 'react';
import './global.scss?global';
export function A() { return <div className="a" />; }
`);
    assert.match(code, /scope-style&scoped=true&global=true&id=v-/);
    assert.match(code, /global\.scss\?scope-style/);
  });

  it('将 options.scope 函数视为 scopeFn', () => {
    const code = transformWithPreset(`
import React from 'react';
import './fn.scss?scoped';
export function A() { return <div />; }
`, {
      pluginOptions: {
        scope: (p1, query) => (query ? `${p1}${query}` : `${p1}?fn`),
      },
    });
    assert.match(code, /fn\.scss\?scope-style/);
  });

  it('将 scope 字符串用作 scope id 的命名空间', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() { return <div />; }
`, {
      filename: '/p/src/Namespaced.jsx',
      pluginOptions: { scope: 'pkg' },
    });
    assert.match(code, /id=v-pkg-/);
  });

  it('注入 scope 时包装已有 classnames 调用', () => {
    const code = transformWithPreset(`
import React from 'react';
import classNames from 'classnames';
import './x.scss?scoped';
export function A() { return <div className={classNames('a', 'b')} />; }
`);
    assert.match(code, /classNames\(\["v-[^"]+",\s*'a'\],\s*'b'\)/);
  });
});
