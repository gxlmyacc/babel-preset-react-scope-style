/**
 * 单文件测试调试入口：同进程 require 测试文件，并在加载前暂停以便 VS Code 绑定断点。
 * @returns {void}
 */
const { existsSync } = require('fs');
const { resolve } = require('path');

const input = process.argv[2] || '';
const target = resolve(input);

if (!input || !existsSync(target)) {
  console.error('Usage: node scripts/debug-test.js <path-to-test-file>');
  process.exit(1);
}

// 调试器应在此行暂停；若此处能停而测试文件断点不停，多为路径不一致（见 README 调试说明）
console.log('[debug-test] loading:', target);

require(target);
