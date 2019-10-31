/**
 * _brainStorage subclass. Inherited from _fsStorage superclass
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

import { globalConfig, ext, nextTick } from "../../fs/index";
import { addClass, removeClass } from "../dom/dom";
import { FSEvent } from "../dom/event";
import { generateUUID } from "../misc/guid";
import { isNumeric } from "../misc/numbers";
import { now } from "../misc/time";
import { AjaxTransport } from "../network/ajax";
import { Cookie } from "./cookie";
import { storageTypes, getCookieSettings, _fsStorage } from "./fsstorage";
import { Singletons } from "../top";

/**
 * A subclass of _fsStorage
 * This will use the brain server for syncing
 * It will be used for ALL MC and CL storage as well as Tracker communication for CK and DS modes
 * @param {Browser} browser
 * @param {String} uidOverride
 * @param {String} siteKeyOverride
 * @param {String} brainUrlOverride
 */
class _brainStorage extends _fsStorage {
  constructor(browser, uidOverride, siteKeyOverride, brainUrlOverride) {
    // Initialize using the superclass
    super(browser, uidOverride);

    this.brainUrl = brainUrlOverride || globalConfig.brainUrl;
    this.siteKey = siteKeyOverride || globalConfig.siteKey;

    ext(
      this,
      {
        // How many times did the server fail?
        _serverFails: 0,

        // How much time to wait before saving data
        cThreshold: 600,
      },
      false
    );

    const __stTypes = storageTypes;

    // Only proceed if the browser is ready.
    browser.ready.subscribe(
      () => {
        // Set up AJAX
        this.ajax = new AjaxTransport();

        // Handle the different types of persistence
        if (this.pers == __stTypes.MC) {
          // MICRO-COOKIE ****************************************************************
          this.ckie = new Cookie(getCookieSettings(this));
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
          if (!this.uid || (this.uid && (this.uid.length > 64 || this.uid.indexOf("{") > -1))) {
            this.uid = generateUUID();
            this.ckie.set(this._microStorageKey, this.uid);
          }

          // Safety save in case the cookie disappears.
          if (this.browser.supportsSessionStorage) {
            window.sessionStorage.setItem(this._microStorageKey, this.uid);
          }

          this.ckie.set(this._microStorageKey, this.uid);
        } else if (this.pers == __stTypes.CL) {
          // COOKIELESS *****************************************************************
          this.ckie = new Cookie(getCookieSettings(this));
          this.uid = uidOverride;
        } else if (uidOverride) {
          // Ensure the uid override if we are creating storage in the Tracker window from query parameter
          this.uid = uidOverride;
        }

        /* pragma:DEBUG_START */
        console.warn(`utils: brain storage initializing with ${this.pers} and user id ${this.uid}`);
        /* pragma:DEBUG_END */

        // Get the state
        this._sync(() => {
          if (!this.get("rid")) {
            // This will happen the first time we sync on cookie-based and domstorage mode
            // WE NEED TO SET A USER ID
            this.uid = this.uid || generateUUID();
            this.set("rid", this.uid);
          } else {
            this.uid = this.get("rid");
          }

          // Now set the update interval
          this.setUpdateInterval(this._updateTimeout);
          this._readyState.fire(this);
          this.ready.fire(this);
        });
      },
      true,
      true
    );
  }

  /**
   * Updates the state from persistent store
   * @param {Function} cb
   * @private
   */
  _sync(cb) {
    if (this.isSyncing) {
      /* pragma:DEBUG_START */
      console.error('utils: the server is already "syncing" - not transmitting');
      /* pragma:DEBUG_END */
      return;
    }

    if (this._serverFails > 5) {
      /* pragma:DEBUG_START */
      console.error("utils: the server has failed too many times - not transmitting");
      /* pragma:DEBUG_END */
      return;
    }

    this.isSyncing = true;
    cb = cb || (() => {});
    let newdata;

    /* pragma:DEBUG_START */
    console.log(
      "utils: performing brain sync",
      `${this.brainUrl}/state/${this.siteKey}/${this.uid}`
    );
    /* pragma:DEBUG_END */
    // It's not DOMSTORAGE, so go get it from the server
    this.ajax.send({
      method: "GET",
      url: `${this.brainUrl}/state/${this.siteKey}/${this.uid}`,
      success: result => {
        this.lastSync = now();
        newdata = JSON.parse(result);
        // Get the time offset to deal with faulty system clocks (Saucelabs)
        this.timeOffset = isNumeric(newdata._asof_) ? now() - newdata._asof_ : 0;
        this._fireChangeEvents(newdata.keys);
        this.mergeBrainData(this._data, newdata);
        this.syncWithGeneralStorage();
        this.isSyncing = false;
        // Fire the events
        nextTick(() => {
          this.onSync.fire(this);
          this._readyState.fire(this);
        });
        cb();
      },
      failure: () => {
        this.lastSync = now();
        this.isSyncing = false;
        this._serverFails++;
        this._readyState.fire(this);
      },
    });
  }

