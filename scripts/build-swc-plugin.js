/**
 * 编译 SWC WASM 插件到 swc/。
 * 需要已安装 Rust，并添加 wasm32-wasip1（或旧版 wasm32-wasi）target。
 * Windows：仓库路径含非 ASCII 时，将源码拷到 ASCII 临时目录编译，避免 MSVC link / 路径问题。
 * @returns {void}
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const crateDir = path.join(root, 'crates', 'swc-plugin-react-scope-style');
const outDir = path.join(root, 'swc');

/**
 * 探测可用的 WASM cargo target。
 * @returns {string} target triple
 */
function resolveWasmTarget() {
  const listed = spawnSync('rustup', ['target', 'list', '--installed'], {
    encoding: 'utf8',
  });
  const text = `${listed.stdout || ''}\n${listed.stderr || ''}`;
  if (text.includes('wasm32-wasip1')) return 'wasm32-wasip1';
  if (text.includes('wasm32-wasi')) return 'wasm32-wasi';
  return 'wasm32-wasip1';
}

/**
 * 判断路径是否仅含 ASCII。
 * @param {string} p - 路径
 * @returns {boolean}
 */
function isAsciiPath(p) {
  return /^[\x00-\x7F]*$/.test(p);
}

/**
 * 递归复制目录。
 * @param {string} src - 源目录
 * @param {string} dest - 目标目录
 * @returns {void}
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  });
}

/**
 * 运行命令，失败则退出。
 * @param {string} command - 可执行文件
 * @param {string[]} args - 参数
 * @param {object} [options] - spawn 选项
 * @returns {void}
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status == null ? 1 : result.status);
  }
}

const target = resolveWasmTarget();
const env = { ...process.env };
let buildCwd = crateDir;
let targetDir = env.CARGO_TARGET_DIR;

if (!isAsciiPath(root)) {
  const staging = path.join(os.tmpdir(), 'rss-swc-plugin-src');
  targetDir = path.join(os.tmpdir(), 'rss-swc-plugin-target');
  env.CARGO_TARGET_DIR = targetDir;
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  copyDir(crateDir, staging);
  buildCwd = staging;
  console.log(`[build:swc-plugin] staged crate at ${staging}`);
  console.log(`[build:swc-plugin] CARGO_TARGET_DIR=${targetDir}`);
}

const toolchainArgs = [];
if (process.env.RSS_CARGO_TOOLCHAIN) {
  toolchainArgs.push(`+${process.env.RSS_CARGO_TOOLCHAIN}`);
}

console.log(`[build:swc-plugin] cargo build --release --target ${target}`);
run('cargo', [...toolchainArgs, 'build', '--release', '--target', target], { cwd: buildCwd, env });

const wasmName = 'swc_plugin_react_scope_style.wasm';
const built = path.join(targetDir || path.join(buildCwd, 'target'), target, 'release', wasmName);
if (!fs.existsSync(built)) {
  console.error(`[build:swc-plugin] missing ${built}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const dest = path.join(outDir, wasmName);
fs.copyFileSync(built, dest);
console.log(`[build:swc-plugin] wrote ${dest}`);
