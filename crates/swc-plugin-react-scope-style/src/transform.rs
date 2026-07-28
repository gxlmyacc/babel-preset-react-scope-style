//! 核心变换：对齐 Babel inject-scope + transform-class。

use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;
use swc_core::ecma::atoms::JsWord;
use swc_core::ecma::utils::quote_ident;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::hash_sum::hash_sum_str;
use crate::options::PluginOptions;

const SCOPE_NAME: &str = "scope-style";
const EXCLUDED_TAGS: &[&str] = &["template", "slot"];

/// 根据文件名与选项生成 scopeId（对齐 Babel createScopeId）。
///
/// - `filename`：源文件路径
/// - `opts`：插件选项
///
/// 返回如 `v-444d8b13`。
pub fn create_scope_id(filename: &str, opts: &PluginOptions) -> String {
    let mut hash_input = filename.replace('\\', "/");
    if let Some(pkg) = &opts.pkg {
        if !pkg.name.is_empty() {
            let ver = if opts.scope_version {
                pkg.version.as_str()
            } else {
                ""
            };
            hash_input = format!("{}{}!{}", pkg.name, ver, hash_input);
        }
    }
    let prefix = create_scope_prefix(opts);
    format!("{}{}", prefix, hash_sum_str(&hash_input))
}

/// 生成 scope 前缀（含可选 namespace）。
///
/// - `opts`：插件选项
///
/// 返回前缀字符串。
pub fn create_scope_prefix(opts: &PluginOptions) -> String {
    if opts.scope_namespace.is_empty() {
        opts.scope_prefix.clone()
    } else {
        format!("{}{}-", opts.scope_prefix, opts.scope_namespace)
    }
}

/// 生成 style import 上的 query。
///
/// - `scope_id`：作用域 id
/// - `is_global`：是否 global
///
/// 返回 query 字符串（含前导 `?`）。
fn create_scope_query(scope_id: &str, is_global: bool) -> String {
    if is_global {
        format!("?{SCOPE_NAME}&scoped=true&global=true&id={scope_id}")
    } else {
        format!("?{SCOPE_NAME}&scoped=true&id={scope_id}")
    }
}

/// 匹配 `.(less|scss|sass|css)(?scoped|?global)?`（对齐 Babel scopeRegx）。
///
/// - `source`：import 路径
///
/// 返回 `(path_with_ext_no_query, optional_query)`；未匹配则 None。
fn match_style_import(source: &str) -> Option<(String, Option<String>)> {
    let bytes = source.as_bytes();
    let mut i = bytes.len();
    // optional ?[a-z]+
    let mut query: Option<String> = None;
    if i > 0 {
        let mut j = i;
        while j > 0 && bytes[j - 1].is_ascii_lowercase() {
            j -= 1;
        }
        if j > 0 && bytes[j - 1] == b'?' && j < i {
            query = Some(source[j - 1..i].to_string());
            i = j - 1;
        }
    }
    // extension: .less | .scss | .sass | .css
    let ext_candidates = [".less", ".scss", ".sass", ".css"];
    for ext in ext_candidates {
        if i >= ext.len() && source[i - ext.len()..i] == *ext {
            let base = format!("{}{}", &source[..i - ext.len()], ext);
            return Some((base, query));
        }
    }
    None
}

/// 作用域变换访问器。
pub struct ScopeTransform {
    opts: PluginOptions,
    filename: String,
    /// 组件级 scopeId（由 ?scoped 或 scopeAll 确定）
    scope_id: String,
    /// 是否已 import react（transform-class 条件）
    has_react: bool,
    /// classnames/clsx 本地绑定名（已有或待注入）
    class_lib_local: Option<String>,
    /// 解析到的库包名
    class_lib_name: String,
    /// 期望的 callee 名（本地绑定或默认 classNames/clsx）
    class_lib_callee: String,
    /// 是否需要插入库 import
    need_class_lib_import: bool,
}

