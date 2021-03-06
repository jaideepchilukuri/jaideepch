/**
 * Kills old cookies
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("su.KillOldCookies");
fs.require("su.Top");

(function () {

  /**
   * Kills all known old cookies
   * @param {Cookie} ck 
   */
  var KillOldCookies = function(ck) {
    var cookielist = ['_fsspl_', 'acs.t', '_4c_', 'fsr.s', 'fsr.t', 'fsr.r', 'fsr.a'];
    /* pragma:DEBUG_START */
    console.warn("storageupgrade: killing cookies: ", JSON.stringify(cookielist));
    /* pragma:DEBUG_END */
    for (var i = 0; i < cookielist.length; i++) {
      ck.kill(cookielist[i]);
    }
  };

})();