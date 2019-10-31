/**
 * SessionRecord Data Cache
 *
 * This is used to avoid unnecessarily serializing the same html over and over.
 * We don't use storage or anything for this. This is purely in-memory re-use only
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Data.Cache");

fs.require("rec.Top");

(function () {

  /**
   * @class Namespace for caching functions.
   * @static
   */
  var Cache = {
    /**
     * Holds a browser reference
     */
    _browser: null,

    /**
     * Holds all the cached items by their unique id's
     * @private
     */
    _cacheList: []
  };

  /**
   * Get an object in place of a string. This may only have a uid in it, rather than the string.
   * @param str The string to make cacheable
   * @param srcKey An identifier for the src to make it identifiable
   */
  Cache.getCacheableObject = function (str, srcKey) {
    // Are we mobile?
    var ismobile = Cache._browser.isMobile;

    // Get a string from the array
    if (srcKey && srcKey.join) {
      srcKey = srcKey.join(',');
    }

    var outObj = {},
      a = Cache,
      b = a._cacheList,
      i;

    for (i = b.length - 1; i >= 0; i--) {
      if (b[i].str == str) {
        outObj.uid = b[i].uid;
        break;
      }
    }

    // If that was not successful, bring out some bigger guns
    if (!fs.isDefined(outObj.uid)) {
      // Last resort, create a new one
      outObj.uid = utils.generateGUID();
      outObj.kl = srcKey;

      // We didn't find a match, so lets bring out the big guns
      if (srcKey && str.length > 100)
        for (i = b.length - 1; i >= 0; i--)
          if (b[i].kl == srcKey) {
            var res = Diff(b[i].str, str);
            outObj.diff = {
              'uid': b[i].uid,
              'd': res
            };
            break;
          }

      if (!fs.isDefined(outObj.diff)) {
        outObj.str = str;
        if (!ismobile || b.length < 500) {
          b[b.length] = outObj;
        }
      } else if (!ismobile || b.length < 500) {
        b[b.length] = {
          'str': str,
          'uid': outObj.uid,
          'kl': outObj.kl
        };
      }
    }

    return outObj;
  };

  /**
   * Start from scratch with the cache
   */
  Cache.reset = function () {
    /* pragma:DEBUG_START */
    console.log('sr: disposing the DOM cache');
    /* pragma:DEBUG_END */
    Cache._cacheList = [];
  };

})();