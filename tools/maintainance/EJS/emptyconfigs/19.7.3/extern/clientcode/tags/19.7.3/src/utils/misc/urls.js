/**
 * Working with URL's and domains and such
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Urls");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");

(function (utils) {

  /**
   * Test if two URL's are on the same domain. If a fully qualified URL is not provided, it assumes that it is on
   * the domain of the window it's in.
   * @param url1 {string}
   * @param url2 {string}
   * @returns {boolean}
   */
  utils.testSameDomain = function (url1, url2) {
    var parser = document.createElement("a"),
      local_hostname = parser.hostname,
      local_protocol = parser.protocol;
      
    // Get the hostname of the first URL (is local hostname if empty string)
    parser.href = url1;
    var hostname1 = parser.hostname || local_hostname,
      protocol1 = parser.protocol.indexOf("http") === 0 ? parser.protocol : local_protocol;

    // Get the hostname of the second URL (is local hostname if empty string)
    parser.href = url2;
    var hostname2 = parser.hostname || local_hostname,
      protocol2 = parser.protocol.indexOf("http") === 0 ? parser.protocol : local_protocol;

    // Are they on the same hostname and protocol?
    return fs.toLowerCase(hostname1) == fs.toLowerCase(hostname2) && fs.toLowerCase(protocol1) == fs.toLowerCase(protocol2);
  };

  /**
   * Add a paramter to the url
   * @param url1 {string}
   * @param param {string}
   */
  utils.addParameterToURL = function (url, param) {
    url += (url.split('?')[1] ? '&' : '?') + param;
    return url;
  };

  /**
   * Return a hash value for the given id.  The <tt>id</tt> must be
   * in the form of two numbers delimited by an underscore.
   * @example utils.hash('123_4567');
   * @param {String} id The Id to get the hash for
   * @return {String} The hash
   */
  utils.hash = function (id) {
    var v = id.split('_');
    return ((v[0] * 3) + 1357) + '' + ((v[1] * 9) + 58);
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
   * Test to see if a url matches a search pattern. For example:
   *
   * Returning true means it DID match. If the url is "http://www.coolwizard.com/pages/store.html"
   * then these matches will have the following results:
   *
   *   - "*coolwizard*" : true
   *   - "*cool*pages*" : true
   *   - "cool*pages" : false (because they are terminating on the ends)
   *   - "https*cool*" : false (https)
   *   - "http*cool*" : true
   *   - "http://www.coolwizard.com/pages/store.html" : true
   *
   * @param srch {String} - The searh pattern
   * @param url {String} - A full URL
   */
  utils.testAgainstSearch = function (srch, url) {
    // Check for these backwards compatibility cases
    if (srch === null || typeof srch === "boolean" || typeof url === "boolean") {
      return false;
    } else if (srch === '.') {
      return true;
    } else if (srch instanceof RegExp) {
      return srch.test(url);
    } else if (srch.indexOf("*") == -1 && srch.indexOf("//") == -1 && srch.trim() !== "") {
      return url.indexOf(srch) > -1;
    }
    // If none of these checks passed, proceed with the rest of the wildcard matching

    var ispassing,
      tmpbits,
      x;
    // Get rid of trailing whitespace, multiple stars, and convert to lower case
    // Then convert to an array of pieces
    srch = fs.toLowerCase(srch.replace(/^\s+|\s+$/g, '').replace(/[\*]{2,}/g, '*'));
    url = fs.toLowerCase(url);

    if (srch == '*') {
      return true;
    }
    tmpbits = [];
    while (srch.indexOf('*') > -1) {
      if (srch.indexOf('*') > 0) {
        tmpbits.push(srch.substr(0, srch.indexOf('*')));
      }
      tmpbits.push('*');
      srch = srch.substr(srch.indexOf('*') + 1);
    }
    if (srch.length > 0) {
      tmpbits.push(srch);
    }
    ispassing = (tmpbits.length === 0) ? false : true;
    for (x = 0; x < tmpbits.length; x++) {
      srch = tmpbits[x];
      if (srch == '*') {
        if (tmpbits.length > x + 1) {
          x++;
          if (url.indexOf(tmpbits[x]) == -1) {
            ispassing = false;
            break;
          } else {
            url = url.substr(url.indexOf(tmpbits[x]) + tmpbits[x].length);
          }
        }

        if (x == tmpbits.length - 1 && tmpbits[x] !== '*' &&
          (url != tmpbits[x] && url != tmpbits[x] + '/' && tmpbits[x] != url + '/') &&
          url.length > 0 && url != '/') {
          // x already points to the next fragment (in this case the last one)
          // The array has exhausted.
          ispassing = false;
          break;
        }
      } else {
        if (url.substr(0, srch.length) != srch && url != srch + '/' && srch != url + '/') {
          ispassing = false;
          break;
        } else {
          url = url.substr(srch.length);
          if (x == tmpbits.length - 1 && url.length > 0 && url != '/') {
            // The array has exhausted.
            ispassing = false;
            break;
          }
        }
      }
    }

    // Did we match?
    return !!ispassing;
  };

  /**
   * Get the root domain
   * @param url {String} (Optional) a URL
   */
  utils.getRootDomain = function (url) {
    url = fs.toLowerCase(url || document.domain).replace('https://', '').replace('http://', '');
    var iposList = ['/', '?', ':'],
      iposListLength = iposList.length,
      ipos;

    for (var n = 0; n < iposListLength; n++) {
      ipos = url.indexOf(iposList[n]);
      if (ipos > -1) {
        url = url.substr(0, ipos);
      }
    }

    // If its localhost OR just an IP address then return it whole-hog
    if (url.indexOf('localhost') > -1 || (url.replace(/[0-9\.]/g, '').length === 0)) {
      return url;
    }

    var ubits = url.split('.'),
      ubl = ubits.length,
      isSldPresent = function (tld) {
        return ['com', 'co', 'org', 'gov', 'edu', 'net'].indexOf(tld) > -1;
      },
      isHotList = function (url) {
        return url.indexOf('qc.ca') > -1;
      };

    if (ubl > 2 && (isSldPresent(ubits[ubl - 2]) || isHotList(url))) {
      return ubits[ubl - 3] + '.' + ubits[ubl - 2] + '.' + ubits[ubl - 1];
    } else if (ubl > 1) {
      return ubits[ubl - 2] + '.' + ubits[ubl - 1];
    }

    return url;
  };

})(utils);