/**
 * Reading and writing LocalStorage
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isDefined, nextTick } from "../../fs/index";
import { Bind, FSEvent } from "../dom/event";

/**
 * @class Creates a localStorage DOM storage object
 * @param guid {String} The unique ID of the storage object. This helps separate storage instances between tabs, etc. Optional.
 * @constructor
 */
class DomStorage {
  constructor(guid, autocommit) {
    // Sort out the optional GUID
    if (!guid) {
      guid = "STORAGE";
    }

    this.guid = `FSR_${guid.replace(/[- _.&]/g, "").toUpperCase()}`;

    // Create the storage full event
    this.StorageFull = new FSEvent();

    // Some devices have a hard limit of 5 MB. This is set below that
    // so we don't lose data.
    this.storageLimit = 4500000;

    this.kill();

    // Do a sync
    this.sync();

    // Auto commit if applicable
    if (!isDefined(autocommit) || autocommit) {
      // Force commit on page unload. This has to be done after EVERYTHING ELSE so its on a timer to set the binding
      nextTick(() => {
        Bind(window, "unload", () => {
          // Commit the storage to window.name
          this.commit();
        });
      });
    }
  }

  /**
   * Get the storage size
   */
  size() {
    return this.storageBytesObj + this.storageBytesBlob;
  }

  /**
   * Test to see if we are over our byte limit and fire the event if required
   */
  testStorageLimit() {
    if (this.size() >= this.storageLimit) {
      this.StorageFull.fire(this);
      return true;
    }
    return false;
  }

  /**
   * Delete a key value pair
   * @param key {String} The name of the parameter to delete.
   */
  dispose(key) {
    if (this._data_obj[key]) {
      // remove it
      delete this._data_obj[key];

      // set storage byte count
      this.storageBytesObj = JSON.stringify(this._data_obj).length;
    }
  }

  /**
   * Clears the datastore entirely as though fresh.
   */
  kill() {
    this.storageBytesObj = 0;
    this.storageBytesBlob = 0;

    // remove it
    this._data_obj = {};
    this._data_blob = "";

    // Assume storage is fresh and needs to be initialized
    // sync will reset if storage has data in it already
    this.isNewStorage = true;
  }

  /**
   * Erase all the data
   */
  eraseAll() {
    this.kill();
    this.commit();
  }

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   * @return {Object}
   */
  get(key) {
    return this._data_obj[key];
  }

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   * @return {Object}
   */
  getBlob() {
    return this._data_blob;
  }

  /**
   * Erase a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  erase(key) {
    delete this._data_obj[key];
    this.storageBytesObj = JSON.stringify(this._data_obj).length;
    this.isNewStorage = false;
    this.testStorageLimit();
  }

  /**
   * Set a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  set(key, value) {
    if (value) {
      this._data_obj[key] = value;
      this.storageBytesObj = JSON.stringify(this._data_obj).length;
      this.isNewStorage = false;
      this.testStorageLimit();
    }
  }

  /**
   * Set a unstructured data value into storage
   * @param value {String} The value to set.
   */
  setBlob(value) {
    this._data_blob = value;
    this.storageBytesBlob = this._data_blob.length;
    this.isNewStorage = false;
    this.testStorageLimit();
  }

  /**
   * Test if storage is new has never been initialized
   * @return {Boolean}
   */
  isNew() {
    let isNew;
    // If this window has been parent window then session storage is copied from parent window so this is not new
    if (window.opener && !this.get("isNew")) {
      isNew = true;
      this.set("isNew", isNew);
    }
    return isNew || this.isNewStorage;
  }

  /**
   * Read from window.name to the cache
   * @private
   */
  sync() {
    let data;
    try {
      data = localStorage.getItem(`${this.guid}_OBJ`);
      if (data && data.length > 0) {
        this._data_obj = JSON.parse(data);
        this.storageBytesObj = data.length;
        this.isNewStorage = false;
      }
    } catch (e) {}

    try {
      data = localStorage.getItem(`${this.guid}_BLOB`);
      if (data && data.length > 0) {
        this._data_blob = data;
        this.storageBytesBlob = data.length;
        this.isNewStorage = false;
      }
    } catch (e) {}
  }

  /**
   * Write the cache to the actual DOM
   */
  commit() {
    try {
      // Write it out
      localStorage.setItem(`${this.guid}_OBJ`, JSON.stringify(this._data_obj));
      localStorage.setItem(`${this.guid}_BLOB`, this._data_blob);
    } catch (e) {}
  }
}

/**
 * Perform the initialization
 * @param initCallback {Function} The callback to make when initialization is complete.
 */
DomStorage.initialize = initCallback => {
  // Just call it right away - no init is necessary
  initCallback.apply(DomStorage);
};

/**
 * Test if this storage method is supported
 * @return {Boolean}
 */
DomStorage.isSupported = () => !!localStorage;

export { DomStorage };
