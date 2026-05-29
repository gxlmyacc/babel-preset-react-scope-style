const path = require('path');
const { execCommand } = require('./run-build');

/**
 * 注册 react-scope-style CLI（build / start）。
 * @returns {void}
 */
function startCli() {
  const { Command } = require('commander');
  const pkg = require('../package.json');

  const program = new Command();

  program
    .name('react-scope-style')
    .description('esbuild CLI with babel-preset-react-scope-style integration')
    .version(pkg.version);

  const registerSharedOptions = (command) => command
    .option('--root <path>', 'project root directory')
    .option('--config <path>', 'esbuild-scope.config.js path')
    .option('--no-config', 'skip esbuild-scope.config.js auto-discovery')
    .option('--entry <path>', 'entry file (bundle mode)')
    .option('--src <path>', 'source directory, default src')
    .option('--out <path>', 'output directory, default dist')
    .option('--outfile <path>', 'single output file (bundle mode)')
    .option('--bundle', 'SPA mode: bundle single entry (default: lib / no-bundle)')
    .option('--format <format>', 'esm | cjs | iife', 'esm')
    .option('--jsx <mode>', 'jsx transform mode', 'automatic')
    .option('--sourcemap', 'generate sourcemap')
    .option('-ts, --typescript', 'include ts/tsx in lib mode glob')
    .option('--ignore <paths>', 'ignore paths, comma separated')
    .option('--scope-style', 'enable JSX + CSS scope style (default: true)')
    .option('--no-scope-style', 'disable JSX + CSS scope style')
    .option('--scope-style-version', 'include package version in scope id')
    .option('--scope-namespace <namespace>', 'scope namespace prefix')
    .option('--servedir <path>', 'static files directory for start command')
    .option('--serve-port <port>', 'dev server port', '3002')
    .option('--disable-clean', 'do not clean output directory before build');

  registerSharedOptions(
    program
      .command('build')
      .description('build with esbuild')
      .action(async (options) => {
        try {
          await execCommand('build', options);
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      })
  );

  registerSharedOptions(
    program
      .command('start')
      .description('build, watch and serve (app bundle mode)')
      .action(async (options) => {
        try {
          await execCommand('start', options);
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      })
  );

  program.parse(process.argv);
}

module.exports = {
  startCli,
  execCommand,
};
