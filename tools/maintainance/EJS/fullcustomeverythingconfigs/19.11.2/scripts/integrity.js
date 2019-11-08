/**
 * Generate integrity hash codes for the config.json endpoint
 */
/* eslint-env node */
const crypto = require("crypto");
const request = require("request");
const FCPClient = require("fcp-client");
const { getGlobalConfig } = require("./SDKConfigs.js");

async function hashContainer(container, cmd) {
  const env = cmd.env;
  const envNumber = FCPClient.environmentShort.indexOf(cmd.env);
  const algo = cmd.algo;

  if (envNumber < 0) {
    throw Error(`Unknown FCP env: ${cmd.env}`);
  }

  let sitekey = cmd.sitekey;
  if (!sitekey) {
    const config = getGlobalConfig(envNumber);
    sitekey = config.siteKey;
  }

  const gateway = FCPClient.frontEndEnvironments[env];
  const url = `${gateway}/sites/${sitekey}/${container}/config.json`;

  console.log("Using config.json from:");
  console.log(url);

  const body = await promiseRequest(url);

  const code = hashBuffer(algo, body);

  console.log(`\nIntegrity code:\n${code}\n`);
}

function hashBuffer(algo, body) {
  const hash = crypto.createHash(algo);
  hash.update(body);
  const code = hash.digest("base64");

  return `${algo}-${code}`;
}

function promiseRequest(url) {
  return new Promise((resolve, reject) => {
    request(url, function(err, response, body) {
      if (err) {
        reject(err);
        return;
      }
      if (response.statusCode !== 200) {
        return reject(new Error(body));
      }

      resolve(body);
    });
  });
}

module.exports = {
  hashContainer,
  hashBuffer,
};
