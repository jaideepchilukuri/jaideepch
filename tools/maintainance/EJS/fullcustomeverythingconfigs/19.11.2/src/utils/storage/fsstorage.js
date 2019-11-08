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

import {
  globalConfig,
  ext,
  isDefined,
  isString,
  makeURI,
  nextTick,
  supportsDomStorage,
} from "../../fs/index";
import { Bind, FSEvent } from "../dom/event";
import { now } from "../misc/time";
import { testAgainstSearch, getRootDomain } from "../misc/urls";
import { _W } from "../top";

/**
 * Keeps the strings for each storage mode
 * @type {{CK: string, MC: string, CL: string, DS: string}}
 */
const storageTypes = {
  CK: "COOKIE",
  MC: "MICROCOOKIE",
  CL: "COOKIELESS",
  DS: "DOMSTORAGE",
};

/**
 * Helper function to return cookie settings for Storage constructors
 */
const getCookieSettings = ctx => {
  const nwd = new Date();
  return {
    path: "/",
    domain: ctx.selectCookieDomain(globalConfig.cookieDomain, window.location.toString()),
    secure: false,
    encode: true,
    expires: new Date(
      nwd.getFullYear(),
      nwd.getMonth(),
      nwd.getDate() + globalConfig.cookieExpiration
    ).toUTCString(),
  };
};

/**
 * A persistent storage object that's resilient to simple origin changes.
 * A superclass for _brainStorage and _generalStorage
 * @param browser {Browser} Browser information
 * @constructor
 */
class _fsStorage {
  constructor(browser) {
    this.pers = (globalConfig.storage || "").toUpperCase();

    ext(
      this,
      {
        // For places where we need it, the storage key (DOM STORAGE)
        _storageKey: "_4c_",

        // For places where we need it, the micro storage key (DOM STORAGE)
        _microStorageKey: "_4c_mc_",

        // See if we're working.
        isReady: false,

        // 90 day value expiration
        defaultExpire: 90 * 1000 * 60 * 60 * 24,

        // The event that tells us when we are safe to work with the state
        ready: new FSEvent(),

        // Fires when storage commits happen
        onCommit: new FSEvent(),

        // Fires when a sync happens
        onSync: new FSEvent(),

        // This event ensures that writes to data only occur when the system is in a ready state.
        // Should only be used with stragglers: true!
        // @private
        _readyState: new FSEvent(),

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

        lastMaint: now(),
        lastSave: now(),
        lastSync: now(),

        // true if we're in the process of syncing
        isSyncing: false,
      },
      false
    );

    // Keep a reference to browser
    this.browser = browser;

    // Save on unload
    Bind(window, "unload", () => {
      // Force save
      this.save(true);
    });
  }

  /**
   * Choose which domain to set the cookie to
   * @param cookieDomain {Object} globalConfig.cookieDomain. Ex: [{ path: "*", domain: "duckduckgo.com" }]
   * @param path {String} The url to test to determine which domain to set the cookie on.
   * @return {String} domain found in cookie config or root domain if fail.
   */
  selectCookieDomain(cookieDomain, path) {
    // Try to get the config needed
    if (!isDefined(cookieDomain) || !Array.isArray(cookieDomain) || cookieDomain.length < 1) {
      return getRootDomain();
    }

    // This will hold the cfg to apply, when found. Ex: { path: "*", domain: "duckduckgo.com" }
    let cfg;

    // Find a matching config
    for (let i = 0; i < cookieDomain.length; i++) {
      const c = cookieDomain[i];
      if (c && c.path && c.domain && testAgainstSearch(c.path, path)) {
        cfg = c;
        break;
      }
    }

    // There are rules in cookieDomain but none matches this path
    if (!cfg || !isString(cfg.domain)) {
      /* pragma:DEBUG_START */
      console.error("fss: cookieDomain rules are present but none matches", path, cookieDomain);
      /* pragma:DEBUG_END */
      return null;
    }
    return cfg.domain;
  }

