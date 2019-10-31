const beautify = require("js-beautify").js_beautify;
const copydir = require("copy-dir");
const fs = require("fs");
const gulp = require("gulp");
const chalk = require("chalk");
const handydevserver = require("handydevserver");
const lotemplate = require("lodash.template");
const path = require("path");
const rimraf = require("rimraf");
const uuidV4 = require("uuid");

const fsGulpUtil = require("../bin/fsgulputils");

function startTestServer(pjson, clientProperties, isSSL) {
  // Set an instance UID
  var instanceUID = uuidV4()
    .toString()
    .replace(/-/gi, "")
    .substr(0, 10);

  // Handles text file requests
  var textfilehandler = function(filename, contents) {
    if (filename.indexOf("fs.gateway.js") > -1) {
      // do not inject configs into this file, as prod/qa/stg does not have any
      // configs in this file.
      return contents;
    }
    if (
      filename.indexOf("gateway.js") > -1 ||
      filename.indexOf("gateway.min.js") > -1 ||
      filename.indexOf("gatewayconfig.js") > -1 ||
      filename.indexOf("gatewayconfig.min.js") > -1
    ) {
      // todo: use /scripts/SDKConfigs.js > getGlobalConfig()

      // Holds the global config
      var globalConfig = {
        codeVer: pjson.code_version,
        products: {
          record: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "record"),
          trigger: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "trigger"),
          feedback: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "feedback"),
        },
        siteKey: clientProperties.client.sitekey,
        storage: clientProperties.client.persistence,
        brainUrl: clientProperties.client.brainurl,
        recUrl: clientProperties.client.transporturl,
        surveyUrl: clientProperties.client.surveyurl,
        modernSurveyUrl: clientProperties.client.modernSurveyUrl,
        analyticsUrl: clientProperties.client.events,
        staticUrl: clientProperties.client.static,
        cookieDomain: clientProperties.client.cookieDomain,
        cookieSecure: clientProperties.client.cookieSecure,
        adobeRsid: clientProperties.client.adobersid,
        customerId: clientProperties.client.id,
        modernRecord: clientProperties.client.modernRecord,
        deviceDetectionUrl: clientProperties.client.deviceDetectionUrl,
        journeyEvents: clientProperties.client.journeyEvents,
        disable_cpps: clientProperties.client.disable_cpps,
      };

      var feedbackProdConfig = fs
          .readFileSync(pjson.build.config + "/productconfig/feedback/product_config.js", "utf8")
          .toString(),
        feedbackGWConfig = fs
          .readFileSync(pjson.build.config + "/productconfig/feedback/gateway_config.js", "utf8")
          .toString(),
        recordProdConfig = fs
          .readFileSync(pjson.build.config + "/productconfig/record/product_config.js", "utf8")
          .toString(),
        recordGWConfig = fs
          .readFileSync(pjson.build.config + "/productconfig/record/gateway_config.js", "utf8")
          .toString(),
        triggerProdConfig = fs
          .readFileSync(pjson.build.config + "/productconfig/trigger/product_config.js", "utf8")
          .toString(),
        triggerGWConfig = fs
          .readFileSync(pjson.build.config + "/productconfig/trigger/gateway_config.js", "utf8")
          .toString(),
        svDefFiles = fs
          .readdirSync(pjson.build.config + "/productconfig/trigger/surveydef")
          .filter(function(file) {
            if (file.match(/^\./)) {
              return;
            }
            // Make sure we're reading only files.
            return fs
              .statSync(path.join(pjson.build.config + "/productconfig/trigger/surveydef", file))
              .isFile();
          });
      svDefFiles.sort();
      for (var i = 0; i < svDefFiles.length; i++) {
        svDefFiles[i] = {
          name: svDefFiles[i],
          contents: fs
            .readFileSync(
              pjson.build.config + "/productconfig/trigger/surveydef/" + svDefFiles[i],
              "utf8"
            )
            .toString(),
        };
      }

      // See if we should add record anyway
      if (!globalConfig.products.record) {
        if (globalConfig.products.trigger) {
          for (let p = 0; p < svDefFiles.length; p++) {
            if (svDefFiles[p].contents.match(/["']*cxRecord["']*:\s*true/g)) {
              globalConfig.products.record = true;
              break;
            }
          }
        }
        if (globalConfig.products.feedback) {
          if (feedbackProdConfig.match(/["']*replay["']*:\s*true/g)) {
            globalConfig.products.record = true;
          }
        }
      }
      var globalConfigStr = "globalConfig = " + JSON.stringify(globalConfig) + ";\n\n",
        productConfigStr = "";
      if (globalConfig.products.feedback) {
        feedbackGWConfig = feedbackGWConfig.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
          feedbackProdConfig
        );
        productConfigStr += "productConfig.feedback = " + feedbackGWConfig + ";\n\n";
      }
      if (globalConfig.products.record) {
        recordGWConfig = recordGWConfig.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
          recordProdConfig
        );
        productConfigStr += "productConfig.record = " + recordGWConfig + ";\n\n";
      }
      if (globalConfig.products.trigger) {
        var sdef = "";
        for (var k = 0; k < svDefFiles.length; k++) {
          var defObStr = fsGulpUtil.simpleMinifyJSString(svDefFiles[k].contents);
          sdef += "'" + fsGulpUtil.b64EncodeUnicode(defObStr) + "'";
          if (k !== svDefFiles.length - 1) {
            sdef += ", ";
          }
        }
        triggerProdConfig = triggerProdConfig.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@SVCONFIG_GOES_HERE@@[^/]*\//gi,
          "var surveydefs = [" + sdef + "];"
        );
        triggerGWConfig = triggerGWConfig.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
          triggerProdConfig
        );
        productConfigStr += "productConfig.trigger = " + triggerGWConfig + ";\n\n";
      }
      contents = contents
        .toString()
        .replace(
          /\/\*\*[^@/]*@preserve[^[/]*\[GENERAL_CONFIG\][^/]*\//gi,
          globalConfigStr + productConfigStr
        );
      contents = contents.replace(/\${staticCodeLocation}/gi, "/code/");
      contents = contents.replace(/\${versionTag}/gi, instanceUID);
      contents = contents.replace(/\${recTransportUrl}/gi, clientProperties.client.transporturl);
      contents = contents.replace(/\${hasreplay}/gi, globalConfig.products.record.toString());
      contents = lotemplate(contents)(clientProperties);
      contents = beautify(contents, { indent_size: 2 });
    }
    return contents;
  };

  var serverDirs = [
    "./dist",
    "./smoketest",
    pjson.build.extern + "/gateway/tags/" + pjson.gateway_version + "/dist",
  ];

  // Start an SSL server
  var startServerSSL = function() {
    handydevserver(pjson.build.ports[1], serverDirs, {
      ssl: true,
      ignore: ["DS_Store", "_selfhost_", "embed.txt", ".zip"],
      latency: 250,
      ontextfile: textfilehandler,
    });

    fsGulpUtil.signal(
      "SSL Server Started",
      "Build complete. Web server running at https://localhost:" + pjson.build.ports[1] + "..."
    );
  };

  // Start a non-SSL server
  var startServer = function() {
    handydevserver(pjson.build.ports[0], serverDirs, {
      ssl: false,
      ignore: ["DS_Store", "_selfhost_", "embed.txt", ".zip"],
      latency: 250,
      ontextfile: textfilehandler,
    });

    process.nextTick(function() {
      fsGulpUtil.signal(
        "Server Started",
        "Build complete. A web server running at http://localhost:" + pjson.build.ports[0] + "..."
      );
    });
  };

  startServer();

  if (isSSL) {
    startServerSSL();
  }
}

