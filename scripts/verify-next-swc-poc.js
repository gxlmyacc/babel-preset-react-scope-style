/**
 * 扫描 next-swc-poc 构建产物，确认 SWC 插件写入了 scope-style query / scope class。
 * @returns {void}
 */
const fs = require('fs');
const path = require('path');

/**
 * 递归收集目录下文件。
 * @param {string} dir - 目录
 * @param {(name: string) => boolean} [filter] - 文件名过滤
 * @param {string[]} [acc] - 累加列表
 * @returns {string[]}
 */
function walk(dir, filter = () => true, acc = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'cache') return;
      walk(full, filter, acc);
    } else if (filter(entry.name)) acc.push(full);
  });
  return acc;
}

const root = path.join(__dirname, '../examples/next-swc-poc/.next');
if (!fs.existsSync(root)) {
  console.error('missing .next — run examples/next-swc-poc build first');
  process.exit(1);
}

const cssFiles = walk(root, (name) => name.endsWith('.css'));
const jsFiles = walk(root, (name) => name.endsWith('.js'));
const htmlFiles = walk(root, (name) => name.endsWith('.html'));

let queryHits = 0;
let cssScopedHits = 0;
let htmlClassHits = 0;

jsFiles.forEach((file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('scope-style&scoped=true')) queryHits += 1;
});

cssFiles.forEach((file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.[a-zA-Z_-]+\.v-[a-f0-9]+/.test(text)) cssScopedHits += 1;
});

htmlFiles.forEach((file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (/class="v-[a-f0-9]+/.test(text)) htmlClassHits += 1;
});

console.log(JSON.stringify({
  queryHits,
  cssScopedHits,
  htmlClassHits,
  cssFiles: cssFiles.length,
}, null, 2));

if (cssScopedHits < 1 || htmlClassHits < 1) {
  console.error('FAIL: expected scoped CSS selectors and HTML className with scope id');
  process.exit(1);
}
console.log('OK: SWC + loader scoping verified');
