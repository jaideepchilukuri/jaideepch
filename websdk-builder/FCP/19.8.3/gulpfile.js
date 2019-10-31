/* **************************************************
 *
 * Boot things up
 *
 ************************************************** */

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
  return;
}

// Validate UglifyJS version because it's not correctly maintained and breaks things post 3.4.8
// TODO: remove when uglify-js is trashed away. CC-4608
// equals
if (svcmp(require("uglify-js/package.json").version, "3.4.8") !== 0) {
  throw `Invalid version of UglifyJS (${versionUglifyJS}). Make sure UglifyJS 3.4.8 is used.  npm i uglify-js@3.4.8`;
}

// Signals what version we are running
console.log(
  chalk.magenta("Client Code Template"),
  chalk.yellow("v" + pjson.version.toString()),
  chalk.magenta(". Client Code"),
  chalk.yellow("v" + pjson.code_version.toString()),
  chalk.magenta(". NodeJS"),
  chalk.yellow(process.version.toString()),
  chalk.magenta(".")
);

/* **************************************************
 *
 * Load some more dependencies
 *
 ************************************************** */

//todo: require these only in the task needing them; to speed up things
const gitsync = require("./scripts/node-gitsync.js");
const gulp = require("gulp");
const rimraf = require("rimraf");
const fs = require("fs");

//todo: require these only in the task needing them; to speed up things
const FCP = require("./scripts/FCP");
const { buildHTML, buildImages, buildClientAssets } = require("./scripts/buildAssets");
const { buildGateway } = require("./scripts/buildGateway");
const { buildSDK } = require("./scripts/buildSDK");
const { buildSelfHosted } = require("./scripts/buildSelfHosted");
const { buildTemplates, buildCustomTemplates } = require("./scripts/buildTemplates");
const { startTestServer, startPreviewServer } = require("./scripts/testServer");
const { compareConfig } = require("./scripts/configDiff");
const unreachables = require("./scripts/unreachables");

/* **************************************************
 *
 * Here are the tasks
 *
 ************************************************** */

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
  rimraf(pjson.build.dist + "/*", cb);
});

/**
 * Recreate folders deleted by _cleandist
 */
gulp.task("_createfolders", function(cb) {
  [
    pjson.build.dist,
    pjson.build.dist + "/code",
    pjson.build.dist + "/code/" + pjson.code_version,
    pjson.build.dist + "/trigger",
    pjson.build.dist + "/record",
  ].forEach(function(folder) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  });
  cb();
});

/**
 * Delete any retrieved externals
 */
gulp.task("cleanextern", function(cb) {
  rimraf(pjson.build.extern + "/clientcode/tags/*", function() {
    rimraf(pjson.build.extern + "/clientcode/branches/*", function() {
      rimraf(pjson.build.extern + "/clientcode/trunk/*", function() {
        rimraf(pjson.build.extern + "/gateway/tags/*", function() {
          rimraf(pjson.build.extern + "/gateway/branches/*", function() {
            rimraf(pjson.build.extern + "/gateway/trunk/*", function() {
              if (cb) {
                cb();
              }
            });
          });
        });
      });
    });
  });
});

/**
 * Go get external libraries
 */
gulp.task("_pullextern", function(cb) {
  process.nextTick(function() {
    [
      pjson.build.extern,
      pjson.build.extern + "/gateway",
      pjson.build.extern + "/clientcode",
    ].forEach(function(dir) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
    });

    // First grab the gateway code
    gitsync(
      {
        dest: pjson.build.extern + "/gateway/tags/",
        repo: pjson.repository.url + "/gateway_js.git",
        branch: pjson.gateway_version,
      },
      function(err) {
        if (err) {
          console.log("Error getting gateway code!", err);
          return;
        }
        // Now go get the client code
        gitsync(
          {
            dest: pjson.build.extern + "/clientcode/tags/",
            repo: pjson.repository.url + "/client_code.git",
            branch: pjson.code_version,
          },
          function(err) {
            if (err) {
              console.log("Error getting client code!", err);
              return;
            }
            if (cb) {
              cb();
            }
          }
        );
      }
    );
  });
});

