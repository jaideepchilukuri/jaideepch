/**
 * Used for reading and writing persistent ForeSee state
 * Superclass to _brainStorage and _generalStorage
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Keeps the strings for each storage mode
 * @type {{CK: string, MC: string, CL: string, DS: string}}
 */
utils.storageTypes = {
  CK: "COOKIE",
  MC: "MICROCOOKIE",
  CL: "COOKIELESS",
  DS: "DOMSTORAGE",
};

/**
 * Helper function to return cookie settings for Storage constructors
 */
var getCookieSettings = function(ctx) {
  var nwd = new Date();
  return {
    path: "/",
    domain: ctx.selectCookieDomain(fs.config.cookieDomain, window.location.toString()),
    secure: false,
    encode: true,
    expires: new Date(nwd.getFullYear() + 2, nwd.getMonth(), nwd.getDate()).toUTCString(),
  };
};

/**
 * A persistent storage object that's resilient to simple origin changes.
 * A superclass for _brainStorage and _generalStorage
 * @param browser {Browser} Browser information
 * @param uidoverride {String} (Optional) Sets a specific UID
 * @constructor
 */
var _fsStorage = function(browser, uidoverride) {
  var __stTypes = utils.storageTypes;
  this.pers = (fs.config.storage || "").toUpperCase();

  fs.ext(this, {
    // For places where we need it, the storage key (DOM STORAGE)
    _storageKey: "_4c_",

    // For places where we need it, the micro storage key (DOM STORAGE)
    _microStorageKey: "_4c_mc_",

    // See if we're working.
    isReady: false,

    // 90 day value expiration
    defaultExpire: 90 * 1000 * 60 * 60 * 24,

    // The event that tells us when we are safe to work with the state
    ready: new utils.FSEvent(),

    // Fires when storage commits happen
    onCommit: new utils.FSEvent(),

    // Fires when a sync happens
    onSync: new utils.FSEvent(),

    // This event ensures that writes to data only occur when the system is in a ready state.
    // Should only be used with stragglers: true!
    // @private
    _readyState: new utils.FSEvent(),

    // The max expiration
    maxExpire: -1,

    timeOffset: 0,

    // Holds the event listeners for all key changes
    _keyEvents: {},

    // How many milliseconds between updates
    _updateTimeout: 60000,

    // The data store
    _data: {
      when: 0,
      keys: {},
    },

    // true if any data has changed since last sync
    isStale: false,

    // The lock for throttled commits
    lock: null,

    lastMaint: utils.now(),
    lastSave: utils.now(),
    lastSync: utils.now(),

    // true if we're in the process of syncing
    isSyncing: false,
  });

  // Keep a reference to browser
  this.browser = browser;

  // Save on unload
  utils.Bind(
    window,
    "unload",
    function() {
      // Force save
      this.save(true);
    }.bind(this)
  );
};

/**
 * Choose which domain to set the cookie to
 * @param cookieDomain {Object} globalConfig.cookieDomain. Ex: [{ path: "*", domain: "duckduckgo.com" }]
 * @param path {String} The url to test to determine which domain to set the cookie on.
 * @return {String} domain found in cookie config or root domain if fail.
 */
_fsStorage.prototype.selectCookieDomain = function(cookieDomain, path) {
  // Try to get the config needed
  if (!fs.isDefined(cookieDomain) || !Array.isArray(cookieDomain) || cookieDomain.length < 1) {
    return utils.getRootDomain();
  }

  // This will hold the cfg to apply, when found. Ex: { path: "*", domain: "duckduckgo.com" }
  var cfg, i, c;

  // Find a matching config
  for (i = 0; i < cookieDomain.length; i++) {
    c = cookieDomain[i];
    if (c && c.path && c.domain && utils.testAgainstSearch(c.path, path)) {
      cfg = c;
      break;
    }
  }

  // There are rules in cookieDomain but none matches this path
  if (!cfg || !fs.isString(cfg.domain)) {
    /* pragma:DEBUG_START */
    console.error("fss: cookieDomain rules are present but none matches", path, cookieDomain);
    /* pragma:DEBUG_END */
    return null;
  }
  return cfg.domain;
};

/**
 * Upgrade OLD storage if necessary
 * @param cb
 */
