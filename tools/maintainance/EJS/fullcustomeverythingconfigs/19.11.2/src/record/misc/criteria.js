/**
 * Criteria checker for cx record
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isDefined, toLowerCase } from "../../fs/index";
import { _W } from "../top";
import { retrieveNestedVariable, testAgainstSearch, Cookie, SeshStorage } from "../../utils/utils";

/**
 * Sets up a criteria checker
 * @param config
 * @constructor
 */
class Criteria {
  constructor(config, browser, cpps) {
    this.config = config;
    this.browser = browser;
    this.didSkipOnPurpose = false;
    // diagnostic information useful for the API
    this.reasons = {};
    this.cpps = cpps;
  }

  /**
   * Is this platform, url (blacklist), and device supported?
   */
  supported() {
    const cfg = this.config.advancedSettings || {};
    const brws = this.browser;
    const blst = this.config.blacklist;
    const wlst = this.config.whitelist;
    let wlmet = false;
    const dts = cfg.device_type_support;
    let i;
    let j;
    const url = location.toString();
    let rval;

    if (!cfg.browser_cutoff) {
      cfg.browser_cutoff = {};
    }

    if (!cfg.platform_cutoff) {
      cfg.platform_cutoff = {};
    }

    if (cfg.useSessionStorage) {
      if (!SeshStorage.isSupported()) {
        this.reasons.sessionStorageUnsupported = true;
        /* pragma:DEBUG_START */
        console.warn("sr: SessionStorage not supported and is required!");
        /* pragma:DEBUG_END */
        return false;
      }
      this.reasons.sessionStorageUnsupported = false;
    }

    // Enforcing IE 11 minimum
    cfg.browser_cutoff.IE = Math.max(cfg.browser_cutoff.IE, 11);

    // Enforcing Safari 8 minimum
    cfg.browser_cutoff.Safari = Math.max(cfg.browser_cutoff.Safari, 8);

    // Enforcing Chrome 38 minimum
    cfg.browser_cutoff.Chrome = Math.max(cfg.browser_cutoff.Chrome, 38);
    cfg.browser_cutoff["Chrome Mobile"] = Math.max(cfg.browser_cutoff["Chrome Mobile"], 38);

    // Enforcing Android 5 minimum
    cfg.platform_cutoff.Android = Math.max(cfg.platform_cutoff.Android, 5.0);

    // Enforcing iOS 8 minimum
    ["iPod", "iPhone", "iPad"].forEach(iOS => {
      cfg.platform_cutoff[iOS] = Math.max(cfg.platform_cutoff[iOS], 8);
    });

    const checkCriteria = (group, type, criteriaObj) => {
      const criteria = criteriaObj[type];
      switch (type) {
        // 'text' has been used before, adding 'urls' which works the same way but gives better meaning to the other options
        case "urls":
        case "text":
          for (j = 0; j < criteria.length; j++) {
            if (testAgainstSearch(criteria[j], url)) {
              this.reasons[`${group}_${type}_${j}`] = true;
              return true;
            }
            this.reasons[`${group}_${type}_${j}`] = false;
          }
          break;
        case "variables":
          for (j = 0; j < criteria.length; j++) {
            if (isDefined(criteria[j].name)) {
              // Client retrieved variable value
              rval = retrieveNestedVariable(_W, criteria[j].name);

              if (criteria[j].value === rval) {
                this.reasons[`${group}_${type}_${criteria[j].name}`] = true;
                return true;
              } else if (rval === true && criteria[j].value == "true") {
                this.reasons[`${group}_${type}_${criteria[j].name}`] = true;
                return true;
              } else if (rval === false && criteria[j].value == "false") {
                this.reasons[`${group}_${type}_${criteria[j].name}`] = true;
                return true;
              }
              this.reasons[`${group}_${type}_${criteria[j].name}`] = false;
            }
          }
          break;
        case "cookies":
          {
            const ckie = new Cookie();
            let ckvl;
            for (j = 0; j < criteria.length; j++) {
              ckvl = ckie.get(criteria[j].name);
              if (isDefined(ckvl) && ckvl == criteria[j].value) {
                this.reasons[`${group}_${type}_${criteria[j].name}`] = true;
                return true;
              }
              this.reasons[`${group}_${type}_${criteria[j].name}`] = false;
            }
          }
          break;
        case "cpps":
          /* eslint-disable no-case-declarations */
          const cppsObj = this.cpps.all();
          for (j = 0; j < criteria.length; j++) {
            const cppTestRule = criteria[j];
            const testName = cppTestRule.name;
            const testValue = cppTestRule.value;

            // Ignore matching if an invalid testName or testValue is provided,
            // or if no cpps key is found with that name.
            if (!testName || typeof testValue === undefined) continue;
            const cppValue = cppsObj[testName];
            if (typeof cppValue === undefined) continue;

            if (cppValue === testValue) {
              this.reasons[`${group}_${type}_${testName}`] = true;
              return true;
            }
          }
          break;
        default:
          throw new Error(`unknown criteria type ${type}`);
      }
      this.reasons[`${group}_${type}`] = false;
      return false;
    };

    // Return false if it's on the unsupported list and the version is too old
    if (
      cfg.browser_cutoff[brws.browser.name] &&
      brws.browser.actualVersion < cfg.browser_cutoff[brws.browser.name]
    ) {
      this.reasons.browserUnsupported = true;
      /* pragma:DEBUG_START */
      console.warn("sr: blacklisting, browser is unsupported");
      /* pragma:DEBUG_END */
      return false;
    }
    this.reasons.browserUnsupported = false;

    if (cfg.platform_cutoff[brws.os.name] && brws.os.version < cfg.platform_cutoff[brws.os.name]) {
      this.reasons.platformUnsupported = true;
      /* pragma:DEBUG_START */
      console.warn("sr: blacklisting, device is unsupported");
      /* pragma:DEBUG_END */
      return false;
    }
    this.reasons.platformUnsupported = false;

    // Check device type support
    if (
      dts &&
      ((!dts.desktop && !brws.isMobile) ||
        (!dts.tablet && brws.isTablet) ||
        (!dts.phone && brws.isMobile && !brws.isTablet))
    ) {
      this.reasons.deviceTypeUnsupported = true;
      /* pragma:DEBUG_START */
      console.warn(`sr: ${window === window.top ? "" : "[frm] "}excluded device type`);
      /* pragma:DEBUG_END */
      return false;
    }
    this.reasons.deviceTypeUnsupported = false;

    if (blst) {
      for (i in blst) {
        if (checkCriteria("blacklist", i, blst)) {
          /* pragma:DEBUG_START */
          console.warn(`sr: ${window === window.top ? "" : "[frm] "}blacklisted: `, i, blst[i][j]);
          /* pragma:DEBUG_END */
          this.didSkipOnPurpose = true;
          this.reasons.blacklistMatched = true;
          return false;
        }
      }
    }
    this.reasons.blacklistMatched = false;

    if (wlst) {
      for (i in wlst) {
        if (checkCriteria("whitelist", i, wlst)) {
          /* pragma:DEBUG_START */
          console.warn(`sr: ${window === window.top ? "" : "[frm] "}whitelisted: `, i, wlst[i][j]);
          /* pragma:DEBUG_END */
          wlmet = true;
          break;
        }
      }

      if (!wlmet) {
        /* pragma:DEBUG_START */
        console.warn("sr: whitelist is active but was not met.");
        /* pragma:DEBUG_END */
        this.didSkipOnPurpose = true;
        this.reasons.whitelistNotMatched = true;
        return false;
      }
    }
    this.reasons.whitelistNotMatched = false;

    // Check device blacklist
    for (i = 0; i < cfg.device_blacklist.length; i++) {
      if (toLowerCase(brws.agent).indexOf(cfg.device_blacklist[i].toLowerCase()) > -1) {
        /* pragma:DEBUG_START */
        console.warn("sr: blacklisting, device was on blacklist");
        /* pragma:DEBUG_END */
        this.reasons.deviceBlacklisted = true;
        return false;
      }
    }
    this.reasons.deviceBlacklisted = false;

    return true;
  }
}

export { Criteria };
