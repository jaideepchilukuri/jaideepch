/**
 * Google Analytics
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * The Google Analytics Module
 */
var GA = {
  /**
   * Does the site have Google Analytics?
   */
  has: function() {
    var ga = window.ga;
    return typeof ga == "function" && ga.getAll && ga.getAll().length;
  },

  /**
   * Get the GA ID
   * @param cb
   */
  uid: function(cb) {
    var nt = fs.nextTick;
    if (GA.has()) {
      ga(function(tracker) {
        nt(function() {
          if (tracker) {
            cb(tracker.get("clientId"));
          } else {
            try {
              cb(ga.getAll()[0].get("clientId"));
            } catch (e) {
              cb();
            }
          }
        });
      });
    } else {
      nt(function() {
        cb();
      });
    }
  },
};

// Expose it
utils.INT.GA = GA;
