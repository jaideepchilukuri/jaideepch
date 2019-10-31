/**
 * Some shorthand variable defintions. Many of these
 * are used by our version of requireJS
 */
var op = Object.prototype,
  ostring = op.toString,
  hasOwn = op.hasOwnProperty,
  ap = Array.prototype;

/**
 * Does an object have a property in its definition?
 * @param obj
 * @param prop
 * @returns {boolean}
 */
var hasProp = function (obj, prop) {
  return hasOwn.call(obj, prop);
};

/**
 * Get an objects own property
 * @param obj
 * @param prop
 * @returns {boolean|*}
 */
var getOwn = function (obj, prop) {
  return hasProp(obj, prop) && obj[prop];
};

/**
 * Cycles over properties in an object and calls a function for each
 * property value. If the function returns a truthy value, then the
 * iteration is stopped.
 */
var eachProp = function (obj, func) {
  var prop;
  for (prop in obj) {
    if (hasProp(obj, prop)) {
      if (func(obj[prop], prop)) {
        break;
      }
    }
  }
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
var isDefined = function (obj) {
  return (null !== obj && "undefined" !== typeof obj);
};

/**
 * Test if the given object is a function
 * @param {Object} obj The object to test
 */
var isFunction = function (obj) {
  return typeof(obj) == "function";
};

/**
 * Test if the given object is an object
 * @param {Object} obj The object to test
 */
var isObject = function (obj) {
  return typeof(obj) == "object";
};

/**
 * Test if the given object is an Array
 * @param {Object} obj The object to test
 */
var isArray = function (obj) {
  return Object.prototype.toString.call(obj) == "[object Array]";
};

/**
 * Test if the given object is a Date
 * @param {Object} obj The object to test
 */
var isDate = function (obj) {
  return obj instanceof Date;
};

/**
 * Is the object a string?
 * @param obj
 * @returns {boolean}
 */
var isString = function (obj) {
  return (typeof obj == "string");
};


/**
 * Test if the given object is a plain JavaScript Object
 * @param {Object} obj The object to test
 */
var isPlainObject = function (obj) {
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
  for (key in obj) {
  }

  // Since other libraries might extend Object directly, we need to allow
  // those elements to pass thru and still be a plain object
  return (key === undefined || hasOwnProperty.call(obj, key)) ||
    (!hasOwnProperty.call(obj, key) && hasOwnProperty.call(Object.prototype, key));
};


/**
 * Sets the context of a function (taken from underscore.js)
 * @param func
 * @param context The variable that will be passed in and used as 'this'
 * @param arg1, arg2, arg3, etc
 * @returns {Function}
 */
var proxy = function (func, context) {
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
var dispose = function (obj) {
  if (obj) {
    if (obj.length) {
      for (var i = obj.length - 1; i >= 0; i--) {
        obj[i] = null;
      }
    }
    for (var prop in obj) {
      var tob = typeof(obj[prop]);
      if (tob == "function" || tob == "object") {
        obj[prop] = null;
      }
    }
  }
  obj = null;
};

/**
 * Get query string parameters
 * @param parm
 * @returns {string}
 */
var getParam = function (parm) {
  var vars = {},
    parts = _W.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
      function (m, key, value) {
        vars[key] = value;
      }),
    vrl = vars[parm];
  return (!!vrl ? decodeURIComponent(vrl) : vrl);
};

/**
 * Run some code at the earliest opportunity out of sync with the current
 * execution cycle.
 * @param cb
 */
var nextTick = function (cb) {
  setTimeout(cb || function () {
    }, 20);
};

/**
 * Extend one object to include the parameters of the first.
 * If the last argument is a boolean (and false) it will force a surface-level copy.
 */
var ext = function () {
  var a = arguments,
    target = a[0] || {},
    i = 1,
    lnt = a.length,
    options,
    name,
    copy,
    surface = arguments[arguments.length - 1] === false;

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && !isFunction(target)) {
    target = {};
  }

  // extend this if only one argument is passed
  if (lnt === i) {
    target = this;
    --i;
  }

  for (; i < lnt; i++) {
    // Only deal with non-null/undefined values
    if (isDefined(options = a[i])) {
      // Extend the base object
      for (name in options) {
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy) {
          continue;
        }

        // Don't bring in undefined values
        if (copy !== undefined) {
          if (isArray(copy)) {
            // Clone the array
            copy = copy.slice(0);
          } else if (isDate(copy)) {
            copy = new Date(copy.getTime());
          } else if (typeof(copy) == 'object' && !surface) {
            // Create a deep copy
            copy = ext({}, copy);
          }
          target[name] = copy;
        }
      }
    }
  }
  // Return the modified object
  return target;
};

/**
 * Get/set an attribute
 * @param elm
 * @param atr
 * @returns {*}
 */
var attr = function (elm, atr, val) {
  if (isDefined(val)) {
    elm.setAttribute(atr, val);
  }
  return (!!elm && elm.getAttribute) ? elm.getAttribute(atr) : null;
};

/**
 * Convert a list of parameters and a base URL to a properly qualified URL
 */
var toQueryString = function (params, base) {
  var pList = isDefined(base) ? base + (base.indexOf('?') > -1 ? '&' : '?') : '',
    pm;
  if (params) {
    for (var nm in params) {
      pm = params[nm];
      if (!isString(pm)) {
        pm = JSON.stringify(pm);
      }
      pList += encodeURIComponent(nm) + '=' + encodeURIComponent(pm) + '&';
    }
  }
  return pList;
};

/**
 * Trims the . and .. from an array of path segments.
 * It will keep a leading path segment if a .. will become
 * the first path segment, to help with module name lookups,
 * which act like paths, but can be remapped. But the end result,
 * all paths that use this function should look normalized.
 * NOTE: this method MODIFIES the input array.
 * @param {Array} ary the array of path segments.
 */
function trimDots(ary) {
  var i, part;
  for (i = 0; i < ary.length; i++) {
    part = ary[i];
    if (part === '.') {
      ary.splice(i, 1);
      i -= 1;
    } else if (part === '..') {
      // If at the start, or previous value is still ..,
      // keep them so that when converted to a path it may
      // still work when converted to a path, even though
      // as an ID it is less than ideal. In larger point
      // releases, may be better to just kick out an error.
      if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
        continue;
      } else if (i > 0) {
        ary.splice(i - 1, 2);
        i -= 2;
      }
    }
  }
}

/**
 * Compute
 * @param vstr
 * @returns {*}
 */
var compute = function (vstr) {
  var f = new [].constructor.constructor(vstr);
  return f.call(_W);
};

/**
 * Safer toLowerCase
 * @param str
 * @returns {*}
 */
var toLowerCase = function(str) {
  if (isString(str)) {
    return str.toLowerCase();
  }
  return '';
};