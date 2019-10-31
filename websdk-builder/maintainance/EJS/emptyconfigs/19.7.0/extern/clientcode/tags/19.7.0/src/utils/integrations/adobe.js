/**
 * Adobe Omniture
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Integrations.Adobe");

fs.require("fs.Utils.Integrations");

(function (utils) {

  /**
   * The Omniture Module
   * @type {{has: OM.has}}
   */
  var OM = {

    /**
     * Holds a backup of the marketing cloud ID
     */
    _id: '',

    /**
     * Does the site have Omnniture?
     */
    has: function () {
      try {
        return !!(!!window.s && fs.isFunction(s.c_r) && s.c_r('s_vi').indexOf('[CE]') > -1);
      } catch (e) {
        return false;
      }
    },

    // Intervals to be used for uid/mcid fetching
    intervals: {
      uid: '',
      mcid: ''
    },

    sgi: function (rsid) {
      if (!rsid || typeof s_gi === 'undefined' || !s_gi) {
        return false;
      }
      // Join multiple RSIDs if they are given
      if (Array.isArray(rsid) && rsid.length === 2) {
        rsid = rsid.join(',');
      }
      // Adobe-provided function to get sgi
      return s_gi(rsid);
    },

    /**
     * Get the Omniture VID/AID/FID and set the appropriate CPP
     */
    uid: function (rsid, setCppFn) {
      var counter = 0,
        sgi,
        id;

      // Clear the interval in case this was already run by another product
      clearInterval(this.intervals.uid);
      this.intervals.uid = setInterval(function () {

        sgi = this.sgi(rsid);
        if (counter++ < 10 && sgi) {

          // Order of preference: VID, AID, FID
          if (sgi.visitorID) {
            // VID
            id = {
              name: 'OMTR_VID',
              value: sgi.visitorID
            };
          } else if (sgi.analyticsVisitorID) {
            // AID
            id = {
              name: 'OMTR_VID',
              value: sgi.analyticsVisitorID
            };
          } else if (sgi.fid) {
            //FID
            id = {
              name: 'OMTR_FID',
              value: sgi.fid
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
      }.bind(this), 1000);
    },

    /**
     * Get the Omniture MCID and set the appropriate CPP
     */
    mcid: function (rsid, setCppFn) {
      var counter = 0,
        sgi,
        id;

      // Clear the interval in case this was already run by another product
      clearInterval(this.intervals.mcid);
      this.intervals.mcid = setInterval(function () {

        sgi = this.sgi(rsid);
        if (counter++ < 10 && sgi) {

          // Additionally push MCID regardless of the other IDs existing
          if (sgi.marketingCloudVisitorID) {
            // MCID
            id = {
              name: 'OMTR_MCID',
              value: sgi.marketingCloudVisitorID
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
      }.bind(this), 1000);
    },

    /**
     * Get the beacon
     */
    beacon: function () {
      if (OM._id) {
        return OM._id;
      }
      var src,
        mainURL,
        query,
        filteredQuery,
        p;
      function getQueryValue(args, str) {
        var res = "", strb = str.split('&');
        for (var p = 0; p < strb.length; p++) {
          var bts = strb[p].split('=');
          for (var h = 0; h < args.length; h++) {
            if (args[h] == bts[0]) {
              res += bts[0] + '=' + bts[1] + '&';
              break;
            }
          }
        }
        if (res.substr(res.length - 1) == '&') {
          res = res.substr(0, res.length - 1);
        }
        return res;
      }

      var whitelist = ['AQB', 'mid', 'aid', 'vid', 'fid', 'AQE'],
        foundSrc = '';
      for (p in window) {
        if ((p.substring(0, 4) == 's_i_') && (window[p].src)) {
          src = window[p].src;
          if (src.indexOf('/b/ss/') >= 0) {
            foundSrc = src;
            break;
          }
        }
      }

      // CC-3585 - Using a fallback method if the s_i_ object does not have a src (because it is an XMLHttpRequest object)
      // CC-4218 - Newer versions named the eb variable sb and it could be renamed again (its minified).
      //  So I just made it search the whole object for a property that matches.
      //  Also, window.s_c_il might have multiple objects, and in this case it was the second one not the first
      if (!foundSrc && window.s_c_il && window.s_c_il.length) {
        for (var i = 0; i < window.s_c_il.length && !foundSrc; i++) {
          for (p in window.s_c_il[i]) {
            src = window.s_c_il[i][p];
            if (
              fs.isString(src) &&
              src.indexOf('/b/ss/') >= 0 &&
              src.indexOf('AQB=1') >= 0 &&
              src.indexOf('AQE=1') >= 0 &&
              src.indexOf('mid=') >= 0
            ) {
              foundSrc = src;
              break;
            }
          }
        }
      }

      // TODO: also loop through document.images just in case
      if (!foundSrc && window.document.images) {
        for (var image_num = 0; image_num < window.document.images.length; image_num++) {
          src = window.document.images[image_num].src;
          if (src.indexOf('/b/ss/') >= 0) {
            foundSrc = src;
            break;
          }
        }
      }

      // Don't set a CPP if there is a Beacon case we can't handle
      if (!foundSrc || !fs.isString(foundSrc)) {
        return;
      }

      mainURL = foundSrc.substring(0, foundSrc.indexOf('?'));
      query = foundSrc.substring(foundSrc.indexOf('?') + 1);
      filteredQuery = getQueryValue(whitelist, query);
      if (!!window.s && s.trackingServerSecure) {
        mainURL = "https://" + s.trackingServerSecure + foundSrc.substring(foundSrc.indexOf('/b/ss/'), foundSrc.indexOf('?'));
        query = foundSrc.substring(foundSrc.indexOf('?') + 1);
        filteredQuery = getQueryValue(whitelist, query);
      }
      var finalval = mainURL + '?' + filteredQuery;
      if (finalval.length < 3) {
        finalval = null;
      } else {
        OM._id = finalval;
      }
      return finalval;
    }
  };

  // Expose it
  utils.INT.OM = OM;
})(utils);