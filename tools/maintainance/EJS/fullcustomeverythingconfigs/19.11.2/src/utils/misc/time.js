/**
 * Time and date constants and functions
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * One full day, in milliseconds. (86,400,000)
 * @type {Number}
 */
const FULL_DAY = 24 * 60 * 60 * 1000;

/**
 * Get the current date, in milliseconds.
 * @return {Number} The date in milliseconds
 */
const now = () => +new Date();

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
const debounce = (fn, delay, limit) => {
  let timeout;
  let lastRanAt = 0;
  let waiting = false;
  const debounced = function() {
    const ctx = this;
    const args = arguments;
    const age = now() - lastRanAt;

    clearTimeout(timeout);
    const run = () => {
      waiting = false;
      lastRanAt = now();
      fn.apply(ctx, args);
    };
    if (limit && waiting && age > limit && age < limit + delay + 1) {
      run();
    } else {
      waiting = true;
      timeout = setTimeout(run, delay);
    }
  };
  debounced.cancel = () => {
    lastRanAt = now();
    clearTimeout(timeout);
  };
  return debounced;
};

/**
 * The inline start time for when the ForeSee script was encountered
 */
const startTime = now();

export { FULL_DAY, now, debounce, startTime };
