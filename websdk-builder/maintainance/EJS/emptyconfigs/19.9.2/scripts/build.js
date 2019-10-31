/* eslint-env node */
// Ideally, here will be the only file where process.env is read
/* eslint-disable no-process-env */

const pjson = require("../package.json");
const chalk = require("chalk");
const { promisify } = require("util");
const { buildHTML, buildImages } = require("./buildAssets");
const { rollupBuild } = require("./rollupBuild");
const { buildTemplates } = require("./buildTemplates");
const { cleanDist, createDistFolders } = require("./cleanup");

const DIST = pjson.build.dist;

function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    stream.once("finish", resolve);
    stream.once("error", reject);
  });
}

async function freshStart(version) {
  console.log("  ↳ removing dist folder...");
  await promisify(cleanDist)(DIST);

  console.log("  ↳ recreating dist folder...");
  await promisify(createDistFolders)(DIST, version);
}

async function buildAssets(isProd, version) {
  console.log("  ↳ building HTML...");
  await streamToPromise(buildHTML(isProd, DIST, version));

  console.log("  ↳ copying images...");
  await streamToPromise(buildImages(DIST, version));

  console.log("  ↳ building templates...");
  await promisify(buildTemplates)(DIST, version);
}

async function buildCode(isProd, version) {
  // TODO: this is ugly, but not sure what a better way would be
  // the rollup.config.js needs to be usable by the rollup binary
  // as well as our code.
  process.env.NODE_ENV = isProd ? "production" : "development";
  process.env.VERSION_OVERRIDE = version;

  await promisify(rollupBuild)();
}

// note, this skips custom templates, client assets, etc
// only builds for a code push to FCP
async function buildForDeploy(isProd, version) {
  console.log(chalk.magenta("Assembling for deploy..."));
  await freshStart(version);
  await buildAssets(isProd, version);
  await buildCode(isProd, version);
}

module.exports = { buildForDeploy, DIST };
