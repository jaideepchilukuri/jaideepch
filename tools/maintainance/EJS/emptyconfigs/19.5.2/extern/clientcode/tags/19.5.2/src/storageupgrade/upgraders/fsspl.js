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
fs.require("su.KillOldCookies");
fs.require("su.FixCPPS");

(function () {

  /**
   * Upgrades old storage
   * @param cb
   * @constructor
   */
  var FSSPL = function (stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get('_fsspl_');
  };

  /**
   * Upgrade it
   */
  FSSPL.prototype.upgrade = function () {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading _fsspl_", this.val);
      /* pragma:DEBUG_END */
      try {
        var obj = JSON.parse(this.val);
        // This storage migration happens after the regular storage initialization, so we need to use the the newly generated UID and force the storage RID to be this so it doesn't get overwritten.
        obj.keys.rid.v = this.stg.uid;
        this.stg._general.data.keys = obj.keys;
        this.stg.save(true);
      } catch (e) {
        /* pragma:DEBUG_START */
        console.log("storageupgrade: upgrade exited", e);
        /* pragma:DEBUG_END */
      }
    }

    // Fix the CPPS
    FixCPPS(this.stg);

    // Remove any old cookies
    KillOldCookies(this.ckie);
  };

})();