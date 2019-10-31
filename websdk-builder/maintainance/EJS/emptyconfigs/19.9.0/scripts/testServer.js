/* eslint-env node */

const copydir = require("copy-dir");
const fs = require("fs");
const gulp = require("gulp");
const chalk = require("chalk");
const handydevserver = require("handydevserver");
const rimraf = require("rimraf");

const { getAllConfigs } = require("./SDKConfigs.js");
const fsGulpUtil = require("./fsgulputils");

function startTestServer(pjson, clientProperties, isSSL) {
  // Handles text file requests
  const textfilehandler = function(filename, contents) {
    if (filename.indexOf("fs.gateway.js") > -1) {
      // do not inject configs into this file, as prod/qa/stg does not have any
      // configs in this file.
      return contents;
    }

    if (filename.indexOf("gateway.js") > -1 || filename.indexOf("gateway.min.js") > -1) {
      const configs = getAllConfigs(5);

      const globalConfigStr = `globalConfig = ${JSON.stringify(configs.global, null, 2)}\n\n`;
      let productConfigStr = "";
      if (configs.global.products.feedback) {
        const feedbackGWConfig = configs.gateway.feedback.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
          `var config = ${JSON.stringify(configs.feedback, null, 2)}`
        );
        productConfigStr += `productConfig.feedback = ${feedbackGWConfig}\n\n`;
      }
      if (configs.global.products.record) {
        const recordGWConfig = configs.gateway.record.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
          `var config = ${JSON.stringify(configs.record, null, 2)}`
        );
        productConfigStr += `productConfig.record = ${recordGWConfig}\n\n`;
      }
      if (configs.global.products.trigger) {
        const triggerGWConfig = configs.gateway.trigger.replace(
          /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
          `var config = ${JSON.stringify(configs.trigger, null, 2)}`
        );
        productConfigStr += `productConfig.trigger = ${triggerGWConfig}\n\n`;
      }

      contents = contents
        .toString()
        .replace(
          /\/\*\*[^@/]*@preserve[^[/]*\[GENERAL_CONFIG\][^/]*\//gi,
          globalConfigStr + productConfigStr
        );
    }

    return contents;
  };

  const serverDirs = ["./dist", "./smoketest", `./dist/code/${pjson.version}`];

  // Start an SSL server
  const startServerSSL = function() {
    handydevserver(pjson.build.ports[1], serverDirs, {
      ssl: true,
      ignore: ["DS_Store", "_selfhost_", "embed.txt", ".zip"],
      latency: 250,
      ontextfile: textfilehandler,
    });

    fsGulpUtil.signal(
      "SSL Server Started",
      `Build complete. Web server running at https://localhost:${pjson.build.ports[1]}...`
    );
  };

  // Start a non-SSL server
  const startServer = function() {
    handydevserver(pjson.build.ports[0], serverDirs, {
      ssl: false,
      ignore: ["DS_Store", "_selfhost_", "embed.txt", ".zip"],
      latency: 250,
      ontextfile: textfilehandler,
    });

    process.nextTick(function() {
      fsGulpUtil.signal(
        "Server Started",
        `Build complete. A web server running at http://localhost:${pjson.build.ports[0]}...`
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
    const previewContainer = fs.readFileSync("./smoketest/testpages/feedback/_previewframe.html");
    fs.writeFile("./preview/previewframe.html", previewContainer, function(err) {
      if (err) {
        console.log("There was an error generating the preview frame: ", err);
      }
    });
    const previewBadgeContainer = fs.readFileSync(
      "./smoketest/testpages/feedback/_previewbadge.html"
    );
    fs.writeFile("./preview/previewbadge.html", previewBadgeContainer, function(err) {
      if (err) {
        console.log("There was an error generating the preview frame: ", err);
      }
    });

    const globalConfig = {
      codeVer: pjson.version,
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

    let gatewayfile = fs.readFileSync("dist/gateway/gateway.js").toString();

    let gatewaycfgfile = fs.readFileSync("dist/gateway/gatewayconfig.min.js").toString();

    const snippet =
      `_moduleLocationOverride = 'preview/code/${pjson.version}/'; globalConfig = ${JSON.stringify(
        globalConfig
      )};` +
      `productConfig.feedback = ${fs
        .readFileSync(`${pjson.build.config}/productconfig/feedback/gateway_config.js`)
        .toString()};`;

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
    copydir.sync(`./dist/code/${pjson.version}`, `./preview/code/${pjson.version}`);
    fs.writeFile(`./preview/code/${pjson.version}/fs.gateway.js`, gatewayfile, function(err) {
      if (err) {
        console.log("There was an error generating the gateway file: ", err);
      }
    });
    fs.writeFile(`./preview/code/${pjson.version}/fs.gatewayconfig.js`, gatewaycfgfile, function(
      err
    ) {
      if (err) {
        console.log("There was an error generating the gateway config file: ", err);
      }
    });
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
