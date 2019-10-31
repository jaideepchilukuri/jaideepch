/**
 * Upgrader for "acs.t" cookies
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("su.Upgraders.ACST");
fs.require("su.Top");

(function () {

  /**
   * Upgrades old storage
   * @param cb
   * @constructor
   */
  var ACST = function (stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get('acs.t') || ckie.get('fsr.t');
  };

  /**
   * Upgrade it
   */
  ACST.prototype.upgrade = function () {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading acs.t or fsr.t", this.val);
      /* pragma:DEBUG_END */
      try {
        var obj = JSON.parse(this.val),
          objks = Object.keys(obj);
        if (objks.length > 0) {
          if (fs.isDefined(obj[objks[0]].v)) {
            // Its normal
            this.stg._data.keys = obj;
          } else {
            // Its OLD
            for (var i = 0; i < objks.length; i++) {
              this.stg.set(objks[i], obj[objks[i]]);
            }
          }
          this.stg.save(true);
        }
      } catch (e) {
        /* pragma:DEBUG_START */
        console.warn("storageupgrade: failed to upgrade", e);
        /* pragma:DEBUG_END */
      }
      this.ckie.kill('acs.t');
      this.ckie.kill('fsr.t');
    }
  };

})();