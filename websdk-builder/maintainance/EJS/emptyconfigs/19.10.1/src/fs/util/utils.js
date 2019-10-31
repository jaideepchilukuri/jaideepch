import { _W } from "./quickrefs";

/**
 * Some shorthand variable defintions. Many of these
 * are used by our version of requireJS
 */
const op = Object.prototype;
const hasOwn = op.hasOwnProperty;
const ap = Array.prototype;

/**
 * Does an object have a property in its definition?
 * @param obj
 * @param prop
 * @returns {boolean}
 */
const hasProp = (obj, prop) => hasOwn.call(obj, prop);

/**
 * Get an objects own property
 * @param obj
 * @param prop
 * @returns {boolean|*}
 */
const getOwn = (obj, prop) => hasProp(obj, prop) && obj[prop];

/**
 * Cycles over properties in an object and calls a function for each
 * property value. If the function returns a truthy value, then the
 * iteration is stopped.
 */
const eachProp = (obj, func) => {
  let prop;
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
const isDefined = obj => null !== obj && "undefined" !== typeof obj;

/**
 * Test if the given object is a function
 * @param {Object} obj The object to test
 */
const isFunction = obj => typeof obj == "function";

/**
 * Test if the given object is an object
 * @param {Object} obj The object to test
 */
const isObject = obj => typeof obj == "object";

/**
 * Test if the given object is an Array
 * @param {Object} obj The object to test
 */
const isArray = obj => Object.prototype.toString.call(obj) == "[object Array]";

/**
 * Test if the given object is a NodeList
 * @param {Object} obj The object to test
 */
const isNodeList = obj => Object.prototype.toString.call(obj) == "[object NodeList]";

/**
 * Test if the given object is a Date
 * @param {Object} obj The object to test
 */
const isDate = obj => obj instanceof Date;

/**
 * Is the object a string?
 * @param obj
 * @returns {boolean}
 */
const isString = obj => typeof obj == "string";

/**
 * To know whether an element is a valid html element or not.
 */
const isElement = ele =>
  ele && ele.nodeType && (ele.nodeType == 1 || ele.nodeType == 11 || ele.nodeType == 9);

/**
 * Test if the given object is a plain JavaScript Object
 * @param {Object} obj The object to test
 */
const isPlainObject = obj => {
  // Make sure that DOM nodes and window objects don't pass through, as well
  if (
    !obj ||
    Object.prototype.toString.call(obj) !== "[object Object]" ||
    obj.nodeType ||
    obj.setInterval
  ) {
    return false;
  }

  // Not own constructor property must be Object
  if (
    obj.constructor &&
    !hasOwnProperty.call(obj, "constructor") &&
    !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")
  ) {
    return false;
  }

  let plain = true;

  // Own properties are enumerated firstly
  let key;
  for (key in obj) {
    // Since other libraries might extend Object directly, we need to allow
    // those elements to pass thru and still be a plain object
    if (
      !plain ||
      key === undefined ||
      hasOwnProperty.call(obj, key) ||
      (!hasOwnProperty.call(obj, key) && hasOwnProperty.call(Object.prototype, key))
    ) {
      plain = false;
    }
  }

  return plain;
};

/**
 * Sets the context of a function (taken from underscore.js)
 * @param func
 * @param context The variable that will be passed in and used as 'this'
 * @param arg1, arg2, arg3, etc
 * @returns {Function}
 */
const proxy = (func, context) => func.bind(context);

/**
 * Dispose of all the members of an object. Useful for preventing memory leaks
 * @param obj
 */
const dispose = obj => {
  if (obj) {
    if (obj.length) {
      for (let i = obj.length - 1; i >= 0; i--) {
        obj[i] = null;
      }
    }
    for (const prop in obj) {
      const tob = typeof obj[prop];
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
const getParam = parm => {
  const vars = {};
  _W.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, key, value) => {
    vars[key] = value;
  });
  const vrl = vars[parm];
  return vrl ? decodeURIComponent(vrl) : vrl;
};

/**
 * Get query string parameters, this cleans up any # values and gets only the value of the key.
 * @param parm
 * @returns {string}
 */
const getQueryString = parm => {
  const vars = {};
  _W.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (m, key, value) => {
    if (value.indexOf("#") > -1) {
      vars[key] = value.substring(0, value.indexOf("#"));
    } else {
      vars[key] = value;
    }
  });
  const vrl = vars[parm];
  return vrl ? decodeURIComponent(vrl) : vrl;
};

/**
 * Run some code at the earliest opportunity out of sync with the current
 * execution cycle.
 * @param cb
 */
const nextTick = cb => setTimeout(cb, 0);

/**
 * Extend one object to include the parameters of the first.
 * If the last argument is a boolean (and false) it will force a surface-level copy.
 * Warning: Arrays are handled like values. ext({a:[1,2]}, {a:[3]}) == {a:[3]}
 */
function ext() {
  const a = arguments;
  let target = a[0] || {};
  let i = 1;
  const lnt = a.length;
  let options;
  let name;
  let copy;
  const surface = arguments[arguments.length - 1] === false;

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && typeof target !== "function") {
    target = {};
  }

  // extend this if only one argument is passed
  if (lnt === i) {
    target = this;
    --i;
  }

  for (; i < lnt; i++) {
    // Only deal with non-null/undefined values
    if (typeof (options = a[i]) != "undefined") {
      // Extend the base object
      for (name in options) {
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy) {
          continue;
        }

        // Don't bring in undefined values
        if (copy !== undefined) {
          if (copy instanceof Array) {
            // Clone the array
            copy = copy.slice(0);
          } else if (copy instanceof Date) {
            copy = new Date(copy.getTime());
          } else if (copy === null) {
            copy = null;
          } else if (typeof copy == "object" && !surface) {
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
}

/**
 * Compare 2 objects and return the differences.
 * The returned object contains all the properties of objA which
 * are absent or different than of objB.
 * @param objA object to compare
 * @param objB object reference
 * @param stackCache : internally used to block potential circular recursions loop
 * @return obj of all differences
 */
const diff = (objA, objB, stackCache) => {
  // keep references of the parent objects to avoid circular recursion loop
  stackCache = stackCache || [];

  const oDiff = {};
  let copy;

  for (const name in objA) {
    copy = objA[name];

    // Prevent never-ending loop
    if (copy === objA || copy === undefined) {
      continue;
    }

    // difference?
    if (!isDefined(objB[name]) || copy !== objB[name]) {
      // go deeper if this is an object
      if (isObject(copy) && !isArray(copy)) {
        // Skip that if it's already one of the parents
        if (
          stackCache.some(function(c) {
            return c === this;
          }, copy)
        ) {
          continue;
        }

        stackCache.push(copy);
        const childDiff = diff(copy, objB[name], stackCache);
        if (isDefined(childDiff)) {
          // ignore empty objects, strings and arrays
          if (!childDiff.length || childDiff.length > 0) {
            oDiff[name] = childDiff;
          }
        }
        stackCache.pop();
      } else {
        oDiff[name] = copy;
      }
    }
  }

  return oDiff;
};

/**
 * Get/set an attribute
 * @param elm
 * @param atr
 * @returns {*}
 */
const attr = (elm, atr, val) => {
  if (isDefined(val)) {
    elm.setAttribute(atr, val);
  }
  return !!elm && elm.getAttribute ? elm.getAttribute(atr) : null;
};

/**
 * Convert a list of parameters and a base URL to a properly qualified URL
 */
const toQueryString = (params, base) => {
  let pList = isDefined(base) ? base + (base.indexOf("?") > -1 ? "&" : "?") : "";
  let pm;
  if (params) {
    for (const nm in params) {
      pm = params[nm];
      if (!isString(pm)) {
        pm = JSON.stringify(pm);
      }
      pList += `${encodeURIComponent(nm)}=${encodeURIComponent(pm)}&`;
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
  let i;
  let part;
  for (i = 0; i < ary.length; i++) {
    part = ary[i];
    if (part === ".") {
      ary.splice(i, 1);
      i -= 1;
    } else if (part === "..") {
      // If at the start, or previous value is still ..,
      // keep them so that when converted to a path it may
      // still work when converted to a path, even though
      // as an ID it is less than ideal. In larger point
      // releases, may be better to just kick out an error.
      if (i === 0 || (i == 1 && ary[2] === "..") || ary[i - 1] === "..") {
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
const compute = vstr => {
  const f = new [].constructor.constructor(vstr);
  return f.call(_W);
};

/**
 * Safer toLowerCase
 * @param str
 * @returns {*}
 */
const toLowerCase = str => {
  if (isString(str)) {
    return str.toLowerCase();
  }
  return "";
};

/**
 * Hide FSR UI Visibility with CSS
 * @param any
 * @returns {*}
 */

const setFSRVisibility = isVisible => {
  const htmlClassList = document.documentElement.classList;
  const hideClass = "_fsrclientInvokedHide";

  if (isVisible) {
    htmlClassList.add(hideClass);
  } else {
    htmlClassList.remove(hideClass);
  }
};

export {
  ap,
  hasProp,
  getOwn,
  eachProp,
  isDefined,
  isFunction,
  isObject,
  isArray,
  isNodeList,
  isDate,
  isString,
  isElement,
  isPlainObject,
  proxy,
  dispose,
  getParam,
  getQueryString,
  nextTick,
  ext,
  diff,
  attr,
  toQueryString,
  trimDots,
  compute,
  toLowerCase,
  setFSRVisibility,
};