impl ScopeTransform {
    /// 创建访问器。
    ///
    /// - `opts`：插件选项
    /// - `filename`：当前文件路径
    ///
    /// 返回访问器实例。
    pub fn new(opts: PluginOptions, filename: String) -> Self {
        let scope_id = if opts.scope_all {
            create_scope_id(&filename, &opts)
        } else {
            String::new()
        };
        let (class_lib_name, class_lib_callee) = match opts.class_name_library.as_str() {
            "clsx" => ("clsx".into(), "clsx".into()),
            "classnames" => ("classnames".into(), "classNames".into()),
            _ => ("classnames".into(), "classNames".into()),
        };
        Self {
            opts,
            filename,
            scope_id,
            has_react: false,
            class_lib_local: None,
            class_lib_name,
            class_lib_callee,
            need_class_lib_import: false,
        }
    }

    /// 对整个 Module 执行 inject-scope + transform-class。
    ///
    /// - `module`：模块 AST
    ///
    /// 无返回值。
    pub fn transform_module(&mut self, module: &mut Module) {
        self.scan_imports(module);
        if self.opts.scope {
            self.rewrite_style_imports(module);
        }
        if self.opts.scope && self.opts.scope_attrs && !self.scope_id.is_empty() {
            module.visit_mut_children_with(self);
        }
        self.finalize_class_lib_import(module);
    }

    /// 扫描模块顶层 import，记录 react / classnames / clsx。
    ///
    /// - `module`：模块 AST
    ///
    /// 无返回值。
    fn scan_imports(&mut self, module: &Module) {
        let mut has_classnames = false;
        let mut has_clsx = false;
        let mut classnames_local = None;
        let mut clsx_local = None;

        for item in &module.body {
            let ModuleItem::ModuleDecl(ModuleDecl::Import(imp)) = item else {
                continue;
            };
            let src = imp.src.value.as_ref();
            if src == "react" {
                self.has_react = true;
            }
            if src == "classnames" {
                has_classnames = true;
                classnames_local = default_import_local(imp);
            }
            if src == "clsx" {
                has_clsx = true;
                clsx_local = default_import_local(imp);
            }
        }

        if self.opts.class_name_library == "auto" {
            if has_classnames {
                self.class_lib_name = "classnames".into();
                self.class_lib_local = classnames_local.clone();
                self.class_lib_callee = classnames_local.unwrap_or_else(|| "classNames".into());
            } else if has_clsx {
                self.class_lib_name = "clsx".into();
                self.class_lib_local = clsx_local.clone();
                self.class_lib_callee = clsx_local.unwrap_or_else(|| "clsx".into());
            }
        } else if self.opts.class_name_library == "clsx" {
            self.class_lib_local = clsx_local.clone();
            if let Some(local) = clsx_local {
                self.class_lib_callee = local;
            }
        } else {
            self.class_lib_local = classnames_local.clone();
            if let Some(local) = classnames_local {
                self.class_lib_callee = local;
            }
        }
    }

    /// 重写 `?scoped` / `?global` 样式 import 的 query。
    ///
    /// - `module`：模块 AST
    ///
    /// 无返回值。
    fn rewrite_style_imports(&mut self, module: &mut Module) {
        for item in &mut module.body {
            let ModuleItem::ModuleDecl(ModuleDecl::Import(imp)) = item else {
                continue;
            };
            let source = imp.src.value.to_string();
            let Some((base, query_opt)) = match_style_import(&source) else {
                continue;
            };
            let scoped = query_opt.as_deref().unwrap_or("");
            let is_global = scoped == "?global";
            let is_scoped = scoped == "?scoped";

            let scope_id = if is_global {
                create_scope_prefix(&self.opts)
            } else if is_scoped {
                if self.scope_id.is_empty() {
                    self.scope_id = create_scope_id(&self.filename, &self.opts);
                }
                self.scope_id.clone()
            } else {
                continue;
            };

            // 仅非 global 时写入组件级 scopeId（对齐 Babel）
            if !is_global {
                self.scope_id = scope_id.clone();
            }

            let new_query = create_scope_query(&scope_id, is_global);
            let new_src = format!("{base}{new_query}");
            imp.src = Box::new(Str {
                span: DUMMY_SP,
                value: JsWord::from(new_src),
                raw: None,
            });
        }
    }

