/**
 * Reading and writing SessionStorage
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 */

import { supportsDomStorage } from "../../fs/index";
import { DomStorage } from "./domstorage";

/**
 * @class Creates a SessionStorage DOM storage object
 * @param guid {String} The unique ID of the storage object. This helps separate storage instances between tabs, etc. Optional.
 * @constructor
 */
class SeshStorage extends DomStorage {
  constructor(guid, autocommit, maxsize) {
    super(guid, autocommit);

    // Some devices have a hard limit of 5 MB. This is set below that
    // so we don't lose data.
    // TODO: maybe do device detection and increase this if the
    // device supports more storage?
    this.storageLimit = maxsize || 4500000;
  }

  /**
   * Read from window.name to the cache
   * @private
   */
  sync() {
    let data;
    try {
      data = sessionStorage.getItem(`${this.guid}_OBJ`);
      if (data && data.length > 0) {
        this._data_obj = JSON.parse(data);
        this.storageBytesObj = data.length;
        this.isNewStorage = false;
      }
    } catch (e) {}

    try {
      data = sessionStorage.getItem(`${this.guid}_BLOB`);
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
      sessionStorage.setItem(`${this.guid}_OBJ`, JSON.stringify(this._data_obj));
      sessionStorage.setItem(`${this.guid}_BLOB`, this._data_blob);
    } catch (e) {}
  }
}

/**
 * Test if this storage method is supported
 * @return {Boolean}
 */
SeshStorage.isSupported = () => supportsDomStorage;

export { SeshStorage };
