/**
 * Reading and writing Window.name
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Storage.Window");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");

(function (utils) {

  /**
   * @class Creates a window.name storage object
   * @param guid {String} The unique ID of the storage object. This helps separate storage instances between tabs, etc. Optional.
   * @constructor
   */
  utils.WindowStorage = function (guid, autocommit) {

    // Sort out the optional GUID
    if (!guid) {
      guid = "STORAGE";
    }

    this.guid = "FSR_" + guid.replace(/[- _.&]/g, "").toUpperCase();

    // The official storage limit for this type
    this.storageLimit = 5000000;

    // Create the storage full event
    this.StorageFull = new utils.FSEvent();

    this.kill();

    // Do a sync
    this.sync();

    if (!fs.isDefined(autocommit) || autocommit) {
      // Force commit on page unload. This has to be done after EVERYTHING ELSE so its on a timer to set the binding
      setTimeout(fs.proxy(function () {
        utils.Bind(window, 'unload', fs.proxy(function () {
          // Commit the storage to window.name
          this.commit();
        }, this));
      }, this), 100);
    }
  };

  /**
   * Test to see if we are over our byte limit and fire the event if required
   */
  utils.WindowStorage.prototype.testStorageLimit = function () {
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
  utils.WindowStorage.prototype.dispose = function (key) {
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
  utils.WindowStorage.prototype.kill = function () {
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
   * Get a data value
   * @param key {String} The name of the parameter to get.
   * @return {Object}
   */
  utils.WindowStorage.prototype.get = function (key) {
    return this._data_obj[key];
  };

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   * @return {Object}
   */
  utils.WindowStorage.prototype.getBlob = function () {
    return this._data_blob;
  };

  /**
   * Erase a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  utils.WindowStorage.prototype.erase = function (key) {
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
  utils.WindowStorage.prototype.set = function (key, value) {
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
  utils.WindowStorage.prototype.setBlob = function (value) {
    this._data_blob = value;

    this.storageBytesBlob = this._data_blob.length;

    this.isNewStorage = false;

    this.testStorageLimit();
  };

  /**
   * Test if storage is new has never been initialized
   * @return {Boolean}
   */
  utils.WindowStorage.prototype.isNew = function () {
    return this.isNewStorage;
  };

  /**
   * Perform the initialization
   * @param initCallback {Function} The callback to make when initialization is complete.
   */
  utils.WindowStorage.initialize = function (initCallback) {
    // Just call it right away - no init is necessary
    initCallback.apply(utils.WindowStorage);
  };

  /**
   * Test if this storage method is supported
   * @return {Boolean}
   */
  utils.WindowStorage.isSupported = function () {
    return true;
  };

  /**
   * Read from window.name to the cache
   * @private
   */
  utils.WindowStorage.prototype.sync = function () {
    // These strings are used to locate our storage block inside window name
    var wName = (utils.nameBackup || window.name || ''),
      kWord = this.guid + "_",
      data = "",
      ipos = wName.indexOf(kWord + 'BEGIN_OBJ');

    if (ipos > -1) {
      data = wName.substr(ipos + (kWord + 'BEGIN_OBJ').length, wName.indexOf(kWord + 'END_OBJ') - (ipos + (kWord + 'BEGIN_OBJ').length));
    }

    try {
      if (data.length > 0) {
        this._data_obj = JSON.parse(data);
        this.storageBytesObj = data.length;
        this.isNewStorage = false;
      }
    } catch (e) {
    }

    data = "";
    ipos = wName.indexOf(kWord + 'BEGIN_BLOB');
    if (ipos > -1) {
      data = wName.substr(ipos + (kWord + 'BEGIN_BLOB').length, wName.indexOf(kWord + 'END_BLOB') - (ipos + (kWord + 'BEGIN_BLOB').length));
    }

    try {
      if (data.length > 0) {
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
  utils.WindowStorage.prototype.commit = function () {
    // Do the actual remapping, while preserving any other data that may be in there
    var wName = window.name;
    if (!fs.isDefined(wName)) {
      wName = '';
    }

    var kWord = this.guid + "_",
      ipos = wName.indexOf(kWord + 'BEGIN_OBJ'),
      mpart = JSON.stringify(this._data_obj),
      dstr = kWord + 'BEGIN_OBJ' + mpart + kWord + 'END_OBJ';
    if (ipos > -1) {
      wName = wName.substr(0, ipos) + dstr + wName.substr(wName.indexOf(kWord + 'END_OBJ') + (kWord + 'END_OBJ').length);
    } else {
      wName = wName + dstr;
    }

    ipos = wName.indexOf(kWord + 'BEGIN_BLOB');
    dstr = kWord + 'BEGIN_BLOB' + this._data_blob + kWord + 'END_BLOB';
    if (ipos > -1) {
      wName = wName.substr(0, ipos) + dstr + wName.substr(wName.indexOf(kWord + 'END_BLOB') + (kWord + 'END_BLOB').length);
    } else {
      wName = wName + dstr;
    }

    // Assign to the backup, as well as the original. This avoids problems with accidentally syncing again after committing.
    window.name = utils.nameBackup = wName;

    // set the storage bytes
    this.storageBytes = window.name.length;
  };

  // Do an automatic backup as soon as this is encountered
  utils.nameBackup = window.name;

})(utils);