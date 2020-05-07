/* eslint-env node */

// *************************************************
// Load some more dependencies
// *************************************************

const gulp = require("gulp");
const rimraf = require("rimraf");
const runSequence = require("run-sequence");
const argv = require("yargs").argv;

// *************************************************
// Boot things up
// *************************************************

const svcmp = require("semver-compare");
const chalk = require("chalk");
const {
  pjson,
  clientProperties,
  getGlobalConfig,
  isProd,
  isSSL,
  testEnvs,
} = require("./scripts/SDKConfigs.js");

// Validate Node version against minimum set in package.json
const _evner = process.version.toString().replace(/[v><=]/gi, "");
const _mpver = pjson.engines.node.toString().replace(/[v><=]/gi, "");

if (svcmp(_evner, _mpver) == -1) {
  console.log(
    chalk.grey("\n****"),
    chalk.magenta("A minimum Node version of "),
    chalk.yellow(
      "v",
      _mpver.toString(),
      " is required (your version: ",
      "v",
      _evner.toString(),
      "). Please get the latest from ",
      "http://nodejs.org"
    ),
    chalk.magenta("."),
    chalk.grey("****\n")
  );
  throw Error("process.version < packagejson.engines.node");
}

// Signals what version we are running
console.log(
  chalk.magenta("Client Code"),
  chalk.yellow(`v${pjson.version.toString()}`),
  chalk.magenta(". NodeJS"),
  chalk.yellow(process.version.toString()),
  chalk.magenta(".")
);

//todo: require these only in the task needing them; to speed up things
const FCP = require("./scripts/FCP");
const { buildHTML, buildImages, buildClientAssets } = require("./scripts/buildAssets");
const { rollupBuild } = require("./scripts/rollupBuild");
const { buildSelfHosted } = require("./scripts/buildSelfHosted");
const { buildTemplates, buildCustomTemplates } = require("./scripts/buildTemplates");
const { startTestServer, startPreviewServer } = require("./scripts/testServer");
const { cleanDist, createDistFolders } = require("./scripts/cleanup");
const { compareConfig } = require("./scripts/configDiff");
const unreachables = require("./scripts/unreachables");

// *************************************************
// Here are the tasks
// *************************************************

/**
 * Delete node_modules
 */
gulp.task("_clean_modules", function(cb) {
  rimraf("./node_modules", cb);
});

/**
 * Delete any files in the dist folder
 */
gulp.task("_cleandist", function(cb) {
  cleanDist(pjson.build.dist, cb);
});

/**
 * Recreate folders deleted by _cleandist
 */
gulp.task("_createfolders", function(cb) {
  createDistFolders(pjson.build.dist, pjson.version, cb);
});

// *************************************************
// BUILDS
// *************************************************

/**
 * Copy HTML assets
 */
gulp.task("_html", function(cb) {
  return buildHTML(isProd, pjson.build.dist, pjson.version, cb);
});

/**
 * Copy Image assets
 */
gulp.task("_images", function(cb) {
  return buildImages(pjson.build.dist, pjson.version, cb);
});

/**
 * Copy client assets
 */
gulp.task("_clientassets", function(cb) {
  return buildClientAssets(pjson, clientProperties, cb);
});

/**
 * Build templates assets
 */
gulp.task("_templates", function(cb) {
  return buildTemplates(pjson.build.dist, pjson.version, cb);
});

/**
 * Build custom templates assets
 */
gulp.task("_customtemplates", function(cb) {
  return buildCustomTemplates(pjson, cb);
});

gulp.task("_freshstart", ["_cleandist"], function(cb) {
  runSequence("_createfolders", function() {
    runSequence(["_templates", "_customtemplates", "_images", "_html", "_clientassets"], cb);
  });
});

/**
 * Build using the rollup config
 */
gulp.task("sdk", ["_freshstart"], function(cb) {
  return rollupBuild(cb);
});

// Build unminified code without the pragma logs for Veracode scanning
gulp.task("sdk_veracode", ["sdk"]);

/**
 * Prod build for SDK
 */
gulp.task("sdk_prod", ["sdk"]);

gulp.task("_freshcustom", ["_cleandist"], function(cb) {
  runSequence("_createfolders", function() {
    runSequence(["_customtemplates", "_clientassets"], cb);
  });
});

gulp.task("fcp_sdk", ["_freshcustom"], function(cb) {
  return FCP.pullCode(pjson.build.dist, pjson.version, null, cb);
});

// *************************************************
// TEST WITH A LOCAL WEB SERVER
// *************************************************

