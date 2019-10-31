/**
 * Upgrader for "fsr.r" cookies
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("su.Upgraders.FSRR");
fs.require("su.Top");

(function () {

  /**
   * Upgrades old storage
   * @param cb
   * @constructor
   */
  var FSRR = function (stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get('fsr.r');
  };

  /**
   * Upgrade it
   */
  FSRR.prototype.upgrade = function () {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading fsr.r", this.val);
      /* pragma:DEBUG_END */
      try {
        var obj = JSON.parse(this.val),
          dayval = 1000 * 60 * 60 * 24;

        // Set the invite situation to accepted
        this.stg.set('i', 'x');

        //  obj.d == repeat days (eg: "90", "45", etc)
        // obj.e == True conversion expiration timestamp

        if (obj.d && obj.e) {
          this.stg.setMaxKeyExpiration((7 * dayval) + (obj.d * dayval));
        } else if (obj.d) {
          // Split the difference
          this.stg.setMaxKeyExpiration((obj.d / 2) * dayval);
        } else {
          // Set 45 days
          this.stg.setMaxKeyExpiration(45 * dayval);
        }
        this.stg.save(true);
      } catch (e) {
        /* pragma:DEBUG_START */
        console.warn("storageupgrade: failed to upgrade", e);
        /* pragma:DEBUG_END */
      }
      this.ckie.kill('fsr.r');
      this.ckie.kill('fsr.s');
      this.ckie.kill('fsr.a');
    }
  };

})();