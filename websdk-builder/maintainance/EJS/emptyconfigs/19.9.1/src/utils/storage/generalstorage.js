/**
 * _generalStorage subclass. Inherited from _fsStorage superclass
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

import { globalConfig, ext, isString, nextTick } from "../../fs/index";
import { Compress } from "../misc/compression";
import { generateUUID } from "../misc/guid";
import { now } from "../misc/time";
import { _brainStorage } from "./brainstorage";
import { Cookie } from "./cookie";
import { storageTypes, getCookieSettings, _fsStorage } from "./fsstorage";
import { Singletons } from "../top";

/**
 * A subclass of _fsStorage
 * This will use cookie or localstorage
 * It will only be used for "General Storage" for CK and DS modes
 * @param {Browser} browser
 * @param {String} uidoverride
 * @param {Object} cookieSettings
 */
class _generalStorage extends _fsStorage {
  constructor(browser, uidoverride) {
    // Initialize using the superclass
    super(browser, uidoverride);

    ext(
      this,
      {
        // How much time to wait before saving data
        cThreshold: 2000,
      },
      false
    );

    const __stTypes = storageTypes;

    browser.ready.subscribe(
      () => {
        // Handle the different types of persistence
        if (this.pers == __stTypes.CK) {
          // COOKIE **********************************************************************
          this.ckie = new Cookie(getCookieSettings(this));
        } else if (this.pers == __stTypes.DS) {
          // DOM STORAGE *****************************************************************
          // Set shorter commit threshold
          this.cThreshold = 500;
        } else if (uidoverride) {
          // Ensure the uid override if we are creating storage in the Tracker window from query parameter
          this.uid = uidoverride;
        }

        /* pragma:DEBUG_START */
        console.warn(
          `utils: general storage initializing with ${this.pers} and user id ${
            this.pers == __stTypes.CK ? "not important" : this.uid
          }`
        );
        /* pragma:DEBUG_END */

        // Get the state
        // This sync is only necessary for GENERAL data
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
          // Maint is only for CK and DS
          this._maint(true);
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
    // We don't need to sync tracker comms in the parent window. Only in the Tracker
    if (!this.isSyncing) {
      this.isSyncing = true;
      cb = cb || (() => {});
      let dstr;
      let newdata;

      if (this.pers == storageTypes.CK) {
        dstr = this.ckie.get(this._storageKey);
        if (dstr) {
          dstr = Compress.decompress(dstr);
          this._lastSync = now();
          newdata = JSON.parse(dstr);
          this._fireChangeEvents(newdata.keys);
          newdata.keys = newdata.keys || {};
          this._data = newdata;
          this.onSync.fire(this);
          this.isSyncing = false;
          nextTick(cb);
          return;
        }
        // Brand new! Start fresh
        this.isSyncing = false;
        nextTick(cb);
      } else if (this.pers == storageTypes.DS) {
        dstr = localStorage.getItem(this._storageKey);
        if (dstr) {
          dstr = Compress.decompress(dstr);
          this.lastSync = now();
          newdata = JSON.parse(dstr);
          newdata.keys = newdata.keys || {};
          this._fireChangeEvents(newdata.keys);
          this._data = newdata;
          nextTick(() => {
            this.onSync.fire(this);
          });
          if (now() - this._data.when < 1000 * 60 * 5) {
            this.isSyncing = false;
            nextTick(cb);
            return;
          } else {
            this.lastSync = now();
            this._data = {
              when: now(),
              keys: {},
            };
          }
        }
        // Brand new! Start fresh
        this.isSyncing = false;
        nextTick(cb);
      }
    }
  }

  /**
   * Does a straight commit
   * @private
   */
  _commit() {
    clearTimeout(this.lock);
    this.lock = null;
    this.lastSave = now();
    this._data.when = this.lastSave;
    let dtastr = "";

    try {
      dtastr = JSON.stringify(this._data);
    } catch (e) {
      /* pragma:DEBUG_START */
      console.error("utils: error serializing the state: ", e);
      /* pragma:DEBUG_END */
      return;
    }

    if (this.pers == storageTypes.CK) {
      //delete useless 't' values from cookie to lower its size
      const nval = ext({}, this._data);
      for (const key in nval.keys) {
        delete nval.keys[key].t;
      }
      dtastr = JSON.stringify(nval);
      /* pragma:DEBUG_START */
      // console.log("utils: commit", nval, " to cookie (key: " + this._storageKey + ")", "compression: ", dtastr.length, "B - now is ", Compress.compress(dtastr).length, "B");
      /* pragma:DEBUG_END */
      // Simple DOM storage
      this.ckie.set(this._storageKey, Compress.compress(dtastr));

      // Fire the event
      this.onCommit.fire(this._data);
    } else if (this.pers == storageTypes.DS) {
      /* pragma:DEBUG_START */
      // console.log("utils: committing fsstorage to localstorage (key: " + this._storageKey + ")", "compression: ", dtastr.length, "B - now is ", Compress.compress(dtastr).length, "B");
      /* pragma:DEBUG_END */
      // Simple DOM storage
      localStorage.setItem(this._storageKey, Compress.compress(dtastr));

      // Fire the event, if there is a callback
      this.onCommit.fire(this._data);
    }
    this.isStale = false;
  }
}

_generalStorage.prototype.constructor = _fsStorage;

/**
 * Get a Storage Instance for "General Storage" if one exists, if not create one.
 * Cases:
 * 1. CK or DS return generalStorage
 * 2. MC or CL return brainStorage
 * @param {Object} browser
 * @param {String} uidoverride
 */
const getGeneralStorage = (browser, uidoverride) => {
  let pers = globalConfig.storage.toUpperCase();
  const si = Singletons.StorageInstances;
  const st = storageTypes;

  /* pragma:DEBUG_START */
  if (!browser || isString(browser)) {
    console.error("utils: global storage not initialized properly. Browser instance required.");
  }
  if (!(pers == st.MC || pers == st.CL || pers == st.DS || pers == st.CK)) {
    console.error(
      `utils: invalid persistence setting. Must be '${st.CK}', '${st.MC}', '${st.CL}', or '${
        st.DS
      }'.`
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

  const ckds = pers == storageTypes.CK || pers == storageTypes.DS;

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

export { getGeneralStorage };