  /**
   * Does a straight commit
   * @private
   */
  _commit() {
    clearTimeout(this.lock);
    this.lock = null;
    this.lastSave = this._data.when = now();

    if (this._serverFails > 5) {
      /* pragma:DEBUG_START */
      console.error("utils: the server has failed too many times - not transmitting");
      /* pragma:DEBUG_END */
      return;
    }

    // This isn't a pure DOM storage event, so there will be a server transmit
    this.ajax.send({
      method: "POST",
      url: `${this.brainUrl}/state/${this.siteKey}/${this.uid}`,
      data: this._data,
      contentType: "application/json",
      success: result => {
        this._lastSync = now();
        const newdata = JSON.parse(result);
        // Get the time offset to deal with faulty system clocks (Saucelabs)
        this.timeOffset = isNumeric(newdata._asof_) ? now() - newdata._asof_ : 0;
        this._fireChangeEvents(newdata.keys);
        this.mergeBrainData(this._data, newdata);
        this.syncWithGeneralStorage();
        // Fire the events
        this.onCommit.fire(this._data);
        this._readyState.fire(this);
      },
      failure: () => {
        this._serverFails++;
        this._readyState.fire(this);
      },
    });

    this.isStale = false;
  }

  _delete(key) {
    this._data.keys[key].d = 1;
    this._data.keys[key].t = now();
    this._data.keys[key].x = now() + this._updateInterval;
  }

  /**
   * Kill everything
   * @param success {Function} (Optional)
   * @param failure {Function} (Optional)
   */
  reset(success, failure, keepUID) {
    const settingsBox = document.getElementById("acsOverrideSettings");
    const messageBox = document.getElementById("acsClearStateWaitMessage");
    const inAdminView = !!settingsBox && !!messageBox;

    // Hide the Settings, show the Waiting Message
    if (inAdminView) {
      addClass(settingsBox, "acsNoDisplay");
      removeClass(messageBox, "acsNoDisplay");
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
      this._readyState = new FSEvent();
    }

    const allKeysToDelete = Object.keys(this._data.keys);
    this.erase(
      allKeysToDelete,
      newdata => {
        this._lastSync = now();
        // Get the time offset to deal with faulty system clocks (Saucelabs)
        this.timeOffset = isNumeric(newdata._asof_) ? now() - newdata._asof_ : 0;
        this._fireChangeEvents(newdata.keys);
        this.mergeBrainData(this._data, newdata);
        this.syncWithGeneralStorage();
        // Show the Waiting Message, hide the Settings
        if (inAdminView) {
          removeClass(settingsBox, "acsNoDisplay");
          addClass(messageBox, "acsNoDisplay");
        }
        // Signal commit
        this.onCommit.fire();
        this._readyState.fire(this);
      },
      true
    );
  }

  /**
   * When brainstorage is used to communicate with a Tracker window
   * but not as general storage (ex: storagetype == COOKIE),
   * we want to sync brain -> general.
   */
  syncWithGeneralStorage() {
    const generalStorage = Singletons.StorageInstances.generalStorage;

    if (!generalStorage) {
      // We're only concerned with the case where the Brain is only used as
      // a communication mean with the Tracker.
      return;
    }

    const thb = this._data.keys.tracker_hb;

    if (thb) {
      generalStorage.set("tracker_hb", thb.v, thb.x);
      generalStorage.save(true);
    } else {
      generalStorage.erase("tracker_hb");
    }
  }

  /**
   * Gathers the most recent data from 2 storage data objects.
   * Note: objA is mutated and is returned.
   * @param {Object} dataA
   * @param {Object} dataB
   * @returns {Object} dataA
   */
  mergeBrainData(dataA, dataB) {
    let k;
    let kvA;
    let kvB;
    const keysA = dataA.keys;
    const keysB = dataB.keys;

    for (k in keysB) {
      kvA = keysA[k];
      kvB = keysB[k];

      // Special case CPP:
      // They are the only nested objects we have in storage atm
      if (kvA && k === "cp") {
        const cppB = keysB.cp.v || {};
        const cppA = keysA.cp.v || {};
        for (const cppName in cppB) {
          cppA[cppName] = cppB[cppName];
        }
        keysA.cp.v = cppA;
      }

      // Default case:
      // update key if more recent
      else if (kvA) {
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
  }
}

_brainStorage.prototype.constructor = _fsStorage;

/**
 * Get Storage Instance for "Brain Storage" if one exists, if not create one.
 * This is for Tracker Comms
 * @param {Object} browser
 * @param {String} uidOverride
 * @param {String} siteKeyOverride
 * @param {String} brainUrlOverride
 */
const getBrainStorage = (browser, uidOverride, siteKeyOverride, brainUrlOverride) => {
  const si = Singletons.StorageInstances;
  // Ensure Brain Storage
  if (!si.brainStorage) {
    si.brainStorage = new _brainStorage(browser, uidOverride, siteKeyOverride, brainUrlOverride);
  }
  return si.brainStorage;
};

export { _brainStorage, getBrainStorage };
