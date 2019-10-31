/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */
// Ideally, here will be the only file where process.env is read
/* eslint-disable no-process-env */

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
// move towards using process.env.NODE_ENV

let isProd = false;
let isSSL = true;
let isVeracode = false;
let testEnvs = false;

const taskName = (gutil.env._[0] || "").toLowerCase();

// If a "production" task is run.....
if (taskName.indexOf("prod") > -1) {
  isProd = true;
  // QA's automated scripts don't have sudo access
  isSSL = false;

  // use standard build type signalling
  process.env.NODE_ENV = "production";
}
// if (taskName.indexOf('preview') > -1) {
// isProd = false;
// }
if (taskName.indexOf("push_") > -1) {
  isProd = true;
  process.env.NODE_ENV = "production";
}
// If a "debug" task is run.....
if (taskName.indexOf("debug") > -1) {
  isProd = false;
  process.env.NODE_ENV = "development";
}
// Self hosted is prod
if (taskName.indexOf("get_self_hosted") > -1) {
  isProd = true;
  process.env.NODE_ENV = "production";
}
if (taskName.indexOf("_test_envs") > -1) {
  testEnvs = true;
}
if (taskName.indexOf("_veracode") > -1) {
  process.env.NODE_ENV = "development";
  process.env.VERACODE = "1";
  isVeracode = true;
}

if (taskName === "test_debug" || taskName === "test_prod") {
  // Override certain settings when running the dev server with environment variables
  // Example .bash_profile / .profile goodness:
  //   export CC_DEV_PORT=4000
  //   export CC_SSL_DEV_PORT=4443
  //   export CC_CONFIG_DIR="../myconfigs"

  const devPortOverride = process.env["CC_DEV_PORT"];
  const sslDevPortOverride = process.env["CC_SSL_DEV_PORT"];
  const configDirOverride = process.env["CC_CONFIG_DIR"];

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
    // eslint-disable-next-line global-require
    clientProperties = require(clientPropertiesPath);
  }
}

// todo: Should we freeze deeper?
Object.freeze(pjson);
Object.freeze(clientProperties);

/**
 * Use require to pull in a config file
 */
function requireConfig(filename) {
  const fullpath = path.resolve(filename);

  // for testserver so it will load a fresh copy every time
  delete require.cache[fullpath];

  // eslint-disable-next-line global-require
  return require(fullpath);
}

/**
 * Get the default config for an env.
 */
const getGlobalConfig = envNumber => {
  /* FCPClient.environmentShort = ["dev", "qa", "qa2", "stg", "prod", "local"]; */
  const env = FcpClient.environmentShort[envNumber];
  if (!env)
    throw Error(
      `Invalid environment number passed: ${chalk.cyan(
        envNumber
      )}. Expected an index of Array ${JSON.stringify(FcpClient.environmentShort)}`
    );

  // cache busting in test server
  const clientProperties = requireConfig(`${pjson.build.config}/client_properties.js`);

  const globalConfig = {};

  // Gather configurations related to the code

  globalConfig.codeVer = pjson.version;

  // Gather configurations related to the environment

  const envConfig = requireConfig(`${pjson.build.config}/globalconfig/${env}.js`);

  globalConfig.brainUrl = envConfig.brainurl;
  globalConfig.recUrl = envConfig.transporturl;
  globalConfig.surveyUrl = envConfig.surveyurl;
  globalConfig.modernSurveyUrl = envConfig.modernSurveyUrl;
  globalConfig.analyticsUrl = envConfig.events;
  globalConfig.staticUrl = envConfig.static;
  globalConfig.deviceDetectionUrl = envConfig.deviceDetectionUrl;
  globalConfig.mobileOnExitUrl = envConfig.surveyasynccurl;

  // Gather configurations related to the feature flags

  const featureFlagsConfig = requireConfig(`${pjson.build.config}/featureFlags.js`);

  // The environmental feature flags overrides by global ones
  globalConfig.featureFlags = Object.assign({}, featureFlagsConfig, envConfig.featureFlags);

  // Gather configurations related to the client site

  globalConfig.storage = clientProperties.client.persistence;
  globalConfig.adobeRsid = clientProperties.client.adobersid;
  globalConfig.customerId = clientProperties.client.id;
  globalConfig.replayId = clientProperties.client.replayid;
  globalConfig.modernRecord = clientProperties.client.modernRecord;
  globalConfig.journeyEvents = clientProperties.client.journeyEvents;
  globalConfig.disable_cpps = clientProperties.client.disable_cpps;
  globalConfig.siteKey = clientProperties.client.sitekey;
  globalConfig.cookieDomain = clientProperties.client.cookieDomain;
  globalConfig.cookieSecure = clientProperties.client.cookieSecure;

  globalConfig.products = {
    trigger: clientProperties.client.productsToBuild.includes("trigger"),
    feedback: clientProperties.client.productsToBuild.includes("feedback"),
    record: clientProperties.client.productsToBuild.includes("record"),
  };

  // ???
  globalConfig.alwaysOnLatest = 0;

  return globalConfig;
};

function getAllConfigs(envNumber) {
  const globalConfig = getGlobalConfig(envNumber);

  const feedbackProdConfig = requireConfig(
    `${pjson.build.config}/productconfig/feedback/product_config.js`
  );

  const recordProdConfig = requireConfig(
    `${pjson.build.config}/productconfig/record/product_config.js`
  );

  let triggerProdConfig = requireConfig(
    `${pjson.build.config}/productconfig/trigger/product_config.js`
  );

  const svDefFiles = fs
    .readdirSync(`${pjson.build.config}/productconfig/trigger/surveydef`)
    .filter(function(file) {
      if (file.match(/^\./)) {
        return [];
      }
      // Make sure we're reading only files.
      return fs
        .statSync(path.join(`${pjson.build.config}/productconfig/trigger/surveydef`, file))
        .isFile();
    });

  svDefFiles.sort();

  for (let i = 0; i < svDefFiles.length; i++) {
    svDefFiles[i] = requireConfig(
      `${pjson.build.config}/productconfig/trigger/surveydef/${svDefFiles[i]}`
    );
  }

  triggerProdConfig = {
    config: triggerProdConfig,
    surveydefs: svDefFiles,
  };

  const stringify = isProd ? c => JSON.stringify(c) : c => JSON.stringify(c, null, 2);

  // Get the raw configs
  const feedbackConfigJSON = stringify(feedbackProdConfig);
  const recordConfigJSON = stringify(recordProdConfig);
  const triggerConfigJSON = stringify(triggerProdConfig);

  return {
    global: globalConfig,
    feedback: feedbackConfigJSON,
    record: recordConfigJSON,
    trigger: triggerConfigJSON,
    gateway: {
      trigger: triggerConfigJSON,
      feedback: feedbackConfigJSON,
      record: recordConfigJSON,
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
