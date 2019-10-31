/**
 * Criteria checker for cx record
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Misc.Criteria");

fs.require("rec.Top");

(function () {

  /**
   * Sets up a criteria checker
   * @param config
   * @constructor
   */
  var Criteria = function (config, browser) {
    this.config = config;
    this.browser = browser;
  };

  /**
   * Is this platform, url (blacklist), and device supported?
   */
  Criteria.prototype.supported = function () {
    var cfg = this.config.advancedSettings || {},
      brws = this.browser,
      blst = this.config.blacklist,
      wlst = this.config.whitelist,
      wlmet = false,
      dts = cfg.device_type_support,
      i,
      j,
      url = location.toString(),
      rval;

    var checkCriteria = function (type, criteriaObj) {
      var criteria = criteriaObj[type];
      switch (type) {
        // 'text' has been used before, adding 'urls' which works the same way but gives better meaning to the other options
        case "urls":
        case "text":
          for (j = 0; j < criteria.length; j++) {
            if (utils.testAgainstSearch(criteria[j], url)) {
              return true;
            }
          }
          break;
        case "variables":
          for (j = 0; j < criteria.length; j++) {
            if (fs.isDefined(criteria[j].name)) {
              // Client retrieved variable value
              rval = utils.retrieveNestedVariable(_W, criteria[j].name);

              if (criteria[j].value === rval) {
                return true;
              } else if (rval === true && criteria[j].value == "true") {
                return true;
              } else if (rval === false && criteria[j].value == "false") {
                return true;
              }
            }
          }
          break;
        case "cookies":
          var ckie = new utils.Cookie(),
            ckvl;
          for (j = 0; j < criteria.length; j++) {
            ckvl = ckie.get(criteria[j].name);
            if (fs.isDefined(ckvl) && ckvl == criteria[j].value) {
              return true;
            }
          }
          break;
      }
      return false;
    };

    // Return false if it's on the unsupported list and the version is too old
    if (!(
      (cfg.browser_cutoff[brws.browser.name] && brws.browser.actualVersion >= cfg.browser_cutoff[brws.browser.name]) ||
      (cfg.platform_cutoff[brws.os.name] && brws.os.version >= cfg.platform_cutoff[brws.os.name])
    )) {
      /* pragma:DEBUG_START */
      console.warn("sr: blacklisting, browser or device is unsupported");
      /* pragma:DEBUG_END */
      return false;
    }

    // Check device type support
    if (dts && ((!dts.desktop && !brws.isMobile) || (!dts.tablet && brws.isTablet) || (!dts.phone && brws.isMobile && !brws.isTablet))) {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "excluded device type");
      /* pragma:DEBUG_END */
      return false;
    }

    if (blst && blst.active) {
      for (i in blst) {
        if (checkCriteria(i, blst)) {
          /* pragma:DEBUG_START */
          console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "blacklisted: ", i, blst[i][j]);
          /* pragma:DEBUG_END */
          return false;
        }
      }
    }

    if (wlst && wlst.active) {
      for (i in wlst) {
        if (checkCriteria(i, wlst)) {
          /* pragma:DEBUG_START */
          console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "whitelisted: ", i, wlst[i][j]);
          /* pragma:DEBUG_END */
          wlmet = true;
          break;
        }
      }
      if (!wlmet) {
        /* pragma:DEBUG_START */
        console.warn("sr: whitelist is active but was not met.");
        /* pragma:DEBUG_END */
        return false;
      }
    }

    // Check device blacklist
    for (i = 0; i < cfg.device_blacklist.length; i++) {
      if (fs.toLowerCase(brws.agent).indexOf(cfg.device_blacklist[i].toLowerCase()) > -1) {
        /* pragma:DEBUG_START */
        console.warn("sr: blacklisting, device was on blacklist");
        /* pragma:DEBUG_END */
        return false;
      }
    }
    return true;
  };

})();