// todo: replace by archiver (more maintenance and already used in fsgulputils.js)
const argv = require("yargs").argv;
const chalk = require("chalk");
const emailValidator = require("email-validator");
const FcpClient = require("fcp-client");
const fs = require("fs");
const path = require("path");
const lotemplate = require("lodash.template");
const mailer = require("nodemailer");
const prompt = require("prompt");
const semver = require("semver");
const smtpTransport = require("nodemailer-smtp-transport");
const zipdir = require("zip-dir");

const fsGulpUtil = require("../bin/fsgulputils");

let creds = {};
let envVariableOptions = fsGulpUtil.readEnvVariables();

// todo: the function using fcp have flattened their callbacks,
// but they should taken out of and made more generic,
// saving some duplications, like "listClients".
// Callbacks nesting in general can use some clean up anyway.

/**
 * List of clients
 */
function listClients() {
  console.log(chalk.magenta("Listing clients..."));
  FcpClient.promptForFCPCredentials({}, function(rs) {
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.listClients(function(success, data) {
      if (!success) {
        console.log(chalk.red("Was not able to connect. Message: "), data);
      } else {
        console.log(
          chalk.yellow(
            "Complete client list (" + chalk.magenta(data.length.toString()) + " results):"
          )
        );
        for (var i = 0; i < data.length; i++) {
          var client = data[i];
          if (i > 0) {
            console.log(chalk.grey("---------------------------------------------"));
          }
          console.log(
            chalk.magenta("   Client: "),
            chalk.grey("[ID: " + chalk.yellow(client.id.toString()) + "]"),
            client.name,
            client.deleted != 0 ? chalk.red("DELETED") : ""
          );
          console.log(chalk.magenta(" metadata: "), client.metadata);
        }
      }
    });
  });
}

/**
 * Look up a client
 */
function lookupClient(cb) {
  console.log(chalk.magenta("Looking up a client. Provide a search term:"));
  fsGulpUtil.promptForValuesIfNeeded(
    {
      client_search_term: null,
    },
    function(res) {
      if (res.client_search_term && res.client_search_term.length > 0) {
        res.client_search_term = res.client_search_term.trim().replace(/[ ]{2,}/g, " ");
        console.log(
          chalk.magenta(
            "Searching for clients with the term: ",
            '"',
            chalk.yellow(res.client_search_term),
            '"',
            ".."
          )
        );
        FcpClient.promptForFCPCredentials({}, function(rs) {
          /**
           * Set up an instance of the FCP client
           * @type {FCPClient}
           */
          var fcp = new FcpClient(rs.username, rs.password, rs.environment);
          fcp.lookupClient(res.client_search_term, function(success, data) {
            if (!success) {
              console.error(chalk.red("Was not able to connect. Message: "), data);
            } else {
              console.log(
                chalk.yellow(
                  "Client results (",
                  chalk.magenta(data.clients.length.toString()),
                  " results):"
                )
              );
              for (let i = 0; i < data.clients.length; i++) {
                let client = data.clients[i];
                if (i > 0) {
                  console.log(chalk.grey("---------------------------------------------"));
                }
                console.log(
                  chalk.magenta("   Client: "),
                  chalk.grey("[ID: ", chalk.yellow(client.id.toString()), "]"),
                  client.name,
                  client.deleted != 0 ? chalk.red("DELETED") : ""
                );
                console.log(chalk.magenta(" metadata: "), client.metadata);
              }
              console.log(
                chalk.yellow(
                  "\n\nSite results (",
                  chalk.magenta(data.sites.length.toString()),
                  " results):"
                )
              );
              for (let i = 0; i < data.sites.length; i++) {
                let site = data.sites[i];
                if (i > 0) {
                  console.log(chalk.grey("---------------------------------------------"));
                }
                console.log(chalk.magenta("     Site: "), site.name);
                console.log(
                  chalk.magenta("   Client: "),
                  chalk.grey("[ID: ", chalk.yellow(site.client_id.toString()), "]"),
                  site.deleted != 0 ? chalk.red("DELETED") : ""
                );
              }
            }
          });
        });
      } else {
        console.log(chalk.red("You must provide a search term."));
        if (cb) cb();
      }
    }
  );
}

/**
 * Make a client
 */
function createClient(cb) {
  console.log(
    chalk.magenta("Creating a client."),
    chalk.yellow("NOTE: "),
    "You should search for a client first by calling ",
    chalk.grey("client_lookup"),
    "!"
  );
  console.log(
    "Metadata can be the website URL, client contact name, other trademarks, etc. This is useful for searching."
  );
  console.log(chalk.yellow("Client ID should be a non-zero integer."));
  fsGulpUtil.promptForValuesIfNeeded(
    {
      client_name: null,
      metadata: null,
      client_id: null,
    },
    function(res) {
      if (
        res.client_name &&
        res.client_name.length > 0 &&
        res.metadata &&
        res.metadata.length > 0
      ) {
        res.client_name = res.client_name.trim().replace(/[ ]{2,}/g, " ");
        res.metadata = res.metadata.trim().replace(/[ ]{2,}/g, " ");
        if (res.client_name.length > 45) {
          res.client_name = res.client_name.substr(0, 45);
        }
        res.client_id = parseInt(res.client_id);
        if (isNaN(res.client_id) || res.client_id === 0) {
          throw new Error("Invalid client id!");
        }
        console.log(
          chalk.magenta("Making a client with the name: ") +
            '"' +
            res.client_name.yellow +
            '"' +
            chalk.magenta("..")
        );
        FcpClient.promptForFCPCredentials({}, function(rs) {
          /**
           * Set up an instance of the FCP client
           * @type {FCPClient}
           */
          var fcp = new FcpClient(rs.username, rs.password, rs.environment);
          fcp.makeClient(
            res.client_id,
            res.client_name,
            res.metadata,
            "Created client " + res.client_name,
            function(success, client) {
              if (!success) {
                console.log(chalk.red("Was not able to connect. Message: "), client);
              } else {
                console.log(
                  chalk.magenta("   Client: "),
                  chalk.grey(chalk.grey("[ID: ") + chalk.yellow(client.id.toString()) + "]"),
                  client.name,
                  client.deleted != 0 ? chalk.red("DELETED") : ""
                );
                console.log(chalk.magenta(" metadata: "), client.metadata);
              }
            }
          );
        });
      } else {
        console.log(chalk.red("You must provide all values."));
        if (cb) {
          cb();
        }
      }
    }
  );
}

