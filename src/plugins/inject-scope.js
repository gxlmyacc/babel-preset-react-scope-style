const hash = require('hash-sum');
const options = require('../options');
const {
  createScopeQuery, resolveClassNameLibrary,
  expr2str, isFunction, existClassAttrName,
} = require('../utils');

function createScopePrefix(scopeNamespace) {
  const { scopePrefix = 'v-' } = options;
  return `${scopePrefix}${scopeNamespace ? `${scopeNamespace}-` : ''}`;
}

const scopeIds = {};
function createScopeId(filename, scopeNamespace, scopeVersion) {
  if (options.pkg) filename = `${options.pkg.name}${scopeVersion ? options.pkg.version : ''}!${filename}`;
  let key = `${filename}_${scopeNamespace}`;
  let scopeId = scopeIds[key];
  if (!scopeId) {
    scopeId = scopeIds[key] = `${createScopePrefix(scopeNamespace)}${hash(filename.replace(/\\/g, '/'))}`;
  }
  return scopeId;
}

const excludedTags = ['template', 'slot'];

module.exports = function ({ types: t, template }) {
  const scope = Boolean(options.scope);
  const scopeVersion = options.scopeVersion;
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
              ? createScopeId(filename, scopeNamespace, scopeVersion)
              : '',
            filename,
            regx: options.scopeRegx,
            handled: [],
            classNameCallee: ''
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
                else if (scoped === '?scoped') {
                  scopeId = this.scopeId || createScopeId(filename, scopeNamespace, scopeVersion);
                }
              }

              if (!scopeId) {
                if (scopeFn) {
                  let file = source.replace(this.regx, (match, p1) => scopeFn(p1, '', { filename, source, scopeId: '', pkg: options.pkg }));
                  if (file) path.node.source.value = file;
                }
                return;
              }

              /* c8 ignore next 3 — scope 为 false 时不会进入带 scopeId 的分支 */
              if (!scope) {
                return;
              }

              if (!isGlobal) this.scopeId = scopeId;
              const query = createScopeQuery(scopeId, isGlobal);
              let file = source.replace(this.regx, (match, p1) => {
                if (!scopeFn) return p1 + query;
                return scopeFn(p1, query, {
                  filename,
                  source,
                  scopeId,
                  global: isGlobal,
                  pkg: options.pkg
                });
              });
              if (file) path.node.source.value = file;
            },
          }, ctx);

          function traverseClassAttrs(path, classAttrName, tagName) {
            const classAttr = path.node.openingElement.attributes.find((attr) => {
              /* c8 ignore next — JSX 属性在合法 AST 中总有 name */
              if (!attr.name) return;
              return existClassAttrName(classAttrName, expr2str(attr.name), tagName);
            });
            if (classAttr) {
              if (t.isStringLiteral(classAttr.value)) {
                classAttr.value = t.stringLiteral(`${this.scopeId} ${classAttr.value.value}`);
              } else if (t.isJSXExpressionContainer(classAttr.value)) {
                let expr = classAttr.value.expression;
                let updater = (v) => classAttr.value.expression = v;
                if (t.isCallExpression(expr)) {
                  if (!this.classNameCallee) {
                    const lib = resolveClassNameLibrary(path, options.classNameLibrary);
                    this.classNameCallee = lib.calleeName;
                  }
                  if (expr2str(expr.callee) === this.classNameCallee) {
                    expr = classAttr.value.expression.arguments[0];
                    updater = (v) => classAttr.value.expression.arguments[0] = v;
                  }
                }
                updater(template('[$SCOPEID$,$SOURCE$]')({
                  $SCOPEID$: t.stringLiteral(this.scopeId),
                  $SOURCE$: expr
                }).expression);
              }
            } else if (classAttrName === 'className') {
              path.get('openingElement').unshiftContainer('attributes', t.jsxAttribute(
                t.jsxIdentifier(classAttrName), t.stringLiteral(this.scopeId)
              ));
            }
          }

          if (scopeAttrs && ctx.scopeId) {
            path.traverse({
              JSXElement(path) {
                let tagName = expr2str(path.node.openingElement.name);
                if (!tagName || excludedTags.includes(tagName)) return;
                classAttrs.forEach((classAttrName) => traverseClassAttrs.call(this, path, classAttrName, tagName));
              }
            }, ctx);
          }
        }
      }
    }
  };
};

module.exports.scopeIds = scopeIds;
module.exports.createScopeId = createScopeId;
