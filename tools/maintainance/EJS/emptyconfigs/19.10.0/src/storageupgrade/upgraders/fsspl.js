/**
 * Upgrader for "_fsspl_" cookies
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { FixCPPS } from "../fixcpps";
import { KillOldCookies } from "../killoldcookies";

/**
 * Upgrades old storage
 * @param cb
 * @constructor
 */
class FSSPL {
  constructor(stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get("_fsspl_");
  }

  /**
   * Upgrade it
   */
  upgrade() {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading _fsspl_", this.val);
      /* pragma:DEBUG_END */
      try {
        const obj = JSON.parse(this.val);
        // This storage migration happens after the regular storage initialization, so we need to use the the newly generated UID and force the storage RID to be this so it doesn't get overwritten.
        obj.keys.rid.v = this.stg.uid;
        this.stg._data.keys = obj.keys;
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
  }
}

export { FSSPL };
