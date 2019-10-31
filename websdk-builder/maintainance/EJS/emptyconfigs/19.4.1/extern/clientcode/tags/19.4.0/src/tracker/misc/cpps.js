/**
 * Foresee Heartbeat
 *
 * Heartbeat cookie that helps to determine if it's time to
 * display the survey.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Misc.CPPS");

fs.require("track.Top");

(function (trigger) {

  /**
   * Constructor for CPP class
   * @param gstorage
   * @constructor
   */
  var CPPS = function(gstorage) {
    this.gs = gstorage;
  };

  /**
   * Handles CPP interactions.
   */
  CPPS.prototype = {

    /**
     * Extra cpps that arent directly in storage
     */
    _extras: {},

    /**
     * Set a CPP to the value provided.
     * @param key
     * @param value
     */
    set: function(key, value) {
      var cpp = this.all();
      cpp[key] = value;
      this._extras[key] = value;
      //this.gs.set('cp', cpp);
    },

    /**
     * Get the CPP value stored for the provided key.
     * @param key
     */
    get: function(key) {
      return this.all()[key];
    },

    /**
     * Get all CPP's
     */
    all: function() {
      return fs.ext({}, this.gs.get('cp') || {}, this._extras);
    },

    /**
     * Get as a querystring
     */
    toQueryString: function() {
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
    erase: function(key) {
      var cpp = this.all();
      delete cpp[key];
      this.gs.set('cp', cpp);
    },

    /**
     * Append to an existing key, converting the single value to a list of values.
     * @param key
     * @param value
     * @param arg
     */
    append: function(key, value, arg) {
      var cpp = this.gs.get('cp') || {};
      cpp[key] = (cpp[key] || '') + ',' + value;
      if (arg) {
        var cppArr = cpp[key].split(",");
        var end = cppArr.length - 1;
        var start = cppArr.length > arg ? (cppArr.length - arg) : 0;
        cpp[key] = cppArr.splice(start, end - start + 1).join();
      }
      this.gs.set('cp', cpp);
    }

  };

})(trigger);