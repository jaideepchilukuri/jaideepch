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

(function () {

  /**
   * Constructor for a CPPS reader
   * @param namespace
   * @constructor
   */
  var CPPS = function (namespace) {
    this.ns = namespace;

    // override this
    this.config = fs.config;
  };

  /**
   * Holds the interface
   * @type {{get: Function, all: Function}}
   */
  CPPS.prototype = {
    /**
     * Return if a CPP is enabled
     */
    _isCPPEnabled: function (key) {
      if (!this.config.disable_cpps) {
        /* pragma:DEBUG_START */
        console.error("missing disable_cpps config in global config");
        /* pragma:DEBUG_END */
        return true;
      }

      if (this.config.disable_cpps.indexOf(key) < 0) return true;

      /* pragma:DEBUG_START */
      console.warn("cpps: blocking cpp " + key);
      /* pragma:DEBUG_END */

      return false;
    },

    /**
     * Get a CPP
     * @param name
     */
    set: function (name, val) {
      if (!this._isCPPEnabled(name)) return;

      if (fs.supportsDomStorage) {
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