_fsStorage.prototype.upgradeOldStorage = function(cb) {
  var _ckie = this.ckie,
    oldCookies = ["fsr.r", "fsr.s", "_fsspl_", "fsr.t", "acs.t"],
    hasOldCookie = false;

  if (this.pers === utils.storageTypes.MC) {
    oldCookies.push("_4c_");
  }

  for (var i = 0; i < oldCookies.length; i++) {
    if (!!_ckie.get(oldCookies[i])) {
      hasOldCookie = true;
      break;
    }
  }

  if (hasOldCookie) {
    require([fs.makeURI("$fs.storageupgrade.js")], function(su) {
      su(this, _ckie, cb);
    }.bind(this));
  } else {
    fs.nextTick(cb);
  }
};

/**
 * How often it should update in milliseconds
 * @param delayMS {Number} Time between updates
 */
_fsStorage.prototype.setUpdateInterval = function(delayMS) {
  if (delayMS && !isNaN(delayMS)) {
    /* pragma:DEBUG_START */
    console.log("utils: setting regular persistence delay to ", delayMS);
    /* pragma:DEBUG_END */
    this._updateTimeout = delayMS;
    clearInterval(this._updateInterval);
    this._updateInterval = setInterval(
      function() {
        this._sync();
      }.bind(this),
      delayMS
    );
  }
};

/**
 * Clear the interval
 */
_fsStorage.prototype.stopUpdateInterval = function() {
  clearInterval(this._updateInterval);
  this._updateInterval = null;
};

/**
 * Fire any change events as needed
 * @param newData {Object} New data keys
 * @private
 */
_fsStorage.prototype._fireChangeEvents = function(newData) {
  var ctx = this;
  var oldData;
  /* pragma:DEBUG_START */
  // lower console spam
  var changedKeys = [];
  /* pragma:DEBUG_END */

  for (var key in newData) {
    oldData = this._data.keys[key];
    if (!oldData || oldData.t < newData[key].t || oldData.x !== newData[key].x) {
      /* pragma:DEBUG_START */
      changedKeys.push(key);
      /* pragma:DEBUG_END */
      // It's changed!
      if (!this._keyEvents[key]) {
        this._keyEvents[key] = new utils.FSEvent();
      }
      /* jshint ignore:start */
      fs.nextTick(
        (function(kw) {
          return function() {
            ctx._keyEvents[kw].fire(kw, ctx._data.keys[kw], newData[kw].v);
          };
        })(key)
      );
      /* jshint ignore:end */
    }
  }
};

/**
 * Performs a throttled commit. Safe to call publicly. Implements throttling.
 * @param emergency (Boolean) Do it right away? (Optional)
 */
_fsStorage.prototype.save = function(emergency) {
  if (emergency) {
    this._commit();
  } else {
    var nw = utils.now();
    if (!this.lock && this.isStale) {
      this.lock = setTimeout(
        this._commit.bind(this),
        Math.max(0, this.cThreshold - (nw - this.lastSave))
      );
    }
  }
};

/**
 * Remove any expired keys
 * @param {boolean} force
 */
_fsStorage.prototype._maint = function(force) {
  var kvp;
  var nw = utils.now();
  var i;
  var didExpire = false;
  var dobj = this._data.keys;

  if (nw - this.lastMaint > 5000 || force) {
    for (var key in dobj) {
      kvp = dobj[key];

      if (nw - this.timeOffset > kvp.x) {
        delete dobj[key];
        didExpire = true;
        this.isStale = true;
      }
    }
    this.lastMaint = nw;
  }

  if (didExpire && (this.pers == utils.storageTypes.CK || this.pers == utils.storageTypes.DS)) {
    // Do a save
    this._commit();
  }
};

/**
 * Write a value
 * @param key {String}
 * @param value {String} Value to set
 * @param expiration {Number / Date} (Optional) A specific expiration value. When its a number its Now+Number in MS.
 * @param emergency {Boolean} Should this be committed right away?
 * @param callback {Function} (Optional) Callback
 */