/* **************************************************
 * BUILDS
 * ************************************************* */

/**
 * Copy HTML assets
 */
gulp.task("_html", ["_createfolders"], function(cb) {
  return buildHTML(isProd, pjson, cb);
});

/**
 * Copy Image assets
 */
gulp.task("_images", ["_createfolders"], function(cb) {
  return buildImages(pjson, cb);
});

/**
 * Copy client assets
 */
gulp.task("_clientassets", ["_createfolders"], function(cb) {
  return buildClientAssets(pjson, clientProperties, cb);
});

/**
 * Build templates assets
 */
gulp.task("_templates", ["_createfolders"], function(cb) {
  return buildTemplates(pjson, cb);
});

/**
 * Build custom templates assets
 */
gulp.task("_customtemplates", ["_templates"], function(cb) {
  return buildCustomTemplates(pjson, cb);
});

// this will be a little easier in gulp 4 with gulp.series
gulp.task("_alltemplates", ["_customtemplates"]);
gulp.task("_allassets", ["_alltemplates"], function(cb) {
  const runSequence = require("run-sequence");
  runSequence(["_images", "_html", "_clientassets"], cb);
});

/**
 * Build gateway if needed
 */
gulp.task("_gateway_prod", ["_gateway"]);
gulp.task("_gateway", function() {
  return buildGateway(isProd, pjson);
});

/**
 * Default task for building the SDK
 */
