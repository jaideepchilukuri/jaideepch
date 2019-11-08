/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods, es5/no-for-of, no-await-in-loop */

// todo: replace by archiver (more maintenance and already used in fsgulputils.js)
const fs = require("fs");
const chalk = require("chalk");
const emailValidator = require("email-validator");
const FcpClient = require("fcp-client");
const mailer = require("nodemailer");
const prompt = require("prompt");
const semver = require("semver");
const smtpTransport = require("nodemailer-smtp-transport");
const zipdir = require("zip-dir");

const fsGulpUtil = require("./fsgulputils");
const { getAllConfigs } = require("./SDKConfigs");

const creds = {};

const environments = FcpClient.environmentShort;
const environmentUrls = FcpClient.environments;

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
    const fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.listClients(function(success, data) {
      if (!success) {
        console.log(chalk.red("Was not able to connect. Message: "), data);
      } else {
        console.log(
          chalk.yellow(`Complete client list (${chalk.magenta(data.length.toString())} results):`)
        );
        for (let i = 0; i < data.length; i++) {
          const client = data[i];
          if (i > 0) {
            console.log(chalk.grey("---------------------------------------------"));
          }
          console.log(
            chalk.magenta("   Client: "),
            chalk.grey(`[ID: ${chalk.yellow(client.id.toString())}]`),
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
 * List of sitekeys for configured client
 */
function listSites(clientProperties, cb) {
  console.log(chalk.magenta("Listing sites for client..."));
  FcpClient.promptForFCPCredentials({}, function(rs) {
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    const fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.listSitesForClient(clientProperties.client.clientid, function(success, data) {
      if (!success) {
        console.log(chalk.red("Was not able to connect. Message: "), data);
      } else {
        console.log(
          chalk.yellow(`Complete sitekey list (${chalk.magenta(data.length.toString())} results):`)
        );
        for (let i = 0; i < data.length; i++) {
          const site = data[i];
          if (i > 0) {
            console.log(chalk.grey("---------------------------------------------"));
          }
          console.log(
            chalk.magenta("   Site: "),
            chalk.grey(`[sitekey: ${chalk.yellow(site.name.toString())}]`),
            site.alias,
            site.deleted != 0 ? chalk.red("DELETED") : ""
          );
        }
      }
      cb();
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
          const fcp = new FcpClient(rs.username, rs.password, rs.environment);
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
                const client = data.clients[i];
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
                const site = data.sites[i];
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
        if (cb) return cb();
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
        res.client_id = parseInt(res.client_id, Number.NaN);
        if (isNaN(res.client_id) || res.client_id === 0) {
          throw new Error("Invalid client id!");
        }
        console.log(
          `${chalk.magenta("Making a client with the name: ")}"${
            res.client_name.yellow
          }"${chalk.magenta("..")}`
        );
        FcpClient.promptForFCPCredentials({}, function(rs) {
          /**
           * Set up an instance of the FCP client
           * @type {FCPClient}
           */
          const fcp = new FcpClient(rs.username, rs.password, rs.environment);
          fcp.makeClient(
            res.client_id,
            res.client_name,
            res.metadata,
            `Created client ${res.client_name}`,
            function(success, client) {
              if (!success) {
                console.log(chalk.red("Was not able to connect. Message: "), client);
              } else {
                console.log(
                  chalk.magenta("   Client: "),
                  chalk.grey(`${chalk.grey("[ID: ") + chalk.yellow(client.id.toString())}]`),
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
          return cb();
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
      const fcp = new FcpClient(rs.username, rs.password, rs.environment);
      fcp.getClient(rs.clientId, function(success, client) {
        if (!success) {
          console.log(chalk.red("Was not able to connect. Message: "), client);
        } else {
          console.log(
            chalk.magenta("   Client: "),
            chalk.grey(`[ID: ${chalk.yellow(client.id.toString())}]`),
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
                    throw Error(chalk.red("Could not look up site."));
                  } else if (exists) {
                    console.log(
                      chalk.red("Unfortunately, that sitekey (") +
                        chalk.yellow(res.sitekey) +
                        chalk.red(") already exists and is assigned to client ") +
                        chalk.red(clientinfo.client_id.toString()) +
                        chalk.red("...")
                    );
                    throw Error(`Cannot overwrite an existing sitekey.`);
                  } else {
                    console.log(
                      `${chalk.magenta("Making a site key with the name: ")}"${chalk.yellow(
                        res.sitekey
                      )}${'"..'.magenta}`
                    );
                    fcp.makeSite(
                      res.sitekey,
                      rs.clientId,
                      res.alias,
                      `Created site key ${res.sitekey}`,
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
                            return cb();
                          }
                        }
                      }
                    );
                  }
                });
              } else {
                console.log(chalk.red("You must provide a site key."));
                if (cb) {
                  return cb();
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
        const fcp = new FcpClient(rs.username, rs.password, rs.environment);
        const siteKey = userInput.site_name;

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
              for (let i = 0; i < publishers.length; i++) {
                const publisher = publishers[i];
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

              if (cb) return cb();
            }
          } else {
            console.error("List publishers for site", siteKey.magenta, "Error: ", publishers.red);
            if (cb) return cb();
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
        const fcp = new FcpClient(rs.username, rs.password, rs.environment);
        const siteKey = userInput.site_name;
        const publisherId = userInput.publisher_id;

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
          if (cb) {
            return cb();
          }
        });
      }
    );
  });
}

/**
 * Will optionally ask for credentials if they haven't been supplied.
 */
function optionallyPromptForCredentials(rs, opts, cb) {
  if (rs) {
    return cb(rs);
  }
  FcpClient.promptForFCPCredentials(opts, cb);
}

/**
 * Post code to FCP
 */
function pushCode(dist, version, dev, testEnvs, isProd, rs, cb) {
  if (!semver.valid(version)) {
    console.log(chalk.red("Version ", version, "is not a valid semver version."));
    return;
  }
  console.log(
    chalk.magenta("Packaging code version for FCP: "),
    chalk.yellow(version.toString()),
    chalk.magenta(".")
  );
  const distloc = `${dist}/code/${version}`;
  zipdir(distloc, function(err, buffer) {
    if (err) {
      console.log("Could not zip the code: ", err);
    } else {
      console.log("Zip file size: ", buffer.length, "... Preparing to upload...");
      optionallyPromptForCredentials(
        rs,
        {
          notes: true,
          // whether or not we prompt for 'latest'; true, unless we are using one of the bash scripts
          latest: !testEnvs && !dev,
          disableEnv: !!testEnvs || dev,
        },
        function(rs) {
          function postCodeToEnv(env, cb) {
            const envShort = Object.keys(FcpClient.environments).find(
              key => FcpClient.environments[key] === env
            );

            const fcp = new FcpClient(rs.username, rs.password, env);
            fcp.postCodeVersion(buffer, rs.notes, version, rs.latest, function(success, data) {
              if (!success) {
                console.log(chalk.red("𐄂"), `${envShort}:`, chalk.red(data.toString()));
              } else {
                console.log(chalk.green("✓"), `${envShort}:`, chalk.magenta(data.toString()));
              }

              cb();
            });
          }

          if (testEnvs) {
            const proms = [];
            for (let i = 1, len = 3; i <= len; i++) {
              const es = FcpClient.environmentShort[i];
              (function(es) {
                proms.push(
                  new Promise(function(resolve) {
                    console.log("Pushing Code to: ", es);
                    postCodeToEnv(FcpClient.environments[es], resolve);
                  })
                );
              })(es);
            }
            Promise.all(proms)
              .then(() => cb())
              .catch(cb);
          } else if (dev) {
            postCodeToEnv(FcpClient.environments["dev"], cb);
          } else if (rs.environment == FcpClient.environments.prod && !isProd) {
            // if push_code_debug was called on prod
            console.log(chalk.red("Terminating: will not push debug code to production"));
          } else {
            postCodeToEnv(rs.environment, cb);
          }
        }
      );
    }
  });
}

/**
 * Pull code from FCP and install it in the dist folder
 */
function pullCode(dist, version, rs, cb) {
  const fs = require("fs").promises; // eslint-disable-line global-require
  const distloc = `${dist}/code/${version}`;
  optionallyPromptForCredentials(rs, {}, rs => {
    console.log(chalk.magenta("Downloading code package from FCP:"), chalk.yellow(version));

    const fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.getCodePackage(version, async (err, files) => {
      if (err) {
        return cb(err);
      }

      try {
        for (const file of files) {
          const fn = `${distloc}/${file.name}`;
          if (file.folder) {
            await fs.mkdir(fn);
          } else {
            await fs.writeFile(fn, file.buffer);
          }
        }
        console.log(`  ↳ ${chalk.green("Successfully downloaded")} ${chalk.yellow(version)}`);

        return cb();
      } catch (e) {
        return cb(e);
      }
    });
  });
}

/**
 * Push the default config
 */
function pushDefaultConfig(version, getGlobalConfig, rsIn, cb) {
  optionallyPromptForCredentials(rsIn, {}, function(rs) {
    const defCfg = getGlobalConfig(rs.env);

    // deploy script can change the version, so make sure that the
    // old version doesn't make it to the server
    defCfg.codeVer = version;

    console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
    console.log(defCfg);

    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    const fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.postDefaultConfig(
      JSON.stringify(defCfg),
      `Posted a new default configuration (${version})`,
      function(success, result) {
        if (!success) {
          console.log(chalk.red("Was not able to connect. Message: "), result);
        } else {
          console.log(chalk.magenta("Success: "), result);
          if (cb) {
            return cb();
          }
        }
      }
    );
  });
}

/**
 * Push the DEFAULT config
 */
function pushStgConfig(pjson, clientProperties, getGlobalConfig, cb) {
  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      const defCfg = getGlobalConfig(rs.env);
      console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
      console.log(defCfg);
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      const fcp = new FcpClient(rs.username, rs.password, rs.environment);
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
              `Posted a new default configuration (${pjson.version})`,
              function(success, result) {
                if (!success) {
                  console.log(chalk.red("Was not able to connect. Message: "), result);
                } else {
                  console.log(chalk.magenta("Success: "), result);
                  if (cb) {
                    return cb();
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
function pushProdConfig(pjson, clientProperties, getGlobalConfig, cb) {
  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      const defCfg = getGlobalConfig(rs.env);
      console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
      console.log(defCfg);
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      const fcp = new FcpClient(rs.username, rs.password, rs.environment);
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
              `Posted a new default configuration (${pjson.version})`,
              function(success, result) {
                if (!success) {
                  console.log(chalk.red("Was not able to connect. Message: "), result);
                } else {
                  console.log(chalk.magenta("Success: "), result);
                  if (cb) {
                    return cb();
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
const BuildAndPushToEnv = function(pjson, clientProperties, environment, cb = function noop() {}) {
  const publishFeedbackConfig = process.argv.includes("--publish-feedback-config");

  FcpClient.promptForFCPCredentials(
    {
      notes: true,
    },
    function(rs) {
      const configs = getAllConfigs(rs.env);

      const globalConfig = configs.global;

      // Store the username
      creds.username = rs.username;
      /**
       * Set up an instance of the FCP client
       * @type {FCPClient}
       */
      const fcp = new FcpClient(rs.username, rs.password, rs.environment, rs.notes);
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
                    `Pushing code to ${environment} for client ${clientProperties.client.clientid}:`
                  ),
                  chalk.yellow(client.name),
                  chalk.magenta("on site key"),
                  chalk.yellow(clientProperties.client.sitekey),
                  chalk.magenta("...")
                );

                let nbProductToUpload = 0;

                // Checks to see if everything is created
                const checker = () => {
                  if (nbProductToUpload < 1) {
                    console.log(chalk.magenta(`Finished uploading configs.`));
                    return cb();
                  }
                };

                const pushProduct = (name, config) => {
                  if (!fs.existsSync(`${pjson.build.dist}/${name}`)) {
                    fs.mkdirSync(`${pjson.build.dist}/${name}`);
                  }

                  zipdir(`${pjson.build.dist}/${name}`, function(err, buffer) {
                    if (err) {
                      throw Error(`Could not zip the product folder: ${err}`);
                    }

                    fcp.pushCustomerConfigForProduct(
                      clientProperties.client.clientid,
                      clientProperties.client.sitekey,
                      environment,
                      name,
                      config,
                      buffer,
                      rs.notes,
                      function(success, result) {
                        if (!success) {
                          console.error(chalk.red(`𐄂 Failed to upload product ${name}:`, result));
                        } else {
                          const prodResult = result.find(r => r.product === name);
                          console.log(
                            `${chalk.green("✓")} Successfully uploaded product ${chalk.yellow(
                              name
                            )} with tag ${chalk.yellow(prodResult.tag)}`
                          );
                        }
                        nbProductToUpload--;
                        checker();
                      },
                      false,
                      config
                    );
                  });
                };

                for (const product of configs.products) {
                  if (
                    globalConfig.products[product] ||
                    (product === "fbmods" && globalConfig.products.feedback)
                  ) {
                    // only push feedback config if overridden to do so
                    if (product === "feedback" && !publishFeedbackConfig) {
                      console.log(
                        chalk.grey("  * "),
                        chalk.red("will not push feedback (this should be done in CXSuite)")
                      );
                      continue;
                    }

                    console.log(chalk.grey("  * "), chalk.yellow(product));
                    nbProductToUpload++;

                    pushProduct(product, JSON.stringify(configs[product]));
                  }
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
function pushStg(pjson, clientProperties, cb) {
  BuildAndPushToEnv(pjson, clientProperties, "staging", function() {
    return cb();
  });
}

/**
 * Push Product Config to FCP
 */
function pushProd(pjson, clientProperties, cb) {
  const container = "production";
  BuildAndPushToEnv(pjson, clientProperties, container, function() {
    return cb();
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
      const fcp = new FcpClient(rs.username, rs.password, rs.environment);
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
    const promiseFunctions = clients.map(function(client) {
      return function() {
        // bar.update(i / clients.length);

        return new Promise(function(resolve, reject) {
          // object that gets placed into report.json []
          const clientObj = {
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

    // serial executes Promises sequentially.
    // @param {funcs} An array of funcs that return promises
    function serial(funcs) {
      return funcs.reduce(
        (promise, func) => promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([])
      );
    }
  }

  function listSitesForClient(fcp, clientObj, resolveClient) {
    const clientInfo = `Client Name: "${clientObj.clientName}" Client ID:  "${
      clientObj.clientId
    }" `;
    fcp.listSitesForClient(clientObj.clientId, function(success, sites) {
      if (!success) {
        clientObj.error = sites;
        resolveClient(clientObj);
      } else if (sites.length) {
        const sitePromises = sites.map(function(site) {
          return new Promise(function(resolveSite, rejectSite) {
            const siteObj = {
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
            console.log(`Unable to retrieve client info: ${clientInfo}${e}`);
            resolveClient({});
          });
      } else {
        resolveClient(clientObj);
      }
    });
  }

  function listContainersForSite(fcp, siteObj, resolveSite, rejectSite) {
    fcp.getContainersForSitekey(siteObj.siteKey, function(success, containers) {
      if (!success) {
        rejectSite(`List Containers For Site Key "${siteObj.siteKey}" Error: ${containers}`);
      } else if (containers.length) {
        const containerPromises = containers.map(function(container) {
          return new Promise(function(resolveContainer, rejectContainer) {
            const containerObj = {
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
            rejectSite(`Container error: ${err}`);
          });
      } else {
        resolveSite();
      }
    });
  }

  function updateContainerConfig(fcp, containerObj, siteKey, resolveContainer, rejectContainer) {
    fcp.getContainerForSitekey(siteKey, containerObj.containerName, gotContainer);

    function gotContainer(success, container) {
      if (!success) {
        return rejectContainer(
          `getContainerForSitekey Error: for siteKey "${siteKey}" container "${
            containerObj.containerName
          }": ${container}`
        );
      }

      if (container.config_tag) {
        containerObj.config_tag = container.config_tag;

        fcp.getConfigForSiteContainer(
          siteKey,
          containerObj.containerName,
          containerObj.config_tag,
          function setConfig(data) {
            if (!data) return rejectContainer(`getConfigForSiteContainer error: ${data}`);
            let config = {};

            try {
              config = JSON.parse(data);
            } catch (e) {
              return rejectContainer(`JSON.parse error: ${data}`);
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
                : rejectContainer(`postDefaultConfigForSiteContainer error: ${data.message}`);
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

    const schema = {
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
              const clientObj = {
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
      // serial executes Promises sequentially.
      // @param {funcs} An array of funcs that return promises
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
    const transport = mailer.createTransport(
      smtpTransport({
        host: "webmail.foreseeresults.com",
        port: 25,
        ignoreTLS: true,
      })
    );

    const mailOptions = {
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
    const clientInfo = `Client Name: "${clientObj.clientName}" Client ID:  "${
      clientObj.clientId
    }" `;
    fcp.listSitesForClient(clientObj.clientId, function(success, sites) {
      if (!success) {
        rejectClient(`${clientInfo}List Sites Error: ${sites}`);
      } else if (sites.length) {
        const sitePromises = sites.map(function(site) {
          return new Promise(function(resolve, reject) {
            const siteObj = {
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
            console.log(`Unable to retrieve client info: ${clientInfo}${e}`);
            resolveClient({});
          });
      } else {
        resolveClient(clientObj);
      }
    });
  }

  function listContainersForSite(fcp, codeVer, siteObj, resolveSite, rejectSite) {
    fcp.getContainersForSitekey(siteObj.siteKey, function(success, containers) {
      if (!success) {
        rejectSite(`List Containers For Site Key "${siteObj.siteKey}" Error: ${containers}`);
      } else if (containers.length) {
        const containerPromises = containers.map(function(container) {
          return new Promise(function(resolveContainer, rejectContainer) {
            const containerObj = {
              containerName: container.name,
              codeVersion: codeVer,
              products: [],
            };

            siteObj.containers.push(containerObj);

            const getCodeVersion = new Promise(function(resolve, reject) {
              getCodeVersionForContainer(fcp, containerObj, siteObj.siteKey, resolve, reject);
            });

            const getProducts = new Promise(function(resolve, reject) {
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
            rejectSite(`Container error: ${err}`);
          });
      } else {
        resolveSite();
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
            `getCodeVersion Error: for siteKey "${siteKey}" container "${
              containerObj.containerName
            }": ${data}`
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
          `getProducts Error for siteKey "${siteKey}" container "${
            containerObj.containerName
          }": ${data}`
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
function pushConfig(pjson, clientProperties, getGlobalConfig, cb) {
  console.log("Please indicate the container you want to push to: ");
  fsGulpUtil.promptForValuesIfNeeded({ containerName: null }, function(res) {
    if (res) {
      let container = res.containerName;
      if (container == "d" || container == "dev") {
        container = "development";
      }
      if (container == "s" || container == "stg") {
        container = "staging";
      }
      if (container == "p" || container == "prd" || container == "prod") {
        container = "production";
      }
      FcpClient.promptForFCPCredentials(
        {
          notes: true,
        },
        function(rs) {
          const defCfg = getGlobalConfig(rs.env);
          console.log(chalk.magenta("About to push a new default global configuration. Here it is:"));
          console.log(defCfg);
          /**
           * Set up an instance of the FCP client
           * @type {FCPClient}
           */
          const fcp = new FcpClient(rs.username, rs.password, rs.environment);
          fcp.makeContainer(
            clientProperties.client.sitekey,
            container,
            clientProperties.client.clientid,
            rs.notes,
            function(success, message) {
              if (!success && message !== "Container name already exists") {
                console.log(
                  chalk.red(`Failed to create container for site_key "${clientProperties.client.sitekey}": `, message),
                  rs.environment
                );
              } else {
                fcp.postDefaultConfigForSiteContainer(
                  clientProperties.client.sitekey,
                  container,
                  JSON.stringify(defCfg),
                  `Posted a new default configuration (${pjson.version})`,
                  function(success, result) {
                    if (!success) {
                      console.log(chalk.red("Was not able to connect. Message: "), result);
                    } else {
                      console.log(chalk.magenta("Success: "), result);
                      if (cb) {
                        return cb();
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
function pushProducts(pjson, clientProperties, cb) {
  console.log("Please indicate the container you want to push to: ");
  fsGulpUtil.promptForValuesIfNeeded({ containerName: null }, function(res) {
    if (res) {
      let container = res.containerName;
      if (container == "d" || container == "dev") {
        container = "development";
      }
      if (container == "s" || container == "stg") {
        container = "staging";
      }
      if (container == "p" || container == "prd" || container == "prod") {
        container = "production";
      }
      BuildAndPushToEnv(pjson, clientProperties, container, function() {
        return cb();
      });
    }
  });
}

module.exports = {
  codeVersionReports,
  createClient,
  createSite,
  listClients,
  listSites,
  listPublishers,
  lookupClient,
  promoteProd,
  pushCode,
  pullCode,
  pushDefaultConfig,
  pushProd,
  pushProdConfig,
  pushStg,
  pushStgConfig,
  removePublisher,
  updateConfigs,
  optionallyPromptForCredentials,
  environments,
  environmentUrls,
  pushConfig,
  pushProducts,
};
