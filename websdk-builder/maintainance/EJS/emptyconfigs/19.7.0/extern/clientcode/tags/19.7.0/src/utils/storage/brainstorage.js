/**
 * _brainStorage subclass. Inherited from _fsStorage superclass
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

fs.provide("fs.Utils.Storage.BrainStorage");

fs.require("fs.Top");
fs.require("fs.Utils.Storage.FSStorage");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");

(function () {
  /**
   * A subclass of _fsStorage
   * This will use the brain server for syncing
   * It will be used for ALL MC and CL storage as well as Tracker communication for CK and DS modes
   * @param {Browser} browser
   * @param {String} uidOverride
   * @param {String} siteKeyOverride
   * @param {String} brainUrlOverride
   */
  var _brainStorage = function (browser, uidOverride, siteKeyOverride, brainUrlOverride) {
    this.brainUrl = brainUrlOverride || fs.config.brainUrl;
    this.siteKey = siteKeyOverride || fs.config.siteKey;

    // Initialize using the superclass
    _fsStorage.call(this, browser, uidOverride);

    fs.ext(this, {
      // How many times did the server fail?
      _serverFails: 0,

      // How much time to wait before saving data
      cThreshold: 600
    });

    var __stTypes = utils.storageTypes;

    // Only proceed if the browser is ready.
    browser.ready.subscribe(function () {
      // Set up AJAX
      this.ajax = new utils.AjaxTransport();

      // Handle the different types of persistence
      if (this.pers == __stTypes.MC) {
        // MICRO-COOKIE ****************************************************************
        this.ckie = new utils.Cookie(getCookieSettings(this));
        this.uid = uidOverride;
        // if no override, there should be a uid in the Cookie
        if (!this.uid) {
          this.uid = this.ckie.get(this._microStorageKey);
        }
        // if that failed, the uid may have been saved in localstorage for safety
        // (A client site may wipe out the cookies CC-4254)
        if (!this.uid && browser.supportsSessionStorage) {
          this.uid = window.sessionStorage.getItem(this._microStorageKey);
        }
        // If there is still no uid, or an invalid one, create a new one
        if ((!this.uid) || (this.uid && (this.uid.length > 64 || this.uid.indexOf('{') > -1))) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._microStorageKey, this.uid);
        }

        // Safety save in case the cookie disappears.
        if (this.browser.supportsSessionStorage) { window.sessionStorage.setItem(this._microStorageKey, this.uid); }

        this.ckie.set(this._microStorageKey, this.uid);
      } else if (this.pers == __stTypes.CL) {
        // COOKIELESS *****************************************************************
        this.ckie = new utils.Cookie(getCookieSettings(this));
        this.uid = uidOverride;
      } else if (uidOverride) {
        // Ensure the uid override if we are creating storage in the Tracker window from query parameter
        this.uid = uidOverride;
      }

      /* pragma:DEBUG_START */
      console.warn("utils: brain storage initializing with " + this.pers + " and user id " + this.uid);
      /* pragma:DEBUG_END */

      // Get the state
      this._sync(function () {
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
        this._readyState.fire(this);
        this.ready.fire(this);
      }.bind(this));
    }.bind(this), true, true);
  };

  // Set up prototype chain, restore the constructor
  _brainStorage.prototype = Object.create(_fsStorage.prototype);
  _brainStorage.prototype.constructor = _fsStorage;

  /**
   * Updates the state from persistent store
   * @param {Function} cb
   * @private
   */
  _brainStorage.prototype._sync = function (cb) {
    // We don't need to sync tracker comms in the parent window. Only in the Tracker
    if (!this.isSyncing) {
      this.isSyncing = true;
      cb = cb || function () {
      };
      var dstr,
        newdata;

      if (this._serverFails > 5) {
        /* pragma:DEBUG_START */
        console.error("utils: the server has failed too many times - not transmitting");
        /* pragma:DEBUG_END */
        return;
      }

      /* pragma:DEBUG_START */
      console.log("utils: performing brain sync", this.brainUrl + '/state/' + this.siteKey + '/' + this.uid);
      /* pragma:DEBUG_END */
      // It's not DOMSTORAGE, so go get it from the server
      this.ajax.send({
        method: 'GET',
        url: this.brainUrl + '/state/' + this.siteKey + '/' + this.uid,
        success: function (result) {
          this.lastSync = utils.now();
          newdata = JSON.parse(result);
          // Get the time offset to deal with faulty system clocks (Saucelabs)
          this.timeOffset = utils.isNumeric(newdata._asof_) ? utils.now() - newdata._asof_ : 0;
          this._fireChangeEvents(newdata.keys);
          this.mergeBrainData(this._data, newdata);
          this.syncWithGeneralStorage();
          this.isSyncing = false;
          // Fire the events
          fs.nextTick(function () {
            this.onSync.fire(this);
            this._readyState.fire(this);
          }.bind(this));
          cb();
        }.bind(this),
        failure: function () {
          this.lastSync = utils.now();
          this.isSyncing = false;
          this._serverFails++;
          this._readyState.fire(this);
        }.bind(this)
      });
    }
  };

  /**
   * Does a straight commit
   * @private
   */
  _brainStorage.prototype._commit = function () {
    clearTimeout(this.lock);
    this.lock = null;
    this.lastSave = this._data.when = utils.now();

    if (this._serverFails > 5) {
      /* pragma:DEBUG_START */
      console.error("utils: the server has failed too many times - not transmitting");
      /* pragma:DEBUG_END */
      return;
    }

    // This isn't a pure DOM storage event, so there will be a server transmit
    this.ajax.send({
      method: 'POST',
      url: this.brainUrl + '/state/' + this.siteKey + '/' + this.uid,
      data: this._data,
      contentType: 'application/json',
      success: function (result) {
        this._lastSync = utils.now();
        var newdata = JSON.parse(result);
        // Get the time offset to deal with faulty system clocks (Saucelabs)
        this.timeOffset = utils.isNumeric(newdata._asof_) ? utils.now() - newdata._asof_ : 0;
        this._fireChangeEvents(newdata.keys);
        this.mergeBrainData(this._data, newdata);
        this.syncWithGeneralStorage();
        // Fire the events
        this.onCommit.fire(this._data);
        this._readyState.fire(this);
      }.bind(this),
      failure: function () {
        this._serverFails++;
        this._readyState.fire(this);
      }.bind(this)
    });

    this.isStale = false;
  };

  /**
   * Deletes a storage key from BRAIN
   * @param {String} key
   * @private
   */
  _brainStorage.prototype.erase = function (key, callback, emergency) {
    // update the local _data
    _fsStorage.prototype.erase.call(this, key, callback, emergency);

    this._commit();
  };

  _brainStorage.prototype._delete = function (key) {
    this._data.keys[key].d = 1;
    this._data.keys[key].t = utils.now();
    this._data.keys[key].x = utils.now() + this._updateInterval;
  };

  /**
   * Kill everything
   * @param success {Function} (Optional)
   * @param failure {Function} (Optional)
   */
  _brainStorage.prototype.reset = function (success, failure, keepUID) {
    var settingsBox = document.getElementById('acsOverrideSettings'),
      messageBox = document.getElementById('acsClearStateWaitMessage'),
      inAdminView = !!settingsBox && !!messageBox;

    // Hide the Settings, show the Waiting Message
    if (inAdminView) {
      utils.addClass(settingsBox, 'acsNoDisplay');
      utils.removeClass(messageBox, 'acsNoDisplay');
    }

    // Enable the success callback
    if (success) {
      this.onCommit.subscribe(success, true, false);
    }

    /* pragma:DEBUG_START */
    console.log("utils: clearing storage");
    /* pragma:DEBUG_END */

    if (!keepUID) {
      this.ckie.kill(this._microStorageKey);
      if (this.browser.supportsSessionStorage) {
        window.sessionStorage.removeItem(this._microStorageKey, this.uid);
      }
    }

    if (this._readyState.didFire) {
      this._readyState = new utils.FSEvent();
    }

    var allKeysToDelete = Object.keys(this._data.keys);
    this.erase(allKeysToDelete, function (newdata) {
      this._lastSync = utils.now();
      // Get the time offset to deal with faulty system clocks (Saucelabs)
      this.timeOffset = utils.isNumeric(newdata._asof_) ? utils.now() - newdata._asof_ : 0;
      this._fireChangeEvents(newdata.keys);
      this.mergeBrainData(this._data, newdata);
      this.syncWithGeneralStorage();
      // Show the Waiting Message, hide the Settings
      if (inAdminView) {
        utils.removeClass(settingsBox, 'acsNoDisplay');
        utils.addClass(messageBox, 'acsNoDisplay');
      }
      // Signal commit
      this.onCommit.fire();
      this._readyState.fire(this);
    }.bind(this),
      true
    );

  };

  /**
   * When brainstorage is used to communicate with a Tracker window
   * but not as general storage (ex: storagetype == COOKIE),
   * we want to sync brain -> general.
   */
  _brainStorage.prototype.syncWithGeneralStorage = function () {
    var generalStorage = Singletons.StorageInstances.generalStorage;

    if (!generalStorage) {
      // We're only concerned with the case where the Brain is only used as
      // a communication mean with the Tracker.
      return;
    }

    var thb = this._data.keys.tracker_hb;

    if (thb) {
      generalStorage.set("tracker_hb", thb.v, thb.x);
      generalStorage.save(true);
    } else {
      generalStorage.erase("tracker_hb");
    }
  };

  /**
   * Gathers the most recent data from 2 storage data objects.
   * Note: objA is mutated and is returned.
   * @param {Object} dataA
   * @param {Object} dataB
   * @returns {Object} dataA
   */
  _brainStorage.prototype.mergeBrainData = function (dataA, dataB) {
    var k, kvA, kvB;
    var keysA = dataA.keys;
    var keysB = dataB.keys;

    for (k in keysB) {
      kvA = keysA[k];
      kvB = keysB[k];

      // Special case heartbeat:
      // Let's just trust each other: a key ending with "_hb" is a heartbeat
      if (k.slice(-3) === "_hb") {
        if (kvA) {
          kvA.v = Math.max(kvA.v, kvB.v);
        } else {
          kvA = keysA[k] = kvB;
        }
      }

      // Special case CPP:
      // They are the only nested objects we have in storage atm
      else if (kvA && k === "cp") {
        var cppB = keysB.cp.v || {};
        var cppA = keysA.cp.v || {};
        for (var cppName in cppB) {
          cppA[cppName] = cppB[cppName];
        }
        keysA.cp.v = cppA;
      }

      // Default case:
      // update key
      else if (kvA) {
        // the deletion happened later than local edition
        if (kvB.t > kvA.t) {
          if (kvB.d === 1) {
            // incoming deletion
            delete keysA[k];
          } else {
            // update local state
            keysA[k] = kvB;
          }
        }
      }

      // Default case:
      // new incoming (not deleted) key
      else if (!kvA && kvB.d !== 1) {
        keysA[k] = kvB;
      }

    }


    return dataA;
  };


})();
