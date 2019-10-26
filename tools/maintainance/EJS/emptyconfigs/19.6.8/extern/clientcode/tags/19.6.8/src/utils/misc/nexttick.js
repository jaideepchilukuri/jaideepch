/**
 * Simulates process.nextTick()
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.NextTick");

fs.require("fs.Top");

(function (utils) {
  /**
   * Run some code at the earliest opportunity out of sync with the current
   * execution cycle.
   * @param cb
   */
  fs.nextTick = function (cb) {
    setTimeout(cb || function () { }, 0);
  };
})(utils);