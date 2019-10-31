/**
 * Miscellaneous Stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Misc.Misc");

fs.require("fs.Top");

(function () {

  /**
   * Gets information about an image
   * @param img
   * @param callback
   */
  var imgInfo = function (img, callback) {
    var noop = function () {
    };
    callback = callback || noop;
    var iobj = new Image();
    iobj.onload = function () {
      callback(iobj.width, iobj.height);
    };
    iobj.onerror = function () {
    };
    if (img.indexOf('//') > -1) {
      iobj.src = img;
    } else {
      iobj.src = fs.makeURI(img);
    }
    if (iobj.width) {
      iobj.onload = iobj.onerror = noop;
      callback(iobj.width, iobj.height);
    }
  };

  /**
   * Method to return either option 1 or option 2 if option 1 is not defined or is null from object.
   * @param obj {Object} The object to operate against
   * @param opt1 {String} The first key to look for in the object
   * @param opt2 {String} The second key to look for in the object
   * @return {Object} The determined value
   */
  utils.eitherOr = function (obj, opt1, opt2) {
    return (obj[opt1] || obj[opt2]);
  };

  /**
   * Test if <tt>obj</tt> is defined, returning either <code>true</code> or <code>false.
   * Since the test is performed against <code>null</code> and is <i>loosely evaluated</i>,
   * a type cast will assure that if <tt>obj</tt> is <code>undefined</code> or <code>null</code>,
   * it will return <code>false</code>.  This test will fail, however, if a second or third level
   * field is tested on an object without first verifying that the hierarchy exists.  So testing
   * to see if <tt>foo.bar.baz</tt> is defined, without first testing <tt>foo</tt> then <tt>bar</tt>
   * will result in an exception even before the method is called.
   * @param obj {Object} The object to test
   * @return {Boolean}
   */
  fs.isDefined = function (obj) {
    return (null !== obj && "undefined" !== typeof obj);
  };

  /**
   * Test if the given object is a function
   * @param {Object} obj The object to test
   */
  fs.isFunction = function (obj) {
    return typeof(obj) == "function";
  };

  /**
   * Test if the given object is an object
   * @param {Object} obj The object to test
   */
  fs.isObject = function (obj) {
    return typeof(obj) == "object";
  };

  /**
   * Test if the given object is an Array
   * @param {Object} obj The object to test
   */
  fs.isArray = function (obj) {
    return Object.prototype.toString.call(obj) == "[object Array]";
  };

  /**
   * Encode the string as a regular expression, replacing special
   * characters for later substitution.
   * @param {String} str The string to escape
   * @return {String}
   */
  utils.escapeRegExp = function (str) {
    return str.toString().replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
  };

  /**
   * Trim the string provided, removing whitespace before and after.
   * @param {String} str The string to trim
   * @return {String}
   */
  utils.trim = function (str) {
    return str.toString().replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  };

  /**
   * Sets the context of a function (taken from underscore.js)
   * @param func
   * @param context The variable that will be passed in and used as 'this'
   * @returns {Function}
   */
  fs.proxy = function (func, context) {
    var args, bound,
      nativeBind = Function.prototype.bind,
      slice = Array.prototype.slice;
    if (nativeBind && func.bind === nativeBind) {
      return nativeBind.apply(func, slice.call(arguments, 1));
    }
    args = slice.call(arguments, 2);
    bound = function () {
      if (!(this instanceof bound)) {
        return func.apply(context, args.concat(slice.call(arguments)));
      }
      ctor.prototype = func.prototype;
      var self = ctor();
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) {
        return result;
      }
      return self;
    };

    return bound;
  };

  /**
   * Dispose of all the members of an object. Useful for preventing memory leaks
   * @param obj
   */
  fs.dispose = function (obj) {
    if (obj) {
      if (obj.length)
        for (var i = obj.length - 1; i >= 0; i--)
          obj[i] = null;
      for (var prop in obj) {
        var tob = typeof(obj[prop]);
        if (tob == "function" || tob == "object")
          obj[prop] = null;
      }
    }
    obj = null;
  };

  /**
   * Extend one object to include the parameters of the first
   */
  fs.ext = function () {
    // copy reference to target object
    var a = arguments, target = a[0] || {}, i = 1, lnt = arguments.length, options, name, copy;

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== "object" && !fs.isFunction(target))
      target = {};

    // extend this if only one argument is passed
    if (lnt === i) {
      target = this;
      --i;
    }

    for (; i < lnt; i++) {
      // Only deal with non-null/undefined values
      if (fs.isDefined(options = a[i])) {
        // Extend the base object
        for (name in options) {
          copy = options[name];

          // Prevent never-ending loop
          if (target === copy) continue;

          // Don't bring in undefined values
          if (copy !== undefined) target[name] = copy;
        }
      }
    }
    // Return the modified object
    return target;
  };

  /**
   * Convert a list of parameters and a base URL to a properly qualified URL
   */
  fs.toQueryString = function (params, base) {
    var pList = fs.isDefined(base) ? base + (base.indexOf('?') > -1 ? '&' : '?') : '',
      pm;
    if (params) {
      for (var nm in params) {
        pm = params[nm];
        if (!fs.isString(pm)) {
          pm = JSON.stringify(pm);
        }
        pList += fs.enc(nm) + '=' + fs.enc(pm) + '&';
      }
    }
    return pList;
  };

  /**
   * Javascript Implementation of Java's String.hashCode()
   * @param str
   * @returns {number}
   */
  utils.hashCode = function (str) {
    var hash = 0,
      ch = '', i;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  /**
   * Copy the key from "from" into "to", iff it is
   * defined in "from"
   * @param {String} key The key to copy, may also contain sub-keys (e.g: "part.part2.part3")
   * @param {Object} from The object to copy from
   * @param {Object} to The object to copy into
   */
  utils.copyIfDefined = function (key, from, to) {
    // Is it defined in "from"?
    var parts = key.split('.'), val = from[utils.shift(parts)], c = to, part;
    while (fs.isDefined(val) && parts.length > 0)
      val = val[utils.shift(parts)];
    if (val) {
      // First, create the structure
      parts = key.split('.');
      for (; parts.length && (part = utils.shift(parts));) {  //REMOVED PART IS ALREADY DEFINED AMIN
        if (c[part])
          c = c[part];
        else
          c = c[part] = {};
      }

      // Now populate the value
      parts = key.split('.');
      c = to;
      for (; parts.length && (part = utils.shift(parts));) {
        if (parts.length > 0)
          c = c[part];
        else
          c[part] = val;
      }
    }
  };

  /**
   * Combine
   */
  utils.merge = function () {
    var mix = {}, a = arguments;
    for (var i = 0, l = a.length; i < l; i++) {
      var object = a[i];
      if (!fs.isPlainObject(object)) continue;
      for (var key in object) {
        var op = object[key], mp = mix[key];
        mix[key] = (mp && fs.isPlainObject(op) && fs.isPlainObject(mp)) ? utils.merge(mp, op) : utils.unlink(op);
      }
    }
    return mix;
  };

  /**
   * Unlink
   */
  utils.unlink = function (object) {
    var unlinked;

    if (fs.isPlainObject(object)) {
      unlinked = {};
      for (var p in object) unlinked[p] = utils.unlink(object[p]);
    }
    else if (fs.isArray(object)) {
      unlinked = [];
      for (var i = 0, l = object.length; i < l; i++) unlinked[i] = utils.unlink(object[i]);
    }
    else
      unlinked = object;

    return unlinked;
  };


  /**
   * Test if the given object is a plain JavaScript Object
   * @param {Object} obj The object to test
   */
  fs.isPlainObject = function (obj) {
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || Object.prototype.toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval) {
      return false;
    }

    // Not own constructor property must be Object
    if (obj.constructor && !hasOwnProperty.call(obj, "constructor") && !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
      return false;
    }

    // Own properties are enumerated firstly
    var key;
    for (key in obj) {}

    // Since other libraries might extend Object directly, we need to allow
    // those elements to pass through and still be a plain object
    return (key === undefined || hasOwnProperty.call(obj, key)) ||
      (!hasOwnProperty.call(obj, key) && hasOwnProperty.call(Object.prototype, key));
  };

})();