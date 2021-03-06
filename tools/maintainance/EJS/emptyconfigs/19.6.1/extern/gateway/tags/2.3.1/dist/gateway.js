"use strict";
/**
 * @preserve
 * ForeSee Gateway Script v2.3.1. Friday, February 23rd, 2018, 12:00:21 PM
 * (c) Copyright 2016, ForeSee. http://www.foresee.com
 * Patents pending.
 **/
;
(function() {
    // Some global quickreferences
    var _W = window,
        _D = _W.document,
        supportsDomStorage = !!_W.sessionStorage,
        skipInit = false,
        _HD = _D.getElementsByTagName("head"),
        _moduleLocationOverride,
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        gatewayVersion = 2.03;

    if (isOpera) {
        return;
    }

    if (_HD && _HD.length > 0) {
        _HD = _HD[0];
    } else {
        _HD = _D.body;
    }

    try {
        if (supportsDomStorage) {
            sessionStorage.setItem('_', '');
        }
    } catch (e) {
        supportsDomStorage = false;
    }
    /**
     * Holds the global configuration
     * @type {{}}
     */
    var globalConfig = {},
        productConfig = {};

    /**
     * @preserve
     * [GENERAL_CONFIG]
     */

    /**
     * Don't allow multiple copies of gateway to be added to the page.
     * Also exit if the browser is too old (no JSON object)
     */
    if (typeof(_W["_fsDefine"]) != 'undefined' || !JSON || document.documentMode < 10) {
        return;
    }
    /**
     * Storage class.
     * @constructor
     */
    var stg = function() {};

    /**
     * Does an item exist
     * @param itm
     */
    stg.prototype.has = function(itm) {
        return this.get(itm) !== null;
    };

    /**
     * Get a value (null if not there)
     * @param itm
     */
    stg.prototype.get = function(itm) {
        var res = null;
        if (supportsDomStorage) {
            res = localStorage.getItem(itm);
            if (!res) {
                res = sessionStorage.getItem(itm);
            }
        }
        return res;
    };

    /**
     * Set a value
     * @param itm
     * @param val
     */
    stg.prototype.set = function(itm, val) {
        if (supportsDomStorage) {
            try {
                localStorage.setItem(itm, val.toString());
            } catch (e) {
                try {
                    sessionStorage.setItem(itm, val.toString());
                } catch (e) {

                }
            }
        }
    };
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
    var hasProp = function(obj, prop) {
        return hasOwn.call(obj, prop);
    };

    /**
     * Get an objects own property
     * @param obj
     * @param prop
     * @returns {boolean|*}
     */
    var getOwn = function(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    };

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    var eachProp = function(obj, func) {
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
    var isDefined = function(obj) {
        return (null !== obj && "undefined" !== typeof obj);
    };

    /**
     * Test if the given object is a function
     * @param {Object} obj The object to test
     */
    var isFunction = function(obj) {
        return typeof(obj) == "function";
    };

    /**
     * Test if the given object is an object
     * @param {Object} obj The object to test
     */
    var isObject = function(obj) {
        return typeof(obj) == "object";
    };

    /**
     * Test if the given object is an Array
     * @param {Object} obj The object to test
     */
    var isArray = function(obj) {
        return Object.prototype.toString.call(obj) == "[object Array]";
    };

    /**
     * Test if the given object is a Date
     * @param {Object} obj The object to test
     */
    var isDate = function(obj) {
        return obj instanceof Date;
    };

    /**
     * Is the object a string?
     * @param obj
     * @returns {boolean}
     */
    var isString = function(obj) {
        return (typeof obj == "string");
    };


    /**
     * Test if the given object is a plain JavaScript Object
     * @param {Object} obj The object to test
     */
    var isPlainObject = function(obj) {
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
    var proxy = function(func, context) {
        var args, bound,
            nativeBind = Function.prototype.bind,
            slice = Array.prototype.slice;
        if (nativeBind && func.bind === nativeBind) {
            return nativeBind.apply(func, slice.call(arguments, 1));
        }
        args = slice.call(arguments, 2);
        bound = function() {
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
    var dispose = function(obj) {
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
    var getParam = function(parm) {
        var vars = {},
            parts = _W.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
                function(m, key, value) {
                    vars[key] = value;
                }),
            vrl = vars[parm];
        return (!!vrl ? decodeURIComponent(vrl) : vrl);
    };

    /**
     * Get query string parameters, this cleans up any # values and gets only the value of the key.
     * @param parm
     * @returns {string}
     */
    var getQueryString = function(parm) {
        var vars = {},
            parts = _W.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
                function(m, key, value) {
                    if (value.indexOf('#') > -1) {
                        vars[key] = value.substring(0, value.indexOf('#'));
                    } else {
                        vars[key] = value;
                    }
                }),
            vrl = vars[parm];
        return (!!vrl ? decodeURIComponent(vrl) : vrl);
    };

    /**
     * Run some code at the earliest opportunity out of sync with the current
     * execution cycle.
     * @param cb
     */
    var nextTick = function(cb) {
        setTimeout(cb || function() {}, 20);
    };

    /**
     * Extend one object to include the parameters of the first.
     * If the last argument is a boolean (and false) it will force a surface-level copy.
     * Warning: Arrays are handled like values. ext({a:[1,2]}, {a:[3]}) == {a:[3]}
     */
    var ext = function() {
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
                        } else if (copy === null) {
                            copy = null;
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
     * Compare 2 objects and return the differences.
     * The returned object contains all the properties of objA which
     * are absent or different than of objB.
     * @param objA object to compare
     * @param objB object reference
     * @param stackCache : internally used to block potential circular recursions loop
     * @return obj of all differences
     */
    var diff = function(objA, objB, stackCache) {
        // keep references of the parent objects to avoid circular recursion loop
        stackCache = stackCache || [];

        var oDiff = {},
            copy;

        for (var name in objA) {
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
                    if (stackCache.some(function(c) {
                            return c === this;
                        }, copy)) {
                        continue;
                    }

                    stackCache.push(copy);
                    var childDiff = diff(copy, objB[name], stackCache);
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
    var attr = function(elm, atr, val) {
        if (isDefined(val)) {
            elm.setAttribute(atr, val);
        }
        return (!!elm && elm.getAttribute) ? elm.getAttribute(atr) : null;
    };

    /**
     * Convert a list of parameters and a base URL to a properly qualified URL
     */
    var toQueryString = function(params, base) {
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
    var compute = function(vstr) {
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

    /**
     * Hide FSR UI Visibility with CSS
     * @param any
     * @returns {*}
     */

    var setFSRVisibility = function(isVisible) {
        var htmlClassList = document.documentElement.classList;
        var hideClass = "_fsrclientInvokedHide";

        if (isVisible) {
            htmlClassList.add(hideClass);
        } else {
            htmlClassList.remove(hideClass);
        }
    };
    /**
     * Event Bind
     * @param element
     * @param type
     * @param handler
     * @private
     */
    function __eB(element, type, handler) {
        if (element.addEventListener) {
            element.addEventListener(type, handler, false);
        } else {
            element.attachEvent('on' + type, handler);
        }
    }

    /**
     * Bind to the onload event. Also works if the onload event has already fired
     * @param cb
     */
    var winload = function(cb) {
        if (_D.readyState === 'complete') {
            nextTick(cb);
        } else {
            __eB(_W, 'load', cb);
        }
    };
    /**
     * Quickreference window
     * @type {Window}
     */
    var require,
        define,
        ap = Array.prototype,
        apsp = ap.splice;

    /**
     * Get the scripts for this document
     * @returns {NodeList}
     */
    function getAllScripts() {
        return _D.getElementsByTagName('script');
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function(value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value && !isArray(value) && !isFunction(value) && !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }


    /**
     * Looks to see if a common-js define() method is defined. If not, provides it
     * @type {*}
     */
    var global = _W,
        req, s, head, baseElement, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        // PS3 indicates loaded and complete, but need to wait for complete
        // specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        // to feature test w/o causing perf issues.
        readyRegExp = navigator.platform === 'PLAYSTATION 3' ?
        /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    /**
     * No-op for on error
     * @param err
     */
    function defaultOnError(err) {}

    // Allow getting a global that is expressed in
    // dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function(part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Build a new context
     * @param contextName
     * @returns {{config: {waitSeconds: number, baseUrl: string, paths: {}, bundles: {}, pkgs: {}, shim: {}, config: {}}, contextName: *, registry: {}, defined: {}, urlFetched: {}, defQueue: Array, Module: (Module|*), makeModuleMap: makeModuleMap, nextTick: (Function|*), onError: onError, configure: context.configure, makeShimExports: context.makeShimExports, makeRequire: context.makeRequire, enable: context.enable, completeLoad: context.completeLoad, nameToUrl: context.nameToUrl, load: context.load, execCb: context.execCb, onScriptLoad: context.onScriptLoad, onScriptError: context.onScriptError}|*}
     */
    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                // Defaults. Do not set a default for map
                // config to speed up normalize(), which
                // will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            // registry of just enabled modules, to speed
            // cycle breaking code when lots of modules
            // are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            // Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    // Convert baseName to array, and lop off the last part,
                    // so that . matches that 'directory' and not name of the baseName's
                    // module. For instance, baseName of 'one/two/three', maps to
                    // 'one/two/three.js', but we want the directory, 'one/two' for
                    // this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            // Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        // Find the longest baseName segment match in the config.
                        // So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            // baseName segment has config, find if it has one for
                            // this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    // Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    // Check for a star map match, but just hold on to it,
                    // if there is a shorter segment match later in a matching
                    // config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        /**
         * Pull a script out of the sequence
         * @param name
         */
        function removeScript(name) {
            each(getAllScripts(), function(scriptNode) {
                if (attr(scriptNode, 'data-requiremodule') === name &&
                    attr(scriptNode, 'data-requirecontext') === context.contextName) {
                    scriptNode.parentNode.removeChild(scriptNode);
                    return true;
                }
            });
        }

        /**
         * Is there a path fallback?
         * @param id
         * @returns {boolean}
         */
        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                // Pop off the first array value, since it failed, and
                // retry
                pathConfig.shift();
                context.require.undef(id);

                // Custom require that does not do map translation, since
                // ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        // Turns a plugin!resource to [plugin, resource]
        // with the plugin being undefined if the name
        // did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            // If no name, then it means it is a require call, generate an
            // internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            // Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        // Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function(name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                            normalize(name, parentName, applyMap) :
                            name;
                    }
                } else {
                    // A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    // Normalized name may be a plugin ID due to map config
                    // application in normalize. The map config values must
                    // already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            // If the id is a plugin id that cannot be determined if it needs
            // normalization, stamp it with a unique ID so two matching relative
            // ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                '_unnormalized' + (unnormalizedCounter += 1) :
                '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                    prefix + '!' + normalizedName :
                    normalizedName) + suffix
            };
        }

        /**
         * Get a module
         * @param depMap
         * @returns {boolean|*}
         */
        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        /**
         * On
         * @param depMap
         * @param name
         * @param fn
         */
        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        /**
         * On error
         * @param err
         * @param errback
         */
        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            // Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                // Array splice in the values since the context code has a
                // local var ref to defQueue, so cannot just reassign the one
                // on context.
                apsp.apply(defQueue, [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function(mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function(mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function(mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function() {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            // Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function(depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    // Only force things that have not completed
                    // being defined, so still in the registry,
                    // and only if it has not been matched up
                    // in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                // It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            // Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            // Figure out the state of all the modules.
            eachProp(enabledRegistry, function(mod) {
                var map = mod.map,
                    modId = map.id;

                // Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    // If the module should be executed, and it has not
                    // been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                return;
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function(mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if (!checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function() {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function(map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;
        };

        Module.prototype = {
            init: function(depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    // Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    // If no errback already, but there are error listeners
                    // on this module, set up an errback to pass to the deps.
                    errback = proxy(function(err) {
                        this.emit('error', err);
                    }, this);
                }

                // Do a copy of the dependency array, so that
                // source inputs are not modified. For example
                // "shim" deps are passed in here directly, and
                // doing a direct modification of the depMaps array
                // would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                // Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                // Could have option to init this module in enabled mode,
                // or could have been previously marked as enabled. However,
                // the dependencies are not known until init is called. So
                // if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    // Enable this module and dependencies.
                    // Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function(i, depExports) {
                // Because of cycles, defined callback for a given
                // export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function() {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], proxy(function() {
                        return map.prefix ? this.callPlugin() : this.load();
                    }, this));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function() {
                var url = this.map.url;

                // Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function() {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    // The factory could trigger another require call
                    // that would result in checking this module to
                    // define itself again. If already in the process
                    // of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            // If there is an error listener, favor passing
                            // to that instead of throwing an error. However,
                            // only do it for define()'d  modules. require
                            // errbacks should not be called for failures in
                            // their callbacks (#699). However if a global
                            // onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    // exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            // Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        // Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    // Finished the define stage. Allow calling check again
                    // to allow define notifications below in the case of a
                    // cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function() {
                var map = this.map,
                    id = map.id,
                    // Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                // Mark this as a dependency for this plugin, so it
                // can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', proxy(function(plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    // If current map is not normalized, wait for that
                    // normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        // Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function(name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        // prefix and name should already be normalized, no need
                        // for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                            this.map.parentMap);
                        on(normalizedMap,
                            'defined', proxy(function(value) {
                                this.init([], function() {
                                    return value;
                                }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }, this));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            // Mark this as a dependency for this plugin, so it
                            // can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', proxy(function(err) {
                                    this.emit('error', err);
                                }, this));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    // If a paths config, then just load that file instead to
                    // resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = proxy(function(value) {
                        this.init([], function() {
                            return value;
                        }, null, {
                            enabled: true
                        });
                    }, this);

                    load.error = proxy(function(err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        // Remove temp unnormalized modules for this module,
                        // since they will never be resolved otherwise now.
                        eachProp(registry, function(mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    }, this);

                    // Allow plugins to load other code without having to know the
                    // context or how to 'complete' the load.
                    load.fromText = proxy(function(text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        // As of 2.1.0, support just passing the text, to reinforce
                        // fromText only being called once per resource. Still
                        // support old style of passing moduleName but discard
                        // that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return;
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    }, this);

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }, this));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function() {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, proxy(function(depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                            (this.map.isDefine ? this.map : this.map.parentMap),
                            false, !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', proxy(function(depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }, this));

                        if (this.errback) {
                            on(depMap, 'error', proxy(this.errback, this));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }, this));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, proxy(this, function(pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }, this));

                this.enabling = false;

                this.check();
            },

            on: function(name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function(name, evt) {
                each(this.events[name], function(cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && attr(node, 'data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            // Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            // Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return;
                } else {
                    // args are id, deps, factory. Should be normalized by the
                    // define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function(cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                // Save off the paths since they require special processing,
                // they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function(value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                // Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function(value, prop) {
                        each(value, function(v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                // Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function(value, id) {
                        // Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                // Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function(pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? {
                            name: pkgObj
                        } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        // Save pointer to main module ID for pkg name.
                        // Remove leading dot in main, so main paths are normalized,
                        // and remove any trailing .js, since different package
                        // envs have different conventions: some use a module name,
                        // some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                            .replace(currDirRegExp, '')
                            .replace(jsSuffixRegExp, '');
                    });
                }

                // If there are any "waiting to execute" modules in the registry,
                // update the maps for them, since their info, like URLs to load,
                // may have changed.
                eachProp(registry, function(mod, id) {
                    // If module already has init called, since it is too
                    // late to modify them, and ignore unnormalized ones
                    // since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                // If a deps array or a config callback is specified, then call
                // require with those args. This is useful when require is defined as a
                // config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function(value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }

                return fn;
            },

            makeRequire: function(relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            // Invalid call
                            return;
                        }

                        // If require|exports|module are requested, get the
                        // value for them from the special handlers. Caveat:
                        // this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        // Synchronous access to one module. If require.get is
                        // available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        // Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return;
                        }
                        return defined[id];
                    }

                    // Grab defines waiting in the global queue.
                    intakeDefines();

                    // Mark all the dependencies as needing to be loaded.
                    context.nextTick(function() {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });
                    return localRequire;
                }

                mixin(localRequire, {
                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function(moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                            relMap && relMap.id, true), ext, true);
                    },

                    defined: function(id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function(id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                // Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function(id) {
                        // Bind any waiting define() calls to this context,
                        // fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function(depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function(moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                // Do this after the cycle of callGetModule in case the result
                // of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return;
                        }
                    } else {
                        // A script that does not call define(), so just simulate
                        // the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function(moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                    ((url.indexOf('?') === -1 ? '?' : '&') +
                        config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function(id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function(name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function(evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                    (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function(evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return;
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = function(deps, callback, errback, optional) {
        // Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }
        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function(config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function(fn) {
        setTimeout(fn, 4);
    } : function(fn) {
        fn();
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    require = req;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function(prop) {
        // Reference from contexts instead of early binding to default context,
        // so that during builds, the latest instance of the default context
        // with its config gets used.
        req[prop] = function() {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    head = s.head = _HD;
    // If BASE tag is in play, using appendChild is a problem for IE6.
    // When that browser dies, this can be removed. Details in this jQuery bug:
    // http://dev.jquery.com/ticket/2709
    baseElement = _D.getElementsByTagName('base')[0];
    if (baseElement) {
        head = s.head = baseElement.parentNode;
    }


    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function(config, moduleName, url) {
        var node = config.xhtml ? _D.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') : _D.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function(context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        //In the browser so use a script tag
        node = req.createNode(config, moduleName, url);

        node.setAttribute('data-requirecontext', context.contextName);
        node.setAttribute('data-requiremodule', moduleName);

        //Set up load listener. Test attachEvent first because IE9 has
        //a subtle issue in its addEventListener and script onload firings
        //that do not match the behavior of all other browsers with
        //addEventListener support, which fire the onload event for a
        //script right after the script execution. See:
        //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
        //UNFORTUNATELY Opera implements attachEvent but does not follow the script
        //script execution mode.
        if (node.attachEvent &&
            // Check if node.attachEvent is artificially added by custom script or
            // natively supported by browser
            // read https://github.com/jrburke/requirejs/issues/187
            // if we can NOT find [native code] then it must NOT natively supported.
            // in IE8, node.attachEvent does not have toString()
            // Note the test for "[native code" with no closing brace, see:
            // https://github.com/jrburke/requirejs/issues/273
            !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) && !isOpera) {
            // Probably IE. IE (at least 6-8) do not fire
            // script onload right after executing the script, so
            // we cannot tie the anonymous define call to a name.
            // However, IE reports the script as being in 'interactive'
            // readyState at the time of the define call.
            useInteractive = true;

            node.attachEvent('onreadystatechange', context.onScriptLoad);
            //It would be great to add an error handler here to catch
            //404s in IE9+. However, onreadystatechange will fire before
            //the error handler, so that does not help. If addEventListener
            //is used, then IE will fire error before load, but we cannot
            //use that pathway given the connect.microsoft.com issue
            //mentioned above about not doing the 'script execute,
            //then fire the script load event listener before execute
            //next script' that other browsers do.
            //Best hope: IE10 fixes the issues,
            //and then destroys all installs of IE 6-9.
            //node.attachEvent('onerror', context.onScriptError);
        } else {
            node.addEventListener('load', context.onScriptLoad, false);
            node.addEventListener('error', context.onScriptError, false);
        }
        node.src = url;

        //For some cache cases in IE 6-8, the script executes before the end
        //of the appendChild execution, so to tie an anonymous define
        //call to the module name (which is stored on the node), hold on
        //to a reference to this node, but clear after the DOM insertion.
        currentlyAddingScript = node;
        if (baseElement) {
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }
        currentlyAddingScript = null;

        return node;

    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(getAllScripts(), function(script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function(name, deps, callback) {
        var node, context;

        // Allow for anonymous modules
        if (typeof name !== 'string') {
            // Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        // This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        // If no name, and callback is a function, then figure out if it a
        // CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            // Remove comments from the callback string,
            // look for require calls, and pull them into the dependencies,
            // but only if there are function args.
            if (callback.length && callback.toString) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function(match, dep) {
                        deps.push(dep);
                    });

                // May be a CommonJS thing even without require calls, but still
                // could use exports, and module. Avoid doing exports and module
                // work though if it just needs require.
                // REQUIRES the function to expect the CommonJS variables in the
                // order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        // If in IE 6-8 and hit an anonymous define() call, do the interactive
        // work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = attr(node, 'data-requiremodule');
                }
                context = contexts[attr(node, 'data-requirecontext')];
            }
        }

        // Always save off evaluating the def call until the script onload handler.
        // This allows multiple modules to be in a file without prematurely
        // tracing dependencies, and allows for anonymous module support,
        // where the module name is not known until the script onload event
        // occurs. If no context, use the global queue, and get it processed
        // in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function(text) {
        /*jslint evil: true */
        return new Function(text)();
    };

    //Set up with config info.
    req(cfg);

    // Expose to the window
    _W._fsDefine = _W._acsDefine = define;
    _W._fsRequire = _W._acsRequire = function() {
        /* pragma:DEBUG_START */
        console.log("gw: ", globalConfig.deferredLoading ? "deferredLoading" : "immediate loading");
        /* pragma:DEBUG_END */
        if (globalConfig.deferredLoading) {
            winload(function(args) {
                return function() {
                    require.apply(window, args);
                };
            }(arguments));
        } else {
            require.apply(window, arguments);
        }
    };
    /**
     * Exposes API methods to the page
     * @type {{_enforceGlobalNS: API._enforceGlobalNS, expose: API.expose}}
     */
    var API = {
        /**
         * Sets up the global namespace for API
         * @private
         */
        _enforceGlobalNS: function() {
            if (!_W.FSR) {
                _W.FSR = {};
            }
            if (!_W.FSFB) {
                _W.FSFB = {};
            }
        },
        /**
         * Expose a function or property onto the API
         * @param name
         * @param obj
         */
        expose: function(name, obj) {
            API._enforceGlobalNS();
            _W.FSR[name] = _W.FSFB[name] = obj;
        },

        /**
         * Get an API item
         * @param name
         * @returns {*}
         */
        retrieveFromAPI: function(name) {
            API._enforceGlobalNS();
            return _W.FSR[name];
        }
    };

    // Expose setFSRVisibility across all products instead of individually.
    API.expose("setFSRVisibility", setFSRVisibility);

    /*jshint -W030 */
    /**
     * DomReady implementation. Compatible with:
     * IE6+
     * Firefox 2+
     * Safari 3+
     * Chrome *
     * Opera *
     * Based on domready 0.3.0 (c) Dustin Diaz 2012 - License MIT
     * https://github.com/ded/domready/tree/v0.3.0
     * Minor changes for hinting and brevity were made.
     */
    var domReady = function(ready) {
        var fns = [],
            fn,
            f = false,
            doc = document,
            testEl = doc.documentElement,
            hack = testEl.doScroll,
            domContentLoaded = 'DOMContentLoaded',
            addEventListener = 'addEventListener',
            onreadystatechange = 'onreadystatechange',
            readyState = 'readyState',
            loadedRgx = hack ? /^loaded|^c/ : /^loaded|c/,
            loaded = loadedRgx.test(doc[readyState]);

        function flush(f) {
            loaded = 1;
            do {
                f = fns.shift();
                if (f) {
                    f();
                }
            } while (f);
        }

        doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function() {
            doc.removeEventListener(domContentLoaded, fn, f);
            flush();
        }, f);


        hack && doc.attachEvent(onreadystatechange, fn = function() {
            if (/^c/.test(doc[readyState])) {
                doc.detachEvent(onreadystatechange, fn);
                flush();
            }
        });

        return (ready = hack ?
            function(fn) {
                self != top ?
                    loaded ? fn() : fns.push(fn) :
                    function() {
                        try {
                            testEl.doScroll('left');
                        } catch (e) {
                            return setTimeout(function() {
                                ready(fn);
                            }, 50);
                        }
                        fn();
                    }();
            } :
            function(fn) {
                loaded ? fn() : fns.push(fn);
            });
    }();
    /**
     * Reads commands embedded in hashes in the URL. Returns true or false.
     * @param commandName
     * @returns Boolean
     */
    var fsCmd = function(commandName) {
            var hv = (location.hash + '').toLowerCase();
            commandName = (commandName || '').toLowerCase();
            if (/fscommand|fscmd|acscmd|acscommand/.test(hv) && hv.indexOf(commandName) > -1) {
                return true;
            }
            return false;
        },
        acsCmd = fsCmd;

    // To prevent compression
    fsCmd('');
    acsCmd('');
    /**
     * Locating self
     * @type {{}}
     */
    var locator = {};

    /**
     * What environment are we in?
     * @type {string}
     */
    locator.environment = 'production';

    /**
     * Where these files are found
     */
    locator.gatewayLocation = (function() {
        var scrs = _D.getElementsByTagName("script"),
            gwScr,
            pgwScr,
            g = "gateway",
            src,
            tm,
            s = '/',
            gwl,
            cv,
            au,
            svu,
            asso,
            rovr,
            prodcfg,
            isself,
            hasssl;

        if (_HD) {
            skipInit = attr(_HD, "data-skipfsinit") == "true";
            gwl = attr(_HD, "data-fsgatewaylocparam");
            cv = attr(_HD, "data-codeversion");
            au = attr(_HD, "data-analyticsurl");
            svu = attr(_HD, "data-surveyurl");
            asso = attr(_HD, "data-product-assets");
            rovr = attr(_HD, "data-codelocation");
            prodcfg = attr(_HD, "data-productconfig");
            isself = attr(_HD, "data-isselfhosted");
            // whether or not the host has SSL
            hasssl = attr(_HD, "data-hasssl");

            if (gwl) {
                gwl = getParam(gwl);
            }
            locator.isSelfHosted = false;
            if (isself) {
                locator.isSelfHosted = (getParam(isself) == 'true');
            }
            locator.hasSSL = true;
            if (hasssl) {
                locator.hasSSL = (getParam(hasssl) != 'true');
            }
            if (rovr) {
                locator.rootOverride = getParam(rovr);
            }
            if (asso) {
                locator.assetOverride = getParam(asso);
            }
            if (prodcfg) {
                locator.productCfgOverride = getParam(prodcfg);
            }
            if (cv) {
                if (typeof globalConfig !== "undefined") {
                    globalConfig.codeVer = getParam(cv);
                } else {
                    globalConfig = {
                        codeVer: getParam(cv)
                    };
                }
            }

            if (au) {
                if (typeof globalConfig !== "undefined") {
                    globalConfig.analyticsUrl = getParam(au);
                } else {
                    globalConfig = {
                        analyticsUrl: getParam(au)
                    };
                }
            }
            if (svu) {
                if (typeof globalConfig !== "undefined") {
                    globalConfig.surveyUrl = getParam(svu);
                } else {
                    globalConfig = {
                        surveyUrl: getParam(svu)
                    };
                }
            }
        }

        // if not yet present, get the site key from the URL (case: Tracker window)
        if (!globalConfig) {
            globalConfig = {};
        }
        if (typeof globalConfig.siteKey !== "string" || globalConfig.siteKey.length < 1) {
            globalConfig.siteKey = getParam("sitekey");
        }

        eachProp(scrs, function(scr, prop) {
            if (prop !== "length") {
                src = attr(scr, "src") || '';
                var dv = attr(scr, "data-vendor");
                if ((dv == "fs" || dv == "acs") && attr(scr, "data-role") == g) {
                    // This is definitely the gateway script
                    gwScr = scr;
                    tm = attr(scr, 'timing');
                } else if (src.indexOf(g) > -1) {
                    // This is potentially the gateway script
                    pgwScr = scr;
                }
            }
        });
        // If we didn't get a definite match, then maybe we found a potential match
        if (!gwScr) {
            gwScr = pgwScr;
        }
        if (gwScr) {
            locator.gwScript = gwScr;
            src = gwl || attr(gwScr, "src");
            locator.environment = attr(gwScr, "data-environment") || locator.environment;
            locator.rootOverride = attr(gwScr, "data-codelocation") || locator.rootOverride;
            locator.assetOverride = attr(gwScr, "data-product-assets") || locator.assetOverride;
            locator.isSelfHosted = attr(gwScr, "data-isselfhosted") || locator.isSelfHosted;
            locator.hasSSL = attr(gwScr, "data-hasssl") || locator.hasSSL;
            if (src.indexOf(':/') == -1 && src.substr(0, 1) != s) {
                scrs = (_W.location.href + '').split(s);
                if (scrs[scrs.length - 1].indexOf('.') > -1 && scrs[scrs.length - 1].toLowerCase() != _W.location.hostname.toLowerCase()) {
                    scrs.pop();
                }
                src = scrs.join(s) + (src.substr(0, 1) == s ? '' : s) + src;
            }
            src = src.split(s);
            src.pop();
            trimDots(src);
            return src.join(s) + s;
        }
    })();

    /**
     * Specifies the environment that this has been deployed to
     * @type {boolean}
     */
    locator.isProduction = (locator.gatewayLocation.toLowerCase().indexOf('production') > -1);

    /**
     * Subtract from parts of a url
     * @param base
     * @param notches
     * @returns {*}
     */
    function subtractFromURL(base, notches) {
        var pref = base.substr(0, base.indexOf('//')) + '//',
            suff = base.substr(pref.length),
            dom = suff.substr(suff.indexOf('/') + 1),
            tail = dom.substr(dom.lastIndexOf('/') + 1);

        dom = dom.substr(0, dom.length - tail.length - 1);
        suff = suff.substr(0, suff.indexOf('/'));

        var bits = dom.split('/');
        bits.length -= Math.min(bits.length, notches);

        return (pref + suff + '/' + bits.join('/') + tail).replace(/\/\/\//g, '//');
    }

    /**
     * Take any url and product a correct absolute url from it
     */
    locator.normalizeUrl = function(url) {
        // This is needed for OLD trigger code

        url = url.replace("foresee/", "trigger/");
        var rooturl = locator.gatewayLocation || '',
            suff;

        if (url.indexOf('v=') > -1) {
            return url;
        }
        // First, fix the URL
        if (url.substr(0, 1) == '$') {
            if (locator.rootOverride) {
                return url.replace('$', locator.rootOverride);
            } else {
                suff = (_moduleLocationOverride || ('code/' + globalConfig.codeVer + '/')) + url.replace('$', '');
                return rooturl == '/' ? rooturl + suff : subtractFromURL(rooturl, 3) + suff;
            }
        }

        if (url.indexOf('//') == -1) {
            url = rooturl.substr(rooturl.length - 1, 1) == '/' && url.substr(0, 1) == '/' ? rooturl + url.substr(1) : rooturl + url;
        }

        return url;
    };

    /**
     * Point a url at an asset
     * @param url
     */
    locator.normalizeAssetUrl = function(url) {
        return !!locator.assetOverride ? locator.assetOverride + url : locator.normalizeUrl(url);
    };

    // Expose the locator to the world
    _W["_fsNormalizeUrl"] = _W["_acsNormalizeUrl"] = locator.normalizeUrl;
    _W["_fsNormalizeAssetUrl"] = locator.normalizeAssetUrl;
    /**
     * Expose a module to the world
     */
    var extMod = {
        "supportsDomStorage": supportsDomStorage,
        "hasProp": hasProp,
        "fsCmd": fsCmd,
        "eachProp": eachProp,
        "isDefined": isDefined,
        "isFunction": isFunction,
        "isObject": isObject,
        "isArray": isArray,
        "isDate": isDate,
        "isString": isString,
        "isPlainObject": isPlainObject,
        "proxy": proxy,
        "dispose": dispose,
        "ext": ext,
        "diff": diff,
        "attr": attr,
        "makeURI": locator.normalizeUrl,
        "makeAssetURI": locator.normalizeAssetUrl,
        "home": locator.gatewayLocation,
        "isProduction": locator.isProduction,
        "getParam": getParam,
        "nextTick": nextTick,
        "toQueryString": toQueryString,
        "getQueryString": getQueryString,
        "isSelfHosted": locator.isSelfHosted,
        "hasSSL": locator.hasSSL,
        "compute": compute,
        "config": globalConfig,
        "productConfig": productConfig,
        "setFSRVisibility": setFSRVisibility,
        "gwConfigOverride": locator.productCfgOverride,
        "domReady": domReady,
        "winReady": winload,
        "tagVersion": "${versionTag}",
        "toLowerCase": toLowerCase,
        "enc": encodeURIComponent,
        "dec": decodeURIComponent,
        "assetLocation": locator.assetOverride,
        "codeLocation": locator.rootOverride,
        "startTS": !!(_W.performance && _W.performance.timing) ? _W.performance.timing.responseStart : (new Date()).getTime(),
        "API": API
    };

    define("fs", function() {
        return extMod;
    });

    // Backwards compatibility
    define("_acs", function() {
        return extMod;
    });
    domReady(function() {
        /* pragma:DEBUG_START */
        console.warn("gw: domReady");
        /* pragma:DEBUG_END */

        // Everything has to be done on nextTick to avoid race conditions
        nextTick(function() {
            var dm,
                i,
                fsrd = 'fsReady';

            if (locator.gwScript) {
                dm = attr(locator.gwScript, "data-module");
            }

            // This is a temporary measure for legacy embed snippets
            if (isDefined(_W["acsReady"])) {
                _W[fsrd] = _W["acsReady"];
            }
            if (!isDefined(_W["acsReady"])) {
                var altR = function() {
                    var aT = '__' + fsrd + '_stk__';
                    _W[aT] = _W[aT] || [];
                    _W[aT].push(arguments);
                };
                _W["acsReady"] = _W[fsrd] || altR;
            }

            var dependencies = [];

            /**
             * This will be called at the end regardless
             */
            var finalSetup = function() {
                if (globalConfig.minGatewayVersion && gatewayVersion) {
                    /* pragma:DEBUG_START */
                    console.warn("gw: minimum gateway version is " + globalConfig.minGatewayVersion + " but the actual version is " + gatewayVersion + " - bombing out");
                    /* pragma:DEBUG_END */
                    if (globalConfig.minGatewayVersion > gatewayVersion) {
                        return;
                    }
                }
                // Iterate over the products
                eachProp(productConfig, function(obj, prop) {
                    if (isDefined(globalConfig.products[prop.toLowerCase()]) && globalConfig.products[prop.toLowerCase()] === false) {
                        obj.check = false;
                    }
                    if (isFunction(obj.check)) {
                        obj.check = obj.check.call(obj);
                    }
                    if (!isDefined(obj.check)) {
                        obj.check = true;
                    }
                    if (!isDefined(obj.dependencies)) {
                        obj.dependencies = [];
                    }
                    /* pragma:DEBUG_START */
                    console.log("gw: checked " + prop + ", result was", obj.check);
                    /* pragma:DEBUG_END */
                    if (obj.check) {
                        dependencies = dependencies.concat(obj.dependencies);
                    }
                });

                if (!dm) {
                    /* pragma:DEBUG_START */
                    console.log("gw: dependencies", dependencies);
                    /* pragma:DEBUG_END */

                    for (i = 0; i < dependencies.length; i++) {
                        dependencies[i] = locator.normalizeUrl(dependencies[i]);
                    }
                    _fsRequire(dependencies, function() {
                        if (!_W['__' + fsrd + '__']) {
                            // Legacy acsReady/fsReady functionality
                            _W['__' + fsrd + '__'] = _W['__acsReady__'] = _W['fsReady'] = _W['acsReady'] = function() {
                                var args = arguments;
                                nextTick(function() {
                                    for (var p = 0; p < args.length; p++) {
                                        args[p].call(_W);
                                    }
                                });
                            };
                            var ns = _W['__' + fsrd + '_stk__'],
                                fnmaker = function(cb) {
                                    return function() {
                                        for (var p = 0; p < cb.length; p++) {
                                            cb[p].call(_W);
                                        }
                                    };
                                };
                            if (ns) {
                                for (var i = 0; i < ns.length; i++) {
                                    nextTick(fnmaker(ns[i]));
                                }
                                delete _W['__' + fsrd + '_stk__'];
                            }
                        }
                    });
                } else if (dm) {
                    nextTick(function() {
                        /* pragma:DEBUG_START */
                        console.log("gw: loading " + dm + " as data-module");
                        /* pragma:DEBUG_END */
                        _fsRequire([_fsNormalizeUrl(dm)], function() {
                            /* pragma:DEBUG_START */
                            console.log("gw: loaded " + dm + " successfully");
                            /* pragma:DEBUG_END */
                        });
                    });
                }
            };

            // Are we in a self-host situation?
            if (globalConfig.selfHosted) {
                /* pragma:DEBUG_START */
                console.log("gw: self hosted flow started");
                /* pragma:DEBUG_END */

                _fsRequire([locator.normalizeUrl("$fs.utils.js")], function(utils) {
                    var winStor = new utils.WindowStorage('fssetts', false),
                        appSett = winStor.get('setts');

                    if (!appSett) {
                        var transprt = new utils.AjaxTransport();
                        transprt.send({
                            method: "GET",
                            url: location.protocol + "//" + globalConfig.configLocation + "/" + locator.environment + "/config.json",
                            success: function(data) {
                                if (data) {
                                    winStor.set('setts', data);
                                    appSett = JSON.parse(data);
                                    ext(globalConfig, appSett.global);
                                    ext(productConfig, appSett);
                                    delete productConfig.global;
                                    winStor.commit();
                                    finishSelfHost(appSett);
                                }
                            }
                        });
                    } else {
                        appSett = JSON.parse(appSett);
                        ext(globalConfig, appSett.global);
                        ext(productConfig, appSett);
                        delete productConfig.global;
                        nextTick(function() {
                            finishSelfHost(appSett);
                        });
                    }

                    /**
                     * finish the self-host setup
                     */
                    var finishSelfHost = function(setts) {
                        setts.global.codeVer = globalConfig.codeVer;
                        ext(globalConfig, setts.global);
                        productConfig = {};
                        eachProp(setts, function(obj, prop) {
                            if (prop != 'global' && !(isDefined(globalConfig.products[prop]) && globalConfig.products[prop] === false)) {
                                dependencies.push('$fs.' + prop + '.js');
                                productConfig[prop] = {
                                    check: function(prp, bj) {
                                        return function() {
                                            define(prp + 'config', function() {
                                                return bj;
                                            });
                                        };
                                    }(prop, obj)
                                };
                            }
                        });
                        finalSetup();
                    };
                });
            } else {
                finalSetup();
            }
        });
    });
})();