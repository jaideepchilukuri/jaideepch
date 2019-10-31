var QA_CONFIG_OVERRIDE = "fsrQAConfig";

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
  } catch (e) {}
  return fsCmd("qa") || getParam("fsr-qa-mode");
}

/**
 * If there has been a config override stored in SessionStorage,
 * then apply that override now.
 */
function applyQAOverrides() {
  var overrideStr;

  if (!supportsDomStorage) return;
  try {
    overrideStr = sessionStorage.getItem(QA_CONFIG_OVERRIDE);
  } catch (e) {}
  if (!overrideStr) return;

  var overrides = JSON.parse(overrideStr);
  globalConfig = overrides.global;

  eachProp(productConfig, function(prodconfig, name) {
    if (overrides[name]) {
      // make sure not to use the original config
      prodconfig.check = true;

      // override the definition of the product config
      _fsDefine(name + "config", function() {
        return overrides[name];
      });
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
  } catch (e) {}
}

/**
 * Boot the gateway into a QA mode which allows QA to change
 * the configuration before the SDK fully boots.
 */
function enterQAMode() {
  /* pragma:DEBUG_START */
  console.warn("gw: dropping into QA mode!");
  /* pragma:DEBUG_END */

  // Because the configs are hidden in require.js modules, we
  // have to jump through a few hoops. While we are at it
  // we might as well pull in utils so we can use its functions.
  // This just requires all the configs and utils and makes
  // them available for later.
  var productNames = materializeConfigs();
  var modules = [_fsNormalizeUrl("$fs.utils.js")];
  for (var i = 0; i < productNames.length; i++) {
    modules.push(productNames[i] + "config");
  }
  _fsRequire(modules, function(utils) {
    var productConfigs = {};
    for (var i = 0; i < productNames.length; i++) {
      // lets grab a reference to the config we required
      productConfigs[productNames[i]] = arguments[i + 1];
    }

    // decode the trigger survey defs so we can modify them
    if (productConfigs.trigger && productConfigs.trigger.surveydefs) {
      for (var p = 0; p < productConfigs.trigger.surveydefs.length; p++) {
        if (isString(productConfigs.trigger.surveydefs[p])) {
          productConfigs.trigger.surveydefs[p] = utils.compile(
            utils.b64DecodeUnicode(productConfigs.trigger.surveydefs[p])
          );
        }
      }
    }

    defineQAAPI(utils, productConfigs);
  });
}

/**
 * Define the API that QA can use to change the configuration
 */
function defineQAAPI(utils, configs) {
  configs.global = globalConfig;

  /**
   * Expose a QA interface on the api.
   */
  API.expose("QA", {
    /**
     * Get the config at a specific dot-separated key.
     */
    get: get,

    /**
     * Set the config at a specific dot-separated key.
     */
    set: set,

    /**
     * Copy a value from one key to another.
     */
    copy: function(fromKey, toKey) {
      var value = JSON.parse(JSON.stringify(get(fromKey)));
      return set(toKey, value);
    },

    /**
     * Remove key from its containing object or array.
     */
    remove: function(key) {
      var node = getNested(key);
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
    insert: function(key, index, value) {
      var arr = get(key);
      if (!isArray(arr)) {
        throw new Error("Expected " + key + " to be an array");
      }
      if (index < 0) {
        index = arr.length + 1 + index;
      }
      arr.splice(index, 0, value);
    },

    /**
     * Finished configuring the SDK, now boot it.
     */
    done: function() {
      // remove QA methods
      delete FSR.QA;
      delete FSFB.QA;

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
   * Helper function to recurse the config heirarchy to a specific key
   */
  function getNested(key) {
    var parts = key.split(".");
    var index = 1;
    var node = configs;
    var len = parts.length;
    var nextkey = parts[0];

    while (index < len) {
      node = node[nextkey];
      if (!node) {
        break;
      }

      nextkey = parts[index++];

      // support indexing into an array
      if (isArray(node) && utils.isNumeric(nextkey)) {
        nextkey = +nextkey;
      }
    }

    if (index !== len || !node) {
      throw new Error("Can't find config: " + parts.slice(0, index).join("."));
    }

    return { obj: node, key: nextkey };
  }

  /**
   * Recurse to a key and get the value.
   */
  function get(key) {
    var node = getNested(key);
    return node.obj[node.key];
  }

  /**
   * Recurse to a key and set its value.
   */
  function set(key, value) {
    var node = getNested(key);
    node.obj[node.key] = value;
  }
}