gulp.task("test_prod", ["test_debug"]);
gulp.task("test_debug", ["sdk", "start_server"]);

/**
 * Test debug code. Start a web server for testing.
 */
gulp.task("start_server", ["sdk"], function(cb) {
  startTestServer(pjson, clientProperties, isSSL, cb);
});

// *************************************************
// FCP RELATED TASKS
// *************************************************

/**
 * Build everything prod mode and copy to preview
 */
gulp.task("preview_prod", ["sdk_prod"], function(cb) {
  startPreviewServer(pjson, clientProperties, cb);
});

/**
 * Debug version
 */
gulp.task("preview_debug", ["preview_prod"], function(cb) {
  if (cb) return cb();
});

gulp.task("list_publishers", cb => {
  FCP.listPublishers(cb);
});

gulp.task("remove_publisher", cb => {
  FCP.removePublisher(cb);
});

gulp.task("list_clients", cb => {
  FCP.listClients(cb);
});

gulp.task("list_sites", cb => {
  FCP.listSites(clientProperties, cb);
});

gulp.task("client_lookup", cb => {
  FCP.lookupClient(cb);
});

gulp.task("create_client", cb => {
  FCP.createClient(cb);
});

gulp.task("create_site", cb => {
  FCP.createSite(cb);
});

gulp.task("push_code", ["sdk"], cb => {
  FCP.pushCode(pjson.build.dist, pjson.version, argv.dev, testEnvs, isProd, null, cb);
});

gulp.task("push_code_test_envs", ["push_code"]);

gulp.task("push_code_debug", ["push_code"]);

gulp.task("push_default_config", [], cb => {
  FCP.pushDefaultConfig(pjson.version, getGlobalConfig, null, cb);
});

gulp.task("push_stg", ["_freshstart"], cb => {
  FCP.pushStg(pjson, clientProperties, cb);
});

gulp.task("push_prod", ["_freshstart"], cb => {
  FCP.pushProd(pjson, clientProperties, cb);
});

gulp.task("push_stg_config", [], cb => {
  FCP.pushStgConfig(
    pjson,
    clientProperties,
    // not perfect, but it lowers the depencies of the scripts
    getGlobalConfig,
    cb
  );
});

gulp.task("push_prod_config", [], cb => {
  FCP.pushProdConfig(
    pjson,
    clientProperties,
    // not fond of this but it lowers the depencies of the scripts
    getGlobalConfig,
    cb
  );
});

gulp.task("promote_prod", cb => {
  FCP.promoteProd(clientProperties, cb);
});

gulp.task("compare_prod", cb => {
  compareConfig("production", cb);
});

gulp.task("compare_stg", cb => {
  compareConfig("staging", cb);
});

gulp.task("update_configs", [], cb => {
  FCP.updateConfigs(cb);
});

gulp.task("code_version_report", [], cb => {
  FCP.codeVersionReports(cb);
});

gulp.task("get_self_hosted", ["_freshcustom"], cb => {
  // just prompt once thanks
  FCP.optionallyPromptForCredentials(null, {}, rs => {
    FCP.pullCode(pjson.build.dist, pjson.version, rs, err => {
      if (err) return cb(err);
      buildSelfHosted(pjson, clientProperties, false, rs, cb);
    });
  });
});

gulp.task("self_hosted_debug", ["sdk"], cb => {
  console.error(
    chalk.red("WARNING: DO NOT GIVE THIS TO A CUSTOMER!!!! use get_self_hosted instead!!!")
  );
  console.error(chalk.red("This is for testing purposes only, not a production build!"));
  buildSelfHosted(pjson, clientProperties, true, {}, cb);
});

// *************************************************
// UNREACHABLE ASSETS
// *************************************************

gulp.task("unreachables", cb => unreachables(false, cb));

gulp.task("loop_unreachables", cb => unreachables(true, cb));

// *************************************************
// MISC TASKS
// *************************************************

/**
 * Default task - list tasks
 */
gulp.task("default", function() {
  console.log("List of tasks:".magenta);
  for (const tk in gulp.tasks) {
    if (tk.substr(0, 1) != "_") {
      console.log(chalk.grey(" * ") + chalk.yellow(tk.toString()));
    }
  }
});


//Tasks added by Anthony:


gulp.task("push_config", [], cb => {
	FCP.pushConfig(
		pjson,
		clientProperties,
		// not perfect, but it lowers the depencies of the scripts
		getGlobalConfig,
		cb
	);
});

gulp.task("push_products", ["_freshstart"], cb => {
	FCP.pushProducts(pjson, clientProperties, cb);
});