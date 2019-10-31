const FcpClient = require("fcp-client");
const chalk = require("chalk");
const fs = require("fs");
const gutil = require("gulp-util");
const path = require("path");

const pjson = require("../package.json");
// clientProperties are not constant because they can be overriden with "process.env["CC_CONFIG_DIR"]"
let clientProperties = require("../clientconfig/client_properties");

// Fix the missing events URL if applicable
if (!clientProperties.client.events) {
  clientProperties.client.events = "https://analytics.foresee.com/ingest/events";
}

// todo: annihilate the following:
// mutate configurations!

let isProd = false;
let isSSL = true;
let isVeracode = false;
let testEnvs = false;

try {
  let taskName = (gutil.env._[0] || "").toLowerCase();

  // If a "production" task is run.....
  if (taskName.indexOf("prod") > -1) {
    isProd = true;
    // QA's automated scripts don't have sudo access
    isSSL = false;
  }
  /*if (taskName.indexOf('preview') > -1) {
   isProd = false;
   }*/
  if (taskName.indexOf("push_") > -1) {
    isProd = true;
  }
  // If a "debug" task is run.....
  if (taskName.indexOf("debug") > -1) {
    isProd = false;
  }
  // Self hosted is prod
  if (taskName.indexOf("get_self_hosted") > -1) {
    isProd = true;
  }
  if (taskName.indexOf("_test_envs") > -1) {
    testEnvs = true;
  }
  if (taskName.indexOf("_veracode") > -1) {
    isVeracode = true;
  }

  if (taskName === "test_debug" || taskName === "test_prod") {
    // Override certain settings when running the dev server with environment variables
    // Example .bash_profile / .profile goodness:
    //   export CC_CODE_VERSION="symlink"
    //   export CC_GATEWAY_VERSION="symlink"
    //   export CC_DEV_PORT=4000
    //   export CC_SSL_DEV_PORT=4443
    //   export CC_CONFIG_DIR="../myconfigs"

    let codeVersionOverride = process.env["CC_CODE_VERSION"];
    let gatewayVersionOverride = process.env["CC_GATEWAY_VERSION"];
    let devPortOverride = process.env["CC_DEV_PORT"];
    let sslDevPortOverride = process.env["CC_SSL_DEV_PORT"];
    let configDirOverride = process.env["CC_CONFIG_DIR"];

    if (codeVersionOverride) {
      console.log(
        chalk.red(
          "Overriding code_version with",
          chalk.yellow(codeVersionOverride),
          " because CC_CODE_VERSION is set"
        )
      );
      pjson.code_version = codeVersionOverride;
    }

    if (gatewayVersionOverride) {
      console.log(
        chalk.red(
          "Overriding gateway_version with",
          chalk.yellow(gatewayVersionOverride),
          " because CC_GATEWAY_VERSION is set"
        )
      );
      pjson.gateway_version = gatewayVersionOverride;
    }

    if (devPortOverride) {
      console.log(
        chalk.red(
          "Overriding dev server port with",
          chalk.yellow(devPortOverride),
          " because CC_DEV_PORT is set"
        )
      );
      pjson.build.ports[0] = parseInt(devPortOverride, 10);
    }

    if (sslDevPortOverride) {
      if (sslDevPortOverride === "false") {
        console.log(chalk.red("Disabling SSL dev server because because CC_SSL_DEV_PORT=false"));
        isSSL = false;
      } else {
        console.log(
          chalk.red(
            "Overriding SSL dev server port with",
            chalk.yellow(sslDevPortOverride),
            " because CC_SSL_DEV_PORT is set"
          )
        );
        pjson.build.ports[1] = parseInt(sslDevPortOverride, 10);
      }
    }

    if (configDirOverride) {
      console.log(
        chalk.red(
          "Overriding config dir with",
          chalk.yellow(configDirOverride),
          " because CC_CONFIG_DIR is set"
        )
      );
      pjson.build.config = configDirOverride;
      const clientPropertiesPath = path.isAbsolute(configDirOverride)
        ? path.join(configDirOverride, "client_properties")
        : path.join("..", configDirOverride, "client_properties");
      clientProperties = require(clientPropertiesPath);
    }
  }
} catch (e) {
  throw e;
  // console.error(chalk.red(e));
}

// todo: Should we freeze deeper?
Object.freeze(pjson);
Object.freeze(clientProperties);

/**
 * Get the default config for an env.
 */
