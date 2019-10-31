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
    APPID: {
      TRIGGER: "funcxm",
      FEEDBACK: "funfbk",
      REPLAY: "funrep"
    }
  };

  var Singletons = {
    StorageInstances: {}
  };
  var fshome = "";
  if (fs && fs.home) {
    fshome = fs.home;
  }

})();
