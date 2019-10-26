/**
 * Customer hack area
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.CustomerHacks");

(function () {

  // Where customer hacks can go
  var wl = fs.toLowerCase(window.location.href.toString()),
    ACS_OVERRIDES = {};

  // Build a bear's prod and staging envs.
  if(wl.indexOf('buildabear.c') > -1 || wl.indexOf('bab-dev-store.sparkred.') > -1) {
    ACS_OVERRIDES.FBALTPOSITION = true;
  }

  // peco.com, bge.com, comed.com enforce overflow hidden on the body tag.
  if(wl.indexOf('.peco.c') > -1 || wl.indexOf('.bge.com') > -1 || wl.indexOf('.comed.com') > -1) {
    ACS_OVERRIDES.FBALTOVERFLOW = true;
  }

  // Bomb out on argos iFrames
  if (wl.indexOf('argos.co') > -1 && window !== window.top) {
    return;
  }

  if (wl.indexOf('/serve/') > -1) {
    // AMEX
    ACS_OVERRIDES.FBALTSCROLL = true;
  }

})();