gulp.task("sdk", ["_cleandist", "_pullextern"], function(cb) {
  /**
   * The list of projects to build. The project symbol in the list represents the folder
   * it's in (eg: "invite" gets found in /invite in the src dir). The name is written into
   * the top of the file, and the deps are the requireJS dependencies that get imported.
   * If you set skipAMD: true then the file will NOT be wrapped in any AMD junk.
   */
  var projectsToBuild = {
    utils: {
      name: "Utils Library",
      files: [
        "top.js",
        "misc/basic.js",
        "dom/event.js",
        "storage/fsstorage.js",
        "integrations/integrations.js",
        "dom/frame.js",
        "storage/domstorage.js",
        "storage/brainstorage.js",
        "network/ajax.js",
        "storage/generalstorage.js",
        "misc/urls.js",
        "misc/time.js",
        "misc/pako.js",
        "dom/scriptload.js",
        "misc/base64.js",
        "misc/async.js",
        "misc/numbers.js",
        "misc/journey.js",
        "storage/seshstorage.js",
        "dom/dom.js",
        "misc/misc.js",
        "misc/nexttick.js",
        "misc/array.js",
        "integrations/adobe.js",
        "misc/product.js",
        "integrations/ga.js",
        "dom/css.js",
        "misc/behavioraldata.js",
        "network/beacon.js",
        "network/img.js",
        "network/jsonp.js",
        "misc/compression.js",
        "storage/cookie.js",
        "storage/cpps.js",
        "misc/guid.js",
        "dom/browser.js",
        "storage/window.js",
        "utils.js",
        "misc/makeuri.js",
      ],
    },
    survey: {
      name: "Survey",
      deps: ["$fs.utils.js"],
      files: [
        "surveyconfig.js",
        "top.js",
        "dom/minidom.js",
        "classes.js",
        "surveyquestion.js",
        "select.js",
        "star.js",
        "checkbox.js",
        "inputtext.js",
        "loader.js",
        "surveyutils.js",
        "textarea.js",
        "radio.js",
        "topictester.js",
        "survey.js",
      ],
    },
    feedback: {
      name: "Feedback",
      deps: [
        "$fs.utils.js",
        "$fs.survey.js",
        {
          feedbackconfig: "config",
        },
      ],
      files: [
        "_customerhacks.js",
        "top.js",
        "dom/minidom.js",
        "misc/template.js",
        "topictester.js",
        "ui/badge.js",
        "api.js",
        "loader.js",
        "misc/simpletween.js",
        "criteria.js",
        "templategrabber.js",
        "globalloader.js",
        "fullpage.js",
        "popup.js",
        "preview.js",
        "previewbadge.js",
        "popuphandler.js",
        "modal.js",
        "pop.js",
        "bottom.js",
        "replay.js",
      ],
    },
    feedbackreport: {
      name: "Feedback Reporting UI",
      deps: [
        "$fs.utils.js",
        {
          feedbackconfig: "config",
        },
      ],
      files: [
        "_customerhacks.js",
        "top.js",
        "dom/minidom.js",
        "misc/template.js",
        "ui/badge.js",
        "criteria.js",
        "report.js",
        "topictester.js",
        "misc/simpletween.js",
        "bottom.js",
      ],
    },
    feedbacksurvey: {
      name: "Feedback Standalone Survey",
      deps: ["$fs.utils.js", "$fs.survey.js"],
      files: [
        "top.js",
        "dom/minidom.js",
        "loader.js",
        "misc/template.js",
        "popwindow.js",
        "replay.js",
        "misc/cpps.js",
        "misc/simpletween.js",
        "bottom.js",
      ],
    },
    record: {
      name: "record",
      deps: [
        "$fs.utils.js",
        {
          recordconfig: "recordconfig",
        },
      ],
      files: [
        "top.js",
        "worker/transmitter.js",
        "capture/domresync.js",
        "capture/domtree.js",
        "data/diff.js",
        "capture/eventthrottle.js",
        "worker/controller.js",
        "worker/mule.js",
        "capture/mutation.js",
        "capture/dom.js",
        "data/log.js",
        "data/treecensor.js",
        "capture/inputcapture.js",
        "capture/capture.js",
        "worker/recordworker.js",
        "data/session.js",
        "capture/masker.js",
        "capture/actions.js",
        "record.js",
        "misc/publicapi.js",
        "misc/criteria.js",
        "recordcontroller.js",
        "bottom.js",
      ],
    },
    invite: {
      name: "Invitation Presenter Plugin",
      deps: [
        "$fs.utils.js",
        {
          triggerconfig: "config",
        },
      ],
      files: ["top.js", "misc/template.js", "invite.js", "bottom.js"],
    },
    mouseoff: {
      name: "mouseoff",
      deps: ["$fs.utils.js"],
      files: ["mouseoff.js"],
    },
    optout: {
      name: "Opt-Out Module",
      deps: [
        "$fs.utils.js",
        {
          triggerconfig: "config",
        },
      ],
      files: ["top.js", "misc/template.js", "optout.js", "startup.js"],
    },
    svadmin: {
      name: "Survey Admin Module",
      deps: [
        "$fs.utils.js",
        {
          triggerconfig: "config",
        },
      ],
      files: ["top.js", "misc/template.js", "admin.js", "startup.js"],
    },
    tracker: {
      name: "Tracker Window",
      deps: ["fs.utils.js"],
      files: [
        "debug.js",
        "top.js",
        "misc/template.js",
        "qualifier/qualifier.js",
        "reminder/reminder.js",
        "misc/survey.js",
        "misc/cpps.js",
        "misc/services.js",
        "misc/base64.js",
        "tracker.js",
        "startup.js",
      ],
    },
    replay: {
      name: "Replay JavaScript",
      deps: ["fs.utils.js"],
      files: [
        "top.js",
        "playback/UI/css.js",
        "playback/eventinfo.js",
        "playback/domtree.js",
        "playback/animation.js",
        "playback/domreplay.js",
        "playback/keyboard.js",
        "playback/mediaquery.js",
        "playback/dom.js",
        "playback/mouse.js",
        "playback/assetpreloader.js",
        "playback/frameworker.js",
        "playback/UI/shade.js",
        "playback/UI/progress.js",
        "playback/UI/page.js",
        "playback/cssmod.js",
        "playback/UI/counter.js",
        "playback/UI/overlay.js",
        "playback/UI/UI.js",
        "playback/worker.js",
        "playback/viewport.js",
        "playback/videocap.js",
        "playback/player.js",
        "playback/poser.js",
        "playback/UI/iframe.js",
        "replay.js",
      ],
    },
    trigger: {
      name: "Trigger",
      deps: [
        "$fs.utils.js",
        {
          triggerconfig: "config",
        },
      ],
      files: [
        "top.js",
        "misc/popup.js",
        "misc/services.js",
        "invitesetup.js",
        "misc/tracker.js",
        "misc/survey.js",
        "misc/criteria.js",
        "misc/links.js",
        "misc/publicapi.js",
        "misc/record.js",
        "triggersetup.js",
        "trigger.js",
        "misc/mobileheartbeat.js",
        "startup.js",
      ],
    },
    storageupgrade: {
      name: "Storage Upgrade",
      deps: ["$fs.utils.js"],
      files: [
        "top.js",
        "fixcpps.js",
        "killoldcookies.js",
        "upgraders/acst.js",
        "upgraders/c4c.js",
        "upgraders/fsrr.js",
        "upgraders/fsspl.js",
        "storageupgrade.js",
      ],
    },
    presenter: {
      name: "Short Survey Presenter",
      deps: ["$fs.utils.js"],
      files: ["presenter.js"],
    },
  };

  return buildSDK(projectsToBuild, cb);
});

