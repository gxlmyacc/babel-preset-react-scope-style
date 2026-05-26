const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset } = require('./helpers');

describe('inject-scope edge cases', () => {
  it('scopeAll injects scope without style import', () => {
    const code = transformWithPreset(`
import React from 'react';
export function Box() {
  return <div className="box" />;
}
`, { pluginOptions: { scopeAll: true } });
    assert.match(code, /className="v-[^"]+ box"/);
    assert.doesNotMatch(code, /scope-style/);
  });

  it('scopeVersion includes package name in scope id', () => {
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

  it('scopeFn can rewrite import without scoped query', () => {
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

  it('scopeFn receives scopeId when scoped import', () => {
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

  it('does not rewrite when scope is disabled', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() { return <div className="a" />; }
`, { pluginOptions: { scope: false } });
    assert.match(code, /\.\/x\.scss\?scoped/);
    assert.doesNotMatch(code, /scope-style/);
  });

  it('injects className on elements without class attr', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';
export function A() { return <div />; }
`);
    assert.match(code, /<div className="v-[^"]+"/);
  });

  it('skips template and slot tags', () => {
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

  it('supports .less and .sass imports', () => {
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

  it('scopeFn without scope still rewrites import when matched', () => {
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

  it('rewrites ?global style import with scope prefix id', () => {
    const code = transformWithPreset(`
import React from 'react';
import './global.scss?global';
export function A() { return <div className="a" />; }
`);
    assert.match(code, /scope-style&scoped=true&global=true&id=v-/);
    assert.match(code, /global\.scss\?scope-style/);
  });

  it('treats options.scope function as scopeFn', () => {
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

  it('uses scope string as namespace in scope id', () => {
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

  it('wraps existing classnames call when injecting scope', () => {
    const code = transformWithPreset(`
import React from 'react';
import classNames from 'classnames';
import './x.scss?scoped';
export function A() { return <div className={classNames('a', 'b')} />; }
`);
    assert.match(code, /classNames\(\["v-[^"]+",\s*'a'\],\s*'b'\)/);
  });
});
