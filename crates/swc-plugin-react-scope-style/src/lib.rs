//! babel-preset-react-scope-style 的 SWC 插件（Phase B）。
//!
//! B1：对齐 Babel `inject-scope` + `transform-class`（见 `test/fixtures/phase-b`）。

use swc_core::common::plugin::metadata::TransformPluginMetadataContextKind;
use swc_core::ecma::ast::Program;
use swc_core::ecma::visit::VisitMutWith;
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

mod hash_sum;
mod options;
mod transform;

use options::PluginOptions;
use transform::ScopeTransform;

/// 从插件元数据解析选项与文件名。
///
/// - `metadata`：SWC 插件元数据
///
/// 返回 `(选项, 文件名)`。
fn read_context(metadata: &TransformPluginProgramMetadata) -> (PluginOptions, String) {
    let opts = metadata
        .get_transform_plugin_config()
        .and_then(|raw| serde_json::from_str::<PluginOptions>(&raw).ok())
        .unwrap_or_default();

    let filename = metadata
        .get_context(&TransformPluginMetadataContextKind::Filename)
        .unwrap_or_else(|| "unknown.js".into());

    (opts, filename)
}

/// SWC 插件入口：对 Program 执行作用域变换。
///
/// - `program`：输入 AST
/// - `metadata`：插件元数据（含 filename / 配置 JSON）
///
/// 返回变换后的 Program。
#[plugin_transform]
pub fn process_transform(
    mut program: Program,
    metadata: TransformPluginProgramMetadata,
) -> Program {
    let (opts, filename) = read_context(&metadata);

    if !opts.scope {
        return program;
    }

    let mut visitor = ScopeTransform::new(opts, filename);
    match &mut program {
        Program::Module(module) => visitor.transform_module(module),
        Program::Script(script) => {
            // Script 少见；仅遍历子节点做 JSX 注入（无 style import 重写入口时 scope_id 可能为空）
            script.visit_mut_with(&mut visitor);
        }
    }

    program
}