  /**
   * Upgrade OLD storage if necessary
   * @param cb
   */
  upgradeOldStorage(cb) {
    const _ckie = this.ckie;
    const oldCookies = ["fsr.r", "fsr.s", "_fsspl_", "fsr.t", "acs.t"];
    let hasOldCookie = false;

    if (this.pers === storageTypes.MC) {
      oldCookies.push("_4c_");
    }

    for (let i = 0; i < oldCookies.length; i++) {
      if (_ckie.get(oldCookies[i])) {
        hasOldCookie = true;
        break;
      }
    }

    if (hasOldCookie) {
      _W._fsRequire([makeURI("$fs.storageupgrade.js")], su => {
        su(this, _ckie, cb);
      });
    } else {
      nextTick(cb);
    }
  }

  /**
   * How often it should update in milliseconds
   * @param delayMS {Number} Time between updates
   */
  setUpdateInterval(delayMS) {
    if (delayMS && !isNaN(delayMS)) {
      /* pragma:DEBUG_START */
      console.log("utils: setting regular persistence delay to ", delayMS);
      /* pragma:DEBUG_END */
      this._updateTimeout = delayMS;
      clearInterval(this._updateInterval);
      this._updateInterval = setInterval(() => {
        this._sync();
      }, delayMS);
    }
  }

  /**
   * Clear the interval
   */
  stopUpdateInterval() {
    clearInterval(this._updateInterval);
    this._updateInterval = null;
  }

  /**
   * Fire any change events as needed
   * @param newData {Object} New data keys
   * @private
   */
  _fireChangeEvents(newData) {
    const ctx = this;
    let oldData;
    /* pragma:DEBUG_START */
    // lower console spam
    const changedKeys = [];
    /* pragma:DEBUG_END */

    for (const key in newData) {
      oldData = this._data.keys[key];
      if (!oldData || oldData.t < newData[key].t || oldData.x !== newData[key].x) {
        /* pragma:DEBUG_START */
        changedKeys.push(key);
        /* pragma:DEBUG_END */
        // It's changed!
        if (!this._keyEvents[key]) {
          this._keyEvents[key] = new FSEvent();
        }
        /* jshint ignore:start */
        nextTick(
          (kw => () => {
            ctx._keyEvents[kw].fire(kw, ctx._data.keys[kw], newData[kw].v);
          })(key)
        );
        /* jshint ignore:end */
      }
    }
  }

  /**
   * Performs a throttled commit. Safe to call publicly. Implements throttling.
   * @param emergency (Boolean) Do it right away? (Optional)
   */
  save(emergency) {
    if (emergency) {
      this._commit();
    } else {
      const nw = now();
      if (!this.lock && this.isStale) {
        this.lock = setTimeout(
          this._commit.bind(this),
          Math.max(0, this.cThreshold - (nw - this.lastSave))
        );
      }
    }
  }

  /**
   * Remove any expired keys
   * @param {boolean} force
   */
  _maint(force) {
    let kvp;
    const nw = now();
    let didExpire = false;
    const dobj = this._data.keys;

    if (nw - this.lastMaint > 5000 || force) {
      for (const key in dobj) {
        kvp = dobj[key];

        if (nw - this.timeOffset > kvp.x) {
          delete dobj[key];
          didExpire = true;
          this.isStale = true;
        }
      }
      this.lastMaint = nw;
    }

    if (didExpire && (this.pers == storageTypes.CK || this.pers == storageTypes.DS)) {
      // Do a save
      this._commit();
    }
  }

