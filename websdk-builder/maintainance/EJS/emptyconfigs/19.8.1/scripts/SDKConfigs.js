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
const getDefaultGlobalCfg = env => {
  var defCfg = JSON.parse(
    fs
      .readFileSync(
        pjson.build.extern +
          "/clientcode/tags/" +
          pjson.code_version +
          "/src/default_global_config.json"
      )
      .toString()
  );

  // todo: use /scripts/SDKConfigs.js > getDefaultGlobalCfg()

  defCfg.codeVer = pjson.version;
  defCfg.storage = clientProperties.client.persistence;
  defCfg.brainUrl = clientProperties.client.brainurl;
  defCfg.recUrl = clientProperties.client.transporturl;
  defCfg.surveyUrl = clientProperties.client.surveyurl;
  defCfg.modernSurveyUrl = clientProperties.client.modernSurveyUrl;
  defCfg.analyticsUrl = clientProperties.client.events;
  defCfg.staticUrl = clientProperties.client.static;
  defCfg.adobeRsid = clientProperties.client.adobersid;
  defCfg.customerId = clientProperties.client.id;
  defCfg.modernRecord = clientProperties.client.modernRecord;
  defCfg.deviceDetectionUrl = clientProperties.client.deviceDetectionUrl;
  defCfg.journeyEvents = clientProperties.client.journeyEvents;
  defCfg.disable_cpps = clientProperties.client.disable_cpps;

  if (env == FcpClient.environments.dev) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "DEV"));
    // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'dev-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-dev");
    defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "dev-cx");
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, "dev-rec");
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "dev-analytics");
  } else if (env == FcpClient.environments.stg) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "stg"));
    // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'stg-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-stg");
    defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "stg-cx");
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, "qa-rec");
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "qal-analytics");
  } else if (env == FcpClient.environments.qa) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "QA"));
    // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-qa");
    defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "qal-cx");
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, "qa-rec");
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "qal-analytics");
  } else if (env == FcpClient.environments.qa2) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "QA2"));
    // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-qa");
    defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "qal-cx");
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, "qa-rec");
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "qal-analytics");
  } else if (env == FcpClient.environments.prod) {
    console.log(chalk.yellow(chalk.magenta("FCP environment:"), "PROD"));
  }
  return defCfg;
};

module.exports = {
  pjson,
  clientProperties,
  getDefaultGlobalCfg,
  isProd,
  isVeracode,
  isSSL,
  testEnvs,
};
