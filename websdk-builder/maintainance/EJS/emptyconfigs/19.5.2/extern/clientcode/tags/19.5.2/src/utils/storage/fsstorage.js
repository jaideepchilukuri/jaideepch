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
        'domain': this.selectCookieDomain(fs.config.cookieDomain, window.location.toString()),
        'secure': false,
        'encode': true,
        'expires': (new Date(nwd.getFullYear() + 2, nwd.getMonth(), nwd.getDate())).toUTCString()
      };

    /**
  * General Storage data
  * MC/CL will ONLY use this data
  * CK/DS will use this for general data
  */
    this._general = {
      data: {
        when: utils.now(),
        keys: {}
      },
      isStale: false,
      lock: null,
      cThreshold: 2000,
      lastMaint: utils.now(),
      lastSave: utils.now(),
      lastSync: utils.now(),
      isSyncing: false
    };

    /**
     * Tracker Storage data
     * MC/CL will not use this
     * CK/DS will use this for Tracker comms data
     */
    this._tracker = {
      data: {
        when: utils.now(),
        keys: {}
      },
      isStale: false,
      lock: null,
      cThreshold: 300,
      lastMaint: utils.now(),
      lastSave: utils.now(),
      lastSync: utils.now(),
      isSyncing: false
    };

    fs.ext(this, {
      // For places where we need it, the storage key (DOM STORAGE)
      _storageKey: '_4c_',

      // For places where we need it, the micro storage key (DOM STORAGE)
      _microStorageKey: '_4c_mc_',

      // See if we're working.
      isReady: false,

      // Which services we depend on
      _healthyServices: ["brain"],

      // 90 day value expiration
      defaultExpire: (90 * 1000 * 60 * 60 * 24),

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

      // How many times did the server fail?
      _serverFails: 0,

      // CK/DS This is to use secondary data store and brain server comms if we are sending data to Tracker
      brainOnlyComms: this.pers == utils.storageTypes.CK || this.pers == utils.storageTypes.DS

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
    browser.ready.subscribe(function () {
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

      // Set up CORS in case
      this.cors = new utils.CORS(browser);

      // Handle the different types of persistence
      if (pers == __stTypes.CK) {
        // COOKIE **********************************************************************
        this.ckie = new utils.Cookie(cookieSetts);
      } else if (pers == __stTypes.MC) {
        // MICRO-COOKIE ****************************************************************
        this.ckie = new utils.Cookie(cookieSetts);
        this.uid = uidoverride || this.ckie.get(this._microStorageKey);
        if (this.uid && (this.uid.length > 64 || this.uid.indexOf('{') > -1)) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._microStorageKey, this.uid);
        }
        if (!this.uid) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._microStorageKey, this.uid);
        }
      } else if (pers == __stTypes.CL) {
        // COOKIELESS *****************************************************************
        this.ckie = new utils.Cookie();
        this.uid = uidoverride || browser.fp;
      } else if (pers == __stTypes.DS) {
        // DOM STORAGE *****************************************************************
        // Set shorter commit threshold
        this._general.cThreshold = 500;
      }

      /* pragma:DEBUG_START */
      console.warn("utils: global storage initializing with " + pers + " and user id " + (pers == __stTypes.CK ? 'not important' : this.uid));
      /* pragma:DEBUG_END */

      // Get the state
      // This sync is only necessary for GENERAL data
      this._sync(false, function () {
        if (!this.get('rid')) {
          // This will happen the first time we sync on cookie-based and domstorage mode
          // WE NEED TO SET A USER ID
          this.uid = this.uid || utils.generateGUID();
          this.set('rid', this.uid);
        } else {
          this.uid = this.get('rid');
        }

        // Now set the update interval
        this.setUpdateInterval(this._updateTimeout);

        if (this.pers == utils.storageTypes.CK || this.pers == utils.storageTypes.DS) {
          this._maint(false, true);
        }
        this._readyState.fire(this);
        this.ready.fire(this);
      }.bind(this));
    }.bind(this), true, true);

    // Save on unload
    utils.Bind(window, 'unload', function () {
      // Force save
      this.save(true);
    }.bind(this));
  };

  /**
   * Choose which domain to set the cookie to
   * @param cookieDomain {Object} globalConfig.cookieDomain. Ex: [{ path: "*", domain: "duckduckgo.com" }]
   * @param path {String} The url to test to determine which domain to set the cookie on.
   * @return {String} domain found in cookie config or root domain if fail.
   */
  _fsStorage.prototype.selectCookieDomain = function (cookieDomain, path) {
    // Try to get the config needed
    if (!fs.isDefined(cookieDomain) || !Array.isArray(cookieDomain) || cookieDomain.length < 1) {
      return utils.getRootDomain();
    }

    // This will hold the cfg to apply, when found. Ex: { path: "*", domain: "duckduckgo.com" }
    var cfg,
      i,
      c;

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
  _fsStorage.prototype.upgradeOldStorage = function (cb) {
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
      require([fs.makeURI("$fs.storageupgrade.js")], function (su) {
        su(this, _ckie, cb);
      }.bind(this));
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
   * How often it should update in milliseconds
   * @param delayMS {Number} Time between updates
   * @param forTracker {Boolean} Storage that is meant for Tracker window communication
   */
  _fsStorage.prototype.setUpdateInterval = function (delayMS, forTracker) {
    if (delayMS && !isNaN(delayMS)) {
      /* pragma:DEBUG_START */
      console.log("utils: setting regular persistence delay to ", delayMS);
      /* pragma:DEBUG_END */
      this._updateTimeout = delayMS;
      clearInterval(this._updateInterval);
      this._updateInterval = setInterval(fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.log("utils: performing scheduled sync");
        /* pragma:DEBUG_END */
        this._sync(forTracker);
      }, this), delayMS);
    }
  };

  /**
   * Updates the state from persistent store
   * @param {boolean} forTracker this storage call is meant for the Tracker 
   * @param {Function} cb (optional) callback
   */
  _fsStorage.prototype._sync = function (forTracker, cb) {
    var target = this[forTracker && this.brainOnlyComms ? '_tracker' : '_general'];

    // We don't need to sync tracker comms in the parent window. Only in the Tracker
    if (!target.isSyncing) {
      target.isSyncing = true;
      cb = cb || function () {
      };
      var dstr,
        newdata;

      /**
       * Three Cases:
       * 1. CK and GENERAL (non-Tracker) storage
       * 2. DS and GENERAL (non-Tracker) storage
       * 3. MC/CL GENERAL/TRACKER storage OR CK/DS TRACKER storage
       */
      if (!forTracker && this.pers == utils.storageTypes.CK) {
        dstr = this.ckie.get(this._storageKey);
        if (dstr) {
          dstr = Compress.decompress(dstr);
          this._lastSync = utils.now();
          newdata = JSON.parse(dstr);
          this._fireChangeEvents(newdata.keys);
          newdata.keys = newdata.keys || {};
          target.data = newdata;
          this.onSync.fire(this);
          target.isSyncing = false;
          fs.nextTick(cb);
          return;
        }
        // Brand new! Start fresh
        target.isSyncing = false;
        fs.nextTick(cb);
      } else if (!forTracker && this.pers == utils.storageTypes.DS) {
        dstr = localStorage.getItem(this._storageKey);
        if (dstr) {
          dstr = Compress.decompress(dstr);
          target.lastSync = utils.now();
          newdata = JSON.parse(dstr);
          newdata.keys = newdata.keys || {};
          this._fireChangeEvents(newdata.keys);
          target.data = newdata;
          fs.nextTick(function () {
            this.onSync.fire(this);
          }.bind(this));
          if ((utils.now() - this._general.data.when) < 1000 * 60 * 5) {
            target.isSyncing = false;
            fs.nextTick(cb);
            return;
          } else {
            target.lastSync = utils.now();
            target.data = {
              when: utils.now(),
              keys: {}
            };
          }
        }
        // Brand new! Start fresh
        target.isSyncing = false;
        fs.nextTick(cb);
      } else {
        // Case 3: if CL/MC OR CK/DS Tracker Storage
        if (this._serverFails > 5) {
          /* pragma:DEBUG_START */
          console.error("utils: the server has failed too many times - not transmitting");
          /* pragma:DEBUG_END */
          return;
        }
        if (this._readyState.didFire) {
          this._readyState = new utils.FSEvent();
        }
        utils.Healthy(this.browser, this._healthyServices, function () {
          /* pragma:DEBUG_START */
          console.log("utils: performing brain sync", fs.config.brainUrl + '/state/' + fs.config.siteKey + '/' + this.uid);
          /* pragma:DEBUG_END */
          // It's not DOMSTORAGE, so go get it from the server
          this.cors.send({
            method: 'GET',
            url: fs.config.brainUrl + '/state/' + fs.config.siteKey + '/' + this.uid,

            // TODO make sure target is in scope
            success: function (result) {
              target.lastSync = utils.now();
              newdata = JSON.parse(result);
              // Get the time offset to deal with faulty system clocks (Saucelabs)
              this.timeOffset = utils.isNumeric(newdata._asof_) ? utils.now() - newdata._asof_ : 0;
              this._fireChangeEvents(newdata.keys);
              target.data = newdata;
              target.isSyncing = false;
              fs.nextTick(function () {
                this.onSync.fire(this);
                this._readyState.fire(this);
              }.bind(this));
              cb();
            }.bind(this),
            failure: function () {
              target.lastSync = utils.now();
              target.isSyncing = false;
              this._serverFails++;
              this._readyState.fire(this);
            }.bind(this)
          });
        }.bind(this));
      }
    }
  };

  /**
   * Fire any change events as needed
   * @param newData {Object} New data keys
   * @private
   */
  _fsStorage.prototype._fireChangeEvents = function (newData) {
    var ctx = this,
      oldData;
    /* pragma:DEBUG_START */
    console.log("utils: firing change events on", newData);
    /* pragma:DEBUG_END */
    for (var key in newData) {
      oldData = this._general.data.keys[key];
      if (!oldData || oldData.t < newData[key].t || oldData.x !== newData[key].x) {
        // It's changed!
        if (!this._keyEvents[key]) {
          this._keyEvents[key] = new utils.FSEvent();
        }
        /* jshint ignore:start */
        fs.nextTick(function (kw) {
          return function () {
            ctx._keyEvents[kw].fire(kw, ctx._general.data.keys[kw], newData[kw].v);
          };
        }(key));
        /* jshint ignore:end */
      }
    }
  };

  /**
   * Performs a throttled commit. Safe to call publicly. Implements throttling.
   * @param emergency (Boolean) Do it right away? (Optional)
   * @param forTracker {Boolean} Storage that is meant for Tracker window communication
   */
  _fsStorage.prototype.save = function (emergency, forTracker) {
    var target = this[forTracker && this.brainOnlyComms ? '_tracker' : '_general'];

    if (emergency) {
      this._commit(forTracker);
    } else {
      var nw = utils.now();
      if (!target.lock && target.isStale) {
        target.lock = setTimeout(this._commit.bind(this, forTracker), Math.max(0, target.cThreshold - (nw - target.lastSave)));
      }
    }
  };

  /**
   * Does a straight commit
   * @param forTracker {Boolean} Storage that is meant for Tracker window communication
   * @private
   */
  _fsStorage.prototype._commit = function (forTracker) {
    var target = this[forTracker && this.brainOnlyComms ? '_tracker' : '_general'];
    clearTimeout(target.lock);
    target.lock = null;
    target.lastSave = utils.now();
    target.data.when = target.lastSave;
    var dtastr = '';

    try {
      dtastr = JSON.stringify(target.data);
    } catch (e) {
      /* pragma:DEBUG_START */
      console.error("utils: error serializing the state: ", e);
      /* pragma:DEBUG_END */
      return;
    }
    /**
     * Three cases for commit
     * 1. CK and GENERAL storage
     * 2. DS and GENERAL storage
     * 3. MC/CL GENERAL/TRACKER storage OR CK/DS TRACKER storage
     */
    if (!forTracker && this.pers == utils.storageTypes.CK) {
      //delete useless 't' values from cookie to lower its size
      var nval = fs.ext({}, target.data);
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
      this.onCommit.fire(target.data);
    } else if (!forTracker && this.pers == utils.storageTypes.DS) {
      /* pragma:DEBUG_START */
      console.log("utils: committing fsstorage to localstorage (key: " + this._storageKey + ")", "compression: ", dtastr.length, "B - now is ", Compress.compress(dtastr).length, "B");
      /* pragma:DEBUG_END */
      // Simple DOM storage
      localStorage.setItem(this._storageKey, Compress.compress(dtastr));

      // Fire the event, if there is a callback
      this.onCommit.fire(target.data);
    }

    if (forTracker || !this.brainOnlyComms) {
      if (this._serverFails > 5) {
        /* pragma:DEBUG_START */
        console.error("utils: the server has failed too many times - not transmitting");
        /* pragma:DEBUG_END */
        return;
      }
      if (this._readyState.didFire) {
        this._readyState = new utils.FSEvent();
      }

      utils.Healthy(this.browser, this._healthyServices, function () {
        // This isn't a pure DOM storage event, so there will be a server transmit
        this.cors.send({
          method: 'POST',
          url: fs.config.brainUrl + '/state/' + fs.config.siteKey + '/' + this.uid,
          data: target.data,
          contentType: 'application/json',
          success: function (result) {
            this._lastSync = utils.now();
            target.data = JSON.parse(result);
            // Fire the event
            this.onCommit.fire(target.data);
            this._readyState.fire(this);
          }.bind(this),
          failure: function () {
            this._serverFails++;
            this._readyState.fire(this);
          }.bind(this)
        });
      }.bind(this));
    }
    this.isStale = false;
  };

  /**
   * Remove any expired keys
   * @param {boolean} forTracker whether this storage is meant for the Tracker
   * @param {boolean} force 
   */
  _fsStorage.prototype._maint = function (forTracker, force) {
    var kvp;
    var nw = utils.now();
    var i;
    var didExpire = false;
    var target = this[forTracker && this.brainOnlyComms ? '_tracker' : '_general'];
    var dobj = target.data.keys;

    if ((nw - target.lastMaint) > 5000 || force) {
      for (var key in dobj) {
        kvp = dobj[key];

        if (nw - this.timeOffset > kvp.x) {
          delete dobj[key];
          didExpire = true;
        }
      }
      target.lastMaint = nw;
    }
    if (didExpire && !forTracker && this.brainOnlyComms) {
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
   * @param datatype {String} TRACKER or GENERAL
   * @param callback {Function} (Optional) Callback
   */
  _fsStorage.prototype.set = function (key, value, expiration, emergency, datatype, callback) {
    this._readyState.subscribe(function () {

      // Storage that is meant for tracker comms
      var forTracker = datatype === utils.persistDataType.TRACKER;
      var target = this[forTracker && this.brainOnlyComms ? '_tracker' : '_general'];

      if (!target.data.keys) {
        target.data.keys = {};
      }

      var rf = target.data.keys[key],
        nw = utils.now(),
        ttl = null;

      // Update the Expirations of keys if necessary
      if (expiration) {
        if (typeof (expiration) == 'number') {
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
          t: nw
        };
        this._fireChangeEvents(nObj);
        // Found it
        if (key == 'cp') {
          rf.v = fs.ext(rf.v, value);
        } else if (key == 'ckcpps') {
          rf.v = fs.ext(rf.v, value);
        } else {
          rf.v = value;
        }
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
        target.data.keys[key] = nvObj[key];
      }

      // Set the staleness
      target.isStale = true;

      // Enable the callback
      if (callback) {
        this.onCommit.subscribe(callback, true, false);
      }

      // Run maintenance
      this._maint(forTracker);

      // Call save
      this.save(!!emergency, forTracker);

    }.bind(this), true, true);
  };

  /**
   * Get a value or values
   * @param key {String / Array} the value or values to retrieve
   */
  _fsStorage.prototype.get = function (key) {
    /* pragma:DEBUG_START */
    if (key == 'cp') {
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
      // TODO this is checking the expiration of keys in GENERAL
      this._maint();
      if (!this._general.data.keys) {
        this._general.data.keys = {};
      }
      return (this._general.data.keys[key] || { v: null }).v;
    }
  };

  /**
   * Gets all storage values
   */
  _fsStorage.prototype.all = function () {
    // TODO maybe add a feture to read TRACKER data too?
    return this._general.data.keys;
  };

  /**
   * Erase a value
   * @param key {String}
   * @param callback {Function} (Optional) Callback
   * @param emergency {Boolean} (Optional) Save it right away?
   */
  _fsStorage.prototype.erase = function (key, callback, emergency) {
    if (Array.isArray(key)) {
      for (var kwi = 0; kwi < key.length; kwi++) {
        this.erase(key[kwi]);
      }
    } else {
      // Run maintenance
      this._maint();

      // Delete it
      delete this._general.data.keys[key];

      // Enable the callback
      if (callback) {
        this.onCommit.subscribe(callback, true, false);
      }

      // Do the server commit if necessary
      if (this.pers == utils.storageTypes.CL || this.pers == utils.storageTypes.MC) {
        if (this._readyState.didFire) {
          this._readyState = new utils.FSEvent();
        }
        utils.Healthy(this.browser, this._healthyServices, function () {
          // This isn't a pure DOM storage event, so there will be a server transmit
          this.cors.send({
            method: 'DELETE',
            url: fs.config.brainUrl + '/state/' + fs.config.siteKey + '/' + this.uid + '/' + fs.enc(key),
            contentType: 'application/json',
            success: function (result) {
              this._lastSync = utils.now();
              // Fire the event
              this.onCommit.fire(this._tracker.data);
              this._readyState.fire(this);
            }.bind(this),
            failure: function () {
              this._serverFails++;
              this._readyState.fire(this);
            }.bind(this)
          });
        }.bind(this));
      } else {
        // Save
        this.save(!!emergency);
      }
    }
  };

  /**
   * Kill everything
   * @param success {Function} (Optional)
   * @param failure {Function} (Optional)
   */
  _fsStorage.prototype.reset = function (success, failure, keepUID) {
    var settingsBox = document.getElementById('acsOverrideSettings'),
      messageBox = document.getElementById('acsClearStateWaitMessage'),
      inAdminView = !!settingsBox && !!messageBox;
    this._general.data.keys = {};

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
    }

    if (this.pers == utils.storageTypes.CK) {
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
      if (this._readyState.didFire) {
        this._readyState = new utils.FSEvent();
      }

      // Hide the Settings, show the Waiting Message
      if (inAdminView) {
        utils.addClass(settingsBox, 'acsNoDisplay');
        utils.removeClass(messageBox, 'acsNoDisplay');
      }

      utils.Healthy(this.browser, this._healthyServices, function () {
        this.cors.send({
          method: 'DELETE',
          url: fs.config.brainUrl + '/state/' + fs.config.siteKey + '/' + this.uid,
          success: function () {
            // Show the Waiting Message, hide the Settings
            if (inAdminView) {
              utils.removeClass(settingsBox, 'acsNoDisplay');
              utils.addClass(messageBox, 'acsNoDisplay');
            }
            this._general.lastSync = utils.now() - 10000;

            // Signal commit
            this.onCommit.fire();
            this._readyState.fire(this);
          }.bind(this),
          failure: function () {
            // Show the Waiting Message, hide the Settings
            if (inAdminView) {
              utils.removeClass(settingsBox, 'acsNoDisplay');
              utils.addClass(messageBox, 'acsNoDisplay');
              if (failure) {
                failure();
              }
            }
            this._serverFails++;
            this._readyState.fire(this);
          }.bind(this)
        });
      }.bind(this));
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
      dobj = this._general.data.keys,
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
      dobj = this._general.data.keys,
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