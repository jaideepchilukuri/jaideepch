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
const runSequence = require("run-sequence");

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
gulp.task("_html", function(cb) {
  return buildHTML(isProd, pjson, cb);
});

/**
 * Copy Image assets
 */
gulp.task("_images", function(cb) {
  return buildImages(pjson, cb);
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
  return buildTemplates(pjson, cb);
});

/**
 * Build custom templates assets
 */
gulp.task("_customtemplates", ["_templates"], function(cb) {
  return buildCustomTemplates(pjson, cb);
});

gulp.task("_freshstart", ["_cleandist"], function(cb) {
  runSequence(["_createfolders", "_pullextern"], function() {
    runSequence(["_templates", "_customtemplates", "_images", "_html", "_clientassets"], cb);
  });
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
gulp.task("sdk", ["_freshstart"], function(cb) {
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
gulp.task("test_debug", ["sdk", "start_server"]);

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

gulp.task("push_stg", ["_freshstart"], cb => {
  FCP.pushStg(pjson, clientProperties, cb);
});

gulp.task("push_prod", ["_freshstart"], cb => {
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



















/**
 * Delete assets folder if it exists
 */
gulp.task('assets-clear', function(cb) {
  if(fs.existsSync('./clientconfig/productconfig/trigger/assets')) {
    console.log("Clearing the assets folder");
    rimraf('./clientconfig/productconfig/trigger/assets/*',cb);
  } else console.log("No folder existed at "+dirname+"\\clientconfig\\productconfig\\trigger\\assets");
  cb();
});

/**
 * Copies assets from parent folder
 */
gulp.task('assets-copy', function(cb) {
  var upassets = require('../assets');
  // this gulp task needs logic to copy all contents of '../assets' into pjson.build.config+'/productconfig/trigger/assets'
});

/**
 * Build client_properties from parent folder's json
 */
gulp.task("config-build", function() {
  //this line needs to be replaced by logic that pulls the default config json from fcp using a call to https://gateway-elb.foresee.com/sites/emptyconfigs/codeVersionWithDashes/config.json
  var jconfig = require('../config.json');
  //this line needs to be replaced by logic that copies the empty surveydef and changes the empty config to have the same number of empty surveydefs as the custom config has surveydefs
  //this line needs to be replaced by logic that removes the base 64 encoding of the surveydefs
  //this line needs to be replaced by logic that merges the custom config json into the default config json
  
  //THIS IS WHERE WE START CLIENT_PROPERTIES.JS LOGIC
  var filecontents = 
`module.exports = {
  client: {
    id: "${jconfig.global.customerId}",
    clientid: ${jconfig.global.customerKey},
    sitekey: "${jconfig.global.siteKey}",
    replayid: "${jconfig.record.clientId}",
    siteid: "${jconfig.trigger.site_id}",
    transporturl: "${jconfig.global.recUrl}",
    brainurl: "${jconfig.global.brainUrl}",
    surveyurl: "${jconfig.global.surveyUrl}",
    events: "${jconfig.global.analyticsUrl}",
    modernSurveyUrl: "${jconfig.global.modernSurveyUrl}",
    surveyasynccurl: "${jconfig.trigger.surveyAsyncCurl}",
    static: "${jconfig.global.staticUrl}",
    deviceDetectionUrl: "${jconfig.global.deviceDetectionUrl}",
    productsToBuild: [`;
  if(jconfig.global.products.trigger)
    filecontents+=`
      "trigger",`;
  /*if(jconfig.global.products.feedback)
    filecontents+=`
      "feedback",`;*/
  if(jconfig.global.products.record)
    filecontents+=`
      "record",`;
  filecontents+=`
    ],
    modernRecord: ${jconfig.global.modernRecord},`
  if(jconfig.global.adobeRsid)
    filecontents+=`
    adobersid: "${jconfig.global.adobeRsid}",`;
  filecontents+=`
    persistence: "${jconfig.global.storage}",
    cookieSecure: `;
  filecontents+=Boolean(jconfig.global.cookieSecure)+`,`;
  filecontents+=`
    cookieDomain: [`;
  if(jconfig.global.cookieDomain.length>0) {
    for(var position in jconfig.global.cookieDomain) {
      filecontents+=`
      {
        path: "${jconfig.global.cookieDomain[position].path}",
        domain: "${jconfig.global.cookieDomain[position].domain}",
      },`;
    }
  }
  filecontents+=`
    ],
    journeyEvents: {
      transmit: "${jconfig.global.journeyEvents.transmit}",
      list: [`;
  if(jconfig.global.journeyEvents.list.length>0) {
    for(var position in jconfig.global.journeyEvents.list) {
      filecontents+=`
        "${jconfig.global.journeyEvents.list[position]}",`;
    }
  }
  filecontents+=`
      ],
    },
    disable_cpps: [`
  if(jconfig.global.disable_cpps.length > 0) {
    for(var position in jconfig.global.disable_cpps) {
      filecontents+=`
      "${jconfig.global.disable_cpps[position]}",`;
    }
  }
  filecontents+=`
    ],
  },
};`;
  //console.log(filecontents)
	fs.writeFileSync(pjson.build.config+'/client_properties.js',filecontents,function (err) {
	  if (err) throw err;
  });
  //THIS IS WHERE WE END CLIENT_PROPERTIES.JS LOGIC

  //THIS IS WHERE WE START RECORD PRODUCT_CONFIG.JS LOGIC
  filecontents=
`var config = {
  blacklist: {
    text: [`;
  if(jconfig.record.blacklist.text.length > 0) {
    for(var position in jconfig.record.blacklist.text) {
      filecontents+=`
      "${jconfig.record.blacklist.text[position]}",`;
    }
  }
  filecontents+=`
    ],
    variables: [`;
  if(jconfig.record.blacklist.variables.length > 0) {
    for(var position in jconfig.record.blacklist.variables) {
      filecontents+=`
      {
        name: "${jconfig.record.blacklist.variables[position].name}",
        value: "${jconfig.record.blacklist.variables[position].value}",
      },`;
    }
  }
  filecontents+=`
    ],
    cookies: [`;
  if(jconfig.record.blacklist.cookies.length > 0) {
    for(var position in jconfig.record.blacklist.cookies) {
      filecontents+=`
      {
        name: "${jconfig.record.blacklist.cookies[position].name}",
        value: "${jconfig.record.blacklist.cookies[position].value}",
      },`;
    }
  }
  filecontents+=`
    ],
  },
  whitelist: {
    text: [`;
  if(jconfig.record.whitelist.text.length > 0) {
    for(var position in jconfig.record.whitelist.text) {
      filecontents+=`
      "${jconfig.record.whitelist.text[position]}",`;
    }
  }
  filecontents+=`
    ],
    variables: [`;
  if(jconfig.record.whitelist.variables.length > 0) {
    for(var position in jconfig.record.whitelist.variables) {
      filecontents+=`
      {
        name: "${jconfig.record.whitelist.variables[position].name}",
        value: "${jconfig.record.whitelist.variables[position].value}",
      },`;
    }
  }
  filecontents+=`
    ],
    cookies: [`;
  if(jconfig.record.whitelist.cookies.length > 0) {
    for(var position in jconfig.record.whitelist.cookies) {
      filecontents+=`
      {
        name: "${jconfig.record.whitelist.cookies[position].name}",
        value: "${jconfig.record.whitelist.cookies[position].value}",
      },`;
    }
  }
  filecontents+=`
    ],
  },
  clientId: "$`+`{client.replayid}",
  advancedSettings: {
    useSessionStorage: ${jconfig.record.advancedSettings.useSessionStorage},
    replay_pools: [
      {
        path: "${jconfig.record.advancedSettings.replay_pools[0].path}",
        sp: ${jconfig.record.advancedSettings.replay_pools[0].sp},
      },
    ],
    exclude: {
      urls: [`;
  if(jconfig.record.advancedSettings.exclude.urls.length > 0) {
    for(var position in jconfig.record.advancedSettings.exclude.urls) {
      filecontents+=`
        "${jconfig.record.advancedSettings.exclude.urls[position]}",`;
    }
  }
  filecontents+=`
      ],
      referrers: [`;
  if(jconfig.record.advancedSettings.exclude.referrers.length > 0) {
    for(var position in jconfig.record.advancedSettings.exclude.referrers) {
      filecontents+=`
        "${jconfig.record.advancedSettings.exclude.referrers[position]}",`;
    }
  }
  filecontents+=`
      ],
      userAgents: [`;
  if(jconfig.record.advancedSettings.exclude.userAgents.length > 0) {
    for(var position in jconfig.record.advancedSettings.exclude.userAgents) {
      filecontents+=`
        "${jconfig.record.advancedSettings.exclude.userAgents[position]}",`;
    }
  }
  filecontents+=`
      ],
      browsers: [`;
  if(jconfig.record.advancedSettings.exclude.browsers.length > 0) {
    for(var position in jconfig.record.advancedSettings.exclude.browsers) {
      filecontents+=`
        {`;
      for(var key in jconfig.record.advancedSettings.exclude.browsers[position]) {
        filecontents+=`
          ${key}: `;
        if(typeof jconfig.record.advancedSettings.exclude.browsers[position][key] == typeof "") {
          filecontents+=`"${jconfig.record.advancedSettings.exclude.browsers[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.record.advancedSettings.exclude.browsers[position][key]},`;
        }
      }
      filecontents+=`
        },`;
    }
  }
  filecontents+=`
      ],
      cookies: [`;
  if(jconfig.record.advancedSettings.exclude.cookies.length > 0) {
    for(var position in jconfig.record.advancedSettings.exclude.cookies) {
      filecontents+=`
        {`;
      for(var key in jconfig.record.advancedSettings.exclude.cookies[position]) {
        filecontents+=`
          ${key}: `;
        if(typeof jconfig.record.advancedSettings.exclude.cookies[position][key] == typeof "") {
          filecontents+=`"${jconfig.record.advancedSettings.exclude.cookies[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.record.advancedSettings.exclude.cookies[position][key]},`;
        }
      }
      filecontents+=`
        },`;
    }
  }
  filecontents+=`
      ],
      variables: [`;
  if(jconfig.record.advancedSettings.exclude.variables.length > 0) {
    for(var position in jconfig.record.advancedSettings.exclude.variables) {
      filecontents+=`
        {`;
      for(var key in jconfig.record.advancedSettings.exclude.variables[position]) {
        filecontents+=`
          ${key}: `;
        if(typeof jconfig.record.advancedSettings.exclude.variables[position][key] == typeof "") {
          filecontents+=`"${jconfig.record.advancedSettings.exclude.variables[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.record.advancedSettings.exclude.variables[position][key]},`;
        }
      }
      filecontents+=`
        },`;
    }
  }
  filecontents+=`
      ],
    },
    browser_cutoff: {
      IE: ${jconfig.record.advancedSettings.browser_cutoff.IE},
      Edge: ${jconfig.record.advancedSettings.browser_cutoff.Edge},
      Safari: ${jconfig.record.advancedSettings.browser_cutoff.Safari},
      FireFox: ${jconfig.record.advancedSettings.browser_cutoff.Firefox},
      Chrome: ${jconfig.record.advancedSettings.browser_cutoff.Chrome},
      "Chrome Mobile": ${jconfig.record.advancedSettings.browser_cutoff['Chrome Mobile']},
      Opera: ${jconfig.record.advancedSettings.browser_cutoff.Opera},
    },
    platform_cutoff: {
      Android: ${jconfig.record.advancedSettings.platform_cutoff.Android},
      Winphone: ${jconfig.record.advancedSettings.platform_cutoff.Winphone},
      iPod: ${jconfig.record.advancedSettings.platform_cutoff.iPod},
      iPhone: ${jconfig.record.advancedSettings.platform_cutoff.iPhone},
      iPad: ${jconfig.record.advancedSettings.platform_cutoff.iPad},
    },
    device_type_support: {
      desktop: ${jconfig.record.advancedSettings.device_type_support.desktop},
      phone: ${jconfig.record.advancedSettings.device_type_support.phone},
      tablet: ${jconfig.record.advancedSettings.device_type_support.tablet},
    },
    device_blacklist: [`;
  if(jconfig.record.advancedSettings.device_blacklist.length>0) {
    for(var position in jconfig.record.advancedSettings.device_blacklist) {
      filecontents+=`
      "${jconfig.record.advancedSettings.device_blacklist[position]}",`;
    }
  }
  filecontents+=`
    ],
    pii: {
      selectiveUnMaskZones: {`;
  for(var key in jconfig.record.advancedSettings.pii.selectiveUnMaskZones) {
    filecontents+=`
      "${key}": "${jconfig.record.advancedSettings.pii.selectiveUnMaskZones[key]}",`
  }
  filecontents+=`
      },
      pagesToSelectiveMask: [`;
  if(jconfig.record.advancedSettings.pii.pagesToSelectiveMask.length > 0) {
    for(var position in jconfig.record.advancedSettings.pii.pagesToSelectiveMask) {
      filecontents+=`
        "${jconfig.record.advancedSettings.pii.pagesToSelectiveMask[position]}",`;
    }
  }
  filecontents+=`
      ],
      selectiveMaskZones: {`;
  for(var key in jconfig.record.advancedSettings.pii.selectiveMaskZones) {
    filecontents+=`
      "${key}": "${jconfig.record.advancedSettings.pii.selectiveMaskZones[key]}",`
  }
  filecontents+=`
      },
      visibleInputs: {`;
  for(var key in jconfig.record.advancedSettings.pii.visibleInputs) {
    filecontents+=`
      "${key}": "${jconfig.record.advancedSettings.pii.visibleInputs[key]}",`
  }
  filecontents+=`
      },
      redactZones: {`;
  for(var key in jconfig.record.advancedSettings.pii.redactZones) {
    filecontents+=`
      "${key}": "${jconfig.record.advancedSettings.pii.redactZones[key]}",`
  }
  filecontents+=`
      },
    },
    skipIframes: ${jconfig.record.advancedSettings.skipIframes},
  },
};`;
  //console.log(filecontents)
	fs.writeFileSync(pjson.build.config+'/productconfig/record/product_config.js',filecontents,function (err) {
	  if (err) throw err;
  });
  //THIS IS WHERE WE END RECORD PRODUCT_CONFIG.JS LOGIC

  //THIS IS WHERE WE START TRIGGER PRODUCT_CONFIG.JS LOGIC
  filecontents=
`var triggerconfig = {
  id: "$`+`{client.id}",
  site_id: "$`+`{client.siteid}",
  site_key: "$`+`{client.sitekey}",
  surveyAsyncCurl: "$`+`{client.surveyasynccurl}",
  hasReplay: "$`+`{hasreplay}",
  triggerDelay: ${jconfig.trigger.config.triggerDelay},
  inviteDelay: ${jconfig.trigger.config.inviteDelay},
  pageLoadUrlChangeBlackout: ${jconfig.trigger.config.pageLoadUrlChangeBlackout},
  repeatDays: {
    decline: ${jconfig.trigger.config.repeatDays.decline},
    accept: ${jconfig.trigger.config.repeatDays.accept},
  },
  pageViewsResetTimeout: ${jconfig.trigger.config.pageViewsResetTimeout},
  cppsResetTimeout: ${jconfig.trigger.config.cppsResetTimeout},
  surveyDefResetTimeout: ${jconfig.trigger.config.surveyDefResetTimeout},
  trackerConvertsAfter: ${jconfig.trigger.config.trackerConvertsAfter},
  trackerHeartbeatTimeout: ${jconfig.trigger.config.trackerHeartbeatTimeout},
  trackerHeartbeatLongTimeout: ${jconfig.trigger.config.trackerHeartbeatLongTimeout},
  onExitMobileHeartbeatInterval: ${jconfig.trigger.config.onExitMobileHeartbeatInterval},
  reinviteDelayAfterInviteAbandon: ${jconfig.trigger.config.reinviteDelayAfterInviteAbandon},
  centerTrackerPopup: ${jconfig.trigger.config.centerTrackerPopup},
  workInIframes: "${jconfig.trigger.config.workInIframes}",
  abSurveyType: {
    defs: [`;
  if(jconfig.trigger.config.abSurveyType.defs.length > 0) {
    for(var position in jconfig.trigger.config.abSurveyType.defs) {
      filecontents+=`
      {
        name: "${jconfig.trigger.config.abSurveyType.defs[position].name}",`;
      if(jconfig.trigger.config.abSurveyType.defs[position].section) {
        filecontents+=`
        section: "${jconfig.trigger.config.abSurveyType.defs[position].section}",`;
      }
      if(jconfig.trigger.config.abSurveyType.defs[position].site) {
        filecontents+=`
        site: "${jconfig.trigger.config.abSurveyType.defs[position].site}",`;
      }
      filecontents+=`
        modernPercentage: ${jconfig.trigger.config.abSurveyType.defs[position].modernPercentage},
      },`;
    }
  }
  filecontents+=`
    ],
    shouldTest: ${jconfig.trigger.config.abSurveyType.shouldTest},
  },
  onlyModernSurvey: ${jconfig.trigger.config.onlyModernSurvey},
  ignoreNavigationEvents: ${jconfig.trigger.config.ignoreNavigationEvents},
  publicApiName: "${jconfig.trigger.config.publicApiName}",
  globalExclude: {
    urls: [`;
  if(jconfig.trigger.config.globalExclude.urls.length > 0) {
    for(var position in jconfig.trigger.config.globalExclude.urls) {
      filecontents+=`
      "${jconfig.trigger.config.globalExclude.urls[position]}",`;
    }
  }
  filecontents+=`
    ],
    referrers: [`;
  if(jconfig.trigger.config.globalExclude.referrers.length > 0) {
    for(var position in jconfig.trigger.config.globalExclude.referrers) {
      filecontents+=`
      "${jconfig.trigger.config.globalExclude.referrers[position]}",`;
    }
  }
  filecontents+=`
    ],
    userAgents: [`;
  if(jconfig.trigger.config.globalExclude.userAgents.length > 0) {
    for(var position in jconfig.trigger.config.globalExclude.userAgents) {
      filecontents+=`
      "${jconfig.trigger.config.globalExclude.userAgents[position]}",`;
    }
  }
  filecontents+=`
    ],
    browsers: [`;
  if(jconfig.trigger.config.globalExclude.browsers.length > 0) {
    for(var position in jconfig.trigger.config.globalExclude.browsers) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.config.globalExclude.browsers[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.config.globalExclude.browsers[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.globalExclude.browsers[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.globalExclude.browsers[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    cookies: [`;
  if(jconfig.trigger.config.globalExclude.cookies.length > 0) {
    for(var position in jconfig.trigger.config.globalExclude.cookies) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.config.globalExclude.cookies[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.config.globalExclude.cookies[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.globalExclude.cookies[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.globalExclude.cookies[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    variables: [`;
  if(jconfig.trigger.config.globalExclude.variables.length > 0) {
    for(var position in jconfig.trigger.config.globalExclude.variables) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.config.globalExclude.variables[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.config.globalExclude.variables[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.globalExclude.variables[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.globalExclude.variables[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
  },
  inviteExclude: {
    urls: [`;
  if(jconfig.trigger.config.inviteExclude.urls.length > 0) {
    for(var position in jconfig.trigger.config.inviteExclude.urls) {
      filecontents+=`
      "${jconfig.trigger.config.inviteExclude.urls[position]}",`;
    }
  }
  filecontents+=`
    ],
    referrers: [`;
  if(jconfig.trigger.config.inviteExclude.referrers.length > 0) {
    for(var position in jconfig.trigger.config.inviteExclude.referrers) {
      filecontents+=`
      "${jconfig.trigger.config.inviteExclude.referrers[position]}",`;
    }
  }
  filecontents+=`
    ],
    userAgents: [`;
  if(jconfig.trigger.config.inviteExclude.userAgents.length > 0) {
    for(var position in jconfig.trigger.config.inviteExclude.userAgents) {
      filecontents+=`
      "${jconfig.trigger.config.inviteExclude.userAgents[position]}",`;
    }
  }
  filecontents+=`
    ],
    browsers: [`;
  if(jconfig.trigger.config.inviteExclude.browsers.length > 0) {
    for(var position in jconfig.trigger.config.inviteExclude.browsers) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.config.inviteExclude.browsers[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.config.inviteExclude.browsers[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.inviteExclude.browsers[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.inviteExclude.browsers[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    cookies: [`;
  if(jconfig.trigger.config.inviteExclude.cookies.length > 0) {
    for(var position in jconfig.trigger.config.inviteExclude.cookies) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.config.inviteExclude.cookies[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.config.inviteExclude.cookies[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.inviteExclude.cookies[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.inviteExclude.cookies[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    variables: [`;
  if(jconfig.trigger.config.inviteExclude.variables.length > 0) {
    for(var position in jconfig.trigger.config.inviteExclude.variables) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.config.inviteExclude.variables[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.config.inviteExclude.variables[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.inviteExclude.variables[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.inviteExclude.variables[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
  },
  browser_cutoff: {
    Edge: ${jconfig.trigger.config.browser_cutoff.Edge},
    IE: ${jconfig.trigger.config.browser_cutoff.IE},
    Safari: ${jconfig.trigger.config.browser_cutoff.Safari},
    FireFox: ${jconfig.trigger.config.browser_cutoff.Firefox},
    Chrome: ${jconfig.trigger.config.browser_cutoff.Chrome},
    Opera: ${jconfig.trigger.config.browser_cutoff.Opera},
  },
  platform_cutoff: {
    Android: ${jconfig.trigger.config.platform_cutoff.Android},
    Winphone: ${jconfig.trigger.config.platform_cutoff.Winphone},
    iPod: ${jconfig.trigger.config.platform_cutoff.iPod},
    iPhone: ${jconfig.trigger.config.platform_cutoff.iPhone},
    iPad: ${jconfig.trigger.config.platform_cutoff.iPad},
  },
  device_blacklist: [`;
  if(jconfig.trigger.config.device_blacklist > 0) {
    for(var position in jconfig.trigger.config.device_blacklist) {
      filecontents+=`
      "${jconfig.trigger.config.device_blacklist[position]}",`;
    }
  }
  filecontents+=`
  ],
  replay_pools: [
    {
      path: "${jconfig.trigger.config.replay_pools[0].path}",
      sp: ${jconfig.trigger.config.replay_pools[0].sp},
    },
  ],
  replay_repools: [`;
  // NEED TO DOUBLE CHECK THIS, NOT SURE HOW REPLAY_REPOOLS ARE ACTUALLY ENTERED OFF THE TOP OF MY HEAD
  if(jconfig.trigger.config.replay_repools.length > 0) {
    for(var position in jconfig.trigger.config.replay_repools) {
      filecontents+=`
      "${jconfig.trigger.config.replay_repools[position]}",`;
    }
  }
  filecontents+=`
  ],
  cpps: {`;
  for(key in jconfig.trigger.config.cpps) {
    filecontents+=`
    ${key}: `;
    if(typeof jconfig.trigger.config.cpps[key] == typeof {}) {
      filecontents+=`{`
      for(var insidekey in jconfig.trigger.config.cpps[key]) {
        filecontents+=`
      ${insidekey}: `;
        if(Array.isArray(jconfig.trigger.config.cpps[key][insidekey])) {
          filecontents+=`[`
          if(jconfig.trigger.config.cpps[key][insidekey].length > 0) {
            for(var position in jconfig.trigger.config.cpps[key][insidekey]) {
              filecontents+=`
        {
          regex: "${jconfig.trigger.config.cpps[key][insidekey][position].regex}",
          value: "${jconfig.trigger.config.cpps[key][insidekey][position].value}",
        },`;
            }
          }
          filecontents+=`
      ],`
        }
        else if(typeof jconfig.trigger.config.cpps[key][insidekey] == typeof {}) {
          filecontents+=`{`;
          for(var insideinsidekey in jconfig.trigger.config.cpps[key][insidekey]) {
            filecontents+=`
        ${insideinsidekey}: `;
            if(typeof jconfig.trigger.config.cpps[key][insidekey][insideinsidekey] == typeof "") {
              filecontents+=`"${jconfig.trigger.config.cpps[key][insidekey][insideinsidekey]}",`;
            }
            else {
              filecontents+=`${jconfig.trigger.config.cpps[key][insidekey][insideinsidekey]},`;
            }
          }
          filecontents+=`
      },`;
        }
        else if(typeof jconfig.trigger.config.cpps[key][insidekey] == typeof "") {
          filecontents+=`"${jconfig.trigger.config.cpps[key][insidekey]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.config.cpps[key][insidekey]},`;
        }
      }
      filecontents+=`
    },`;
    }
    else if(typeof jconfig.trigger.config.cpps[key] == typeof "") {
      filecontents+=`"${jconfig.trigger.config.cpps[key]}",`;
    }
    else {
      filecontents+=`${jconfig.trigger.config.cpps[key]},`;
    }
  }
  filecontents+=`
  },
};
_fsDefine("triggerconfig", function() {
  return { config: triggerconfig, surveydefs: surveydefs };
});`;
  //console.log(filecontents)
	fs.writeFileSync(pjson.build.config+'/productconfig/trigger/product_config.js',filecontents,function (err) {
	  if (err) throw err;
  });
  //THIS IS WHERE WE END TRIGGER PRODUCT_CONFIG.JS LOGIC

  //THIS IS WHERE WE START SURVEYDEF LOGIC
  for(var defposition in jconfig.trigger.surveydefs) {
  filecontents=
`({
  name: "${jconfig.trigger.surveydefs[defposition].name}",`;
  if(jconfig.trigger.surveydefs[defposition].site!=null) {
    filecontents+=`
  site: "${jconfig.trigger.surveydefs[defposition].site}",`;
  }
  if(jconfig.trigger.surveydefs[defposition].section!=null) {
    filecontents+=`
  section: "${jconfig.trigger.surveydefs[defposition].section}",`;
  }
  if(jconfig.trigger.surveydefs[defposition].repeatDays) {
    filecontents+=`
  repeatDays: {`;
    if(jconfig.trigger.surveydefs[defposition].repeatDays.decline) {
      filecontents+=`
    decline: ${jconfig.trigger.surveydefs[defposition].repeatDays.decline},`
    }
    if(jconfig.trigger.surveydefs[defposition].repeatDays.accept) {
      filecontents+=`
    accept: ${jconfig.trigger.surveydefs[defposition].repeatDays.accept},`;
    }
    filecontents+=`
  },`;
  }
  filecontents+=`
  language: {
    locale: "${jconfig.trigger.surveydefs[defposition].language.locale}",`;
  if(jconfig.trigger.surveydefs[defposition].language.src) {
    filecontents+=`
    src: "${jconfig.trigger.surveydefs[defposition].language.src}",`;
  }
  if(jconfig.trigger.surveydefs[defposition].language.name) {
    filecontents+=`
    name: "${jconfig.trigger.surveydefs[defposition].language.name}",`;
  }
  if(jconfig.trigger.surveydefs[defposition].language.locales) {
    filecontents+=`
    locales: [`;
    for(var position in jconfig.trigger.surveydefs[defposition].language.locales) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].language.locales[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].language.locales[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].language.locales[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].language.locales[position][key]},`;
        }
      }
      filecontents+=`
      }`;
    }
    filecontents+=`
    ],`;
  }
  filecontents+=`
  },
  cxRecord: ${jconfig.trigger.surveydefs[defposition].cxRecord},
  mouseoff: {
    mode: "${jconfig.trigger.surveydefs[defposition].mouseoff.mode}",
    minSiteTime: ${jconfig.trigger.surveydefs[defposition].mouseoff.minSiteTime},
    minPageTime: ${jconfig.trigger.surveydefs[defposition].mouseoff.minPageTime},
    sp: {
      reg: ${jconfig.trigger.surveydefs[defposition].mouseoff.sp.reg},
      outreplaypool: ${jconfig.trigger.surveydefs[defposition].mouseoff.sp.outreplaypool},
    },
    lf: ${jconfig.trigger.surveydefs[defposition].mouseoff.lf},
  },
  criteria: {
    sp: {
      reg: ${jconfig.trigger.surveydefs[defposition].criteria.sp.reg},
      outreplaypool: ${jconfig.trigger.surveydefs[defposition].criteria.sp.outreplaypool},
    },
    lf: ${jconfig.trigger.surveydefs[defposition].criteria.lf},
    supportsSmartPhones: ${jconfig.trigger.surveydefs[defposition].criteria.supportsSmartPhones},
    supportsTablets: ${jconfig.trigger.surveydefs[defposition].criteria.supportsTablets},
    supportsDesktop: ${jconfig.trigger.surveydefs[defposition].criteria.supportsDesktop},
  },
  include: {
    urls: [`;
  if(jconfig.trigger.surveydefs[defposition].include.urls.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].include.urls) {
      filecontents+=`
      "${jconfig.trigger.surveydefs[defposition].include.urls[position]}",`;
    }
  }
  filecontents+=`
    ],
    referrers: [`;
  if(jconfig.trigger.surveydefs[defposition].include.referrers.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].include.referrers) {
      filecontents+=`
      "${jconfig.trigger.surveydefs[defposition].include.referrers[position]}",`;
    }
  }
  filecontents+=`
    ],
    userAgents: [`;
  if(jconfig.trigger.surveydefs[defposition].include.userAgents.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].include.userAgents) {
      filecontents+=`
      "${jconfig.trigger.surveydefs[defposition].include.userAgents[position]}",`;
    }
  }
  filecontents+=`
    ],
    browsers: [`;
  if(jconfig.trigger.surveydefs[defposition].include.browsers.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].include.browsers) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].include.browsers[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].include.browsers[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].include.browsers[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].include.browsers[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    cookies: [`;
  if(jconfig.trigger.surveydefs[defposition].include.cookies.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].include.cookies) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].include.cookies[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].include.cookies[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].include.cookies[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].include.cookies[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    variables: [`;
  if(jconfig.trigger.surveydefs[defposition].include.variables.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].include.variables) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].include.variables[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].include.variables[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].include.variables[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].include.variables[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
  },
  inviteExclude: {
    urls: [`;
  if(jconfig.trigger.surveydefs[defposition].inviteExclude.urls.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].inviteExclude.urls) {
      filecontents+=`
      "${jconfig.trigger.surveydefs[defposition].inviteExclude.urls[position]}",`;
    }
  }
  filecontents+=`
    ],
    referrers: [`;
  if(jconfig.trigger.surveydefs[defposition].inviteExclude.referrers.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].inviteExclude.referrers) {
      filecontents+=`
      "${jconfig.trigger.surveydefs[defposition].inviteExclude.referrers[position]}",`;
    }
  }
  filecontents+=`
    ],
    userAgents: [`;
  if(jconfig.trigger.surveydefs[defposition].inviteExclude.userAgents.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].inviteExclude.userAgents) {
      filecontents+=`
      "${jconfig.trigger.surveydefs[defposition].inviteExclude.userAgents[position]}",`;
    }
  }
  filecontents+=`
    ],
    browsers: [`;
  if(jconfig.trigger.surveydefs[defposition].inviteExclude.browsers.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].inviteExclude.browsers) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].inviteExclude.browsers[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].inviteExclude.browsers[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].inviteExclude.browsers[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].inviteExclude.browsers[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    cookies: [`;
  if(jconfig.trigger.surveydefs[defposition].inviteExclude.cookies.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].inviteExclude.cookies) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].inviteExclude.cookies[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].inviteExclude.cookies[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].inviteExclude.cookies[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].inviteExclude.cookies[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    variables: [`;
  if(jconfig.trigger.surveydefs[defposition].inviteExclude.variables.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].inviteExclude.variables) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].inviteExclude.variables[position]) {
        filecontents+=`
        ${key}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].inviteExclude.variables[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].inviteExclude.variables[position][key]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].inviteExclude.variables[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
  },
  pattern: "${jconfig.trigger.surveydefs[defposition].pattern}",
  selectMode: "${jconfig.trigger.surveydefs[defposition].selectMode}",
  links: {
    cancel: [`;
  if(jconfig.trigger.surveydefs[defposition].links.cancel.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].links.cancel) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].links.cancel[position]) {
        filecontents+=`
        ${key}: `;
        if(Array.isArray(jconfig.trigger.surveydefs[defposition].links.cancel[position][key])) {
          filecontents+=`[`;
          for(var innerposition in jconfig.trigger.surveydefs[defposition].links.cancel[position][key]) {
            if(typeof jconfig.trigger.surveydefs[defposition].links.cancel[position][key][innerposition] == typeof "") {
              filecontents+=`
          "${jconfig.trigger.surveydefs[defposition].links.cancel[position][key][innerposition]}",`;
            }
            else {
              filecontents+=`
          ${jconfig.trigger.surveydefs[defposition].links.cancel[position][key][innerposition]},`;
            }
          }
          filecontents+=`
        ],`;
        }
        else if(typeof jconfig.trigger.surveydefs[defposition].links.cancel[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].links.cancel[position][key]}",`
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].links.cancel[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    survey: [`;
  if(jconfig.trigger.surveydefs[defposition].links.survey.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].links.survey) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].links.survey[position]) {
        filecontents+=`
        ${key}: `;
        if(Array.isArray(jconfig.trigger.surveydefs[defposition].links.survey[position][key])) {
          filecontents+=`[`;
          for(var innerposition in jconfig.trigger.surveydefs[defposition].links.survey[position][key]) {
            if(typeof jconfig.trigger.surveydefs[defposition].links.survey[position][key][innerposition] == typeof "") {
              filecontents+=`
          "${jconfig.trigger.surveydefs[defposition].links.survey[position][key][innerposition]}",`;
            }
            else {
              filecontents+=`
          ${jconfig.trigger.surveydefs[defposition].links.survey[position][key][innerposition]},`;
            }
          }
          filecontents+=`
        ],`;
        }
        else if(typeof jconfig.trigger.surveydefs[defposition].links.survey[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].links.survey[position][key]}",`
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].links.survey[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
    tracker: [`;
  if(jconfig.trigger.surveydefs[defposition].links.tracker.length > 0) {
    for(var position in jconfig.trigger.surveydefs[defposition].links.tracker) {
      filecontents+=`
      {`;
      for(var key in jconfig.trigger.surveydefs[defposition].links.tracker[position]) {
        filecontents+=`
        ${key}: `;
        if(Array.isArray(jconfig.trigger.surveydefs[defposition].links.tracker[position][key])) {
          filecontents+=`[`;
          for(var innerposition in jconfig.trigger.surveydefs[defposition].links.tracker[position][key]) {
            if(typeof jconfig.trigger.surveydefs[defposition].links.tracker[position][key][innerposition] == typeof "") {
              filecontents+=`
          "${jconfig.trigger.surveydefs[defposition].links.tracker[position][key][innerposition]}",`;
            }
            else {
              filecontents+=`
          ${jconfig.trigger.surveydefs[defposition].links.tracker[position][key][innerposition]},`;
            }
          }
          filecontents+=`
        ],`;
        }
        else if(typeof jconfig.trigger.surveydefs[defposition].links.tracker[position][key] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].links.tracker[position][key]}",`
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].links.tracker[position][key]},`;
        }
      }
      filecontents+=`
      },`;
    }
  }
  filecontents+=`
    ],
  },
  display: {`;
  for(var key in jconfig.trigger.surveydefs[defposition].display) {
    filecontents+=`
    ${key}: [`;
    for(var position in jconfig.trigger.surveydefs[defposition].display[key]) {
      filecontents+=`
      {`;
      for(var innerkey in jconfig.trigger.surveydefs[defposition].display[key][position]) {
        filecontents+=`
        ${innerkey}: `;
        if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey] == typeof {}) {
          filecontents+=`{`;
          for(var innerinnerkey in jconfig.trigger.surveydefs[defposition].display[key][position][innerkey]) {
            filecontents+=`
          ${innerinnerkey}: `;
            if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey] == typeof {}) {
              filecontents+=`{`;
              for(var localekey in jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey]) {
                filecontents+=`
            "${localekey}": `;
                if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey] == typeof {}) {
                  filecontents+=`{`;
                  for(var innerlocalekey in jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey]) {
                    filecontents+=`
              ${innerlocalekey}: `;
                    if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey] == typeof {}) {
                      filecontents+=`{`;
                      for(var innerinnerlocalekey in jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey]) {
                        filecontents+=`
                ${innerinnerlocalekey}: `;
                        if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey][innerinnerlocalekey] == typeof "") {
                          filecontents+=`"${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey][innerinnerlocalekey]}",`;
                        }
                        else {
                          filecontents+=`${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey][innerinnerlocalekey]},`;
                        }
                      }
                      filecontents+=`
              },`;
                    }
                    else if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey] == typeof "") {
                      filecontents+=`"${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey]}",`;
                    }
                    else {
                      filecontents+=`${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey][innerlocalekey]},`;
                    }
                  }
                  filecontents+=`
            },`;
                }
                else if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey] == typeof "") {
                  filecontents+=`"${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey]}",`;
                }
                else {
                  filecontents+=`${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey][localekey]},`;
                }
              }
              filecontents+=`
          },`;
            }
            else if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey] == typeof "") {
              filecontents+=`"${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey]}",`;
            }
            else {
              filecontents+=`${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey][innerinnerkey]},`;
            }
          }
          filecontents+=`
        },`;
        }
        else if(typeof jconfig.trigger.surveydefs[defposition].display[key][position][innerkey] == typeof "") {
          filecontents+=`"${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey]}",`;
        }
        else {
          filecontents+=`${jconfig.trigger.surveydefs[defposition].display[key][position][innerkey]},`;
        }
      }
      filecontents+=`
      },`;
    }
    filecontents+=`
    ],`;
  }
  filecontents+=`
  },
  qualifier: {
    useQualifier: ${jconfig.trigger.surveydefs[defposition].qualifier.useQualifier},
    survey: {`; // left this out since we don't support in code qualifiers anymore, can be added later if we want
  filecontents+=`
    },
  },
  reminder: {
    useReminder: ${jconfig.trigger.surveydefs[defposition].reminder.useReminder},
    display: {
      headerSection: "${jconfig.trigger.surveydefs[defposition].reminder.display.headerSection}",
      bodySection: "${jconfig.trigger.surveydefs[defposition].reminder.display.bodySection}",
      buttonText: "${jconfig.trigger.surveydefs[defposition].reminder.display.buttonText}",`;
  if(jconfig.trigger.surveydefs[defposition].reminder.display.locales) {
    filecontents+=`
      locales: {`;
    for(var key in jconfig.trigger.surveydefs[defposition].reminder.display.locales) {
      filecontents+=`
        "${key}": {`;
      for(var innerkey in jconfig.trigger.surveydefs[defposition].reminder.display.locales[key]) {
        filecontents+=`
          ${innerkey}: "${jconfig.trigger.surveydefs[defposition].reminder.display.locales[key][innerkey]}",`;
      }
      filecontents+=`
        },`;
    }
    filecontents+=`
      },`;
  }
  filecontents+=`
    },
  },`
  filecontents+=`
})`;
  //console.log(filecontents)
	fs.writeFileSync(pjson.build.config+'/productconfig/trigger/surveydef/def'+defposition+'.js',filecontents,function (err) {
	  if (err) throw err;
  });
  }
  //THIS IS WHERE WE END SURVEYDEF LOGIC
});

//gulp.task('build-custom', gulp.series('assets-clear','assets-copy','config-build'), function(cb) {});