// Build unminified code without the pragma logs for Veracode scanning
gulp.task("sdk_veracode", ["sdk"]);

/**
 * Prod build for SDK
 */
gulp.task("sdk_prod", ["sdk"]);

/* **************************************************
 * TEST WITH A LOCAL WEB SERVER
 * ************************************************* */

gulp.task("test_prod", ["test_debug"]);
gulp.task("test_debug", ["_cleandist", "_pullextern", "sdk", "start_server"]);

/**
 * Test debug code. Start a web server for testing.
 */
gulp.task("start_server", ["sdk"], function(cb) {
  startTestServer(pjson, clientProperties, isSSL, cb);
});

/* **************************************************
 * FCP RELATED TASKS
 * ************************************************* */

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
  if (cb) {
    cb();
  }
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
  FCP.pushCode(pjson, clientProperties, testEnvs, isProd, cb);
});

gulp.task("push_code_test_envs", ["push_code"]);

gulp.task("push_code_debug", ["push_code"]);

gulp.task("push_default_config", ["_pullextern"], cb => {
  FCP.pushDefaultConfig(pjson, getGlobalConfig, cb);
});

gulp.task("push_stg", ["_allassets"], cb => {
  FCP.pushStg(pjson, clientProperties, cb);
});

gulp.task("push_prod", ["_allassets"], cb => {
  FCP.pushProd(pjson, clientProperties, cb);
});

gulp.task("push_stg_config", ["_pullextern"], cb => {
  FCP.pushStgConfig(
    clientProperties,
    pjson,
    // not perfect, but it lowers the depencies of the scripts
    getGlobalConfig,
    cb
  );
});

gulp.task("push_prod_config", ["_pullextern"], cb => {
  FCP.pushProdConfig(
    clientProperties,
    pjson,
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

gulp.task("update_configs", ["_pullextern"], cb => {
  FCP.updateConfigs(cb);
});

gulp.task("code_version_report", ["_pullextern"], cb => {
  FCP.codeVersionReports(cb);
});

gulp.task("get_self_hosted", ["sdk"], cb => {
  buildSelfHosted(pjson, clientProperties, cb);
});

/* **************************************************
 * UNREACHABLE ASSETS
 * ************************************************* */

gulp.task("unreachables", cb => unreachables(false, cb));

gulp.task("loop_unreachables", cb => unreachables(true, cb));

/* **************************************************
 * MISC TASKS
 * ************************************************* */

/**
 * Default task - list tasks
 */
gulp.task("default", function() {
  console.log("List of tasks:".magenta);
  for (var tk in gulp.tasks) {
    if (tk.substr(0, 1) != "_") {
      console.log(chalk.grey(" * ") + chalk.yellow(tk.toString()));
    }
  }
});


//Tasks added by Anthony:

gulp.task("push_config", ["_pullextern"], cb => {
  FCP.pushConfig(
    clientProperties,
    pjson,
    // not perfect, but it lowers the depencies of the scripts
    getGlobalConfig,
    cb
  );
});

gulp.task("push_products", ["_allassets"], cb => {
  FCP.pushProducts(pjson, clientProperties, cb);
});