const getGlobalConfig = env => {
  var config = JSON.parse(
    fs
      .readFileSync(
        pjson.build.extern +
          "/clientcode/tags/" +
          pjson.code_version +
          "/src/default_global_config.json"
      )
      .toString()
  );

  config.codeVer = pjson.version;
  config.minGatewayVersion = pjson.minGWVer;
  config.alwaysOnLatest = 1;
  config.products = {
    record: clientProperties.client.productsToBuild.includes("record"),
    trigger: clientProperties.client.productsToBuild.includes("trigger"),
    feedback: clientProperties.client.productsToBuild.includes("feedback"),
  };
  config.siteKey = clientProperties.client.sitekey;
  config.storage = clientProperties.client.persistence;
  config.brainUrl = clientProperties.client.brainurl;
  config.recUrl = clientProperties.client.transporturl;
  config.surveyUrl = clientProperties.client.surveyurl;
  config.modernSurveyUrl = clientProperties.client.modernSurveyUrl;
  config.analyticsUrl = clientProperties.client.events;
  config.staticUrl = clientProperties.client.static;
  config.cookieDomain = clientProperties.client.cookieDomain;
  config.cookieSecure = clientProperties.client.cookieSecure;
  config.adobeRsid = clientProperties.client.adobersid;
  config.customerId = clientProperties.client.id;
  config.modernRecord = clientProperties.client.modernRecord;
  config.deviceDetectionUrl = clientProperties.client.deviceDetectionUrl;
  config.journeyEvents = clientProperties.client.journeyEvents;
  config.disable_cpps = clientProperties.client.disable_cpps;

  if (env == FcpClient.environments.dev) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "DEV"));
    // config.brainUrl = config.brainUrl.replace(/brain/, 'dev-brain');
    config.surveyUrl = config.surveyUrl.replace(/survey/, "survey-dev");
    config.modernSurveyUrl = config.modernSurveyUrl.replace(/cx/, "dev-cx");
    config.recUrl = config.recUrl.replace(/rec/, "dev-rec");
    config.analyticsUrl = config.analyticsUrl.replace(/analytics/, "dev-analytics");
  } else if (env == FcpClient.environments.stg) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "stg"));
    // config.brainUrl = config.brainUrl.replace(/brain/, 'stg-brain');
    config.surveyUrl = config.surveyUrl.replace(/survey/, "survey-stg");
    config.modernSurveyUrl = config.modernSurveyUrl.replace(/cx/, "stg-cx");
    config.recUrl = config.recUrl.replace(/rec/, "qa-rec");
    config.analyticsUrl = config.analyticsUrl.replace(/analytics/, "qal-analytics");
  } else if (env == FcpClient.environments.qa) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "QA"));
    // config.brainUrl = config.brainUrl.replace(/brain/, 'qa-brain');
    config.surveyUrl = config.surveyUrl.replace(/survey/, "survey-qa");
    config.modernSurveyUrl = config.modernSurveyUrl.replace(/cx/, "qal-cx");
    config.recUrl = config.recUrl.replace(/rec/, "qa-rec");
    config.analyticsUrl = config.analyticsUrl.replace(/analytics/, "qal-analytics");
  } else if (env == FcpClient.environments.qa2) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "QA2"));
    // config.brainUrl = config.brainUrl.replace(/brain/, 'qa-brain');
    config.surveyUrl = config.surveyUrl.replace(/survey/, "survey-qa");
    config.modernSurveyUrl = config.modernSurveyUrl.replace(/cx/, "qal-cx");
    config.recUrl = config.recUrl.replace(/rec/, "qa-rec");
    config.analyticsUrl = config.analyticsUrl.replace(/analytics/, "qal-analytics");
  } else if (env == FcpClient.environments.prod) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "PROD"));
  }
  return config;
};

function getAllConfigs(env) {
  const fsGulpUtil = require("../bin/fsgulputils");
  const lotemplate = require("lodash.template");

  var globalConfig = getGlobalConfig(env),
    feedbackProdConfig = fs
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
      for (var p = 0; p < svDefFiles.length; p++) {
        if (svDefFiles[p].contents.match(/["']*cxRecord["']*:\s*true/g)) {
          globalConfig.products.record = true;
          break;
        }
      }
    }
  }
  if (globalConfig.products.record) {
    recordGWConfig = recordGWConfig.replace(
      /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
      recordProdConfig
    );
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
  }
  triggerGWConfig = triggerGWConfig.replace(
    /\$\{hasreplay\}/gi,
    globalConfig.products.record.toString()
  );
  triggerGWConfig = lotemplate(triggerGWConfig)(clientProperties);
  recordGWConfig = lotemplate(recordGWConfig)(clientProperties);
  feedbackGWConfig = feedbackGWConfig.replace(
    /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
    feedbackProdConfig
  );

  // todo: get rid of eval
  // It is expected here to create the global variables:
  // config, triggerconfig, surveydefs

  // Get the raw configs
  var feedbackConfigJSON = JSON.stringify(eval(feedbackProdConfig));
  var recordConfigJSON = eval(recordProdConfig);
  recordConfigJSON = JSON.stringify(config);
  var triggerConfigJSON = eval("var _fsDefine = function() {}; " + triggerProdConfig);
  triggerConfigJSON = JSON.stringify({
    config: triggerconfig,
    surveydefs: surveydefs,
  });
  triggerConfigJSON = triggerConfigJSON.replace(
    /\$\{hasreplay\}/gi,
    globalConfig.products.record.toString()
  );
  feedbackConfigJSON = lotemplate(feedbackConfigJSON)(clientProperties);
  recordConfigJSON = lotemplate(recordConfigJSON)(clientProperties);
  triggerConfigJSON = lotemplate(triggerConfigJSON)(clientProperties);

  return {
    global: globalConfig,
    feedback: feedbackConfigJSON,
    record: recordConfigJSON,
    trigger: triggerConfigJSON,
    gateway: {
      trigger: fsGulpUtil.simpleMinifyJSString(triggerGWConfig),
      feedback: fsGulpUtil.simpleMinifyJSString(feedbackGWConfig),
      record: fsGulpUtil.simpleMinifyJSString(recordGWConfig),
    },
  };
}

module.exports = {
  pjson,
  clientProperties,
  getGlobalConfig,
  getAllConfigs,
  isProd,
  isVeracode,
  isSSL,
  testEnvs,
};
