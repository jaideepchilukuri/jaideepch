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
   * Generate an Id using the current time and a random number.
   * @return {String} A randomized Id 32 bytes long
   */
  utils.generateGUID = function () {
    return utils.md5(utils.now() + '' + navigator.userAgent + window.location + (new Date()).getTimezoneOffset() + (Math.random()));
  };

})(utils);