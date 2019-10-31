/**
 * Checks whether we are in or out of the pool
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isDefined, toLowerCase } from "../../fs/index";
import { _W } from "../top";
import { testAgainstSearch, Cookie, storageTypes, retrieveNestedVariable } from "../../utils/utils";

/**
 * Runs criteria checking and pooling
 * @constructor
 */
class Criteria {
  constructor(gstorage, config) {
    this.stg = gstorage;
    this.cfg = config;
  }

  /**
   * Check if we are in the cxReplay pool
   * @param callback
   */
  calcReplayPoolStatus(callback) {
    const cfg = this.cfg.config;
    const pls = cfg.replay_pools;
    const pth = _W.location.toString();
    let i;
    if (!pls || pls.length === 0 || this.pooloverride === true) {
      /* pragma:DEBUG_START */
      if (this.pooloverride) {
        console.warn("trigger: the pool is overridden");
      }
      /* pragma:DEBUG_END */
      return callback(true);
    }

    let pool = this.stg.get("pl");
    if (!isDefined(pool)) {
      // Was not defined. Roll the dice
      for (i = 0; i < pls.length; i++) {
        if (testAgainstSearch(pls[i].path, pth)) {
          // it matches
          if (Math.random() * 100 < pls[i].sp) {
            pool = 1;
          } else {
            pool = 0;
          }
          // Set the pooling value but have it expire after 4 hours
          this.stg.set("pl", pool, 1000 * 60 * 60 * 4);
        }
      }
    }
    const rps = cfg.replay_repools;
    // Check on repools
    if (pool === 0 && rps && rps.length > 0) {
      /* pragma:DEBUG_START */
      console.warn("trigger: we're pooled out, so checking on repools", rps);
      /* pragma:DEBUG_END */
      for (i = 0; i < rps.length; i++) {
        if (testAgainstSearch(rps[i].path, pth)) {
          // it matches
          if (Math.random() * 100 < rps[i].sp) {
            // We are in the pool
            pool = 1;
            /* pragma:DEBUG_START */
            console.warn("trigger: dice roll successful. back in the pool!");
            /* pragma:DEBUG_END */
          } else {
            // We are out of the pool
            pool = 0;
            /* pragma:DEBUG_START */
            console.warn("trigger: nope, still out of the pool");
            /* pragma:DEBUG_END */
          }
          // Set it again but have it expire after 4 hours
          this.stg.set("pl", pool, 1000 * 60 * 60 * 4);
        }
      }
    }
    return callback(!!pool);
  }

  /**
   * Check opt out
   */
  optoutCheck(success, failure) {
    this.stg.ready.subscribe(
      () => {
        if (this.stg.get("optout") === true) {
          failure();
        } else {
          success();
        }
      },
      true,
      true
    );
  }

  /**
   * Check browser supported. Note: we basically ignore this if we're on mobile and rely on the platform check instead.
   */
  browserCheck(brws, cfg) {
    // Return false if it's on the unsupported list and the version is too old
    if (
      !brws.isMobile &&
      cfg.config.browser_cutoff[brws.browser.name] &&
      brws.browser.actualVersion < cfg.config.browser_cutoff[brws.browser.name]
    ) {
      return false;
    }
    return true;
  }

  /**
   * Check browser features
   * @param brws
   * @param cfg
   */
  featureCheck(brws, cfg) {
    if (cfg.config.persistence == storageTypes.DS && !brws.supportsLocalStorage) {
      return false;
    }
    return true;
  }

  /**
   * Check platform supported
   */
  platformCheck(brws, cfg) {
    if (
      cfg.config.platform_cutoff[brws.os.name] &&
      brws.os.version < cfg.config.platform_cutoff[brws.os.name]
    ) {
      return false;
    }
    return true;
  }

