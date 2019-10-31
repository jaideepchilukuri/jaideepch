/**
 * String differ
 *
 * Generates a simple diff for two strings.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Data.Diff");

fs.require("rec.Top");

(function () {

  /**
   * A utility that performs a diff on two strings
   */
  var Diff = function (originalStr, newStr) {
    var str1 = originalStr;
    var str2 = newStr;
    var len1 = originalStr.length;
    var len2 = newStr.length;
    var maxlen = (len1 > len2) ? len2 : len1;
    var knownCeiling = maxlen;
    var knownFloor = 0;
    var knownCap = 0;
    var testPosition = 0;
    var chunkSize = 0;

    while (knownCeiling - knownFloor > 15) {
      chunkSize = Math.round((knownCeiling - knownFloor) / 2);
      testPosition = knownCeiling - chunkSize;
      if (str1.substr(0, testPosition) != str2.substr(0, testPosition))
        knownCeiling = testPosition;
      else
        knownFloor = testPosition;
    }

    var chopped = newStr.substr(knownFloor);
    knownCeiling = chopped.length;

    while (knownCeiling - knownCap > 15) {

      chunkSize = Math.round((knownCeiling - knownCap) / 2);
      testPosition = knownCeiling - chunkSize;

      if (chopped.substr(chopped.length - testPosition) != str1.substr(str1.length - testPosition)) {
        knownCeiling = testPosition;
      } else {
        knownCap = testPosition;

      }
    }

    return {"o": knownFloor, "c": knownCap, "r": newStr.substring(knownFloor, newStr.length - knownCap)};
  };

})();