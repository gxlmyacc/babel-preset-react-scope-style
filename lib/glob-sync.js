/**
 * 同步 glob 封装：兼容 glob@8（`glob.sync`）与 glob@10+（`globSync`）。
 * 用于在 Node >=14.17 下运行 esbuild 库模式扫描。
 * @param {string} pattern - glob 模式
 * @param {object} [options={}] - glob 选项（cwd / absolute / ignore 等）
 * @returns {string[]} 匹配到的路径列表
 */
function globSync(pattern, options = {}) {
  const glob = require('glob');
  if (typeof glob.globSync === 'function') {
    return glob.globSync(pattern, options);
  }
  if (typeof glob.sync === 'function') {
    return glob.sync(pattern, options);
  }
  throw new Error(
    '[babel-preset-react-scope-style] 需要安装 glob@8+（当前包未提供 sync API）'
  );
}

module.exports = {
  globSync,
};
