module.exports = {
  scopeRegx: /(\.(?:le|sc|sa|c)ss)(\?[a-z]+)?$/,
  scope: true,
  scopeFn: null,
  scopePrefix: 'v-',
  scopeAttrs: true,
  scopeAll: false,
  scopeVersion: false,
  pkg: /** @type {any} */(null),

  classAttrs: ['className'],
};
