//! 复刻 npm `hash-sum` 对字符串的结果（scopeId 必须与 Babel 一致）。

/// 将 32 位 hash 左侧补零到至少 `len` 位十六进制。
///
/// - `hash`：十六进制字符串
/// - `len`：目标长度
///
/// 返回补零后的字符串。
fn pad(mut hash: String, len: usize) -> String {
    while hash.len() < len {
        hash = format!("0{hash}");
    }
    hash
}

/// hash-sum 的 fold：把文本折叠进 i32 hash。
///
/// - `hash`：当前累加值
/// - `text`：待折叠文本
///
/// 返回新的非负 i32。
fn fold(mut hash: i32, text: &str) -> i32 {
    if text.is_empty() {
        return hash;
    }
    for ch in text.chars() {
        let chr = ch as i32;
        hash = hash.wrapping_shl(5).wrapping_sub(hash).wrapping_add(chr);
    }
    if hash < 0 {
        hash.wrapping_mul(-2)
    } else {
        hash
    }
}

/// 对字符串计算与 `hash-sum` 相同的 8 位十六进制摘要。
///
/// - `value`：输入字符串（无入参对象分支；Babel 对 filename 只传 string）
///
/// 返回 8 位 hex。
pub fn hash_sum_str(value: &str) -> String {
    // foldValue(0, str, '', []) 对 string 的路径：
    // hash = fold(fold(fold(0, key=''), '[object String]'), 'string')
    // then fold(hash, value.toString())
    let mut hash = fold(0, "");
    hash = fold(hash, "[object String]");
    hash = fold(hash, "string");
    hash = fold(hash, value);
    pad(format!("{hash:x}"), 8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_npm_hash_sum_for_component_path() {
        assert_eq!(
            hash_sum_str("test-app!/project/src/Component.jsx"),
            "444d8b13"
        );
    }
}
