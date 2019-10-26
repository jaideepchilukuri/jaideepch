/**
 * Some very basic plumbing. This file should appear at the top of the stack.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Top");

(function () {

  // Constant for whether or not we can use typed arrays
  var USE_TYPEDARRAY = (typeof Uint8Array != "undefined");

  /**
   * Quickreference the window
   */
  var _W = window;

  /**
   * The main utils object
   * @type {{}}
   */
  var utils = {
    siteKey: 'global'
  };

  /* pragma:AMD_START */
  if (fs && fs.home && (fs.home.indexOf('production') > -1 || fs.home.indexOf('staging') > -1)) {
    var sk;
    if (fs.home.indexOf('production') > -1) {
      sk = fs.home.split('production')[0];
    } else {
      sk = fs.home.split('staging')[0];
    }
    if (sk.indexOf('//') > -1) {
      sk = sk.split('//')[1];
    }
    sk = sk.replace(/\\/g, '/').split('/');
    if (sk.length >= 3) {
      sk = fs.toLowerCase(sk[1]);
    }
    if (sk && sk.length > 1) {
      utils.siteKey = sk;
    }
  }
  /* pragma:AMD_END */

})();
