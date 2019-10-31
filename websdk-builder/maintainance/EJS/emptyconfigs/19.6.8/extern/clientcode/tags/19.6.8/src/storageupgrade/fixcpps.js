/**
 * Fixes some CPPS
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("su.FixCPPS");
fs.require("su.Top");

(function () {

  /**
   * Fix some CPPS
   */
  var FixCPPS = function (stg) {
    if (stg._data.keys && stg._data.keys.cp) {
      delete stg._data.keys.cp.v.trigger_version;
      stg._data.keys.cp.v.code = fs.config.codeVer;
    }
  };

})();