  /**
   * Check device blacklist
   */
  checkDeviceBlacklist(brws, cfg) {
    for (let i = 0; i < cfg.config.device_blacklist.length; i++) {
      if (toLowerCase(brws.agent).indexOf(toLowerCase(cfg.config.device_blacklist[i])) > -1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Tests each of the urls, referrers, and userAgents defined in the
   * survey definition against its given browser counterpart.  If one matches, it
   * will return true.
   * @param def {Object} The survey definition to process against
   * @param brwsr {Browser} The browser object.
   * @param exAttr {String} The name of the exclude variable to look for.
   * @return {Boolean}
   */
  _match(def, brwsr, exAttr) {
    const include = def.include;
    const exclude = def[exAttr || "globalExclude"];

    if (def.criteria) {
      // First turn off things if we don't support mobile or desktop
      if (!def.criteria.supportsSmartPhones && (!brwsr.isTablet && brwsr.isMobile)) {
        return false;
      } else if (!def.criteria.supportsTablets && brwsr.isTablet) {
        return false;
      } else if (!def.criteria.supportsDesktop && !brwsr.isMobile) {
        return false;
      }
    }

    // Do excludes
    if (exclude) {
      const doexclude = this.runAllTests(exclude, brwsr, false, true);
      if (doexclude) {
        return false;
      }
    }

    // Do includes
    if (include) {
      return this.runAllTests(include, brwsr, false, true);
    }

    // If we got to this point, then there really wasn't any criteria to check on,
    // so you might as well proceed
    return true;
  }

  runAllTests(testlist, brwsr, bombonfalse, bombontrue) {
    const ck = new Cookie({});

    // Quickreference the href
    const href = _W.location.href.toString();
    const refr = document.referrer.toString();
    const comparelist = {
      urls: href,
      referrers: refr,
      userAgents: _W.navigator.userAgent,
    };

    // Actually run a regex match
    function _match(m, v) {
      if (!Array.isArray(v)) {
        v = [v];
      }
      for (let x = 0, y = v.length; x < y; x++) {
        if (typeof v[x] === "string") {
          v[x] = v[x].replace(/-_DS_-/gi, "$$");
        }
        if (testAgainstSearch(v[x], m)) {
          return true;
        }
      }
      return false;
    }

    let truthyres;
    for (const tst in testlist) {
      const atest = testlist[tst];
      if (atest.length > 0) {
        truthyres = false;
        if (comparelist[tst]) {
          // It's one of the easy tests
          truthyres = _match(comparelist[tst], atest);
        } else if (tst == "browsers") {
          const brn = brwsr.browser.name;
          const brv = brwsr.browser.actualVersion;
          for (let lp = 0; lp < atest.length; lp++) {
            if (toLowerCase(brn).indexOf(toLowerCase(atest[lp].name)) > -1) {
              if (!atest[lp].comparison) {
                // No comparison provided
                truthyres = true;
              } else if (atest[lp].comparison == "lt" && brv < atest[lp].version) {
                truthyres = true;
              } else if (atest[lp].comparison == "eq" && brv == atest[lp].version) {
                truthyres = true;
              } else if (atest[lp].comparison == "gt" && brv > atest[lp].version) {
                truthyres = true;
              }
            }
          }
        } else if (tst == "cookies") {
          for (let ckd = 0; ckd < atest.length; ckd++) {
            const cki = atest[ckd];
            const rck = ck.get(cki.name);
            if (isDefined(cki.value) && rck == cki.value) {
              truthyres = true;
            } else if (!isDefined(cki.value) && !!rck) {
              truthyres = true;
            }
          }
        } else if (tst == "variables") {
          for (let ckdd = 0; ckdd < atest.length; ckdd++) {
            const ckiv = atest[ckdd];
            let rckv = retrieveNestedVariable(_W, ckiv.name);

            if (!rckv) {
              rckv = typeof rckv === "boolean" ? false : "";
            }

            const containsCkivValue = isDefined(ckiv.value);

            // Checks for a boolean match or a regex string match
            if (containsCkivValue && rckv === ckiv.value) {
              truthyres = true;
            } else if (containsCkivValue && testAgainstSearch(ckiv.value, rckv)) {
              truthyres = true;
            } else if (!containsCkivValue && !!rckv) {
              truthyres = true;
            }
          }
        }

        // Spit out the result if necessary
        if (!truthyres && bombonfalse) {
          return true;
        } else if (truthyres && bombontrue) {
          return true;
        }
      }
    }
    return false;
  }
}

export { Criteria };
