const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset } = require('./helpers');

describe('inject-scope', () => {
  it('rewrites ?scoped style import and injects scope class into JSX', () => {
    const code = transformWithPreset(`
import React from 'react';
import './button.scss?scoped';

export function Button() {
  return <button className="btn">OK</button>;
}
`);
    assert.match(code, /scope-style&scoped=true&id=v-/);
    assert.match(code, /className="v-[^"]+ btn"/);
  });

  it('rewrites ?global style import with global scope prefix', () => {
    const code = transformWithPreset(`
import React from 'react';
import './theme.scss?global';

export function App() {
  return <div className="wrap">x</div>;
}
`);
    assert.match(code, /scope-style&scoped=true&global=true&id=v-/);
  });

  it('merges scope id into classnames() call', () => {
    const code = transformWithPreset(`
import React from 'react';
import classnames from 'classnames';
import './a.scss?scoped';

export function Box({ on }) {
  return <div className={classnames({ active: on })} />;
}
`);
    assert.match(code, /classnames\(\[/);
    assert.match(code, /"v-/);
  });

  it('merges scope id into clsx() call when clsx is imported', () => {
    const code = transformWithPreset(`
import React from 'react';
import clsx from 'clsx';
import './a.scss?scoped';

export function Box({ on }) {
  return <div className={clsx({ active: on })} />;
}
`, { pluginOptions: { classNameLibrary: 'auto' } });
    assert.match(code, /clsx\(\[/);
    assert.match(code, /"v-/);
  });
});
