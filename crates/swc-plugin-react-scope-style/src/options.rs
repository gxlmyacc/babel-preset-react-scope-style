//! 插件配置（对齐 Babel preset options 的常用字段）。

use serde::Deserialize;

/// npm 包信息（用于 scopeId 哈希输入）。
#[derive(Debug, Clone, Default, Deserialize)]
pub struct PkgInfo {
    /// package.json name
    #[serde(default)]
    pub name: String,
    /// package.json version（仅 scopeVersion 时使用）
    #[serde(default)]
    pub version: String,
}

/// SWC 插件选项（由 Next `experimental.swcPlugins` 第二项传入）。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PluginOptions {
    /// 是否启用作用域
    pub scope: bool,
    /// 作用域 class 前缀
    pub scope_prefix: String,
    /// 命名空间（插入 prefix 与 hash 之间）
    pub scope_namespace: String,
    /// 是否把 package version 计入 hash
    pub scope_version: bool,
    /// 是否向 JSX 注入 scope class
    pub scope_attrs: bool,
    /// 是否在无 ?scoped import 时也生成 scopeId
    pub scope_all: bool,
    /// 视为 class 的属性名列表
    pub class_attrs: Vec<String>,
    /// classnames / clsx / auto
    pub class_name_library: String,
    /// 可选 pkg
    pub pkg: Option<PkgInfo>,
}

impl Default for PluginOptions {
    /// 返回与 Babel `options-default` 对齐的默认配置。
    fn default() -> Self {
        Self {
            scope: true,
            scope_prefix: "v-".into(),
            scope_namespace: String::new(),
            scope_version: false,
            scope_attrs: true,
            scope_all: false,
            class_attrs: vec!["className".into()],
            class_name_library: "auto".into(),
            pkg: None,
        }
    }
}
