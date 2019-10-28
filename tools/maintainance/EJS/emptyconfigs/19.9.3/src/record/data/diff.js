/**
 * Diffing strings
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

// Wrap in an iffy
const ___diff = () => {
  /**
   * Handles diffing two strings
   */
  const Differ = (str1, str2) => {
    // Check some easy cases
    if (typeof str1 != "string" || str1.length === 0) {
      // If the previous string has no length - then just use the new string
      return {
        s: 0,
        v: str2,
        e: 0,
      };
    } else if (typeof str2 != "string" || str2.length === 0) {
      // If the new string has no length then just use it
      return {
        s: 0,
        v: "",
        e: 0,
      };
    } else if (str1 === str2) {
      // If they're the same then there is no difference
      return null;
    } else {
      const diff = {};
      let len1 = Math.min(str1.length, str2.length);
      let i;
      for (i = 0; i < len1; i++) {
        if (str1.charCodeAt(i) !== str2.charCodeAt(i)) {
          diff.s = i;
          break;
        }
        if (i === len1 - 1) {
          diff.s = len1;
        }
      }
      // Walk backwards
      len1 = str1.length;
      const len2 = str2.length;
      const elen = Math.min(len1 - diff.s, len2 - diff.s);
      for (i = 0; i < elen; i++) {
        if (str1.charCodeAt(len1 - i - 1) !== str2.charCodeAt(len2 - i - 1)) {
          diff.e = i;
          diff.v = str2.substr(diff.s, len2 - i - diff.s);
          return diff;
        }
      }

      // all stuff is new/repeated
      diff.e = 0;
      diff.v = str2.substr(diff.s, len2 - diff.s);

      return diff;
    }
  };

  // Return the Differ
  return Differ;
};

export { ___diff };