_fsStorage.prototype.set = function(key, value, expiration, emergency, callback) {
  this._readyState.subscribe(
    function() {
      if (!this._data.keys) {
        this._data.keys = {};
      }

      var rf = this._data.keys[key],
        nw = utils.now(),
        ttl = null;

      // Update the Expirations of keys if necessary
      if (expiration) {
        if (typeof expiration == "number") {
          // Relative expiration time
          ttl = expiration;
          if (this.maxExpire > 0 && this.maxExpire < expiration) {
            ttl = expiration = this.maxExpire;
          }
          expiration = nw + expiration;
        } else if (expiration instanceof Date) {
          // Absolute time
          expiration = expiration.getTime() + expiration;
          if (this.maxExpire > 0) {
            var tr = expiration - nw;
            if (tr > this.maxExpire) {
              ttl = expiration = this.maxExpire;
              expiration = nw + expiration;
            }
          }
        }
      }

      /**
       * v = value
       * x = expiration
       * t = when the value was set
       */
      if (rf) {
        var nObj = {};
        nObj[key] = {
          v: value,
          x: expiration || rf.x,
          t: nw,
        };
        this._fireChangeEvents(nObj);
        // Found it
        if (key == "cp") {
          rf.v = fs.ext(rf.v, value);
        } else if (key == "ckcpps") {
          rf.v = fs.ext(rf.v, value);
        } else {
          rf.v = value;
        }
        rf.x = expiration || rf.x;
        if (ttl) {
          rf.ttl = ttl;
        }
        rf.t = nw;
        // mark this key as NOT deleted
        if (rf.d) {
          rf.d = 0;
        }
      } else {
        var nvObj = {};
        nvObj[key] = {
          v: value,
          x: expiration || this.defaultExpire + nw,
          t: nw,
        };
        if (ttl) {
          nvObj[key].ttl = ttl;
        }
        this._fireChangeEvents(nvObj);
        // It's new
        this._data.keys[key] = nvObj[key];
      }

      // Set the staleness
      this.isStale = true;

      // Enable the callback
      if (callback) {
        this.onCommit.subscribe(callback, true, false);
      }

      // Run maintenance
      this._maint();

      // Call save
      this.save(!!emergency);
    }.bind(this),
    true,
    true
  );
};

/**
 * Get a value or values
 * @param key {String / Array} the value or values to retrieve
 */
_fsStorage.prototype.get = function(key) {
  /* pragma:DEBUG_START */
  if (key == "cp") {
    // console.warn("utils: fsstorage data: ", JSON.stringify(this._data));
  }
  /* pragma:DEBUG_END */
  if (Array.isArray(key)) {
    var coll = {};
    for (var kwi = 0; kwi < key.length; kwi++) {
      coll[key[kwi]] = this.get(key[kwi]);
    }
    return coll;
  } else {
    // Run maintenance
    this._maint();
    if (!this._data.keys) {
      this._data.keys = {};
    }
    return (this._data.keys[key] || { v: null }).v;
  }
};

/**
 * Gets all storage values
 */
_fsStorage.prototype.all = function() {
  return this._data.keys;
};

/**
 * Erase a value
 * @param key {String}
 * @param callback {Function} (Optional) Callback
 * @param emergency {Boolean} (Optional) Save it right away?
 */
_fsStorage.prototype.erase = function(key, callback, emergency) {
  if (Array.isArray(key)) {
    for (var kwi = 0; kwi < key.length; kwi++) {
      this.erase(key[kwi]);
    }
    // Enable the callback
    if (callback) {
      this.onCommit.subscribe(callback, true, false);
    }
    return;
  }

  // Run maintenance
  this._maint();

  if (this._data.keys[key]) {
    this._delete(key);
  }

  this.isStale = true;

  // Enable the callback
  if (callback) {
    this.onCommit.subscribe(callback, true, false);
  }

  this.save(!!emergency);
};

/**
 * Deletes a storage key.
 * @param {String} key
 * @private
 */
_fsStorage.prototype._delete = function(key) {
  delete this._data.keys[key];
};

/**
 * Kill everything
 * @param success {Function} (Optional)
 * @param failure {Function} (Optional)
 */
_fsStorage.prototype.reset = function(success, failure, keepUID) {
  var settingsBox = document.getElementById("acsOverrideSettings"),
    messageBox = document.getElementById("acsClearStateWaitMessage"),
    inAdminView = !!settingsBox && !!messageBox;

  // Enable the success callback
  if (success) {
    this.onCommit.subscribe(success, true, false);
  }

  /* pragma:DEBUG_START */
  console.log("utils: clearing storage");
  /* pragma:DEBUG_END */

  if (!keepUID) {
    this.ckie.kill(this._storageKey);
    this.ckie.kill(this._microStorageKey);
    if (this.browser.supportsSessionStorage) {
      window.sessionStorage.removeItem(this._microStorageKey, this.uid);
    }
  }

  if (this.pers == utils.storageTypes.CK) {
    this._data.keys = {};
    if (localStorage && fs.supportsDomStorage) {
      for (var ls in localStorage) {
        if (/^(_fsr|__fsFr)/.test(ls)) {
          localStorage.removeItem(ls);
        }
      }
    }
    // Signal commit
    this.onCommit.fire();
  } else if (this.pers == utils.storageTypes.DS) {
    this._data.keys = {};
    // Simple DOM storage
    localStorage.removeItem(this._storageKey);
    // Signal commit
    this.onCommit.fire();
  } else {
    /*
     * MICROCCOKIE/_brainStorage overrides this method
     */
  }
};

