/**
 * Top file for storage upgrader
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("su.StorageUpgrade");
fs.require("su.Top");
fs.require("su.Upgraders.ACST");
fs.require("su.Upgraders.FSSPL");
fs.require("su.Upgraders.FSRR");
fs.require("su.Upgraders.C4C");
fs.require("su.FixCPPS");

(function () {

  /**
   * Upgrades old storage
   * @param cb
   * @constructor
   */
  var StorageUpgrader = function(stg, ckie, cb) {
    /* pragma:DEBUG_START */
    console.warn("storageupgrade: about to attempt an upgrade of the cookies");
    /* pragma:DEBUG_END */
    if (!!ckie.get('_fsspl_')) {
      var fpu = new FSSPL(stg, ckie);
      fpu.upgrade();
    }
    if (!!ckie.get('fsr.r') && !!ckie.get('fsr.s')) {
      var fpr = new FSRR(stg, ckie);
      fpr.upgrade();
    }
    if (!!ckie.get('acs.t') || !!ckie.get('fsr.t')) {
      var acs = new ACST(stg, ckie);
      acs.upgrade();
    }
    if (!!ckie.get('_4c_')) {
      var c4c = new C4C(stg, ckie);
      c4c.upgrade();
    }

    // If there are CPPs, set their expiration to 24 hours
    var cpps = stg.get('cp');
    if (cpps) {
      stg.set('cp', cpps, 24 * 60 * 60 * 1000);
    }

    stg._maint();
    // Call the callback
    if (cb) {
      cb();
    }
  };

  /**
   * Expose it
   */
  return StorageUpgrader;

})();