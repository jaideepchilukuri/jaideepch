/**
 * Reading CPPS
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Misc.CPPS");

fs.require("fs.Top");
fs.require("fs.Misc.Misc");

(function () {

  /**
   * Constructor for a CPPS reader
   * @param namespace
   * @constructor
   */
  var CPPS = function (namespace) {
    this.ns = namespace;
  };

  /**
   * Holds the interface
   * @type {{get: Function, all: Function}}
   */
  CPPS.prototype = {
    /**
     * Get a CPP
     * @param name
     */
    set: function (name, val) {
      if(fs.supportsDomStorage) {
        var dobj = JSON.parse(localStorage.getItem(this.ns) || '{}');
        dobj[name] = val;
        localStorage.setItem(this.ns, JSON.stringify(dobj));
      }
    },

    /**
     * Get a CPP
     * @param name
     */
    get: function (name) {
      var dobj = JSON.parse(localStorage.getItem(this.ns) || '{}');
      // returns undefined if not found.
      return dobj[name];
    },

    /**
     * Return an object containing all the CPPS that were set
     */
    all: function () {
      var dobj = JSON.parse(localStorage.getItem(this.ns) || '{}');
      return dobj;
    }
  };

})();