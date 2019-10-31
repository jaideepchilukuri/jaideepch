/**
 * Simulates process.nextTick()
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Run some code at the earliest opportunity out of sync with the current
 * execution cycle.
 * @param cb
 */
fs.nextTick = function(cb) {
  (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(cb);
};