/**
 * Enforce a max key expiration
 * @param when (Number) How many MS from now to set the max expiration
 */
_fsStorage.prototype.setMaxKeyExpiration = function(when) {
  this.maxExpire = this.defaultExpire = when;
  var nw = utils.now(),
    nnw = nw + when,
    dobj = this._data.keys,
    kvp,
    i;
  for (var key in dobj) {
    kvp = dobj[key];
    var remaining = kvp.x - nw;
    if (remaining > when || kvp.ttl > when) {
      kvp.ttl = when;
      if (kvp.x) {
        kvp.x -= remaining - when;
      }
    }
  }
  this.save(true);
};

/**
 * Report on the time left
 */
_fsStorage.prototype.getMaxKeyExpiration = function() {
  var nw = utils.now(),
    dobj = this._data.keys,
    maxremaining = 0;
  for (var key in dobj) {
    maxremaining = Math.max(maxremaining, dobj[key].x - nw);
  }
  return maxremaining;
};

/**
 * Watch for changes to keys
 * @param keys {Array || String} The keys to watch for
 * @param fn {Function} Callback
 * @param once {Boolean} Only bind once
 * @param stragglers {Boolean} Fire on stragglers
 */
_fsStorage.prototype.watchForChanges = function(keys, fn, once, stragglers) {
  if (!Array.isArray(keys)) {
    keys = [keys];
  }
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!this._keyEvents[key]) {
      this._keyEvents[key] = new utils.FSEvent();
    }
    this._keyEvents[key].subscribe(fn, once, stragglers);
  }
};

/**
 * Release resources, clear timers
 */
_fsStorage.prototype.dispose = function() {
  // todo: release resource?
  clearInterval(this._updateInterval);
};

//========

/**
 * Get a Storage Instance for "General Storage" if one exists, if not create one.
 * Cases:
 * 1. CK or DS return generalStorage
 * 2. MC or CL return brainStorage
 * @param {Object} browser
 * @param {String} uidoverride
 */
utils.getGeneralStorage = function(browser, uidoverride) {
  var pers = fs.config.storage.toUpperCase();
  var ckds;
  var si = Singletons.StorageInstances;
  var st = utils.storageTypes;

  /* pragma:DEBUG_START */
  if (!browser || fs.isString(browser)) {
    console.error("utils: global storage not initialized properly. Browser instance required.");
  }
  if (!(pers == st.MC || pers == st.CL || pers == st.DS || pers == st.CK)) {
    console.error(
      "utils: invalid persistence setting. Must be '" +
        st.CK +
        "', '" +
        st.MC +
        "', '" +
        st.CL +
        "', or '" +
        st.DS +
        "'."
    );
  }
  /* pragma:DEBUG_END */

  /**
   * If local storage is not available and DOMSTORAGE is the chosen modality
   * then default to COOKIELESS storage instead.
   */
  if (!browser.supportsLocalStorage && pers == st.DS) {
    pers = st.CK;
  } else if (browser.isMobile && pers == st.CL) {
    // If we're on mobile and using cookieless, default instead to micro-cookie. LocalStorage would also be acceptable.
    pers = st.MC;
  }

  ckds = pers == utils.storageTypes.CK || pers == utils.storageTypes.DS;

  if (ckds) {
    // Ensure General Storage if CK or DS mode
    if (!si.generalStorage) {
      si.generalStorage = new _generalStorage(browser, uidoverride);
    }
    return si.generalStorage;
  } else {
    // Ensure Brain Storage if MC or CL mode
    if (!si.brainStorage) {
      si.brainStorage = new _brainStorage(browser, uidoverride);
    }
    return si.brainStorage;
  }
};
/**
 * Get Storage Instance for "Brain Storage" if one exists, if not create one.
 * This is for Tracker Comms
 * @param {Object} browser
 * @param {String} uidOverride
 * @param {String} siteKeyOverride
 * @param {String} brainUrlOverride
 */
utils.getBrainStorage = function(browser, uidOverride, siteKeyOverride, brainUrlOverride) {
  var si = Singletons.StorageInstances;
  // Ensure Brain Storage
  if (!si.brainStorage) {
    si.brainStorage = new _brainStorage(browser, uidOverride, siteKeyOverride, brainUrlOverride);
  }
  return si.brainStorage;
};
