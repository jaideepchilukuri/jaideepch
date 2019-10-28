/**
 * Class for setting custom pass parameters
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Storage.CPPS");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");
fs.require("fs.Utils.Storage.FSStorage");

(function (utils) {

  /**
   * Constructor for CPP class
   * @param fstorage {FSStorage} The Storage instance
   * @constructor
   */
  utils.CPPS = function (fstorage, expiration) {
    this.gs = fstorage;
    this.onSet = new utils.FSEvent();
    this._blCPP = [];
    this.exp = expiration || (1000 * 60 * 60 * 24);
  };

  /**
   * Handles CPP interactions.
   */
  utils.CPPS.prototype = {
    /**
     * Blacklist some CPPS
     * @param vals
     */
    addToBlacklist: function(vals) {
      vals = vals || [];
      var cpp = this.all();
      this._blCPP = this._blCPP.concat(vals);
      for (var i = 0; i < vals.length; i++) {
        delete cpp[vals[i]];
      }
      this.gs.set('cp', cpp);
    },

    /**
     * Set a CPP to the value provided.
     * @param key
     * @param value
     */
    set: function (key, value) {
      /* pragma:DEBUG_START */
      console.warn("utils: setting CPP " + key, value);
      /* pragma:DEBUG_END */
      if (this._blCPP.indexOf(key) == -1) {
        var cpp = this.all();
        cpp[key] = value + '';
        this.gs.set('cp', cpp, this.exp);
        this.onSet.fire(key, value);
      }
    },

    /**
     * Get the CPP value stored for the provided key.
     * @param key
     */
    get: function (key) {
      return this.all()[key];
    },

    /**
     * Get all CPP's
     */
    all: function () {
      /* pragma:DEBUG_START */
      console.warn("utils: getting all CPP's ", JSON.stringify(this.gs.get('cp')));
      /* pragma:DEBUG_END */
      return this.gs.get('cp') || {};
    },

    /**
     * Get as a querystring
     */
    toQueryString: function () {
      var res = [],
        all = this.all();
      for (var vr in all) {
        res.push('cpp[' + fs.enc(vr) + ']' + '=' + fs.enc(all[vr]));
      }
      return res.join('&');
    },

    /**
     * Remove the CPP.
     * @param key
     */
    erase: function (key) {
      var cpp = this.all();
      delete cpp[key];
      this.gs.set('cp', cpp);
    },

    /**
     * Save the CPPS.
     */
    save: function () {
      this.gs.save();
    },

    /**
     * Append to an existing key, converting the single value to a list of values.
     * @param key
     * @param value
     * @param arg
     */
    append: function (key, value, arg) {
      var cpp = this.gs.get('cp') || {},
        cppArr,
        end,
        start;
      if (this._blCPP.indexOf(key) == -1) {
        cpp[key] = (cpp[key] || '') + ',' + value;
        if (arg) {
          cppArr = cpp[key].split(",");
          end = cppArr.length - 1;
          start = cppArr.length > arg ? (cppArr.length - arg) : 0;
          cpp[key] = cppArr.splice(start, end - start + 1).join();
        }
        this.gs.set('cp', cpp);
      }
    }
  };

})(utils);