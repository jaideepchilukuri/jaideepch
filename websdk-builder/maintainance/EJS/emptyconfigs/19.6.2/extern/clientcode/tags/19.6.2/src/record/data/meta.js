/**
 * Meta - Manage meta data about recording
 *
 * A way to manage state about the recording.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Data.Meta");

fs.require("rec.Top");

(function () {

  /**
   * @class The Meta namespace.
   */
  var Meta = {};

  /**
   * Increment key
   */
  Meta.increment = function (stg, key) {
    try {
      var meta = stg.get("meta") || {};
      meta[key] = (meta[key] || 0) + 1;
      stg.set("meta", meta);
    }
    catch (e) {
    }
  };

  /**
   * Set Key
   */
  Meta.set = function (stg, key, value) {
    try {
      var meta = stg.get("meta") || {};
      meta[key] = value;
      stg.set("meta", meta);
    }
    catch (e) {
    }
  };

})();