  /**
   * Write a value
   * @param key {String}
   * @param value {String} Value to set
   * @param expiration {Number / Date} (Optional) A specific expiration value. When its a number its Now+Number in MS.
   * @param emergency {Boolean} Should this be committed right away?
   * @param callback {Function} (Optional) Callback
   */
  set(key, value, expiration, emergency, callback) {
    this._readyState.subscribe(
      () => {
        if (!this._data.keys) {
          this._data.keys = {};
        }

        const rf = this._data.keys[key];
        const nw = now();
        let ttl = null;

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
              const tr = expiration - nw;
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
          const nObj = {};
          nObj[key] = {
            v: value,
            x: expiration || rf.x,
            t: nw,
          };
          this._fireChangeEvents(nObj);
          // Found it
          if (key == "cp") {
            rf.v = ext(rf.v, value);
          } else if (key == "ckcpps") {
            rf.v = ext(rf.v, value);
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
          const nvObj = {};
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
      },
      true,
      true
    );
  }

  /**
   * Get a value or values
   * @param key {String / Array} the value or values to retrieve
   */
  get(key) {
    /* pragma:DEBUG_START */
    if (key == "cp") {
      // console.warn("utils: fsstorage data: ", JSON.stringify(this._data));
    }
    /* pragma:DEBUG_END */
    if (Array.isArray(key)) {
      const coll = {};
      for (let kwi = 0; kwi < key.length; kwi++) {
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
  }

  /**
   * Gets all storage values
   */
  all() {
    return this._data.keys;
  }

  /**
   * Erase a value
   * @param key {String}
   * @param callback {Function} (Optional) Callback
   * @param emergency {Boolean} (Optional) Save it right away?
   */
  erase(key, callback, emergency) {
    if (Array.isArray(key)) {
      for (let kwi = 0; kwi < key.length; kwi++) {
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
  }

  /**
   * Deletes a storage key.
   * @param {String} key
   * @private
   */
  _delete(key) {
    delete this._data.keys[key];
  }

  /**
   * Kill everything
   * @param success {Function} (Optional)
   * @param failure {Function} (Optional)
   */
  reset(success, failure, keepUID) {
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

    if (this.pers == storageTypes.CK) {
      this._data.keys = {};
      if (localStorage && supportsDomStorage) {
        for (const ls in localStorage) {
          if (/^(_fsr|__fsFr)/.test(ls)) {
            localStorage.removeItem(ls);
          }
        }
      }
      // Signal commit
      this.onCommit.fire();
    } else if (this.pers == storageTypes.DS) {
      this._data.keys = {};
      // Simple DOM storage
      localStorage.removeItem(this._storageKey);
      // Signal commit
      this.onCommit.fire();
    } else {
      // MICROCCOKIE/_brainStorage overrides this method
    }
  }

  /**
   * Enforce a max key expiration
   * @param when (Number) How many MS from now to set the max expiration
   */
  setMaxKeyExpiration(when) {
    this.maxExpire = this.defaultExpire = when;
    const nw = now();
    const dobj = this._data.keys;
    let kvp;
    for (const key in dobj) {
      kvp = dobj[key];
      const remaining = kvp.x - nw;
      if (remaining > when || kvp.ttl > when) {
        kvp.ttl = when;
        if (kvp.x) {
          kvp.x -= remaining - when;
        }
      }
    }
    this.save(true);
  }

  /**
   * Report on the time left
   */
  getMaxKeyExpiration() {
    const nw = now();
    const dobj = this._data.keys;
    let maxremaining = 0;
    for (const key in dobj) {
      maxremaining = Math.max(maxremaining, dobj[key].x - nw);
    }
    return maxremaining;
  }

  /**
   * Watch for changes to keys
   * @param keys {Array || String} The keys to watch for
   * @param fn {Function} Callback
   * @param once {Boolean} Only bind once
   * @param stragglers {Boolean} Fire on stragglers
   */
  watchForChanges(keys, fn, once, stragglers) {
    if (!Array.isArray(keys)) {
      keys = [keys];
    }
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!this._keyEvents[key]) {
        this._keyEvents[key] = new FSEvent();
      }
      this._keyEvents[key].subscribe(fn, once, stragglers);
    }
  }

  /**
   * Release resources, clear timers
   */
  dispose() {
    // todo: release resource?
    clearInterval(this._updateInterval);
  }
}

export { storageTypes, getCookieSettings, _fsStorage };
