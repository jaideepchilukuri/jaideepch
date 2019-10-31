/**
 * Upgrader for "_4c_" cookie
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

fs.provide("su.Upgraders.C4C");
fs.require("su.Top");
fs.require("su.KillOldCookies");
fs.require("su.FixCPPS");

(function () {

  /**
   * Upgrades old storage
   * @param cb
   * @constructor
   */
  var C4C = function (stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = utils.Compress.decompress(decodeURIComponent(ckie.get('_4c_')));
  };

  /**
   * Upgrade it
   */
  C4C.prototype.upgrade = function () {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading _4c_", this.val);
      /* pragma:DEBUG_END */
      try {
        var obj = JSON.parse(this.val).keys,
          objks = Object.keys(obj);
        // Create cpp storage value if it doesn't exist. Override code version CPP after, regardless.
        if (!obj.cp) {
          obj.cp = { v: {} };
        }
        // This storage migration happens after the regular storage initialization, so we need to use the the newly generated UID and force the storage RID to be this so it doesn't get overwritten.
        obj.rid.v = this.stg.uid;

        if (objks.length > 0) {
          if (fs.isDefined(obj[objks[0]].v)) {
            // It's normal
            this.stg._data.keys = obj;
          } else {
            // It's OLD
            for (var i = 0; i < objks.length; i++) {
              this.stg.set(objks[i], obj[objks[i]]);
            }
          }
          this.stg.save(true);
        }
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