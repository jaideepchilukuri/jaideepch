/**
 * Working with URL's and domains and such
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { toLowerCase } from "../../fs/index";
import { escapeRegExp } from "./basic";

/**
 * Test if two URL's are on the same domain. If a fully qualified URL is not provided, it assumes that it is on
 * the domain of the window it's in.
 * @param url1 {string}
 * @param url2 {string}
 * @returns {boolean}
 */
const testSameDomain = (url1, url2) => {
  const parser = document.createElement("a");
  const local_hostname = parser.hostname;
  const local_protocol = parser.protocol;

  // Get the hostname of the first URL (is local hostname if empty string)
  parser.href = url1;
  const hostname1 = parser.hostname || local_hostname;
  const protocol1 = parser.protocol.indexOf("http") === 0 ? parser.protocol : local_protocol;

  // Get the hostname of the second URL (is local hostname if empty string)
  parser.href = url2;
  const hostname2 = parser.hostname || local_hostname;
  const protocol2 = parser.protocol.indexOf("http") === 0 ? parser.protocol : local_protocol;

  // Are they on the same hostname and protocol?
  return (
    toLowerCase(hostname1) == toLowerCase(hostname2) &&
    toLowerCase(protocol1) == toLowerCase(protocol2)
  );
};

/**
 * Return a hash value for the given id.  The <tt>id</tt> must be
 * in the form of two numbers delimited by an underscore.
 * @example utils.hash('123_4567');
 * @param {String} id The Id to get the hash for
 * @return {String} The hash
 */
const hash = id => {
  const v = id.split("_");
  return `${v[0] * 3 + 1357}${v[1] * 9 + 58}`;
};

/**
 * Javascript Implementation of Java's String.hashCode()
 * @param str
 * @returns {number}
 */
const hashCode = str => {
  let hash = 0;
  let ch = "";
  let i;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash &= hash; // Convert to 32bit integer
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
const testAgainstSearch = (srch, url) => {
  if (srch == null || typeof url !== "string") {
    return false;
  }

  // convert to lowercase
  url = toLowerCase(url);

  // Check for these special cases
  if (srch === "." || srch === "*") {
    return true;
  } else if (srch instanceof RegExp) {
    return srch.test(url);
  } else if (typeof srch !== "string") {
    return false;
  }

  // Get rid of trailing whitespace and convert to lower case
  srch = toLowerCase(srch.replace(/^\s+|\s+$/g, ""));

  let regex;

  // Allow one to drop to regex if necessary
  if (srch.indexOf("re:") === 0) {
    regex = srch.substr(3);
  } else if (srch.indexOf("glob:") === 0) {
    // remove prefix
    srch = srch.substr(5);

    // remove protocol for glob syntax
    url = url.replace(/^(?:https?:)?\/\//, "");

    // test the query string and url separately
    if (srch.indexOf("?") > -1) {
      const urlparts = url.split("?");
      const srchparts = srch.split("?");

      const urlpartmatches = testUrlRegex(genGlobRegex(srchparts[0]), urlparts[0]);
      const querypartmatches = testUrlRegex(genGlobRegex(srchparts[1]), urlparts[1]);
      return urlpartmatches && querypartmatches;
    }

    // remove the query string if we aren't matching it
    url = url.replace(/\?.*$/, "");

    regex = genGlobRegex(srch);
  } else {
    // legacy syntax
    if (srch.indexOf("*") == -1 && srch.indexOf("//") == -1 && srch !== "") {
      // special case, search for the string
      return url.indexOf(srch) > -1;
    }
    regex = genLegacyRegex(srch);
  }

  return testUrlRegex(regex, url);
};

function testUrlRegex(regex, url) {
  const re = new RegExp(regex);
  return re.test(url);
}

function genGlobRegex(srch) {
  // Compile wildcards into a regex
  const parts = srch.split("*");
  for (let i = 0; i < parts.length; i++) {
    // make sure to escape regex stuff
    parts[i] = escapeRegExp(parts[i])
      .replace(/[/]/g, "/+") // replace / with /+
      .replace(/\/\+\/\+/g, "/*"); // replace // with /*
  }

  const source = `^${parts.join("[^/]*")}$`
    // replace double stars with .*
    .replace(/\[\^\/\]\*\[\^\/\]\*/g, ".*");

  return source;
}

function genLegacyRegex(srch) {
  // Compile wildcards into a regex
  const parts = srch.split("*");
  for (let i = 0; i < parts.length; i++) {
    // make sure to escape regex stuff
    parts[i] = escapeRegExp(parts[i]);
  }

  let source = parts.join(".*");

  // a single part match that ends in a slash should have that slash be optional
  if (parts.length === 1) {
    source = source.replace(/\/$/, "");
  }

  return `^${source}/?$`;
}

/**
 * Get the root domain
 *
 * NOTE: this is the actual list of TLDs we can't set cookies on:
 * https://publicsuffix.org/list/public_suffix_list.dat
 *
 * @param url {String} (Optional) a URL
 */
const getRootDomain = url => {
  url = toLowerCase(url || document.domain);
  url = url.replace("https://", "").replace("http://", "");
  const iposList = ["/", "?", ":"];
  const iposListLength = iposList.length;
  let ipos;

  for (let n = 0; n < iposListLength; n++) {
    ipos = url.indexOf(iposList[n]);
    if (ipos > -1) {
      url = url.substr(0, ipos);
    }
  }

  // If its localhost OR just an IP address then return it whole-hog
  if (url.indexOf("localhost") > -1 || url.replace(/[0-9.]/g, "").length === 0) {
    return url;
  }

  const ubits = url.split(".");
  const ubl = ubits.length;
  const lastTwo = ubl > 1 ? `${ubits[ubl - 2]}.${ubits[ubl - 1]}` : url;

  function isSldPresent(sld, lastTwo) {
    return (
      ["com", "co", "org", "gov", "edu", "net", "mil"].indexOf(sld) > -1 ||
      ["dni.us", "isa.us", "nsn.us", "fed.us", "qc.ca"].indexOf(lastTwo) > -1
    );
  }

  if (ubl > 2 && isSldPresent(ubits[ubl - 2], lastTwo)) {
    return `${ubits[ubl - 3]}.${lastTwo}`;
  }
  return lastTwo;
};

export { hashCode, testAgainstSearch, getRootDomain, testSameDomain, hash };
