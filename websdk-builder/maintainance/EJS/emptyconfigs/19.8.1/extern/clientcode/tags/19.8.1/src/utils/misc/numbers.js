/**
 * Math stuff and nubers
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Return a random floating point number within the given range.  Use
 * <code>Math.floor(utils.randomRange(min,max))</code> to get a whole
 * number.
 * @param {Number} min The low end of the range
 * @param {Number} max The high end of the range
 * @return {Number} A number between min and max
 */
utils.randomRange = function(min, max) {
  return min + Math.random() * (max - min);
};

utils.isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};
