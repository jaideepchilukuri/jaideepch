import { _W, supportsDomStorage } from "../../fs/util/quickrefs";
import {
  globalConfig,
  productConfig,
  setGlobalConfig,
  setProductConfig,
} from "../../fs/lib/configdefs";
import { eachProp, isArray, ext, getParam } from "../../fs/util/utils";
import { API, addClearStateIntercept } from "../../fs/lib/api";
import { fsCmd } from "../../fs/util/fscmd";
import { _fsNormalizeUrl } from "./locator";
import { _fsRequire } from "./amd";

const QA_CONFIG_OVERRIDE = "fsrQAConfig";

/**
 * Check if we should enter QA mode to configure the SDK
 */
function shouldEnterQAMode() {
  try {
    if (supportsDomStorage && sessionStorage.getItem(QA_CONFIG_OVERRIDE)) {
      /* pragma:DEBUG_START */
      console.warn("gw: running with an overridden config (won't do QA mode)");
      /* pragma:DEBUG_END */

      return false;
    }
  } catch (e) {
    // ignore
  }
  return fsCmd("qa") || getParam("fsr-qa-mode");
}

/**
 * If there has been a config override stored in SessionStorage,
 * then apply that override now.
 */
function applyQAOverrides() {
  let overrideStr;

  if (!supportsDomStorage) return;
  try {
    overrideStr = sessionStorage.getItem(QA_CONFIG_OVERRIDE);
  } catch (e) {
    // ignore
  }
  if (!overrideStr) return;

  const overrides = JSON.parse(overrideStr);

  setGlobalConfig(overrides.global);

  eachProp(productConfig, (prodconfig, name) => {
    if (overrides[name]) {
      setProductConfig(name, prodconfig);
    }
  });
}

/**
 * Make sure on clearState that the QA state is cleared
 */
function clearQAModeConfigs() {
  if (!supportsDomStorage) return;
  try {
    sessionStorage.removeItem(QA_CONFIG_OVERRIDE);
  } catch (e) {
    // ignore
  }
}
addClearStateIntercept(clearQAModeConfigs);

/**
 * Boot the gateway into a QA mode which allows QA to change
 * the configuration before the SDK fully boots.
 */
function enterQAMode(bootSDK) {
  /* pragma:DEBUG_START */
  console.warn("gw: dropping into QA mode!");
  /* pragma:DEBUG_END */

  _fsRequire([_fsNormalizeUrl("$fs.utils.js")], function(utils) {
    defineQAAPI(bootSDK, utils, ext({}, productConfig));
  });
}

/**
 * Define the API that QA can use to change the configuration
 */
function defineQAAPI(bootSDK, utils, configs) {
  configs.global = globalConfig;

  /**
   * Expose a QA interface on the api.
   */
  API.expose("QA", {
    /**
     * Get the config at a specific dot-separated key.
     */
    get,

    /**
     * Set the config at a specific dot-separated key.
     */
    set,

    /**
     * Copy a value from one key to another.
     */
    copy(fromKey, toKey) {
      const value = JSON.parse(JSON.stringify(get(fromKey)));
      return set(toKey, value);
    },

    /**
     * Remove key from its containing object or array.
     */
    remove(key) {
      const node = getNested(configs, key);
      if (isArray(node.obj)) {
        node.obj.splice(node.key, 1);
      } else {
        delete node.obj[key];
      }
    },

    /**
     * Insert at a specific index in an array. Use negative
     * index values to count backwards from the end of the array.
     */
    insert(key, index, value) {
      const arr = get(key);
      if (!isArray(arr)) {
        throw new Error(`Expected ${key} to be an array`);
      }
      if (index < 0) {
        index = arr.length + 1 + index;
      }
      arr.splice(index, 0, value);
    },

    /**
     * Get the value of a feature flag
     */
    getFlag(name) {
      return get(`global.featureFlags.${name}`);
    },

    /**
     * Set the value of a feature flag
     */
    setFlag(name, value) {
      return set(`global.featureFlags.${name}`, value);
    },

    /**
     * Get the value of all feature flags
     */
    getAllFlags() {
      return get("global.featureFlags");
    },

    /**
     * Set a value to all feature flags
     */
    setAllFlags(value) {
      const flags = get("global.featureFlags");
      const flagKeys = Object.keys(flags);
      const len = flagKeys.length;

      for (let index = 0; index < len; index++) {
        set(`global.featureFlags.${flagKeys[index]}`, value);
      }
    },

    /**
     * Finished configuring the SDK, now boot it.
     */
    done() {
      // remove QA methods
      delete _W.FSR.QA;
      delete _W.FSFB.QA;

      // save to session storage
      if (supportsDomStorage) {
        // purposely not wrapping this in a try/catch so that if
        // sessionStorage is broken, hopefully that will break tests
        sessionStorage.setItem(QA_CONFIG_OVERRIDE, JSON.stringify(configs));
      }

      // exit QA mode
      bootSDK();
    },
  });

  /**
   * Recurse to a key and get the value.
   */
  function get(key) {
    const node = getNested(configs, key);
    return node.obj[node.key];
  }

  /**
   * Recurse to a key and set its value.
   */
  function set(key, value) {
    const node = getNested(configs, key);
    node.obj[node.key] = value;
  }
}

/**
 * Helper function to recurse the config heirarchy to a specific key
 */
function getNested(obj, key, unsafe = false) {
  const parts = key.split(".");
  let index = 1;
  let node = obj;
  const len = parts.length;
  let nextkey = parts[0];

  while (index < len) {
    node = node[nextkey];
    if (!node) {
      break;
    }

    nextkey = parts[index++];

    // support indexing into an array
    if (isArray(node) && !isNaN(parseFloat(nextkey)) && isFinite(nextkey)) {
      nextkey = +nextkey;
    }
  }

  if (index !== len || !node) {
    if (unsafe) return;
    throw new Error(`Can't find config: ${parts.slice(0, index).join(".")}`);
  }

  return { obj: node, key: nextkey };
}

export { shouldEnterQAMode, applyQAOverrides, enterQAMode, getNested };