/**
 * Make a site_key
 */
function createSite(cb) {
  FcpClient.promptForFCPCredentials(
    {
      clientId: true,
      alias: true,
    },
    function(rs) {
      console.log(
        chalk.magenta("Creating a site for client id ") +
          chalk.yellow(rs.clientId.toString()) +
          chalk.magenta(".")
      );
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      var fcp = new FcpClient(rs.username, rs.password, rs.environment);
      fcp.getClient(rs.clientId, function(success, client) {
        if (!success) {
          console.log(chalk.red("Was not able to connect. Message: "), client);
        } else {
          console.log(
            chalk.magenta("   Client: "),
            chalk.grey("[ID: " + chalk.yellow(client.id.toString()) + "]"),
            client.name,
            client.deleted != 0 ? chalk.red("DELETED") : ""
          );
          console.log(chalk.magenta(" metadata: "), client.metadata);
          fsGulpUtil.promptForValuesIfNeeded(
            {
              sitekey: null,
              alias: null,
            },
            function(res) {
              if (res.sitekey && res.sitekey.length > 0) {
                res.sitekey = res.sitekey
                  .trim()
                  .replace(/[ \t\n\r]/g, "")
                  .toLowerCase();
                if (res.sitekey.length > 45) {
                  res.sitekey = res.sitekey.substr(0, 45);
                }
                fcp.doesSiteKeyExist(res.sitekey, function(success, exists, clientinfo) {
                  if (!success) {
                    console.log(chalk.red("Could not look up site."));
                    process.exit();
                  } else {
                    if (exists) {
                      console.log(
                        chalk.red("Unfortunately, that sitekey (") +
                          chalk.yellow(res.sitekey) +
                          chalk.red(") already exists and is assigned to client ") +
                          chalk.red(clientinfo.client_id.toString()) +
                          chalk.red("...")
                      );
                      process.exit();
                    } else {
                      console.log(
                        chalk.magenta("Making a site key with the name: ") +
                          '"' +
                          chalk.yellow(res.sitekey) +
                          '"..'.magenta
                      );
                      fcp.makeSite(
                        res.sitekey,
                        rs.clientId,
                        res.alias,
                        "Created site key " + res.sitekey,
                        function(success, site) {
                          if (!success) {
                            console.log(chalk.red("Was not able to connect. Message: "), site);
                          } else {
                            console.log(
                              chalk.magenta("Site "),
                              site.name,
                              chalk.magenta("was created.")
                            );
                            if (cb) {
                              cb();
                            }
                          }
                        }
                      );
                    }
                  }
                });
              } else {
                console.log(chalk.red("You must provide a site key."));
                if (cb) {
                  cb();
                }
              }
            }
          );
        }
      });
    }
  );
}

/**
 * List publishers
 */
function listPublishers(cb) {
  console.log(chalk.magenta("Listing publishers..."));
  FcpClient.promptForFCPCredentials({}, function(rs) {
    fsGulpUtil.promptForValuesIfNeeded(
      {
        site_name: null,
      },
      function(userInput) {
        var fcp = new FcpClient(rs.username, rs.password, rs.environment);
        var siteKey = userInput.site_name;

        fcp.getPublishersForSitekey(siteKey, function(success, publishers) {
          if (success) {
            if (!publishers || publishers.length < 0) {
              // note: actually, atm, fcp returns an error for this
              // "no permitted users found for site"
              console.log("There is no publisher for site", chalk.amgenta(siteKey));
            } else {
              console.log(
                chalk.yellow("Complete publishers list (") +
                  chalk.magenta(publishers.length.toString()) +
                  chalk.yellow(" results):")
              );
              for (var i = 0; i < publishers.length; i++) {
                var publisher = publishers[i];
                if (i > 0) {
                  console.log(chalk.grey("---------------------------------------------"));
                }
                console.log(
                  chalk.magenta("  Publisher:"),
                  chalk.grey("[ID:"),
                  chalk.yellow(publisher.id.toString()) + chalk.grey("]"),
                  publisher.user
                );
                console.log(chalk.magenta(" permission:"), publisher.permission);
              }

              if (cb) cb();
            }
          } else {
            console.error("List publishers for site", siteKey.magenta, "Error: ", publishers.red);
            if (cb) cb();
          }
        });
      }
    );
  });
}

/**
 * Remove publishers
 */
function removePublisher(cb) {
  console.log(chalk.magenta("Removing publisher..."));
  FcpClient.promptForFCPCredentials({}, function(rs) {
    fsGulpUtil.promptForValuesIfNeeded(
      {
        site_name: null,
        publisher_id: null,
      },
      function(userInput) {
        var fcp = new FcpClient(rs.username, rs.password, rs.environment);
        var siteKey = userInput.site_name;
        var publisherId = userInput.publisher_id;

        fcp.removePublisherForSitekey(siteKey, publisherId, function(success, data) {
          if (success) {
            console.log(
              "Publisher [",
              publisherId.yellow,
              "] has been successfully removed from site ",
              siteKey.magenta
            );
          } else {
            console.error(
              "Failed to remove publisher [",
              publisherId.yellow,
              "] for site",
              siteKey.magenta,
              "\n Error:",
              data.red
            );
          }
          if (cb) cb();
        });
      }
    );
  });
}

