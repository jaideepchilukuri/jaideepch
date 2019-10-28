/* eslint-env node */

const rollup = require("rollup");
const chalk = require("chalk");
const path = require("path");

function requireRollupConfig() {
  const fullpath = path.resolve(`${__dirname}/../rollup.config.js`);

  // for deploy script so it will load a fresh copy every time
  delete require.cache[fullpath];

  // eslint-disable-next-line global-require
  return require(fullpath);
}

/**
 * Build using Rollup and the rollup config
 */
function rollupBuild(cb) {
  console.log(chalk.magenta("Building sdk..."));

  const config = requireRollupConfig();

  const bundle = async component => {
    const bundle = await rollup.rollup(component);
    await bundle.write(component.output);
  };

  const serial = async () => {
    // eslint-disable-next-line es5/no-for-of
    for (const component of config) {
      // eslint-disable-next-line no-await-in-loop
      await bundle(component);
    }
  };

  const parallel = () => Promise.all(config.map(bundle));

  // BUG: windows seems to run out of memory if we try to run rollup in parallel
  // mac seems to handle this just fine.
  const run = process.platform === "darwin" ? parallel : serial;

  run()
    .then(() => cb(null))
    .catch(err => {
      prettyPrintRollupError(err);
      cb(new Error("Rollup build failed"));
    });
}

function relativeId(id) {
  if (typeof process === "undefined" || !path.isAbsolute(id)) return id;
  return path.relative(process.cwd(), id);
}

// pretty print the error -- this is copied from the rollup bin script
function prettyPrintRollupError(err) {
  const stderr = console.error.bind(console); // eslint-disable-line no-console

  stderr("");

  let description = err.message || err;
  if (err.name) description = `${err.name}: ${description}`;
  const message = (err.plugin ? `(${err.plugin} plugin) ${description}` : description) || err;

  stderr(chalk.bold.red(`[!] Rollup ${chalk.bold(message.toString())}`));

  if (err.url) {
    stderr(chalk.cyan(err.url));
  }
  if (err.loc) {
    stderr(`${relativeId(err.loc.file || err.id)} (${err.loc.line}:${err.loc.column})`);
  } else if (err.id) {
    stderr(relativeId(err.id));
  }
  if (err.frame) {
    stderr(chalk.dim(err.frame));
  }
  // if (err.stack) {
  //   stderr(chalk.dim(err.stack));
  // }
  stderr("");
}

module.exports = { rollupBuild };
