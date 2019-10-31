/**
 * Builds signed requests
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.Signer");

fs.require("fs.Top");
fs.require("fs.Misc.MD5");

(function (utils) {

  /**
   * Signs requests
   * @type {signer}
   */
  utils.sign = function (url) {
    var val = (new Date()).getTime(),
      hpart = url.substr(url.indexOf('/rec/')),
      hval = utils.md5((hpart + val).toString());

    if (url.indexOf('?') == -1) {
      url += '?';
    } else {
      url += '&';
    }
    return url + 'token=' + val + '&sig=' + fs.enc(hval);
  };

})(utils);