/**
 * Post code to FCP
 */
function pushCode(pjson, clientProperties, testEnvs, isProd) {
  if (!semver.valid(pjson.version)) {
    console.log(
      chalk.red("Version "),
      pjson.version.red,
      chalk.red("is not a valid semver version.")
    );
    return;
  }
  if (clientProperties.client.clientid === 0) {
    console.log(chalk.red("Client ID is not defined in client_properties."));
    return;
  }
  if (!clientProperties.client.sitekey || clientProperties.client.sitekey.length == 0) {
    console.log(chalk.red("Site key is not valid in client_properties."));
    return;
  }
  console.log(
    chalk.magenta("Packaging code version for FCP: "),
    chalk.yellow(pjson.version.toString()),
    chalk.magenta(".")
  );
  var distloc = pjson.build.dist + "/code/" + pjson.code_version;
  zipdir(distloc, function(err, buffer) {
    if (err) {
      console.log("Could not zip the code: ", err);
    } else {
      console.log("Zip file size: ", buffer.length, "... Preparing to upload...");
      FcpClient.promptForFCPCredentials(
        {
          notes: true,
          // whether or not we prompt for 'latest'; true, unless we are using one of the bash scripts
          latest: !testEnvs && !argv.dev,
          disableEnv: !!testEnvs || argv.dev,
        },
        function(rs) {
          function completePost(env) {
            console.log("About to push code version..");
            new FcpClient(rs.username, rs.password, env).postCodeVersion(
              buffer,
              rs.notes,
              pjson.version,
              rs.latest,
              function(success, data) {
                var envShort = Object.keys(FcpClient.environments).find(key => {
                  return FcpClient.environments[key] === env;
                });

                if (!success) {
                  console.log(chalk.red("𐄂"), envShort + ":", data.toString().red);
                } else {
                  console.log(chalk.green("✓"), envShort + ":", data.toString().magenta);
                }
              }
            );
          }

          if (testEnvs) {
            for (var i = 1, len = 3; i <= len; i++) {
              var es = FcpClient.environmentShort[i];
              console.log("Pushing Code to: ", es);
              completePost(FcpClient.environments[es]);
            }
          } else if (argv.dev) {
            console.log("Pushing Code to: dev");
            completePost(FcpClient.environments["dev"]);
          } else if (rs.environment == FcpClient.environments.prod && !isProd) {
            // if push_code_debug was called on prod
            console.log(chalk.red("Terminating: will not push debug code to production"));
          } else {
            completePost(rs.environment);
          }
        }
      );
    }
  });
}

/**
 * Push the default config
 */
function pushDefaultConfig(pjson, clientProperties, cb) {
  FcpClient.promptForFCPCredentials({}, function(rs) {
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
    defCfg.minGatewayVersion = pjson.minGWVer;
    defCfg.alwaysOnLatest = 1;
    defCfg.siteKey = clientProperties.client.sitekey;
    defCfg.storage = clientProperties.client.persistence;
    defCfg.brainUrl = clientProperties.client.brainurl;
    defCfg.recUrl = clientProperties.client.transporturl;
    defCfg.surveyUrl = clientProperties.client.surveyurl;
    defCfg.modernSurveyUrl = clientProperties.client.modernSurveyUrl;
    defCfg.analyticsUrl = clientProperties.client.events;
    defCfg.staticUrl = clientProperties.client.static;
    defCfg.cookieDomain = clientProperties.client.cookieDomain;
    defCfg.cookieSecure = clientProperties.client.cookieSecure;
    defCfg.adobeRsid = clientProperties.client.adobersid;
    defCfg.customerId = clientProperties.client.id;
    defCfg.modernRecord = clientProperties.client.modernRecord;
    defCfg.deviceDetectionUrl = clientProperties.client.deviceDetectionUrl;
    defCfg.journeyEvents = clientProperties.client.journeyEvents;
    defCfg.disable_cpps = clientProperties.client.disable_cpps;

    if (rs.environment == FcpClient.environments.dev) {
      console.log(chalk.yellow(chalk.magenta("FCP environment:"), "DEV"));
      // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'dev-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-dev");
      defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "dev-cx");
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, "dev-rec");
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "dev-analytics");
    } else if (rs.environment == FcpClient.environments.stg) {
      console.log(chalk.yellow(chalk.magenta("FCP environment:"), "STG"));
      // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'stg-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-stg");
      defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "stg-cx");
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, "qa-rec");
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "qal-analytics");
    } else if (rs.environment == FcpClient.environments.qa) {
      console.log(chalk.yellow(chalk.magenta("FCP environment:"), "QA"));
      // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-qa");
      defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "qal-cx");
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, "qa-rec");
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "qal-analytics");
    } else if (rs.environment == FcpClient.environments.qa2) {
      console.log(chalk.yellow(chalk.magenta("FCP environment:"), "QA2"));
      // defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, "survey-qa");
      defCfg.modernSurveyUrl = defCfg.modernSurveyUrl.replace(/cx/, "qal-cx");
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, "qa-rec");
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, "qal-analytics");
    } else if (rs.environment == FcpClient.environments.prod) {
      console.log(chalk.yellow(chalk.magenta("FCP environment:"), "PROD"));
    }

    console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
    console.log(defCfg);

    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.postDefaultConfig(
      JSON.stringify(defCfg),
      "Posted a new default configuration (" + pjson.version + ")",
      function(success, result) {
        if (!success) {
          console.log(chalk.red("Was not able to connect. Message: "), result);
        } else {
          console.log(chalk.magenta("Success: "), result);
          if (cb) {
            cb();
          }
        }
      }
    );
  });
}

