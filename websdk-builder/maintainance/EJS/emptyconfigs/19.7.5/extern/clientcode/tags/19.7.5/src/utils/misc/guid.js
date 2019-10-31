/**
 * Makes a guid
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Guid");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Time");
fs.require("fs.Misc.MD5");

(function (utils) {

  /**
   * Generate an Id using UUID without dashes.
   * @return {String} A randomized Id 32 bytes long
   */
  utils.generateGUID = function () {
    return utils.generateUUID().replace(/-/g, "");
  };

  /**
   * Generate a UUIDv4 using Crypto API cryptographically random bits.
   * @return {String} A UUID
   */
  utils.generateUUID = function () {
    var bytes = new Uint8Array(16);
    var crypto = window.crypto || window.msCrypto;
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var uuid = "";
    for (var i = 0; i < 16; i++) {
      uuid += (bytes[i] + 0x100).toString(16).substring(1);
    }
    return uuid.substring(0, 8) + '-' +
      uuid.substring(8, 12) + '-' +
      uuid.substring(12, 16) + '-' +
      uuid.substring(16, 20) + '-' +
      uuid.substring(20);
  };

})(utils);