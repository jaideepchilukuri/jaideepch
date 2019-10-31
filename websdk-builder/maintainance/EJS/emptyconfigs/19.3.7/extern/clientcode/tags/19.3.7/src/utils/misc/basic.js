/**
 * Basic stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Basic");

fs.require("fs.Top");

(function (utils) {

  /**
   * Encode the string as a regular expression, replacing special
   * characters for later substitution.
   * @param {String} str The string to escape
   * @return {String}
   */
  utils.escapeRegExp = function (str) {
    return (str || '').toString().replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
  };

  /**
   * Trim the string provided, removing whitespace before and after.
   * @param {String} str The string to trim
   * @return {String}
   */
  utils.trim = function (str) {
    return (str || '').toString().replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  };

  /**
   * Strip HTML tags from a string
   * @param str
   * @returns {string}
   */
  utils.stripHTML = function (str) {
    return (str || '').replace(/(<([^>]+)>)/ig, '');
  };

  /**
   * Combine
   */
  utils.merge = function () {
    var mix = {},
      a = arguments,
      i,
      l,
      op,
      mp,
      object;
    for (i = 0, l = a.length; i < l; i++) {
      object = a[i];
      if (!fs.isPlainObject(object)) {
        continue;
      }
      for (var key in object) {
        op = object[key];
        mp = mix[key];
        mix[key] = (mp && fs.isPlainObject(op) && fs.isPlainObject(mp)) ? utils.merge(mp, op) : utils.unlink(op);
      }
    }
    return mix;
  };

  /**
   * Unlink
   */
  utils.unlink = function (object) {
    var unlinked,
      i;
    if (fs.isPlainObject(object)) {
      unlinked = {};
      for (var p in object) {
        unlinked[p] = utils.unlink(object[p]);
      }
    }
    else if (fs.isArray(object)) {
      unlinked = [];
      for (i = 0, l = object.length; i < l; i++) {
        unlinked[i] = utils.unlink(object[i]);
      }
    }
    else {
      unlinked = object;
    }

    return unlinked;
  };

})(utils);