/**
 * Push the DEFAULT config
 */
function pushStgConfig(clientProperties, pjson, getDefaultGlobalCfg, cb) {
  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      var defCfg = getDefaultGlobalCfg(rs.environment);
      console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
      console.log(defCfg);
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      var fcp = new FcpClient(rs.username, rs.password, rs.environment);
      fcp.makeContainer(
        clientProperties.client.sitekey,
        "staging",
        clientProperties.client.clientid,
        rs.notes,
        function(success, message) {
          if (!success && message !== "Container name already exists") {
            console.log(
              chalk.red(
                `Failed to create container for site_key "${clientProperties.client.sitekey}": `,
                message
              ),
              rs.environment
            );
          } else {
            fcp.postDefaultConfigForSiteContainer(
              clientProperties.client.sitekey,
              "staging",
              JSON.stringify(defCfg),
              "Posted a new default configuration (" + pjson.version + ")",
              function(success, result) {
                if (!success) {
                  console.log(chalk.red("Was not able to connect. Message: "), result);
                } else {
                  console.log(chalk.magenta("Success: "), result);
                  if (cb) {
                    cb();
                  }
                }
              }
            );
          }
        }
      );
    }
  );
}

/**
 * Push the DEFAULT config
 */
function pushProdConfig(clientProperties, pjson, getDefaultGlobalCfg, cb) {
  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      var defCfg = getDefaultGlobalCfg(rs.environment);
      console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
      console.log(defCfg);
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      var fcp = new FcpClient(rs.username, rs.password, rs.environment);
      fcp.makeContainer(
        clientProperties.client.sitekey,
        "production",
        clientProperties.client.clientid,
        rs.notes,
        function(success, message) {
          if (!success && message !== "Container name already exists") {
            console.log(
              chalk.red(
                `Failed to create container for site_key ${clientProperties.client.sitekey}: `,
                message
              ),
              rs.environment
            );
          } else {
            fcp.postDefaultConfigForSiteContainer(
              clientProperties.client.sitekey,
              "production",
              JSON.stringify(defCfg),
              "Posted a new default configuration (" + pjson.version + ")",
              function(success, result) {
                if (!success) {
                  console.log(chalk.red("Was not able to connect. Message: "), result);
                } else {
                  console.log(chalk.magenta("Success: "), result);
                  if (cb) {
                    cb();
                  }
                }
              }
            );
          }
        }
      );
    }
  );
}

/**
 * Build the code and push
 * @param env
 * @constructor
 */