function startPreviewServer(pjson, clientProperties) {
  rimraf("./preview/*", function() {
    console.log(chalk.yellow("Cleared preview folder."));
    var previewContainer = fs.readFileSync("./smoketest/testpages/feedback/_previewframe.html");
    fs.writeFile("./preview/previewframe.html", previewContainer, function(err) {
      if (err) {
        console.log("There was an error generating the preview frame: ", err);
      }
    });
    var previewBadgeContainer = fs.readFileSync(
      "./smoketest/testpages/feedback/_previewbadge.html"
    );
    fs.writeFile("./preview/previewbadge.html", previewBadgeContainer, function(err) {
      if (err) {
        console.log("There was an error generating the preview frame: ", err);
      }
    });

    var globalConfig = {
      codeVer: pjson.code_version,
      products: {
        record: false,
        trigger: false,
        feedback: true,
      },
      siteKey: clientProperties.client.sitekey,
      storage: clientProperties.client.persistence,
      brainUrl: clientProperties.client.brainurl,
      recUrl: clientProperties.client.transporturl,
      surveyUrl: clientProperties.client.surveyurl,
      modernSurveyUrl: clientProperties.client.modernSurveyUrl,
      analyticsUrl: clientProperties.client.events,
      staticUrl: clientProperties.client.static,
      modernRecord: clientProperties.client.modernRecord,
      deviceDetectionUrl: clientProperties.client.deviceDetectionUrl,
      journeyEvents: clientProperties.client.journeyEvents,
      disable_cpps: clientProperties.client.disable_cpps,
    };

    var gatewayfile = fs
      .readFileSync(
        pjson.build.extern + "/gateway/tags/" + pjson.gateway_version + "/dist/gateway.js"
      )
      .toString();

    var gatewaycfgfile = fs
      .readFileSync(
        pjson.build.extern + "/gateway/tags/" + pjson.gateway_version + "/dist/gatewayconfig.min.js"
      )
      .toString();

    var snippet =
      "_moduleLocationOverride = 'preview/code/" +
      pjson.code_version +
      "/'; globalConfig = " +
      JSON.stringify(globalConfig) +
      ";" +
      "productConfig.feedback = " +
      fsGulpUtil.parseGWConfigFile(
        pjson.build.config + "/productconfig/feedback/gateway_config.js"
      ) +
      ";";

    gatewayfile = gatewayfile
      .toString()
      .replace(/\/\*\*[^@/]*@preserve[^[/]*\[GENERAL_CONFIG\][^/]*\//gi, snippet);

    gatewayfile = gatewayfile.toString().replace(/\${versionTag}/gi, pjson.version.toString());

    gatewaycfgfile = gatewaycfgfile
      .toString()
      .replace(/\/\*\*[^@/]*@preserve[^[/]*\[GENERAL_CONFIG\][^/]*\//gi, snippet);

    gatewaycfgfile = gatewaycfgfile
      .toString()
      .replace(/\${versionTag}/gi, pjson.version.toString());

    fs.writeFile("./preview/gateway.js", gatewayfile, function(err) {
      if (err) {
        console.log("There was an error generating the gateway file: ", err);
      }
    });

    fs.writeFile("./preview/gatewayconfig.min.js", gatewaycfgfile, function(err) {
      if (err) {
        console.log("There was an error generating the gateway config file: ", err);
      }
    });

    // Pull everything and put it in the preview folder
    gulp.src(pjson.build.previewsrc).pipe(gulp.dest(pjson.build.previewdst));
    console.log(chalk.yellow("Copying contents of ./dist to ./preview/code"));
    fs.mkdirSync("./preview/code/");
    copydir.sync("./dist/code/" + pjson.code_version, "./preview/code/" + pjson.code_version);
    fs.writeFile("./preview/code/" + pjson.code_version + "/fs.gateway.js", gatewayfile, function(
      err
    ) {
      if (err) {
        console.log("There was an error generating the gateway file: ", err);
      }
    });
    fs.writeFile(
      "./preview/code/" + pjson.code_version + "/fs.gatewayconfig.js",
      gatewaycfgfile,
      function(err) {
        if (err) {
          console.log("There was an error generating the gateway config file: ", err);
        }
      }
    );
    console.log("Starting server on 8080...");
    process.nextTick(function() {
      handydevserver(8080, ["./"], {});
    });

    console.log("Starting ssl server on 443...");
    process.nextTick(function() {
      handydevserver(443, ["./"], {
        ssl: true,
      });
    });
  });
}

module.exports = { startTestServer, startPreviewServer };
