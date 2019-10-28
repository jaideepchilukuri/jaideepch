/**
 * Top file for storage upgrader
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ACST } from "./upgraders/acst";
import { C4C } from "./upgraders/c4c";
import { FSRR } from "./upgraders/fsrr";
import { FSSPL } from "./upgraders/fsspl";

/**
 * Upgrades old storage
 * @param cb
 * @constructor
 */
const StorageUpgrader = (stg, ckie, cb) => {
  /* pragma:DEBUG_START */
  console.warn("storageupgrade: about to attempt an upgrade of the cookies");
  /* pragma:DEBUG_END */
  if (ckie.get("_fsspl_")) {
    const fpu = new FSSPL(stg, ckie);
    fpu.upgrade();
  }
  if (!!ckie.get("fsr.r") && !!ckie.get("fsr.s")) {
    const fpr = new FSRR(stg, ckie);
    fpr.upgrade();
  }
  if (!!ckie.get("acs.t") || !!ckie.get("fsr.t")) {
    const acs = new ACST(stg, ckie);
    acs.upgrade();
  }
  if (ckie.get("_4c_")) {
    const c4c = new C4C(stg, ckie);
    c4c.upgrade();
  }

  // If there are CPPs, set their expiration to 24 hours
  const cpps = stg.get("cp");
  if (cpps) {
    stg.set("cp", cpps, 24 * 60 * 60 * 1000);
  }

  stg._maint();
  // Call the callback
  if (cb) {
    return cb();
  }
};

export default StorageUpgrader;