var BuildAndPushToEnv = function(pjson, clientProperties, environment, cb) {
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
    },
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

  // todo: get rid of eval
  // It is expected here to create the global variables:
  // config, triggerconfig, surveydefs

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
    /\${hasreplay}/gi,
    globalConfig.products.record.toString()
  );
  triggerGWConfig = lotemplate(triggerGWConfig)(clientProperties);
  recordGWConfig = lotemplate(recordGWConfig)(clientProperties);
  feedbackGWConfig = feedbackGWConfig.replace(
    /\/\*\*[^@/]*@preserve[^@/]*@@CONFIG_GOES_HERE@@[^/]*\//gi,
    feedbackProdConfig
  );

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
    /\${hasreplay}/gi,
    globalConfig.products.record.toString()
  );
  clientProperties.hasreplay = globalConfig.products.record.toString();
  feedbackConfigJSON = lotemplate(feedbackConfigJSON)(clientProperties);
  recordConfigJSON = lotemplate(recordConfigJSON)(clientProperties);
  triggerConfigJSON = lotemplate(triggerConfigJSON)(clientProperties);

  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      // Store the username
      creds.username = rs.username;
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      var fcp = new FcpClient(rs.username, rs.password, rs.environment, rs.notes);
      fcp.getClient(clientProperties.client.clientid, function(success, client) {
        if (!success) {
          console.log(chalk.red("Failed to connect to FCP."), client);
        } else {
          fcp.makeContainer(
            clientProperties.client.sitekey,
            environment,
            client.id,
            rs.notes,
            function(success, message) {
              if (!success && message !== "Container name already exists") {
                console.log(chalk.red("Failed to create container: ", message), rs.environment);
              } else {
                console.log(
                  chalk.magenta(
                    "Pushing code to " +
                      environment +
                      " for client " +
                      clientProperties.client.clientid +
                      ":"
                  ),
                  chalk.yellow(client.name),
                  chalk.magenta("on site key"),
                  chalk.yellow(clientProperties.client.sitekey),
                  chalk.magenta("...")
                );
                console.log(chalk.magenta("Products being pushed:"));
                if (globalConfig.products.record) {
                  console.log(chalk.grey("  * "), chalk.yellow("record"));
                }
                if (globalConfig.products.trigger) {
                  console.log(chalk.grey("  * "), chalk.yellow("trigger"));
                }
                if (globalConfig.products.feedback) {
                  console.log(
                    chalk.grey("  * "),
                    chalk.red("will not push feedback (this should be done from the portal)")
                  );
                } else if (globalConfig.products.feedback) {
                  console.log(chalk.grey("  * "), chalk.yellow("feedback"));
                }
                // Checks to see if everything is created
                var checker = function() {
                    var didPass = false;
                    if (globalConfig.products.trigger && globalConfig.products.record) {
                      didPass = didRecord && didTrigger;
                    }
                    if (globalConfig.products.trigger && !globalConfig.products.record) {
                      didPass = didTrigger;
                    }
                    if (!globalConfig.products.trigger && globalConfig.products.record) {
                      didPass = didRecord;
                    }
                    if (didPass && globalConfig.products.feedback) {
                      didPass = didFeedback;
                    }
                    if (didPass) {
                      if (cb) {
                        cb(rs);
                      }
                    }
                  },
                  didTrigger = false,
                  didRecord = false,
                  didFeedback = false;
                if (globalConfig.products.trigger) {
                  if (!fs.existsSync(pjson.build.dist + "/trigger")) {
                    fs.mkdirSync(pjson.build.dist + "/trigger");
                  }
                  //fs.writeFileSync(pjson.build.dist + '/trigger/config.json', triggerConfigJSON);
                  triggerGWConfig = fsGulpUtil.simpleMinifyJSString(triggerGWConfig);
                  zipdir(pjson.build.dist + "/trigger", function(err, buffer) {
                    if (err) {
                      console.log("Could not zip the product folder: ", err);
                    } else {
                      fcp.pushCustomerConfigForProduct(
                        clientProperties.client.clientid,
                        clientProperties.client.sitekey,
                        environment,
                        "trigger",
                        triggerGWConfig,
                        buffer,
                        rs.notes,
                        function(success, result) {
                          if (!success) {
                            console.log("Failed to upload product trigger:", result);
                            return;
                          } else {
                            didTrigger = true;
                            console.log(
                              chalk.green("Successfully uploaded product trigger."),
                              result
                            );
                            checker();
                          }
                        },
                        false,
                        triggerConfigJSON
                      );
                    }
                  });
                }
                if (globalConfig.products.record) {
                  if (!fs.existsSync(pjson.build.dist + "/record")) {
                    fs.mkdirSync(pjson.build.dist + "/record");
                  }
                  recordGWConfig = fsGulpUtil.simpleMinifyJSString(recordGWConfig);
                  zipdir(pjson.build.dist + "/record", function(err, buffer) {
                    if (err) {
                      console.log("Could not zip the product folder: ", err);
                    } else {
                      fcp.pushCustomerConfigForProduct(
                        clientProperties.client.clientid,
                        clientProperties.client.sitekey,
                        environment,
                        "record",
                        recordGWConfig,
                        buffer,
                        rs.notes,
                        function(success, result) {
                          if (!success) {
                            console.log("Failed to upload product record:", result);
                            return;
                          } else {
                            didRecord = true;
                            console.log(
                              chalk.green("Successfully uploaded product record."),
                              result
                            );
                            checker();
                          }
                        },
                        false,
                        recordConfigJSON
                      );
                    }
                  });
                }
                if (globalConfig.products.feedback) {
                  if (!fs.existsSync(pjson.build.dist + "/feedback")) {
                    fs.mkdirSync(pjson.build.dist + "/feedback");
                  }
                  feedbackGWConfig = fsGulpUtil.simpleMinifyJSString(feedbackGWConfig);
                  zipdir(pjson.build.dist + "/feedback", function(err, buffer) {
                    if (err) {
                      console.log("Could not zip the product folder: ", err);
                    } else {
                      fcp.pushCustomerConfigForProduct(
                        clientProperties.client.clientid,
                        clientProperties.client.sitekey,
                        environment,
                        "feedback",
                        feedbackGWConfig,
                        buffer,
                        rs.notes,
                        function(success, result) {
                          if (!success) {
                            console.log("Failed to upload product feedback:", result);
                            return;
                          } else {
                            didFeedback = true;
                            console.log(
                              chalk.green("Successfully uploaded product feedback."),
                              result
                            );
                            checker();
                          }
                        },
                        false,
                        feedbackConfigJSON
                      );
                    }
                  });
                }
              }
            }
          );
        }
      });
    }
  );
};

/**
 * Push Product Config to FCP
 */
function pushStg(pjson, client, cb) {
  var container = "staging",
    emailOpts = /^[01]$/.test(envVariableOptions.email)
      ? {}
      : {
          sendCodeEmail: null,
        };
  BuildAndPushToEnv(pjson, client, container, function(fcpRes) {
    console.log(
      chalk.yellow("Do you want to send a code delivery email to yourself?"),
      chalk.magenta("(1 = yes, 0 = no)")
    );
    fsGulpUtil.promptForValuesIfNeeded(emailOpts, function(res) {
      if (
        (res && res.sendCodeEmail == 1) ||
        (envVariableOptions &&
          envVariableOptions.email &&
          envVariableOptions.email.toString() == "1")
      ) {
        var recipient = creds.username.substr(0, creds.username.indexOf("@")) + "@foresee.com";
        console.log(chalk.yellow("Sending delivery email to ") + " " + recipient.magenta + "...");
        fsGulpUtil.sendClientCodeEmail(
          client.id,
          client.sitekey,
          recipient,
          container,
          fcpRes,
          function(emailSubject) {
            console.log(chalk.yellow("Sent!"), "\nSubject:", emailSubject);
            if (cb) {
              cb();
            }
          }
        );
      } else {
        if (cb) {
          cb();
        }
      }
    });
  });
}

/**
 * Push Product Config to FCP
 */
