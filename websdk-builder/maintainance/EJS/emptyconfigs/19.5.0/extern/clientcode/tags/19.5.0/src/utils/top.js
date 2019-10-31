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
    siteKey: 'global',
    APPID: {
      TRIGGER: "funcxm",
      FEEDBACK: "funfbk",
      REPLAY: "funrep"
    }
  };
  var fshome = "";
  if (fs && fs.home) {
    fshome = fs.home;
  }
  if (fs && fs.config.selfHosted) {
    fshome = fs.config.configLocation.split('/');
    utils.siteKey = fshome[fshome.length - 1];
  }
  
  /* pragma:AMD_START */
  if (fshome.indexOf('production') > -1 || fshome.indexOf('staging') > -1) {
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
      if (sk[1] == 'sites') {
        sk = fs.toLowerCase(sk[2]);
      } else {
        sk = fs.toLowerCase(sk[1]);
      }
    }
    if (sk && sk.length > 1) {
      utils.siteKey = sk;
    }
  }
  /* pragma:AMD_END */

})();
