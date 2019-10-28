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

    /**
     * Get the Omniture ID
     * @param cb
     */
    uid: function (cb) {
      var nt = fs.nextTick;
      if (OM.has()) {
        nt(function () {
          cb(s.c_r('s_vi').split('|')[1].split('[')[0]);
        });
      } else {
        nt(function () {
          cb();
        });
      }
    },

    /**
     * Get the beacon
     */
    beacon: function () {
      var src,
        mainURL,
        query,
        filteredQuery;
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

      var whitelist = ['AQB', 'mid', 'aid', 'vid', 'fid', 'AQE'], foundSrc = '';
      for (var p in window) {
        if ((p.substring(0, 4) == 's_i_') && (window[p].src)) {
          src = window[p].src;
          if (src.indexOf('/b/ss/') >= 0) {
            foundSrc = src;
            break;
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
      }
      return finalval;
    }
  };

  // Expose it
  utils.INT.OM = OM;

})(utils);