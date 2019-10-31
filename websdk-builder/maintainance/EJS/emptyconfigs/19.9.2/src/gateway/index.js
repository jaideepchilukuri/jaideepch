import { _W } from "../fs/util/quickrefs";
import {
  globalConfig,
  productConfig,
  setGlobalConfig,
  setProductConfig,
} from "../fs/lib/configdefs";
import { eachProp, isDefined, isFunction, nextTick, ext, attr } from "../fs/util/utils";
import { _fsRequire } from "./lib/amd";
import { domReady } from "../fs/util/domready";
import { locator, _fsNormalizeUrl } from "./lib/locator";
import { dynamicConfigReplacer } from "./lib/dynconfigs";
import { shouldEnterQAMode, applyQAOverrides, enterQAMode } from "./lib/qamode";
import "./lib/definefs";

/**
 * To get the gateway to load dependencies in parallel on load, add them
 * here. Otherwise it will get the dependencies from the loaded files.
 */
const productDependencies = {
  record: ["$fs.record.js"],
  feedback: ["$fs.feedback.js", "$fs.survey.js"],
  trigger: ["$fs.trigger.js"],
};

function bootSDK() {
  if (typeof _W.opera !== "undefined" && _W.opera.toString() === "[object Opera]") {
    return;
  }

  if (typeof _W["_fsAlreadyBootedSDK"] !== "undefined" || !JSON || document.documentMode < 10) {
    return;
  }

  _W["_fsAlreadyBootedSDK"] = true;

  /* pragma:DEBUG_START */
  console.warn("gw: booting");
  /* pragma:DEBUG_END */

  domReady(onDOMReady);
}

function onDOMReady() {
  /* pragma:DEBUG_START */
  console.warn("gw: domReady");
  /* pragma:DEBUG_END */

  // Everything has to be done on nextTick to avoid race conditions
  nextTick(() => {
    let dm;
    let i;
    let isself;
    let precfg;
    const fsrd = "fsReady";

    if (locator.gwScript) {
      dm = attr(locator.gwScript, "data-module");
      isself = attr(locator.gwScript, "data-isselfhosted") == "true";
      if (!globalConfig.selfHosted) {
        globalConfig.selfHosted = isself;
      }
      precfg = attr(locator.gwScript, "data-config");
      if (precfg) {
        precfg = JSON.parse(atob(precfg));
        ext(globalConfig, precfg.global);
      }
    }

    // This is a temporary measure for legacy embed snippets
    if (isDefined(_W["acsReady"])) {
      _W[fsrd] = _W["acsReady"];
    }
    if (!isDefined(_W["acsReady"])) {
      const altR = function() {
        const aT = `__${fsrd}_stk__`;
        _W[aT] = _W[aT] || [];
        _W[aT].push(arguments);
      };
      _W["acsReady"] = _W[fsrd] || altR;
    }

    let dependencies = [];

    /**
     * This will be called at the end regardless
     */
    const finalSetup = () => {
      applyQAOverrides();

      // Override some configs with values from window variables
      dynamicConfigReplacer(globalConfig);
      dynamicConfigReplacer(productConfig);

      eachProp(productConfig, (v, name) => {
        // skip disabled products
        if (!globalConfig.products[name]) return;

        dependencies = dependencies.concat(productDependencies[name]);
      });
      // all products depend on utils
      dependencies.push("$fs.utils.js");

      eachProp(globalConfig.products, (isOn, name) => {
        if (isOn && !productConfig[name]) {
          // product is missing its config, turn it off
          globalConfig.products[name] = false;
        }
      });

      if (!dm) {
        /* pragma:DEBUG_START */
        console.log("gw: dependencies", dependencies);
        /* pragma:DEBUG_END */

        for (i = 0; i < dependencies.length; i++) {
          dependencies[i] = locator.normalizeUrl(dependencies[i]);
        }
        _fsRequire(dependencies, () => {
          if (!_W[`__${fsrd}__`]) {
            // Legacy acsReady/fsReady functionality
            _W[`__${fsrd}__`] = _W["__acsReady__"] = _W["fsReady"] = _W["acsReady"] = function() {
              const args = arguments;
              nextTick(() => {
                for (let p = 0; p < args.length; p++) {
                  if (isFunction(args[p])) {
                    args[p].call(_W);
                  } else {
                    /* pragma:DEBUG_START */
                    console.error("gw: fsReady() expected a function but got:", args[p]);
                    /* pragma:DEBUG_END */
                  }
                }
              });
            };
            const ns = _W[`__${fsrd}_stk__`];
            const fnmaker = cb => () => {
              for (let p = 0; p < cb.length; p++) {
                cb[p].call(_W);
              }
            };

            if (ns) {
              for (let i = 0; i < ns.length; i++) {
                nextTick(fnmaker(ns[i]));
              }
              delete _W[`__${fsrd}_stk__`];
            }
          }
        });
      } else if (dm) {
        nextTick(() => {
          /* pragma:DEBUG_START */
          console.log(`gw: loading ${dm} as data-module`);
          /* pragma:DEBUG_END */
          _fsRequire([_fsNormalizeUrl(dm)], () => {
            /* pragma:DEBUG_START */
            console.log(`gw: loaded ${dm} successfully`);
            /* pragma:DEBUG_END */
          });
        });
      }
    };

    // Are we in a self-host situation?
    if (globalConfig.selfHosted && !precfg) {
      /* pragma:DEBUG_START */
      console.log("gw: self hosted flow started");
      /* pragma:DEBUG_END */

      _fsRequire([locator.normalizeUrl("$fs.utils.js")], utils => {
        const stg = new utils.SeshStorage("fssetts", false);
        const appSett = stg.get("setts");

        if (!appSett) {
          const transprt = new utils.AjaxTransport();
          transprt.send({
            method: "GET",
            url: `${location.protocol}//${globalConfig.configLocation}/${
              locator.environment
            }/config.json`,
            success(data) {
              if (data) {
                stg.set("setts", data);
                stg.commit();
                finishSelfHost(data);
              }
            },
          });
        } else {
          finishSelfHost(appSett);
        }

        /**
         * finish the self-host setup
         */
        function finishSelfHost(data) {
          const configs = JSON.parse(data);

          configs.global.codeVer = globalConfig.codeVer;
          setGlobalConfig(configs.global);
          delete configs.global;

          eachProp(configs, (obj, prop) => {
            if (globalConfig.products[prop]) {
              setProductConfig(prop, obj);
            }
          });
          finalSetup();
        }
      });
    } else {
      finalSetup();
    }
  });
}

// find the gateway script tag
locator.locateGW();

if (shouldEnterQAMode()) {
  enterQAMode(bootSDK);
} else {
  bootSDK();
}
