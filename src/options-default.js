/** @typedef {import('../types').ScopeStyleOptions} ScopeStyleOptions */

/** @type {Required<Pick<ScopeStyleOptions, keyof ScopeStyleOptions>> & ScopeStyleOptions} */
module.exports = {
  scopeRegx: /(\.(?:le|sc|sa|c)ss)(\?[a-z]+)?$/,
  scope: true,
  scopeFn: null,
  scopePrefix: 'v-',
  scopeAttrs: true,
  scopeAll: false,
  scopeVersion: false,
  pkg: null,
  classAttrs: ['className'],
  classNameLibrary: 'auto',
};
