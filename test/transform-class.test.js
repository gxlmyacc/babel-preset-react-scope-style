const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { transformWithPreset } = require('./helpers');

describe('transform-class', () => {
  it('wraps array className expression with classnames', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';

export function Card() {
  return <div className={['a', 'b']} />;
}
`);
    assert.match(code, /classnames?\(/i);
    assert.match(code, /\['a', 'b'\]/);
  });

  it('wraps array className with clsx when classNameLibrary is clsx', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';

export function Card() {
  return <div className={['a', 'b']} />;
}
`, { pluginOptions: { classNameLibrary: 'clsx' } });
    assert.match(code, /clsx\(/);
    assert.doesNotMatch(code, /from ['"]classnames['"]/);
  });

  it('does not wrap template literal className when scope is off', () => {
    const code = transformWithPreset(`
import React from 'react';

export function Card() {
  return <div className={\`static-\${1}\`} />;
}
`, { pluginOptions: { scope: false } });
    assert.doesNotMatch(code, /classnames/i);
    assert.match(code, /className=\{`static-\$\{1\}`\}/);
  });

  it('does not wrap string literal className', () => {
    const code = transformWithPreset(`
import React from 'react';
import './x.scss?scoped';

export function Card() {
  return <div className="static" />;
}
`);
    assert.doesNotMatch(code, /classnames\(\{/);
  });
});
