/**
 * Reading and writing cookies
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Storage.Cookie");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");

(function (utils) {

  /**
   * @class A cookie which stores its data as a JSON object.  Use the class
   *    read() and write() methods to access basic cookie functionality to
   *    read and write simple string values.
   * @param guid {String} The unique ID of the storage object. This helps separate storage instances between tabs, etc.
   * @param options {Object}
   * @constructor
   */
  utils.Cookie = function (options) {
    // Set up the cookie switches
    this.opts = options || {};
  };

  /**
   * Set a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  utils.Cookie.prototype.set = function (key, value, opts) {
    var _opts = this.opts,
      v;
    if (opts) {
      _opts = fs.ext({}, _opts, opts);
    }
    // Convert the data to a string
    value = fs.isDefined(_opts.encode) ? fs.enc(value) : value;

    // Encode the cookie name
    key = fs.enc(key);

    // Localhost exception
    if (_opts.domain == 'localhost') {
      delete _opts.domain;
    }

    // Apply "secure" flag (to lock cookie to HTTPS)
    // The flag has to exist and be set to something different than "false"
    // That should only apply in cases where hasSSL
    if (fs.config.secureCookie && fs.config.secureCookie !== "false" && fs.hasSSL !== "false") {
      value += ";secure";
    }

    // Apply the options
    for (var opt in _opts) {
      if (_opts[opt]) {
        v = _opts[opt];
        // "duration" needs to map to "expires"
        value += ';' + (opt == 'duration' ? 'expires' : opt);
        switch (opt) {
          // -1 = EXPIRE NOW
          case 'expires':
            value += '=' + (fs.isDate(v) ? v.toUTCString() : v) + ';';
            break;
          case 'duration':
            value += '=' + new Date(utils.now() + (v * utils.FULL_DAY)).toUTCString() + ';';
            break;
          default:
            value += '=' + v;
        }
      }
    }
    // /* pragma:DEBUG_START */
    // console.log("cookie: " + key + "=" + value);
    // /* pragma:DEBUG_END */

    // Set the actual cookie
    document.cookie = key + '=' + value;
  };

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   */
  utils.Cookie.prototype.get = function (key) {
    var va = document.cookie.match('(?:^|;)\\s*' + utils.escapeRegExp(key) + '=([^;]*)');
    return (va) ? decodeURIComponent(va[1]) : null;
  };

  /**
   * Delete a cookie from the browser, by name.
   * @param cookieName {String} The name of the cookie to delete
   */
  utils.Cookie.prototype.kill = function (cookieName) {
    var expireDate = new Date();
    expireDate.setTime(expireDate.getTime() - (9999));
    this.set(cookieName, '', { 'expires': expireDate.toUTCString() });
  };
})(utils);