function pushProd(pjson, clientProperties, cb) {
  var container = "production";
  BuildAndPushToEnv(pjson, clientProperties, container, function(fcpRes) {
    console.log(
      chalk.yellow("Do you want to send a code delivery email to yourself?"),
      chalk.magenta("(1 = yes, 0 = no)")
    );
    fsGulpUtil.promptForValuesIfNeeded(
      {
        sendCodeEmail: null,
      },
      function(res) {
        if (res.sendCodeEmail == 1) {
          var recipient = creds.username.substr(0, creds.username.indexOf("@")) + "@foresee.com";
          console.log(chalk.yellow("Sending delivery email to ") + " " + recipient.magenta + "...");
          fsGulpUtil.sendClientCodeEmail(
            clientProperties.client.id,
            clientProperties.client.sitekey,
            recipient,
            container,
            fcpRes,
            function(emailSubject) {
              console.log(chalk.yellow("Sent!"), "\nSubject: ", emailSubject);
              if (cb) {
                cb();
              }
            }
          );
        } else {
          if (cb) {
            cb();
          }
        }
      }
    );
  });
}

/**
 * Promote product configs from staging to production, will not promote feedback
 */
function promoteProd(client) {
  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      var fcp = new FcpClient(rs.username, rs.password, rs.environment);
      fcp.promoteStgToProd(client.sitekey, rs.notes, ["trigger", "record"], function(
        success,
        result
      ) {
        console.log(result);
      });
    }
  );
}

function getDefaultCodeVersion(fcp) {
  return new Promise(function(resolve) {
    fcp.getDefaultConfig(function(success, data) {
      if (success) {
        resolve(data.codeVer);
      } else {
        resolve("default");
      }
    });
  });
}

/**
 * downloads, modifies, re-uploads container config
 * for every site/container of provided clients
 * generates report.json
 * Modify the config in updateContainerConfig(gotConfig(setConfig(...here...)))
 */
function updateConfigs() {
  // const ProgressBar = require("ascii-progress");
  // const bar = new ProgressBar({
  //   schema: "[:bar] :percent :elapseds/:etas",
  // });

  FcpClient.promptForFCPCredentials({}, function(rs) {
    //get instance of FcpClient
    const fcp = new FcpClient(rs.username, rs.password, rs.environment);

    doTheThingForAllClients(fcp);
  });

  function doTheThingForAllClients(fcp) {
    fcp.listClients(function(success, clients) {
      if (!success) {
        console.log(chalk.red("List clients error: "), clients);
      } else {
        doTheThingForTheseClients(fcp, clients);
      }
    });
  }

  function doTheThingForTheseClients(fcp, clients) {
    //generating an array of functions that return promises
    const promiseFunctions = clients.map(function(client, i) {
      return function() {
        // bar.update(i / clients.length);

        return new Promise(function(resolve, reject) {
          // object that gets placed into report.json []
          let clientObj = {
            clientId: client.id,
            clientName: client.name,
            sites: [],
          };

          listSitesForClient(fcp, clientObj, resolve, reject);
        });
      };
    });

    //execute these promises for each client serially instead of in parallel
    //we are using serial as a throttling mechanism
    serial(promiseFunctions)
      .then(function(report) {
        //done - write report
        fs.writeFile("report.json", JSON.stringify(report, null, 2), "utf8");
      })
      .catch(function(e) {
        console.log(e);
      });

    /*
     * serial executes Promises sequentially.
     * @param {funcs} An array of funcs that return promises
     */
    function serial(funcs) {
      return funcs.reduce(
        (promise, func) => promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([])
      );
    }
  }

  function listSitesForClient(fcp, clientObj, resolveClient) {
    const clientInfo =
      'Client Name: "' + clientObj.clientName + '" Client ID:  "' + clientObj.clientId + '" ';
    fcp.listSitesForClient(clientObj.clientId, function(success, sites) {
      if (!success) {
        clientObj.error = sites;
        resolveClient(clientObj);
      } else {
        if (sites.length) {
          let sitePromises = sites.map(function(site) {
            return new Promise(function(resolveSite, rejectSite) {
              let siteObj = {
                siteKey: site.name,
                containers: [],
              };

              clientObj.sites.push(siteObj);

              listContainersForSite(fcp, siteObj, resolveSite, rejectSite);
            });
          });

          Promise.all(sitePromises)
            .then(function() {
              resolveClient(clientObj);
            })
            .catch(function(e) {
              console.log("Unable to retrieve client info: " + clientInfo + e);
              resolveClient({});
            });
        } else {
          resolveClient(clientObj);
        }
      }
    });
  }

  function listContainersForSite(fcp, siteObj, resolveSite, rejectSite) {
    fcp.getContainersForSitekey(siteObj.siteKey, function(success, containers) {
      if (!success) {
        rejectSite('List Containers For Site Key "' + siteObj.siteKey + '" Error: ' + containers);
      } else {
        if (containers.length) {
          let containerPromises = containers.map(function(container) {
            return new Promise(function(resolveContainer, rejectContainer) {
              let containerObj = {
                containerName: container.name,
                config_tag: "",
                products: [],
              };

              siteObj.containers.push(containerObj);

              updateContainerConfig(
                fcp,
                containerObj,
                siteObj.siteKey,
                resolveContainer,
                rejectContainer
              );
            });
          });

          Promise.all(containerPromises)
            .then(function() {
              resolveSite();
            })
            .catch(function(err) {
              rejectSite("Container error: " + err);
            });
        } else {
          resolveSite();
        }
      }
    });
  }

  function updateContainerConfig(fcp, containerObj, siteKey, resolveContainer, rejectContainer) {
    fcp.getContainerForSitekey(siteKey, containerObj.containerName, gotContainer);

    function gotContainer(success, container) {
      if (!success) {
        return rejectContainer(
          'getContainerForSitekey Error: for siteKey "' +
            siteKey +
            '" container "' +
            containerObj.containerName +
            '": ' +
            container
        );
      }

      if (container.config_tag) {
        containerObj.config_tag = container.config_tag;

        fcp.getConfigForSiteContainer(
          siteKey,
          containerObj.containerName,
          containerObj.config_tag,
          function setConfig(data) {
            if (!data) return rejectContainer("getConfigForSiteContainer error: " + data);
            let config = {};

            try {
              config = JSON.parse(data);
            } catch (e) {
              return rejectContainer("JSON.parse error: " + data);
            }

            containerObj.config = config;

            // UPDATE CONFIG HERE...
            // example:
            // config.foo = "bar";

            fcp.postDefaultConfigForSiteContainer(
              siteKey,
              containerObj.containerName,
              JSON.stringify(config),
              "NOTES GO HERE... Usually the jira ticket number",
              done
            );

            function done(success, data) {
              return success
                ? resolveContainer()
                : rejectContainer("postDefaultConfigForSiteContainer error: " + data.message);
            }
          }
        );
      }

      return resolveContainer();
    }
  }
}

