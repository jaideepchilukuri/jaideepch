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
   * If a function is called a bunch of times in short succession (a bounce)
   * and you want to wait until it stops being called for some amount
   * of time, then you want to debounce it. This function will do that.
   *
   * You can cancel a pending call by calling .cancel() on the returned
   * function.
   *
   * @param {Function} fn the function to debounce
   * @param {Number} delay amount of time to wait for no more calls
   *   before calling fn
   * @param {Number} limit max time to wait for no more calls (optional)
   * @returns {Function} a version of fn that is debounced
   */
  utils.debounce = function (fn, delay, limit) {
    var timeout;
    var lastRanAt = 0;
    var waiting = false;
    var debounced = function () {
      var ctx = this;
      var args = arguments;
      var age = utils.now() - lastRanAt;

      clearTimeout(timeout);
      var run = function () {
        waiting = false;
        lastRanAt = utils.now();
        fn.apply(ctx, args);
      };
      if (limit && waiting && age > limit && age < (limit + delay + 1)) {
        run();
      } else {
        waiting = true;
        timeout = setTimeout(run, delay);
      }
    };
    debounced.cancel = function () {
      lastRanAt = utils.now();
      clearTimeout(timeout);
    };
    return debounced;
  };

  /**
   * Stops a function from being called more than every limit ms. Will
   * call the function on the first call after limit ms have passed, and
   * if called again within limit ms, it will call it again after.
   *
   * You can cancel a pending call by calling .cancel() on the returned
   * function. This will also make sure the next call happens after limit ms.
   *
   * @param {Function} fn the function to throttle
   * @param {Number} limit min amount of time between calls
   * @returns {Function} a version of fn that is throttled
   */
  utils.throttle = function (fn, limit) {
    var lastRanAt = 0;
    var timeout;
    var throttled = function () {
      var ctx = this;
      var args = arguments;
      var now = utils.now();
      var age = now - lastRanAt;
      clearTimeout(timeout);
      if (age >= limit) {
        // call immediately
        lastRanAt = now;
        fn.apply(ctx, args);
      } else {
        // delay call
        timeout = setTimeout(function () {
          lastRanAt = utils.now();
          fn.apply(ctx, args);
        }, limit - age);
      }
    };

    throttled.cancel = function () {
      clearTimeout(timeout);
      lastRanAt = utils.now();
    };

    return throttled;
  };

  /**
   * The inline start time for when the ForeSee script was encountered
   */
  utils.startTime = utils.now();

})(utils);