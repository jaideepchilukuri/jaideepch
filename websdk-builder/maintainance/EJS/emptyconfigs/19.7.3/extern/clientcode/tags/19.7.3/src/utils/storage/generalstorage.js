/**
/**
 * _generalStorage subclass. Inherited from _fsStorage superclass
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

fs.provide("fs.Utils.Storage.GeneralStorage");

fs.require("fs.Top");
fs.require("fs.Utils.Storage.FSStorage");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");

(function () {
  /**
   * A subclass of _fsStorage
   * This will use cookie or localstorage
   * It will only be used for "General Storage" for CK and DS modes
   * @param {Browser} browser
   * @param {String} uidoverride
   * @param {Object} cookieSettings
   */
  var _generalStorage = function (browser, uidoverride) {

    // Initialize using the superclass
    _fsStorage.call(this, browser, uidoverride);

    fs.ext(this, {
      // How much time to wait before saving data
      cThreshold: 2000
    });

    var __stTypes = utils.storageTypes;

    browser.ready.subscribe(function () {
      // Handle the different types of persistence
      if (this.pers == __stTypes.CK) {
        // COOKIE **********************************************************************
        this.ckie = new utils.Cookie(getCookieSettings(this));
      } else if (this.pers == __stTypes.DS) {
        // DOM STORAGE *****************************************************************
        // Set shorter commit threshold
        this.cThreshold = 500;
      } else if (uidoverride) {
        // Ensure the uid override if we are creating storage in the Tracker window from query parameter
        this.uid = uidoverride;
      }

      /* pragma:DEBUG_START */
      console.warn("utils: general storage initializing with " + this.pers + " and user id " + (this.pers == __stTypes.CK ? 'not important' : this.uid));
      /* pragma:DEBUG_END */

      // Get the state
      // This sync is only necessary for GENERAL data
      this._sync(function () {
        if (!this.get('rid')) {
          // This will happen the first time we sync on cookie-based and domstorage mode
          // WE NEED TO SET A USER ID
          this.uid = this.uid || utils.generateUUID();
          this.set('rid', this.uid);
        } else {
          this.uid = this.get('rid');
        }

        // Now set the update interval
        this.setUpdateInterval(this._updateTimeout);
        // Maint is only for CK and DS
        this._maint(true);
        this._readyState.fire(this);
        this.ready.fire(this);
      }.bind(this));
    }.bind(this), true, true);
  };

  // Set up prototype chain, restore the constructor
  _generalStorage.prototype = Object.create(_fsStorage.prototype);
  _generalStorage.prototype.constructor = _fsStorage;

  /**
   * Updates the state from persistent store
   * @param {Function} cb
   * @private
   */
  _generalStorage.prototype._sync = function (cb) {
    // We don't need to sync tracker comms in the parent window. Only in the Tracker
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
          this.lastSync = utils.now();
          newdata = JSON.parse(dstr);
          newdata.keys = newdata.keys || {};
          this._fireChangeEvents(newdata.keys);
          this._data = newdata;
          fs.nextTick(function () {
            this.onSync.fire(this);
          }.bind(this));
          if ((utils.now() - this._data.when) < 1000 * 60 * 5) {
            this.isSyncing = false;
            fs.nextTick(cb);
            return;
          } else {
            this.lastSync = utils.now();
            this._data = {
              when: utils.now(),
              keys: {}
            };
          }
        }
        // Brand new! Start fresh
        this.isSyncing = false;
        fs.nextTick(cb);
      }
    }
  };

  /**
   * Does a straight commit
   * @private
   */
  _generalStorage.prototype._commit = function () {
    clearTimeout(this.lock);
    this.lock = null;
    this.lastSave = utils.now();
    this._data.when = this.lastSave;
    var dtastr = '';

    try {
      dtastr = JSON.stringify(this._data);
    } catch (e) {
      /* pragma:DEBUG_START */
      console.error("utils: error serializing the state: ", e);
      /* pragma:DEBUG_END */
      return;
    }

    if (this.pers == utils.storageTypes.CK) {
      //delete useless 't' values from cookie to lower its size
      var nval = fs.ext({}, this._data);
      for (var key in nval.keys) {
        delete nval.keys[key].t;
      }
      dtastr = JSON.stringify(nval);
      /* pragma:DEBUG_START */
      console.log("utils: commit", nval, " to cookie (key: " + this._storageKey + ")", "compression: ", dtastr.length, "B - now is ", Compress.compress(dtastr).length, "B");
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

      // Fire the event, if there is a callback
      this.onCommit.fire(this._data);
    }
    this.isStale = false;
  };
})();
