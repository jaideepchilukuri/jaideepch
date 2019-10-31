/**
 * Upgrader for "_fsspl_" cookies
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("su.Upgraders.FSSPL");
fs.require("su.Top");

(function () {

  /**
   * Upgrades old storage
   * @param cb
   * @constructor
   */
  var FSSPL = function(stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get('_fsspl_');
  };

  /**
   * Upgrade it
   */
  FSSPL.prototype.upgrade = function() {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading _fsspl_", this.val);
      /* pragma:DEBUG_END */
      try {
        var obj = JSON.parse(this.val);
        this.stg._data.keys = obj.keys;
        this.stg.save(true);
      } catch(e) {
        /* pragma:DEBUG_START */
        console.warn("storageupgrade: failed to upgrade", e);
        /* pragma:DEBUG_END */
      }
      this.ckie.kill('_fsspl_');
    }
  };

})();