/**
 * Generate a report of code versions for all clients/sites/containers
 */
function codeVersionReports() {
  FcpClient.promptForFCPCredentials({}, function(rs) {
    //get instance of FcpClient
    const fcp = new FcpClient(rs.username, rs.password, rs.environment);

    //create progress bar
    // const ProgressBar = require('ascii-progress');

    // const bar = new ProgressBar({
    //   schema: '[:bar] :percent :elapseds/:etas'
    // });

    const bar = "";

    let schema = {
      properties: {},
    };

    schema.properties.email = {
      required: true,
      type: "string",
    };

    prompt.start();
    console.log(chalk.magenta("Enter the email adresss you would like this report sent to..."));
    prompt.get(schema, function(err, result) {
      if (!err && emailValidator.validate(result.email)) {
        //get the current default code version then get this party started
        console.log(chalk.magenta("Generating report..."));
        getDefaultCodeVersion(fcp).then(function(codeVer) {
          listClients(fcp, bar, result.email, codeVer);
        });
      } else {
        console.error(chalk.red("Invalid email"));
      }
    });
  });

  function listClients(fcp, bar, email, codeVer) {
    fcp.listClients(function(success, clients) {
      if (!success) {
        console.log(chalk.red("List clients error: "), clients);
      } else {
        //generating an array of functions that return promises
        const promiseFunctions = clients.map(function(client) {
          return function() {
            // bar.update(i/clients.length);

            return new Promise(function(resolve, reject) {
              let clientObj = {
                clientId: client.id,
                clientName: client.name,
                sites: [],
              };

              listSitesForClient(fcp, codeVer, clientObj, resolve, reject);
            });
          };
        });

        //execute these promises for each client serially instead of in parallel
        //we are using this as a throttling mechanism (active directory service can get overwhelmed with too many concurrent auth requests)
        serial(promiseFunctions)
          .then(function(report) {
            sendReport(bar, email, report);
          })
          .catch(function(e) {
            console.log(e);
          });
      }
      /*
       * serial executes Promises sequentially.
       * @param {funcs} An array of funcs that return promises
       */
      function serial(funcs) {
        return funcs.reduce(
          (promise, func) =>
            promise.then(result => func().then(Array.prototype.concat.bind(result))),
          Promise.resolve([])
        );
      }
    });
  }

  function sendReport(bar, email, report) {
    // bar.update(1);
    var transport = mailer.createTransport(
      smtpTransport({
        host: "webmail.foreseeresults.com",
        port: 25,
        ignoreTLS: true,
      })
    );

    var mailOptions = {
      from: "no-reply@foresee.com",
      to: email,
      replyTo: "no-reply@foresee.com",
      text: "See attached report.json",
      subject: "FCP - Clients Version Report",
      attachments: [
        {
          filename: "report.json",
          content: JSON.stringify(report, null, 2),
          contentType: "application/json",
        },
      ],
    };

    transport.sendMail(mailOptions, function(err) {
      if (!err) {
        console.log("Emailed report to: ", email);
      } else {
        console.log("Error sending report: ", err);
      }
      transport.close();
    });
  }

  function listSitesForClient(fcp, codeVer, clientObj, resolveClient, rejectClient) {
    const clientInfo =
      'Client Name: "' + clientObj.clientName + '" Client ID:  "' + clientObj.clientId + '" ';
    fcp.listSitesForClient(clientObj.clientId, function(success, sites) {
      if (!success) {
        rejectClient(clientInfo + "List Sites Error: " + sites);
      } else {
        if (sites.length) {
          let sitePromises = sites.map(function(site) {
            return new Promise(function(resolve, reject) {
              let siteObj = {
                siteKey: site.name,
                containers: [],
              };

              clientObj.sites.push(siteObj);

              listContainersForSite(fcp, codeVer, siteObj, resolve, reject);
            });
          });

          Promise.all(sitePromises)
            .then(function() {
              resolveClient(clientObj);
            })
            .catch(function(e) {
              console.log("Unable to retrieve client info: " + clientInfo + e);
              resolveClient({});
            });
        } else {
          resolveClient(clientObj);
        }
      }
    });
  }

  function listContainersForSite(fcp, codeVer, siteObj, resolveSite, rejectSite) {
    fcp.getContainersForSitekey(siteObj.siteKey, function(success, containers) {
      if (!success) {
        rejectSite('List Containers For Site Key "' + siteObj.siteKey + '" Error: ' + containers);
      } else {
        if (containers.length) {
          let containerPromises = containers.map(function(container) {
            return new Promise(function(resolveContainer, rejectContainer) {
              let containerObj = {
                containerName: container.name,
                codeVersion: codeVer,
                products: [],
              };

              siteObj.containers.push(containerObj);

              let getCodeVersion = new Promise(function(resolve, reject) {
                getCodeVersionForContainer(fcp, containerObj, siteObj.siteKey, resolve, reject);
              });

              let getProducts = new Promise(function(resolve, reject) {
                getProductsForContainer(fcp, containerObj, siteObj.siteKey, resolve, reject);
              });

              Promise.all([getCodeVersion, getProducts])
                .then(function() {
                  resolveContainer();
                })
                .catch(function(e) {
                  rejectContainer(e);
                });
            });
          });

          Promise.all(containerPromises)
            .then(function() {
              resolveSite();
            })
            .catch(function(err) {
              rejectSite("Container error: " + err);
            });
        } else {
          resolveSite();
        }
      }
    });
  }

  function getCodeVersionForContainer(fcp, containerObj, siteKey, resolve, reject) {
    fcp.listActiveConfigForSiteContainer(siteKey, containerObj.containerName, callback);

    function callback(success, data) {
      if (!success) {
        if (data === "Config not found" || data === "Active Config not found") {
          resolve();
        } else {
          reject(
            'getCodeVersion Error: for siteKey "' +
              siteKey +
              '" container "' +
              containerObj.containerName +
              '": ' +
              data
          );
        }
      } else {
        containerObj.codeVersion = data.code_version;
        resolve();
      }
    }
  }

  function getProductsForContainer(fcp, containerObj, siteKey, resolve, reject) {
    fcp.getContainerForSitekey(siteKey, containerObj.containerName, callback);

    function callback(success, data) {
      if (!success) {
        reject(
          'getProducts Error for siteKey "' +
            siteKey +
            '" container "' +
            containerObj.containerName +
            '": ' +
            data
        );
      } else {
        containerObj.products = data.products;
        resolve();
      }
    }
  }
}


