/**
 * 跨平台执行 test 目录下所有 *.test.js（Windows 下 npm 不会展开 ** glob）。
 * @returns {void}
 */
const { readdirSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

/**
 * 递归收集目录中的测试文件。
 * @param {string} dir - 起始目录
 * @returns {string[]} 测试文件绝对路径列表
 */
function collectTestFiles(dir) {
  const files = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const testDir = join(__dirname, '..', 'test');
const testFiles = collectTestFiles(testDir).sort();

if (!testFiles.length) {
  console.error(`No test files found under ${testDir}`);
  process.exit(1);
}

const isParentUnderDebugger = process.execArgv.some((arg) => /^--inspect/.test(arg));
const spawnOptions = {
  stdio: 'inherit',
  env: { ...process.env },
};
if (isParentUnderDebugger) {
  // 父进程已被 VS Code 调试时，子进程单独 --inspect，便于 autoAttachChildProcesses 挂载
  spawnOptions.execArgv = [];
  const prev = spawnOptions.env.NODE_OPTIONS || '';
  spawnOptions.env.NODE_OPTIONS = `${prev} --inspect`.trim();
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], spawnOptions);

process.exit(result.status == null ? 1 : result.status);
