const {
  isReactComponent, importSpecifier, expr2str, existClassAttrName,
  resolveClassNameLibrary,
} = require('../utils');
const options = require('../options');

module.exports = function ({ types: t, template }) {
  const scope = Boolean(options.scope);
  const classAttrs = options.classAttrs;

  function JSXAttributeVisitor(path) {
    let tagName = path.parent && expr2str(path.parent.name);
    let attrName = expr2str(path.node.name);
    if (!classAttrs.some((classAttrName) => existClassAttrName(classAttrName, attrName, tagName))
      || !t.isJSXExpressionContainer(path.node.value)) return;

    let expression = path.node.value.expression;
    if (t.isStringLiteral(expression)
      || t.isTemplateLiteral(expression)
      || (t.isCallExpression(expression) && expr2str(expression.callee) === this.CLASSNAMES)) return;

    if (!this.libraryVarSpecifier) {
      this.libraryVarSpecifier = importSpecifier(
        path,
        `${this.CLASSNAMES},default`,
        this.libraryName
      );
    }
    path.node.value.expression = template('$RCS($EXPR$)')({
      $RCS: this.libraryVarSpecifier.local.name,
      $EXPR$: expression
    }).expression;
  }

  return {
    visitor: {
      Program: {
        enter(path) {
          if (!scope || !isReactComponent(path)) return;

          const lib = resolveClassNameLibrary(path, options.classNameLibrary);
          const ctx = {
            libraryVarSpecifier: lib.specifier,
            libraryName: lib.libraryName,
            CLASSNAMES: lib.calleeName
          };
          path.traverse({
            JSXAttribute: JSXAttributeVisitor
          }, ctx);
        },
      },
    }
  };
};
