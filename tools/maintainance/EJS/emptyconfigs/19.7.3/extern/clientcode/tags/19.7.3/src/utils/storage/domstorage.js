/**
 * Reading and writing LocalStorage
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Storage.DomStorage");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");

(function (utils) {

  /**
   * @class Creates a localStorage DOM storage object
   * @param guid {String} The unique ID of the storage object. This helps separate storage instances between tabs, etc. Optional.
   * @constructor
   */
  var DomStorage = function (guid, autocommit) {
    // Sort out the optional GUID
    if (!guid) {
      guid = "STORAGE";
    }

    this.guid = "FSR_" + guid.replace(/[- _.&]/g, "").toUpperCase();

    // Create the storage full event
    this.StorageFull = new utils.FSEvent();

    // The official storage limit for this type
    // In this case its unlimited in most cases, but very small in others. Since its usually our primary type we'll make it big
    this.storageLimit = 4500000;

    this.kill();

    // Do a sync
    this.sync();

    // Auto commit if applicable
    if (!fs.isDefined(autocommit) || autocommit) {
      // Force commit on page unload. This has to be done after EVERYTHING ELSE so its on a timer to set the binding
      utils.nextTick(function () {
        utils.Bind(window, 'unload', function () {
          // Commit the storage to window.name
          this.commit();
        }.bind(this));
      }.bind(this));
    }
  };

  /**
   * Test to see if we are over our byte limit and fire the event if required
   */
  DomStorage.prototype.testStorageLimit = function () {
    if ((this.storageBytesObj + this.storageBytesBlob) >= this.storageLimit) {
      this.StorageFull.fire(this);
      return true;
    }

    return false;
  };

  /**
   * Delete a key value pair
   * @param key {String} The name of the parameter to delete.
   */
  DomStorage.prototype.dispose = function (key) {
    if (this._data_obj[key]) {
      // remove it
      delete this._data_obj[key];

      // set storage byte count
      this.storageBytesObj = JSON.stringify(this._data_obj).length;
    }
  };

  /**
   * Clears the datastore entirely as though fresh.
   */
  DomStorage.prototype.kill = function () {
    this.storageBytesObj = 0;
    this.storageBytesBlob = 0;

    // remove it
    this._data_obj = {};
    this._data_blob = '';

    // Assume storage is fresh and needs to be initialized
    // sync will reset if storage has data in it already
    this.isNewStorage = true;
  };

  /**
   * Erase all the data
   */
  DomStorage.prototype.eraseAll = function () {
    this.kill();
    this.commit();
  };

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   * @return {Object}
   */
  DomStorage.prototype.get = function (key) {
    return this._data_obj[key];
  };

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   * @return {Object}
   */
  DomStorage.prototype.getBlob = function () {
    return this._data_blob;
  };

  /**
   * Erase a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  DomStorage.prototype.erase = function (key) {
    delete this._data_obj[key];
    this.storageBytesObj = JSON.stringify(this._data_obj).length;
    this.isNewStorage = false;
    this.testStorageLimit();
  };

  /**
   * Set a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  DomStorage.prototype.set = function (key, value) {
    if (value) {
      this._data_obj[key] = value;
      this.storageBytesObj = JSON.stringify(this._data_obj).length;
      this.isNewStorage = false;
      this.testStorageLimit();
    }
  };

  /**
   * Set a unstructured data value into storage
   * @param value {String} The value to set.
   */
  DomStorage.prototype.setBlob = function (value) {
    this._data_blob = value;
    this.storageBytesBlob = this._data_blob.length;
    this.isNewStorage = false;
    this.testStorageLimit();
  };

  /**
   * Test if storage is new has never been initialized
   * @return {Boolean}
   */
  DomStorage.prototype.isNew = function () {
    var isNew;
    // If this window has been parent window then session storage is copied from parent window so this is not new
    if (window.opener && !this.get("isNew")) {
      isNew = true;
      this.set("isNew", isNew);
    }
    return (isNew || this.isNewStorage);
  };

  /**
   * Perform the initialization
   * @param initCallback {Function} The callback to make when initialization is complete.
   */
  DomStorage.initialize = function (initCallback) {
    // Just call it right away - no init is necessary
    initCallback.apply(DomStorage);
  };

  /**
   * Test if this storage method is supported
   * @return {Boolean}
   */
  DomStorage.isSupported = function () {
    return !!localStorage;
  };

  /**
   * Read from window.name to the cache
   * @private
   */
  DomStorage.prototype.sync = function () {
    var data;
    try {
      data = localStorage.getItem(this.guid + '_OBJ');
      if (data && data.length > 0) {
        this._data_obj = JSON.parse(data);
        this.storageBytesObj = data.length;
        this.isNewStorage = false;
      }
    } catch (e) {
    }

    try {
      data = localStorage.getItem(this.guid + '_BLOB');
      if (data && data.length > 0) {
        this._data_blob = data;
        this.storageBytesBlob = data.length;
        this.isNewStorage = false;
      }
    } catch (e) {
    }
  };

  /**
   * Write the cache to the actual DOM
   */
  DomStorage.prototype.commit = function () {
    try {
      // Write it out
      localStorage.setItem(this.guid + '_OBJ', JSON.stringify(this._data_obj));
      localStorage.setItem(this.guid + '_BLOB', this._data_blob);
    } catch (e) {
    }
  };

  // Add it to the utils global
  utils.DomStorage = DomStorage;

})(utils);