//Tasks added by Anthony:

/**
 * Push the DEFAULT config
 */
function pushConfig(clientProperties, pjson, getDefaultGlobalCfg, cb) {
  var container = { containerName: null };
  console.log('Please indicate the container you want to push to: ');
  fsGulpUtil.promptForValuesIfNeeded(container, function (res) {
	if(res) {
	  container = res.containerName;
	  if(container == 'd' || container == 'dev') { container = 'development' }
	  if(container == 's' || container == 'stg') { container = 'staging' }
	  if(container == 'p' || container == 'prd' || container == 'prod') { container = 'production' }
	  FcpClient.promptForFCPCredentials(
        {
          notes: true,
        },
        function(rs) {
          var defCfg = getDefaultGlobalCfg(rs.environment);
          console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
          console.log(defCfg);
          /**
           * Set up an instance of the FCP client
           * @type {FCPClient}
           */
          var fcp = new FcpClient(rs.username, rs.password, rs.environment);
          fcp.makeContainer(
            clientProperties.client.sitekey,
            container,
            clientProperties.client.clientid,
            rs.notes,
            function(success, message) {
              if (!success && message !== "Container name already exists") {
                console.log(
                  chalk.red(
                    `Failed to create container "${container}" for site_key "${clientProperties.client.sitekey}": `,
                    message
                  ),
                  rs.environment
                );
              } else {
                fcp.postDefaultConfigForSiteContainer(
                  clientProperties.client.sitekey,
                  container,
                  JSON.stringify(defCfg),
                  "Posted a new default configuration (" + pjson.version + ")",
                  function(success, result) {
                    if (!success) {
                      console.log(chalk.red("Was not able to connect. Message: "), result);
                    } else {
                      console.log(chalk.magenta("Success: "), result);
                      if (cb) {
                        cb();
                      }
                    }
                  }
                );
              }
            }
          );
        }
      );
	}
  });
}

/**
 * Push Product Config to FCP
 */
function pushProducts(pjson, client, cb) {
  var container = { containerName: null },
  emailOpts = /^[01]$/.test(envVariableOptions.email)
    ? {}
    : {
      sendCodeEmail: null,
  };
  console.log('Please indicate the container you want to push to: ');
  fsGulpUtil.promptForValuesIfNeeded(container, function (res) {
    if(res) {
      container = res.containerName;
      if(container == 'd' || container == 'dev') { container = 'development' };
      if(container == 's' || container == 'stg') { container = 'staging' };
      if(container == 'p' || container == 'prd' || container == 'prod') { container = 'production' };
      BuildAndPushToEnv(pjson, client, container, function(fcpRes) {
        console.log(
          chalk.yellow("Do you want to send a code delivery email to yourself?"),
          chalk.magenta("(1 = yes, 0 = no)")
        );
        fsGulpUtil.promptForValuesIfNeeded(emailOpts, function(res) {
          if (
            (res && res.sendCodeEmail == 1) ||
            (envVariableOptions &&
              envVariableOptions.email &&
              envVariableOptions.email.toString() == "1")
          ) {
            var recipient = creds.username.substr(0, creds.username.indexOf("@")) + "@foresee.com";
            console.log(chalk.yellow("Sending delivery email to ") + " " + recipient.magenta + "...");
            fsGulpUtil.sendClientCodeEmail(
              client.id,
              client.sitekey,
              recipient,
              container,
              fcpRes,
              function(emailSubject) {
                console.log(chalk.yellow("Sent!"), "\nSubject:", emailSubject);
                if (cb) {
                  cb();
                }
              }
            );
          } else {
            if (cb) {
              cb();
            }
          }
        });
      });
    }
  });
}


module.exports = {
  codeVersionReports,
  createClient,
  createSite,
  listClients,
  listPublishers,
  lookupClient,
  promoteProd,
  pushCode,
  pushDefaultConfig,
  pushProd,
  pushProdConfig,
  pushStg,
  pushStgConfig,
  removePublisher,
  updateConfigs,
  pushConfig,
  pushProducts,
};
