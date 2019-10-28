/**
 * Time and date constants and functions
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Time");

fs.require("fs.Top");

(function (utils) {

  /**
   * One full day, in milliseconds. (86,400,000)
   * @type {Number}
   */
  utils.FULL_DAY = 24 * 60 * 60 * 1000;

  /**
   * Get the current date, in milliseconds.
   * @return {Number} The date in milliseconds
   */
  utils.now = function () {
    return +new Date();
  };

  /**
   * The inline start time for when the ForeSee script was encountered
   */
  utils.startTime = utils.now();

})(utils);