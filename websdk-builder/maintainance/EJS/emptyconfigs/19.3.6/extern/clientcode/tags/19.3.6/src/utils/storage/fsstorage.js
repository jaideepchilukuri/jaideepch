/**
 * Used for reading and writing persistent ForeSee state
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Storage.FSStorage");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");
fs.require("fs.Misc.Fingerprint");
fs.require("fs.Utils.Network.CORS");
fs.require("fs.Utils.Network.Frame");

(function (utils) {

  /**
   * Keeps the strings for each storage mode
   * @type {{CK: string, MC: string, CL: string, DS: string}}
   */
  utils.storageTypes = {
    CK: 'COOKIE',
    MC: 'MICROCOOKIE',
    CL: 'COOKIELESS',
    DS: 'DOMSTORAGE'
  };

  /**
   * Categorizes data. General data is persisted using whatever modality is provided. Tracker type may
   * be sent directly to the tracker, if such a mechanism is available.
   * @type {{GENERAL: string, TRACKER: string}}
   */
  utils.persistDataType = {
    GENERAL: 'GENERAL',
    TRACKER: 'TRACKER'
  };

  /**
   * A persistent storage object that's resilient to simple origin changes.
   * @param config {Object} Configuration
   * @param browser {Browser} Browser information
   * @param uidoverride {String} (Optional) Sets a specific UID
   * @constructor
   */
  var _fsStorage = function (browser, uidoverride) {
    var __stTypes = utils.storageTypes,
      pers = this.pers = fs.config.storage.toUpperCase(),
      nwd = new Date(),
      cookieSetts = {
        'path': '/',
        'domain': utils.getRootDomain(),
        'secure': false,
        'encode': true,
        'expires': (new Date(nwd.getFullYear() + 2, nwd.getMonth(), nwd.getDate())).toGMTString()
      };

    fs.ext(this, {
      // For places where we need it, the storage key (DOM STORAGE)
      _storageKey: '_4c_',

      // See if we're working.
      isReady: false,

      // Which services we depend on
      _healthyServices: ["brain"],

      // The last maintenance & save & update
      _lastMaint: utils.now(),
      _lastSave: utils.now(),
      _lastSync: utils.now(),

      // 90 day value expiration
      defaultExpire: (90 * 1000 * 60 * 60 * 24),

      // The event that tells us when we are safe to work with the state
      ready: new utils.FSEvent(),

      // Fires when storage commits happen
      onCommit: new utils.FSEvent(),

      // Fires when a sync happens
      onSync: new utils.FSEvent(),

      // The max expiration
      maxExpire: -1,

      // Holds the data
      _data: {
        when: utils.now(),
        keys: {}
      },

      // Holds the event listeners for all key changes
      _keyEvents: {},

      // Are there uncommitted changes?
      isStale: false,

      // How many milliseconds between commits
      _cThreshold: 2000,

      // How many milliseconds between updates
      _updateTimeout: 60000,

      // Are we in the middle of a sync?
      isSyncing: false,

      // How many times did the server fail?
      _serverFails: 0
    });

    // Keep a reference to browser
    this.browser = browser;

    /* pragma:DEBUG_START */
    if (!browser || fs.isString(browser)) {
      console.error("utils: global storage not initialized properly. Browser instance required.");
    }
    if (!(pers == __stTypes.MC || pers == __stTypes.CL || pers == __stTypes.DS || pers == __stTypes.CK)) {
      console.error('utils: invalid persistence setting. Must be \'' + __stTypes.CK + '\', \'' + __stTypes.MC + '\', \'' + __stTypes.CL + '\', or \'' + __stTypes.DS + '\'.');
    }
    /* pragma:DEBUG_END */

    // Only proceed if the browser is ready.
    browser.ready.subscribe(fs.proxy(function () {
      /**
       * If local storage is not available and DOMSTORAGE is the chosen modality
       * then default to COOKIELESS storage instead.
       */
      if (!browser.supportsLocalStorage && pers == __stTypes.DS) {
        pers = __stTypes.CK;
      } else if (browser.isMobile && pers == __stTypes.CL) {
        // If we're on mobile and using cookieless, default instead to micro-cookie. LocalStorage would also be acceptable.
        pers = __stTypes.MC;
      }

      // Handle the different types of persistence
      if (pers == __stTypes.CK) {
        // COOKIE **********************************************************************
        this.ckie = new utils.Cookie(cookieSetts);
        this.fr = new utils.Frame(browser);
      } else if (pers == __stTypes.MC) {
        // MICRO-COOKIE ****************************************************************
        this.ckie = new utils.Cookie(cookieSetts);
        this.uid = uidoverride || this.ckie.get(this._storageKey + "mc_");
        if (this.uid && (this.uid.length > 64 || this.uid.indexOf('{') > -1)) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._storageKey + "mc_", this.uid);
        }
        if (!this.uid) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._storageKey + "mc_", this.uid);
        }
        this.cors = new utils.CORS(browser);
      } else if (pers == __stTypes.CL) {
        // COOKIE-LESS *****************************************************************
        this.uid = uidoverride || browser.fp;
        this.cors = new utils.CORS(browser);
      } else if (pers == __stTypes.DS) {
        // DOM STORAGE *****************************************************************
        // Set shorter commit threshold
        this._cThreshold = 500;
        // Set a shorter update timeout
        this._updateTimeout = 10000;
      }

      /* pragma:DEBUG_START */
      console.warn("utils: global storage initializing with " + pers + " and user id " + (pers == __stTypes.CK ? 'not important' : this.uid));
      /* pragma:DEBUG_END */

      // Get the state
      this._sync(fs.proxy(function () {
        if (!this.get('rid')) {
          // This will happen the first time we sync on cookie-based and domstorage mode
          // WE NEED TO SET A USER ID
          this.uid = this.uid || utils.generateGUID();
          this.set('rid', this.uid);
        }
        this.uid = this.get('rid');

        // Now set the update interval
        this.setUpdateInterval(this._updateTimeout);

        if (this.pers == utils.storageTypes.CK || this.pers == utils.storageTypes.DS) {
          this._maint(true);
        }

        // Signal ready
        if (this.fr) {
          this.fr.ready.subscribe(fs.proxy(function () {
            this.ready.fire(this);
          }, this), true, true);
        } else {
          this.ready.fire(this);
        }

      }, this));
    }, this), true, true);

    // Save on unload
    utils.Bind(window, 'unload', fs.proxy(function () {
      // Force save
      this.save(true);
    }, this));
  };

  /**
   * Upgrade OLD storage if necessary
   * @param cb
   */
  _fsStorage.prototype.upgradeOldStorage = function (cb) {
    var _ckie = this.ckie,
      oldCookies = ["fsr.r", "fsr.s", "_fsspl_", "fsr.t", "acs.t"],
      hasOldCookie = false;

    for (var i = 0; i < oldCookies.length; i++) {
      if (!!_ckie.get(oldCookies[i])) {
        hasOldCookie = true;
        break;
      }
    }

    if (hasOldCookie) {
      require([fs.makeURI("$fs.storageupgrade.js")], fs.proxy(function (su) {
        su(this, _ckie, cb);
      }, this));
    } else {
      fs.nextTick(cb);
    }

  };

  /**
   * Watch for changes to keys
   * @param keys {Array || String} The keys to watch for
   * @param fn {Function} Callback
   * @param once {Boolean} Only bind once
   * @param stragglers {Boolean} Fire on stragglers
   */
  _fsStorage.prototype.watchForChanges = function (keys, fn, once, stragglers) {
    if (!fs.isArray(keys)) {
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
   * How often it should update in milliseconds
   * @param delayMS {Number} Time between updates
   */
  _fsStorage.prototype.setUpdateInterval = function (delayMS) {
    /* pragma:DEBUG_START */
    console.log("utils: setting regular persistence delay to ", delayMS);
    /* pragma:DEBUG_END */
    this._updateTimeout = delayMS;
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
    this._updateInterval = setInterval(fs.proxy(function () {
      if (utils.now() - this._lastSync > delayMS) {
        this._sync();
      }
    }, this), Math.min(delayMS / 2, 5000));
  };

  /**
   * Updates the state from persistent store
   * @param cb {Function} (Optional) Callback
   * @private
   */
  _fsStorage.prototype._sync = function (cb) {
    if (!this.isSyncing) {
      this.isSyncing = true;
      cb = cb || function () {
        };
      var dstr,
        newdata;

      if (this.pers == utils.storageTypes.CK) {
        dstr = this.ckie.get(this._storageKey);
        if (dstr) {
          dstr = Compress.decompress(dstr);
          this._lastSync = utils.now();
          newdata = JSON.parse(dstr);
          this._fireChangeEvents(newdata.keys);
          newdata.keys = newdata.keys || {};
          this._data = newdata;
          this.onSync.fire(this);
          this.isSyncing = false;
          fs.nextTick(cb);
          return;
        }
        // Brand new! Start fresh
        this.isSyncing = false;
        fs.nextTick(cb);
      } else if (this.pers == utils.storageTypes.DS) {
        dstr = localStorage.getItem(this._storageKey);
        if (dstr) {
          dstr = Compress.decompress(dstr);
          this._lastSync = utils.now();
          newdata = JSON.parse(dstr);
          newdata.keys = newdata.keys || {};
          this._fireChangeEvents(newdata.keys);
          this._data = newdata;
          fs.nextTick(fs.proxy(function () {
            this.onSync.fire(this);
          }, this));
          if ((utils.now() - this._data.when) < 1000 * 60 * 5) {
            this.isSyncing = false;
            fs.nextTick(cb);
            return;
          } else {
            this._lastSync = utils.now();
            this._data = {
              when: utils.now(),
              keys: {}
            };
          }
        }
        // Brand new! Start fresh
        this.isSyncing = false;
        fs.nextTick(cb);
      } else {
        if (this._serverFails > 5) {
          /* pragma:DEBUG_START */
          console.error("utils: the server has failed too many times - not transmitting");
          /* pragma:DEBUG_END */
          return;
        }
        utils.Healthy(this.browser, this._healthyServices, fs.proxy(function () {
          /* pragma:DEBUG_START */
          console.log("utils: performing brain sync");
          /* pragma:DEBUG_END */
          // It's not DOMSTORAGE, so go get it from the server
          this.cors.send({
            method: 'GET',
            url: fs.config.brainUrl + '/state/' + utils.siteKey + '/' + this.uid,
            success: fs.proxy(function (result) {
              this._lastSync = utils.now();
              var newdata = JSON.parse(result);
              this._fireChangeEvents(newdata.keys);
              this._data = newdata;
              this.isSyncing = false;
              fs.nextTick(fs.proxy(function () {
                this.onSync.fire(this);
              }, this));
              cb();
            }, this),
            failure: function () {
              this._lastSync = utils.now();
              this.isSyncing = false;
              this._serverFails++;
            }
          });
        }, this));
      }
    }
  };

  /**
   * Fire any change events as needed
   * @param newData {Object} New data keys
   * @private
   */
  _fsStorage.prototype._fireChangeEvents = function (newData) {
    var ctx = this;
    for (var key in newData) {
      if (!this._data.keys[key] || this._data.keys[key].t < newData[key].t) {
        // It's changed!
        if (!this._keyEvents[key]) {
          this._keyEvents[key] = new utils.FSEvent();
        }
        /* jshint ignore:start */
        fs.nextTick(function (kw) {
          return function () {
            ctx._keyEvents[kw].fire(kw, ctx._data.keys[kw], newData[kw].v);
          };
        }(key));
        /* jshint ignore:end */
      }
    }
  };

  /**
   * Performs a throttled commit. Safe to call publicly. Implements throttling.
   * @param emergency (Boolean) Do it right away? (Optional)
   */
  _fsStorage.prototype.save = function (emergency) {
    if (emergency) {
      this._commit();
    } else {
      var nw = utils.now();
      if (!this._svT && this.isStale) {
        this._svT = setTimeout(fs.proxy(this._commit, this), Math.max(0, this._cThreshold - (nw - this._lastSave)));
      }
    }
  };

  /**
   * Does a straight commit
   * @private
   */
  _fsStorage.prototype._commit = function () {
    clearTimeout(this._svT);
    this._svT = null;
    this._lastSave = utils.now();
    this._data.when = this._lastSave;
    var dtastr = '';

    try {
      dtastr = JSON.stringify(this._data);
    } catch (e) {
      /* pragma:DEBUG_START */
      console.error("utils: error serializing the state: ", e);
      /* pragma:DEBUG_END */
      return;
    }
    // Do the server commit
    if (this.pers == utils.storageTypes.CK) {
      //delete useless 't' values from cookie to lower its size
      var nval = fs.ext({}, this._data);
      for (var key in nval.keys) {
        delete nval.keys[key].t;
      }
      dtastr = JSON.stringify(nval);
      /* pragma:DEBUG_START */
      console.log("utils: committing fsstorage to cookie (key: " + this._storageKey + ")", "compression: ", dtastr.length, "B - now is ", Compress.compress(dtastr).length, "B");
      /* pragma:DEBUG_END */
      // Simple DOM storage
      this.ckie.set(this._storageKey, Compress.compress(dtastr));

      // Fire the event
      this.onCommit.fire(this._data);
    } else if (this.pers == utils.storageTypes.DS) {
      /* pragma:DEBUG_START */
      console.log("utils: committing fsstorage to localstorage (key: " + this._storageKey + ")", "compression: ", dtastr.length, "B - now is ", Compress.compress(dtastr).length, "B");
      /* pragma:DEBUG_END */
      // Simple DOM storage
      localStorage.setItem(this._storageKey, Compress.compress(dtastr));

      // Fire the event
      this.onCommit.fire(this._data);
    } else {
      if (this._serverFails > 5) {
        /* pragma:DEBUG_START */
        console.error("utils: the server has failed too many times - not transmitting");
        /* pragma:DEBUG_END */
        return;
      }
      utils.Healthy(this.browser, this._healthyServices, fs.proxy(function () {
        // This isn't a pure DOM storage event, so there will be a server transmit
        this.cors.send({
          method: 'POST',
          url: fs.config.brainUrl + '/state/' + utils.siteKey + '/' + this.uid,
          data: this._data,
          contentType: 'application/json',
          success: fs.proxy(function (result) {
            this._lastSync = utils.now();
            this._data = JSON.parse(result);
            // Fire the event
            this.onCommit.fire(this._data);
          }, this),
          failure: fs.proxy(function () {
            this._serverFails++;
          }, this)
        });
      }, this));
    }
    this.isStale = false;
  };

  /**
   * Remove any expired keys
   * @private
   */
  _fsStorage.prototype._maint = function (force) {
    var kvp,
      nw = utils.now(),
      i,
      dobj = this._data.keys,
      didExpire = false;
    if ((nw - this._lastMaint) > 5000 || force) {
      for (var key in dobj) {
        kvp = dobj[key];
        if (nw > kvp.x) {
          delete dobj[key];
          didExpire = true;
        }
      }
      this._lastMaint = nw;
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
   * @param datatype {String}
   * @param callback {Function} (Optional) Callback
   */
  _fsStorage.prototype.set = function (key, value, expiration, emergency, datatype, callback) {
    if (!this._data.keys) {
      this._data.keys = {};
    }
    var rf = this._data.keys[key],
      nw = utils.now(),
      ttl = null;
    if (!datatype) {
      datatype = utils.persistDataType.GENERAL;
    }
    if (expiration) {
      if (typeof(expiration) == 'number') {
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

    // Do something different when we are dealing with cookies or DOM storage and this is a tracker window thing
    if ((this.pers == utils.storageTypes.CK || this.pers == utils.storageTypes.DS) && datatype == utils.persistDataType.TRACKER) {
      if (this.fr) {
        this.fr.trackerReady.subscribe(fs.proxy(function () {
          this.fr.broadcast(key, value, expiration);
        }, this), true, true);
      }
    } else {
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
          t: nw
        };
        this._fireChangeEvents(nObj);
        // Found it
        rf.v = value;
        rf.x = expiration || rf.x;
        if (ttl) {
          rf.ttl = ttl;
        }
        rf.t = nw;
      } else {
        var nvObj = {};
        nvObj[key] = {
          v: value,
          x: expiration || (this.defaultExpire + nw),
          t: nw
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
    }
  };

  /**
   * Get a value or values
   * @param key {String / Array} the value or values to retrieve
   */
  _fsStorage.prototype.get = function (key) {
    if (fs.isArray(key)) {
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
      return (this._data.keys[key] || {v: null}).v;
    }
  };

  /**
   * Gets all storage values
   */
  _fsStorage.prototype.all = function () {
    return this._data.keys;
  };

  /**
   * Erase a value
   * @param key {String}
   * @param callback {Function} (Optional) Callback
   * @param emergency {Boolean} (Optional) Save it right away?
   */
  _fsStorage.prototype.erase = function (key, callback, emergency) {
    if (fs.isArray(key)) {
      for (var kwi = 0; kwi < key.length; kwi++) {
        this.erase(key[kwi]);
      }
    } else {
      // Run maintenance
      this._maint();

      // Delete it
      delete this._data.keys[key];

      // Enable the callback
      if (callback) {
        this.onCommit.subscribe(callback, true, false);
      }

      // Do the server commit if necessary
      if (this.pers == utils.storageTypes.CL || this.pers == utils.storageTypes.MC) {
        utils.Healthy(this.browser, this._healthyServices, fs.proxy(function () {
          // This isn't a pure DOM storage event, so there will be a server transmit
          this.cors.send({
            method: 'DELETE',
            url: fs.config.brainUrl + '/state/' + utils.siteKey + '/' + this.uid + '/' + fs.enc(key),
            contentType: 'application/json',
            success: fs.proxy(function (result) {
              this._lastSync = utils.now();
              // Fire the event
              this.onCommit.fire(this._data);
            }, this),
            failure: fs.proxy(function () {
              this._serverFails++;
            }, this)
          });
        }, this));
      } else {
        // Save
        this.save(!!emergency);
      }
    }
  };

  /**
   * Kill everything
   * @param callback {Function} (Optional)
   */
  _fsStorage.prototype.reset = function (callback) {
    this._data.keys = {};

    // Enable the callback
    if (callback) {
      this.onCommit.subscribe(callback, true, false);
    }

    /* pragma:DEBUG_START */
    console.log("utils: clearing storage");
    /* pragma:DEBUG_END */

    if (this.pers == utils.storageTypes.CK) {
      this.ckie.kill(this._storageKey);
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
      // Simple DOM storage
      localStorage.removeItem(this._storageKey);
      // Signal commit
      this.onCommit.fire();
    } else {
      utils.Healthy(this.browser, this._healthyServices, fs.proxy(function () {
        this.cors.send({
          method: 'DELETE',
          url: fs.config.brainUrl + '/state/' + utils.siteKey + '/' + this.uid,
          success: fs.proxy(function () {
            this._lastSync = utils.now() - 10000;

            // Signal commit
            this.onCommit.fire();
          }, this),
          failure: fs.proxy(function () {
            this._serverFails++;
          }, this)
        });
      }, this));
    }
  };

  /**
   * Enforce a max key expiration
   * @param when (Number) How many MS from now to set the max expiration
   */
  _fsStorage.prototype.setMaxKeyExpiration = function (when) {
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
  _fsStorage.prototype.getMaxKeyExpiration = function () {
    var nw = utils.now(),
      dobj = this._data.keys,
      maxremaining = 0;
    for (var key in dobj) {
      maxremaining = Math.max(maxremaining, dobj[key].x - nw);
    }
    return maxremaining;
  };

  /**
   * Holds the singleton reference to FS Storage
   */
  var __fsStorageInstance__;

  /**
   * Get the global storage singleton
   * @param config {Object} Configuration
   * @param browser {Browser} Browser info
   * @param uidoverride {String} (Optional) UID to use for storage
   * @returns {*}
   */
  utils.getGlobalStore = function (browser, uidoverride) {
    if (!__fsStorageInstance__) {
      /* pragma:DEBUG_START */
      console.log("utils: getGlobalStore is creating a brand new instance of fsstorage");
      /* pragma:DEBUG_END */
      __fsStorageInstance__ = new _fsStorage(browser, uidoverride);
    }
    return __fsStorageInstance__;
  };

})(utils);