    /// 若 transform-class 需要且尚未 import，则插入 default import。
    ///
    /// - `module`：模块 AST
    ///
    /// 无返回值。
    fn finalize_class_lib_import(&mut self, module: &mut Module) {
        if !self.need_class_lib_import {
            return;
        }
        let already = module.body.iter().any(|item| {
            matches!(
                item,
                ModuleItem::ModuleDecl(ModuleDecl::Import(imp))
                    if imp.src.value.as_ref() == self.class_lib_name
            )
        });
        if already {
            return;
        }
        let local = self
            .class_lib_local
            .clone()
            .unwrap_or_else(|| {
                if self.class_lib_name == "clsx" {
                    "clsx".into()
                } else {
                    "classNames".into()
                }
            });
        let import = ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
            span: DUMMY_SP,
            specifiers: vec![ImportSpecifier::Default(ImportDefaultSpecifier {
                span: DUMMY_SP,
                local: quote_ident!(local.as_str()),
            })],
            src: Box::new(Str {
                span: DUMMY_SP,
                value: JsWord::from(self.class_lib_name.as_str()),
                raw: None,
            }),
            type_only: false,
            with: None,
            phase: Default::default(),
        }));
        module.body.insert(0, import);
        self.class_lib_local = Some(local);
    }

    /// 处理单个 class 属性：注入 scopeId，必要时用 classnames/clsx 包装。
    ///
    /// - `el`：JSX 元素
    /// - `attr_name`：属性名
    ///
    /// 无返回值。
    fn process_class_attr(&mut self, el: &mut JSXElement, attr_name: &str) {
        let mut found_idx = None;
        for (i, attr) in el.opening.attrs.iter().enumerate() {
            let JSXAttrOrSpread::JSXAttr(a) = attr else {
                continue;
            };
            if jsx_attr_name(&a.name) == attr_name {
                found_idx = Some(i);
                break;
            }
        }

        if let Some(idx) = found_idx {
            let JSXAttrOrSpread::JSXAttr(attr) = &mut el.opening.attrs[idx] else {
                return;
            };
            match &mut attr.value {
                Some(JSXAttrValue::Lit(Lit::Str(s))) => {
                    let new_val = format!("{} {}", self.scope_id, s.value);
                    *s = Str {
                        span: DUMMY_SP,
                        value: JsWord::from(new_val),
                        raw: None,
                    };
                }
                Some(JSXAttrValue::JSXExprContainer(container)) => {
                    if let JSXExpr::Expr(expr) = &mut container.expr {
                        self.rewrite_class_expr(expr);
                    }
                }
                _ => {}
            }
        } else if attr_name == "className" {
            el.opening.attrs.insert(
                0,
                JSXAttrOrSpread::JSXAttr(JSXAttr {
                    span: DUMMY_SP,
                    name: JSXAttrName::Ident(quote_ident!("className")),
                    value: Some(JSXAttrValue::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: JsWord::from(self.scope_id.as_str()),
                        raw: None,
                    }))),
                }),
            );
        }
    }

    /// 改写 className 表达式：对齐 inject-scope 再 transform-class。
    ///
    /// - `expr`：原表达式（会被替换）
    ///
    /// 无返回值。
    fn rewrite_class_expr(&mut self, expr: &mut Box<Expr>) {
        // 已是 classnames/clsx 调用：把 scopeId 并入第一个参数（inject）；transform-class 跳过
        if let Expr::Call(call) = expr.as_mut() {
            if let Callee::Expr(callee) = &call.callee {
                if let Expr::Ident(id) = callee.as_ref() {
                    if self.is_class_lib_callee(id.sym.as_ref()) {
                        if let Some(ExprOrSpread { expr: first, .. }) = call.args.first_mut() {
                            let inner = first.clone();
                            *first = Box::new(make_scope_array(&self.scope_id, inner));
                        }
                        return;
                    }
                }
            }
        }

        // inject: [scopeId, expr]；随后 transform-class 对非「库调用」表达式包装
        //（inject 后 string/tpl 已成数组，Babel 也会再包一层 classNames/clsx）
        let inner = expr.clone();
        let array = make_scope_array(&self.scope_id, inner);

        if self.has_react {
            let local = self.ensure_class_lib_local();
            *expr = Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Ident(quote_ident!(local.as_str())))),
                args: vec![ExprOrSpread {
                    spread: None,
                    expr: Box::new(array),
                }],
                type_args: None,
            }));
        } else {
            *expr = Box::new(array);
        }
    }

    /// 判断标识符是否为当前 class 库 callee。
    ///
    /// - `name`：标识符名
    ///
    /// 返回是否匹配。
    fn is_class_lib_callee(&self, name: &str) -> bool {
        if name == self.class_lib_callee {
            return true;
        }
        if let Some(local) = &self.class_lib_local {
            if name == local {
                return true;
            }
        }
        name == "classNames" || name == "classnames" || name == "clsx"
    }

    /// 确保存在本地库绑定名；若不存在则标记待插入 import。
    ///
    /// 无入参。
    ///
    /// 返回本地绑定名。
    fn ensure_class_lib_local(&mut self) -> String {
        if let Some(name) = &self.class_lib_local {
            return name.clone();
        }
        let local: String = if self.class_lib_name == "clsx" {
            "clsx".into()
        } else {
            "classNames".into()
        };
        self.class_lib_local = Some(local.clone());
        self.class_lib_callee = local.clone();
        self.need_class_lib_import = true;
        local
    }
}

