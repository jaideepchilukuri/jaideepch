/**
 * Reading and writing cookies
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, enc, ext, hasSSL, isDate, isDefined } from "../../fs/index";
import { escapeRegExp } from "../misc/basic";
import { FULL_DAY, now } from "../misc/time";

/**
 * @class A cookie which stores its data as a JSON object.  Use the class
 *    read() and write() methods to access basic cookie functionality to
 *    read and write simple string values.
 * @param guid {String} The unique ID of the storage object. This helps separate storage instances between tabs, etc.
 * @param options {Object}
 * @constructor
 */
class Cookie {
  constructor(options) {
    // Set up the cookie switches
    this.opts = options || {};
  }

  /**
   * Set a data value
   * @param key {String} The name of the parameter to set.
   * @param value {String} The value of the parameter to set.
   */
  set(key, value, opts) {
    let _opts = this.opts;
    let v;
    if (opts) {
      _opts = ext({}, _opts, opts);
    }
    // Convert the data to a string
    value = isDefined(_opts.encode) ? enc(value) : value;

    // Encode the cookie name
    key = enc(key);

    // Localhost exception
    if (_opts.domain == "localhost") {
      delete _opts.domain;
    }

    // Apply "secure" flag (to lock cookie to HTTPS)
    // The flag has to exist and be set to something different than "false"
    // That should only apply in cases where hasSSL
    if (globalConfig.secureCookie && globalConfig.secureCookie !== "false" && hasSSL !== "false") {
      value += ";secure";
    }

    // Apply the options
    for (const opt in _opts) {
      if (_opts[opt]) {
        v = _opts[opt];
        // "duration" needs to map to "expires"
        value += `;${opt == "duration" ? "expires" : opt}`;
        switch (opt) {
          // -1 = EXPIRE NOW
          case "expires":
            value += `=${isDate(v) ? v.toUTCString() : v};`;
            break;
          case "duration":
            value += `=${new Date(now() + v * FULL_DAY).toUTCString()};`;
            break;
          default:
            value += `=${v}`;
        }
      }
    }
    // /* pragma:DEBUG_START */
    // console.log("cookie: " + key + "=" + value);
    // /* pragma:DEBUG_END */

    // Set the actual cookie
    document.cookie = `${key}=${value}`;
  }

  /**
   * Get a data value
   * @param key {String} The name of the parameter to get.
   */
  get(key) {
    const va = document.cookie.match(`(?:^|;)\\s*${escapeRegExp(key)}=([^;]*)`);
    return va ? decodeURIComponent(va[1]) : null;
  }

  /**
   * Delete a cookie from the browser, by name.
   * @param cookieName {String} The name of the cookie to delete
   */
  kill(cookieName) {
    const expireDate = new Date();
    expireDate.setTime(expireDate.getTime() - 9999);
    this.set(cookieName, "", { expires: expireDate.toUTCString() });
  }
}

export { Cookie };
