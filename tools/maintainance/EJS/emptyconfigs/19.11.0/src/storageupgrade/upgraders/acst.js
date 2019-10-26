/**
 * Upgrader for "acs.t" cookies
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isDefined } from "../../fs/index";
import { FixCPPS } from "../fixcpps";
import { KillOldCookies } from "../killoldcookies";

/**
 * Upgrades old storage
 * @param cb
 * @constructor
 */
class ACST {
  constructor(stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = ckie.get("acs.t") || ckie.get("fsr.t");
  }

  /**
   * Upgrade it
   */
  upgrade() {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading acs.t or fsr.t", this.val);
      /* pragma:DEBUG_END */
      try {
        const obj = JSON.parse(this.val);
        const objks = Object.keys(obj);
        // This storage migration happens after the regular storage initialization, so we need to use the the newly generated UID and force the storage RID to be this so it doesn't get overwritten.
        obj.rid = this.stg.uid;

        if (objks.length > 0) {
          if (isDefined(obj[objks[0]].v)) {
            // Its normal
            this.stg._data.keys = obj;
          } else {
            // Its OLD
            for (let i = 0; i < objks.length; i++) {
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
  }
}

export { ACST };
