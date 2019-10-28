/**
 * Base64 Shim for older browsers
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Misc.Base64");

fs.require("fs.Top");

(function () {

  /**
   * Base 64 Encode
   * @param str
   * @returns {String}
   */
  utils.b64EncodeUnicode = function (str) {
    return btoa(fs.enc(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  };

  /**
   * Base 64 Decode
   * @param str
   * @returns {String}
   */
  utils.b64DecodeUnicode = function (str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str).split(''), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  };

})();