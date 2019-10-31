/**
 * Tools for working with arrays
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Array");

fs.require("fs.Top");

(function (utils) {

  /**
   * De-duplicates an array
   * @param arr {Array} The array
   */
  utils.dedupe = function (arr) {
    var i,
      j;
    for (i = arr.length - 1; i >= 0; i--) {
      for (j = i - 1; j >= 0; j--) {
        if (arr[j] == arr[i]) {
          arr.splice(i, 1);
        }
      }
    }
    return arr;
  };

  /**
   * Returns the index of the element in the object, or -1
   * if not found.  If the object is an array or object, the index
   * is found with the "in" operator.  All other values are treated
   * as strings.
   * @param {Object} e Element to locate in the array
   * @param {Object} obj The object to search
   * @return {Number}
   */
  utils.arrayIndexOf = function (e, obj) {
    for (var a in obj) {
      if (obj[a] === e) {
        return a;
      }
    }
    return -1;
  };

  /**
   * Returns <code>true</code> if the element is in the array
   * @param {Object} e Element to locate in the array
   * @param {Array} arr The array to search
   * @return {Boolean}
   */
  utils.inArray = function (e, arr) {
    return utils.arrayIndexOf(e, arr) != -1;
  };

  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
   */
  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function (predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];

        // 5. Let k be 0.
        var k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return kValue.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return undefined.
        return undefined;
      },
      configurable: true,
      writable: true
    });
  }

})(utils);