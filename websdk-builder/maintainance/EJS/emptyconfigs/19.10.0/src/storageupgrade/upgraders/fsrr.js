/**
 * Upgrader for "fsr.r" cookies
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
class FSRR {
  constructor(stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get("fsr.r");
  }

  /**
   * Upgrade it
   */
  upgrade() {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading fsr.r", this.val);
      /* pragma:DEBUG_END */
      try {
        const obj = JSON.parse(this.val);
        const dayval = 1000 * 60 * 60 * 24;

        // Set the invite situation to accepted
        this.stg.set("i", "x");

        //  obj.d == repeat days (eg: "90", "45", etc)
        // obj.e == True conversion expiration timestamp

        if (obj.d && obj.e) {
          this.stg.setMaxKeyExpiration(7 * dayval + obj.d * dayval);
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

export { FSRR };
