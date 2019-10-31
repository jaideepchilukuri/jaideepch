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
fs.require("fs.Misc.Fingerprint");
fs.require("fs.Utils.Network.CORS");

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
      cThreshold: 300
    });

    var __stTypes = utils.storageTypes;

    // Only proceed if the browser is ready.
    browser.ready.subscribe(function () {
      // Set up CORS
      this.cors = new utils.CORS(browser);

      // Handle the different types of persistence
      if (this.pers == __stTypes.MC) {
        // MICRO-COOKIE ****************************************************************
        this.ckie = new utils.Cookie(getCookieSettings(this));
        this.uid = uidOverride || this.ckie.get(this._microStorageKey);
        if (this.uid && (this.uid.length > 64 || this.uid.indexOf('{') > -1)) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._microStorageKey, this.uid);
        }
        if (!this.uid) {
          this.uid = utils.generateGUID();
          this.ckie.set(this._microStorageKey, this.uid);
        }
      } else if (this.pers == __stTypes.CL) {
        // COOKIELESS *****************************************************************
        this.ckie = new utils.Cookie(getCookieSettings(this));
        this.uid = uidOverride || browser.fp;
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
      if (this._readyState.didFire) {
        this._readyState = new utils.FSEvent();
      }

      /* pragma:DEBUG_START */
      console.log("utils: performing brain sync", this.brainUrl + '/state/' + this.siteKey + '/' + this.uid);
      /* pragma:DEBUG_END */
      // It's not DOMSTORAGE, so go get it from the server
      this.cors.send({
        method: 'GET',
        url: this.brainUrl + '/state/' + this.siteKey + '/' + this.uid,
        success: function (result) {
          this.lastSync = utils.now();
          newdata = JSON.parse(result);
          // Get the time offset to deal with faulty system clocks (Saucelabs)
          this.timeOffset = utils.isNumeric(newdata._asof_) ? utils.now() - newdata._asof_ : 0;
          this._fireChangeEvents(newdata.keys);
          this._data = newdata;
          this.isSyncing = false;
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
    this.lastSave = utils.now();

    if (this._serverFails > 5) {
      /* pragma:DEBUG_START */
      console.error("utils: the server has failed too many times - not transmitting");
      /* pragma:DEBUG_END */
      return;
    }
    if (this._readyState.didFire) {
      this._readyState = new utils.FSEvent();
    }

    // This isn't a pure DOM storage event, so there will be a server transmit
    this.cors.send({
      method: 'POST',
      url: this.brainUrl + '/state/' + this.siteKey + '/' + this.uid,
      data: this._data,
      contentType: 'application/json',
      success: function (result) {
        this._lastSync = utils.now();
        this._data = JSON.parse(result);
        // Fire the event
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
  _brainStorage.prototype._delete = function (key) {
    if (this._readyState.didFire) {
      this._readyState = new utils.FSEvent();
    }

    // This isn't a pure DOM storage event, so there will be a server transmit
    this.cors.send({
      method: 'DELETE',
      url: this.brainUrl + '/state/' + this.siteKey + '/' + this.uid + '/' + fs.enc(key),
      contentType: 'application/json',
      success: function (result) {
        this._lastSync = utils.now();
        // Fire the event
        this.onCommit.fire(this._data);
        this._readyState.fire(this);
      }.bind(this),
      failure: function () {
        this._serverFails++;
        this._readyState.fire(this);
      }.bind(this)
    });
  };


})();
