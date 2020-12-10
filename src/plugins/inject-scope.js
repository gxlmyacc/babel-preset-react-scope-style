const hash = require('hash-sum');
const options = require('../options');
const {
  ScopeName, ClassNames,
  expr2str, isFunction,
} = require('../utils');

function createScopePrefix(scopeNamespace) {
  return `x-${scopeNamespace ? `${scopeNamespace}-` : ''}`;
}

function createScopeId(filename, scopeNamespace) {
  if (options.pkg) filename = `${options.pkg.name}!${filename}`;
  return `${createScopePrefix(scopeNamespace)}${hash(filename.replace(/\\/g, '/'))}`;
}

const excluedTags = ['template', 'slot'];

module.exports = function ({ types: t, template }) {
  const scope = Boolean(options.scope);
  const scopeAttrs = options.scopeAttrs;
  const scopeFn = options.scopeFn || (isFunction(options.scope) ? options.scope : null);
  const scopeNamespace = options.scopeNamespace 
    || (typeof options.scope === 'string' ? options.scope : '');
  const scopePrefix = createScopePrefix(scopeNamespace);
  const classAttrs = options.classAttrs;
  const scopeAll = options.scopeAll;
  return {
    visitor: {
      Program: {
        enter(path,
          {
            file: {
              opts: { filename }
            },
          }) {
          const ctx = {
            globalId: '',
            scopeId: scopeAll 
              ? createScopeId(filename, scopeNamespace, scopePrefix)
              : '',
            filename,
            regx: options.scopeRegx,
            handled: []
          };

          path.traverse({
            ImportDeclaration(path) {
              let source = path.node.source.value;
              const [matched, , scoped] = source.match(this.regx) || [];
              if (!matched) return;
              let scopeId = '';
              let isGlobal = scoped === '?global';
              if (scope) {
                if (isGlobal) scopeId = scopePrefix;
                else if (scoped === '?scoped') scopeId = this.scopeId || createScopeId(filename, scopeNamespace, scopePrefix);
              }
  
              if (!scopeId) {
                if (scopeFn) {
                  let file = source.replace(this.regx, (match, p1) => scopeFn(p1, '', { filename, source, scopeId: '' }));
                  if (file) path.node.source.value = file;
                }
                return;
              }

              if (!isGlobal) this.scopeId = scopeId;
              const query = `?${ScopeName}&scoped=true${isGlobal ? '&global=true' : ''}&id=${scopeId}`;
              let file = source.replace(this.regx, (match, p1) => {
                if (!scopeFn) return p1 + query;
                return scopeFn(p1, query, { 
                  filename, 
                  source, 
                  scopeId, 
                  global: isGlobal 
                });
              });
              if (file) path.node.source.value = file;
            },
          }, ctx);

          function traverseClassAttrs(path, attrName) {
            const classAttr = path.node.openingElement.attributes.find(attr => attr.name && expr2str(attr.name) === attrName);
            if (classAttr) {
              if (t.isStringLiteral(classAttr.value)) {
                classAttr.value = t.stringLiteral(`${this.scopeId} ${classAttr.value.value}`);
              } else if (t.isJSXExpressionContainer(classAttr.value)) {
                let expr = classAttr.value.expression;
                let updator = v => classAttr.value.expression = v;
                if (t.isCallExpression(expr)  
                  && expr2str(expr.callee) === ClassNames) {
                  expr = classAttr.value.expression.arguments[0];
                  updator = v => classAttr.value.expression.arguments[0] = v;
                }
                updator(template('[$SCOPEID$,$SOURCE$]')({
                  $SCOPEID$: t.stringLiteral(this.scopeId),
                  $SOURCE$: expr
                }).expression);
              }
            } else if (attrName === 'className') {
              path.get('openingElement').unshiftContainer('attributes', t.jsxAttribute(
                t.jsxIdentifier(attrName), t.stringLiteral(this.scopeId)
              ));
            }
          }

          if (scopeAttrs && ctx.scopeId) {
            path.traverse({
              JSXElement(path) {
                let tagName = expr2str(path.node.openingElement.name);
                if (!tagName || excluedTags.includes(tagName)) return;
                classAttrs.forEach(attrName => traverseClassAttrs.call(this, path, attrName));
              }
            }, ctx);
          }
        }
      }
    }
  };
};
