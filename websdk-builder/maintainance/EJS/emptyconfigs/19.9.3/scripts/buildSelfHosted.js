/* eslint-env node */

const fs = require("fs");
const handydevserver = require("handydevserver");
const mv = require("mv");
const rimraf = require("rimraf");
const zipdir = require("zip-dir");
const { getAllConfigs } = require("./SDKConfigs");

const { optionallyPromptForCredentials } = require("./FCP");

const fsGulpUtil = require("./fsgulputils");

/**
 * Get a self-hosted zip
 */
function buildSelfHosted(pjson, clientProperties, debug, rs) {
  optionallyPromptForCredentials(rs, {}, function(rs) {
    let gatewayFile = fs
      .readFileSync(`${pjson.build.dist}/code/${pjson.version}/gateway.min.js`)
      .toString();
    let sampleHTMLFile = fs.readFileSync("./bin/sampleselfhost_page.html").toString();
    let embedSnippet = fs.readFileSync("./bin/embedsnippet.html").toString();

    const gateway = debug ? "localhost" : pjson.fcp;
    const configLocation = debug
      ? "localhost/config"
      : `${rs.frontEndEnvironment.replace("https://", "").replace("http://", "")}/sites/${
          clientProperties.client.sitekey
        }`;

    gatewayFile = gatewayFile.toString().replace(
      /\/\*\*[^@/]*@preserve[^[/]*\[GENERAL_CONFIG\][^/]*\//gi,
      `globalConfig = ${JSON.stringify({
        selfHosted: true,
        codeVer: pjson.version,
        siteKey: clientProperties.client.sitekey,
        gateway,
        configLocation,
      })}\n`
    );

    embedSnippet = embedSnippet.replace(/\$\{JSURL\}/g, "gateway.min.js");
    embedSnippet = embedSnippet.replace(
      '"data-vendor": "fs",',
      `${'"data-vendor": "fs",\n          "data-mode": "selfhost",\n          "da' +
        'ta-environment": "production",\n          "data-hasssl": "true",\n       ' +
        '   "data-client": "'}${
        clientProperties.client.sitekey
      }",\n          "data-codelocation": "/foresee_assets/code/${
        pjson.version
      }/",\n          "data-isselfhosted": "true",\n          "data-product-asset` +
        `s": "/foresee_assets/product_assets/",`
    );

    sampleHTMLFile = sampleHTMLFile.replace(/\{\$ver\}/g, pjson.version);
    sampleHTMLFile = sampleHTMLFile.replace(/\{\$embed\}/g, embedSnippet);

    fs.writeFileSync("./dist/embedsnippet.html", embedSnippet);
    fs.writeFileSync("./dist/sampleselfhost_page_production.html", sampleHTMLFile);
    fs.writeFileSync(
      "./dist/sampleselfhost_page_staging.html",
      sampleHTMLFile.replace('"production"', '"staging"')
    );
    fs.writeFileSync("./dist/gateway.min.js", gatewayFile);

    // This will do the final zip up
    const finishUpFn = function() {
      fs.mkdirSync("./dist/foresee_assets");
      fs.mkdirSync("./dist/foresee_assets/product_assets");
      let howmany = 0;

      howmany++;
      mv("./dist/code", "./dist/foresee_assets/code", function() {
        howmany--;
      });

      howmany++;
      mv("./dist/trigger", "./dist/foresee_assets/product_assets/trigger", function() {
        howmany--;
      });

      if (fs.existsSync("./dist/feedback")) {
        howmany++;
        mv("./dist/feedback", "./dist/foresee_assets/product_assets/feedback", function() {
          howmany--;
        });
      }

      if (fs.existsSync("./dist/record")) {
        howmany++;
        mv("./dist/record", "./dist/foresee_assets/product_assets/record", function() {
          howmany--;
        });
      }

      if (fs.existsSync("./dist/gateway")) {
        howmany++;
        rimraf("./dist/gateway", function() {
          howmany--;
        });
      }

      if (debug) {
        fs.mkdirSync("./dist/config");
        fs.mkdirSync("./dist/config/staging");
        fs.mkdirSync("./dist/config/production");

        const configs = getAllConfigs(5);
        delete configs.gateway;
        configs.record = JSON.parse(configs.record);
        configs.feedback = JSON.parse(configs.feedback);
        configs.trigger = JSON.parse(configs.trigger);

        const text = JSON.stringify(configs, null, 2);

        fs.writeFileSync("./dist/config/staging/config.json", text);
        fs.writeFileSync("./dist/config/production/config.json", text);
      }

      // Keep checking
      const zipTimeout = setInterval(function() {
        if (howmany == 0) {
          console.log("Zipping ...");
          clearInterval(zipTimeout);
          zipdir("./dist", function(err, buffer) {
            if (err) {
              console.log("ERROR", err);
              throw Error(`Failed to zip dist`);
            } else {
              const outfile = `./dist/${clientProperties.client.sitekey}_selfhost.zip`;
              if (!debug) {
                fs.writeFileSync(outfile, buffer);
                console.log("Wrote file to ", outfile, "...");
              }
              handydevserver(pjson.build.ports[0], ["./dist"], {
                ssl: false,
                ignore: ["DS_Store", "_selfhost_", "embed.txt", ".zip"],
                latency: 250,
              });
              process.nextTick(function() {
                fsGulpUtil.signal(
                  "Server Started",
                  `Build complete. A web server running at http://localhost:${
                    pjson.build.ports[0]
                  }...`
                );
              });
            }
          });
        }
      }, 250);
    };

    if (fs.existsSync("./dist/foresee_assets")) {
      rimraf("./dist/foresee_assets", finishUpFn);
    } else {
      finishUpFn();
    }
  });
}

module.exports = { buildSelfHosted };
