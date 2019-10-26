/**
 * Upgrader for "_4c_" cookie
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

import { isDefined } from "../../fs/index";
import { FixCPPS } from "../fixcpps";
import { KillOldCookies } from "../killoldcookies";
import { decompress } from "../../compress/compress";

/**
 * Upgrades old storage
 * @param cb
 * @constructor
 */
class C4C {
  constructor(stg, ckie) {
    this.stg = stg;
    this.ckie = ckie;
    this.val = decompress(decodeURIComponent(ckie.get("_4c_")));
  }

  /**
   * Upgrade it
   */
  upgrade() {
    if (this.val) {
      /* pragma:DEBUG_START */
      console.log("storageupgrade: upgrading _4c_", this.val);
      /* pragma:DEBUG_END */
      try {
        const obj = JSON.parse(this.val).keys;
        const objks = Object.keys(obj);
        // Create cpp storage value if it doesn't exist. Override code version CPP after, regardless.
        if (!obj.cp) {
          obj.cp = { v: {} };
        }
        // This storage migration happens after the regular storage initialization, so we need to use the the newly generated UID and force the storage RID to be this so it doesn't get overwritten.
        obj.rid.v = this.stg.uid;

        if (objks.length > 0) {
          if (isDefined(obj[objks[0]].v)) {
            // It's normal
            this.stg._data.keys = obj;
          } else {
            // It's OLD
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

export { C4C };
