/**
 * Adobe Omniture
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isFunction, isString } from "../../fs/index";
import { _W } from "../top";

/**
 * The Omniture Module
 * @type {{has: OM.has}}
 */
const OM = {
  /**
   * Holds a backup of the marketing cloud ID
   */
  _id: "",

  /**
   * Does the site have Omnniture?
   */
  has() {
    try {
      return !!(!!_W.s && isFunction(_W.s.c_r) && _W.s.c_r("s_vi").indexOf("[CE]") > -1);
    } catch (e) {
      return false;
    }
  },

  // Intervals to be used for uid/mcid fetching
  intervals: {
    uid: "",
    mcid: "",
  },

  sgi() {
    if (typeof _W.s_c_il !== "undefined") {
      for (let i = 0; i < _W.s_c_il.length; i++) {
        if (_W.s_c_il[i]._c === "s_c") {
          return _W.s_c_il[i];
        }
      }
    }

    // do NOT call s_gi() in order to get this object. If the
    // above fails, let it be. s_gi() causes glitches on some
    // versions of omniture.

    return false;
  },

  /**
   * Get the Omniture VID/AID/FID and set the appropriate CPP
   */
  uid(rsid, setCppFn) {
    let counter = 0;
    let sgi;
    let id;

    if (!rsid) {
      // not sure if VID/AID/FID will be defined
      return;
    }

    // Clear the interval in case this was already run by another product
    clearInterval(this.intervals.uid);
    this.intervals.uid = setInterval(() => {
      sgi = this.sgi(rsid);
      if (counter++ < 10 && sgi) {
        // Order of preference: VID, AID, FID
        if (sgi.visitorID) {
          // VID
          id = {
            name: "OMTR_VID",
            value: sgi.visitorID,
          };
        } else if (sgi.analyticsVisitorID) {
          // AID
          id = {
            name: "OMTR_VID",
            value: sgi.analyticsVisitorID,
          };
        } else if (sgi.fid) {
          //FID
          id = {
            name: "OMTR_FID",
            value: sgi.fid,
          };
        }

        // If we have one
        if (id) {
          setCppFn(id);
          clearInterval(this.intervals.uid);
        }
      } else {
        /* pragma:DEBUG_START */
        console.warn("utils: could not find an OMTR AID/VID/FID");
        /* pragma:DEBUG_END */
        clearInterval(this.intervals.uid);
      }
    }, 1000);
  },

  /**
   * Get the Omniture MCID and set the appropriate CPP
   */
  mcid(rsid, setCppFn) {
    let counter = 0;
    let sgi;
    let id;

    // Clear the interval in case this was already run by another product
    clearInterval(this.intervals.mcid);
    this.intervals.mcid = setInterval(() => {
      sgi = this.sgi(rsid);
      if (counter++ < 10 && sgi) {
        // Additionally push MCID regardless of the other IDs existing
        if (sgi.marketingCloudVisitorID) {
          // MCID
          id = {
            name: "OMTR_MCID",
            value: sgi.marketingCloudVisitorID,
          };
        }

        // If we have it
        if (id) {
          setCppFn(id);
          clearInterval(this.intervals.mcid);
        }
      } else {
        /* pragma:DEBUG_START */
        console.warn("utils: could not find an OMTR MCID");
        /* pragma:DEBUG_END */
        clearInterval(this.intervals.mcid);
      }
    }, 1000);
  },

  /**
   * Get the beacon
   */
  beacon(cb) {
    if (OM._id) {
      return OM._id;
    }

    const whitelist = ["AQB", "mid", "aid", "vid", "fid", "AQE"];
    let src;
    let p;
    let i;

    function getQueryValue(args, str) {
      let res = "";
      const strb = str.split("&");
      for (let p = 0; p < strb.length; p++) {
        const bts = strb[p].split("=");
        for (let h = 0; h < args.length; h++) {
          if (args[h] == bts[0]) {
            res += `${bts[0]}=${bts[1]}&`;
            break;
          }
        }
      }
      if (res.substr(res.length - 1) == "&") {
        res = res.substr(0, res.length - 1);
      }
      return res;
    }

    function munge(foundSrc) {
      let mainURL;
      let query;
      let filteredQuery;
      mainURL = foundSrc.substring(0, foundSrc.indexOf("?"));
      query = foundSrc.substring(foundSrc.indexOf("?") + 1);
      filteredQuery = getQueryValue(whitelist, query);
      if (!!_W.s && _W.s.trackingServerSecure) {
        mainURL = `https://${_W.s.trackingServerSecure}${foundSrc.substring(
          foundSrc.indexOf("/b/ss/"),
          foundSrc.indexOf("?")
        )}`;
        query = foundSrc.substring(foundSrc.indexOf("?") + 1);
        filteredQuery = getQueryValue(whitelist, query);
      }
      let finalval = `${mainURL}?${filteredQuery}`;
      if (finalval.length < 3) {
        finalval = null;
      } else {
        OM._id = finalval;
      }
      if (finalval) {
        return cb(finalval);
      }
      return finalval;
    }

    let foundSrc = "";
    for (p in window) {
      if (p.substring(0, 4) == "s_i_" && window[p].src) {
        src = window[p].src;
        if (src.indexOf("/b/ss/") >= 0) {
          foundSrc = src;
          break;
        }
      }
    }

    // CC-3585 - Using a fallback method if the s_i_ object does not have a src (because it is an XMLHttpRequest object)
    // CC-4218 - Newer versions named the eb variable sb and it could be renamed again (its minified).
    //  So I just made it search the whole object for a property that matches.
    //  Also, _W.s_c_il might have multiple objects, and in this case it was the second one not the first
    if (!foundSrc && _W.s_c_il && _W.s_c_il.length) {
      for (i = 0; i < _W.s_c_il.length && !foundSrc; i++) {
        for (p in _W.s_c_il[i]) {
          src = _W.s_c_il[i][p];
          if (
            isString(src) &&
            src.indexOf("/b/ss/") >= 0 &&
            src.indexOf("AQB=1") >= 0 &&
            src.indexOf("AQE=1") >= 0 &&
            src.indexOf("mid=") >= 0
          ) {
            foundSrc = src;
            break;
          }
        }
      }
    }

    // TODO: also loop through document.images just in case
    if (!foundSrc && _W.document.images) {
      for (let image_num = 0; image_num < _W.document.images.length; image_num++) {
        src = _W.document.images[image_num].src;
        if (src.indexOf("/b/ss/") >= 0) {
          foundSrc = src;
          break;
        }
      }
    }

    // Don't set a CPP if there is a Beacon case we can't handle
    if (!foundSrc || !isString(foundSrc)) {
      // CC-4328: there is a race condition with our code, sometimes
      // we win. This makes sure we set the CPP later when the beacon
      // is available.
      if (_W.s_c_il) {
        for (i = 0; i < _W.s_c_il.length; i++) {
          if (_W.s_c_il[i].registerPreTrackCallback) {
            _W.s_c_il[i].registerPreTrackCallback(munge);
            break;
          }
        }
      }
      return;
    }

    return munge(foundSrc);
  },
};

export { OM };
