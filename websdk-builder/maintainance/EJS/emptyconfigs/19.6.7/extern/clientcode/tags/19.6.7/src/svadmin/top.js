/**
 * Top file for Survey Admin
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("sv.Top");

(function () {

  // Top file for opt out

  // Tell the world about us
  utils.registerProduct('foresee', config);

  // Decode survey definitions
  if (config && config.surveydefs) {
    for (var p = 0; p < config.surveydefs.length; p++) {
      if (fs.isString(config.surveydefs[p])) {
        config.surveydefs[p] = utils.compile(utils.b64DecodeUnicode(config.surveydefs[p]));
      }
    }
  }

})();