impl VisitMut for ScopeTransform {
    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
        el.visit_mut_children_with(self);

        if !self.opts.scope || self.scope_id.is_empty() || !self.opts.scope_attrs {
            return;
        }

        let tag = jsx_tag_name(&el.opening.name);
        if EXCLUDED_TAGS.contains(&tag.as_str()) {
            return;
        }

        let class_attrs = self.opts.class_attrs.clone();
        for attr_name in class_attrs {
            self.process_class_attr(el, &attr_name);
        }
    }
}

/// 构造 `[scopeId, expr]` 数组表达式。
///
/// - `scope_id`：作用域 id
/// - `inner`：原表达式
///
/// 返回数组 Expr。
fn make_scope_array(scope_id: &str, inner: Box<Expr>) -> Expr {
    Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: vec![
            Some(ExprOrSpread {
                spread: None,
                expr: Box::new(Expr::Lit(Lit::Str(Str {
                    span: DUMMY_SP,
                    value: JsWord::from(scope_id),
                    raw: None,
                }))),
            }),
            Some(ExprOrSpread {
                spread: None,
                expr: inner,
            }),
        ],
    })
}

/// 从 import 声明取 default 本地名。
///
/// - `imp`：import 声明
///
/// 有则返回本地名。
fn default_import_local(imp: &ImportDecl) -> Option<String> {
    for spec in &imp.specifiers {
        if let ImportSpecifier::Default(d) = spec {
            return Some(d.local.sym.to_string());
        }
    }
    None
}

/// 读取 JSX 属性名。
///
/// - `name`：属性名节点
///
/// 返回字符串。
fn jsx_attr_name(name: &JSXAttrName) -> String {
    match name {
        JSXAttrName::Ident(i) => i.sym.to_string(),
        JSXAttrName::JSXNamespacedName(n) => {
            format!("{}:{}", n.ns.sym, n.name.sym)
        }
    }
}

/// 读取 JSX 元素标签名。
///
/// - `name`：标签名节点
///
/// 返回字符串。
fn jsx_tag_name(name: &JSXElementName) -> String {
    match name {
        JSXElementName::Ident(i) => i.sym.to_string(),
        JSXElementName::JSXMemberExpr(m) => {
            let mut parts = vec![m.prop.sym.to_string()];
            let mut obj = &m.obj;
            loop {
                match obj {
                    JSXObject::Ident(i) => {
                        parts.push(i.sym.to_string());
                        break;
                    }
                    JSXObject::JSXMemberExpr(inner) => {
                        parts.push(inner.prop.sym.to_string());
                        obj = &inner.obj;
                    }
                }
            }
            parts.reverse();
            parts.join(".")
        }
        JSXElementName::JSXNamespacedName(n) => {
            format!("{}:{}", n.ns.sym, n.name.sym)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn match_scoped_scss() {
        let (base, q) = match_style_import("./button.scss?scoped").unwrap();
        assert_eq!(base, "./button.scss");
        assert_eq!(q.as_deref(), Some("?scoped"));
    }

    #[test]
    fn match_global_css() {
        let (base, q) = match_style_import("./theme.css?global").unwrap();
        assert_eq!(base, "./theme.css");
        assert_eq!(q.as_deref(), Some("?global"));
    }

    #[test]
    fn create_scope_id_matches_fixture() {
        let opts = PluginOptions {
            pkg: Some(crate::options::PkgInfo {
                name: "test-app".into(),
                version: "1.0.0".into(),
            }),
            ..Default::default()
        };
        assert_eq!(
            create_scope_id("/project/src/Component.jsx", &opts),
            "v-444d8b13"
        );
    }
}
