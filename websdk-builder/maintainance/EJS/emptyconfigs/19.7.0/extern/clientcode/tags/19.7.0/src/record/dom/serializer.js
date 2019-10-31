/**
 * Serialize documents to strings
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Dom.Serializer");

fs.require("rec.Top");

(function () {

  /**
   * Serialize the document
   * @param winRef Reference to the window containing the document
   * @param xpath
   * @return {String}
   * @constructor
   */
  var Serialize = function (winRef, xpath, config) {
    // Quickreference dom namespace
    var dom = Serialize,
      docRef = winRef.document;

    // Treats the contents of the HTML (scrubs out PII, etc...)
    return dom.ProcessHTML(dom._getDocType(docRef) + docRef.querySelectorAll("html")[0].outerHTML, docRef, xpath, !!config.advancedSettings.pii.useWhiteListing, config);
  };

  /**
   * A quickreference to the serialize namespace
   */
  var serialize = Serialize;

  /**
   * Process the contents of an HTML string, scrubbing out any PII
   * @param htmlStr
   * @param docRef {HTMLDocument} Reference to the document that the HTML string was serialized from
   * @param xpath {string} Element xpath
   * @param maskStr {boolean} Should this string be completely masked?
   * @constructor
   */
  Serialize.ProcessHTML = function (htmlStr, docRef, xpath, maskStr, config) {
    // Scrub the document
    return Cache.getCacheableObject(Serialize._scrubHTML(htmlStr, maskStr, config), xpath);
  };

  /**
   * Apply the scrubbing to the HTML String. This function could potentially be used in a WebWorker.
   * @param htmlStr
   * @return {*}
   * @constructor
   */
  Serialize._scrubHTML = function (htmlStr, maskStr, config) {
    // Quickreference dom namespace
    var dom = Serialize,
      asetts = config.advancedSettings || {},
      i;

    htmlStr = Array.isArray(htmlStr) ? htmlStr[0] : htmlStr || "";

    // Do any custom regex scrubbing
    if (asetts.regexScrub) {
      for (i = 0; i < asetts.regexScrub.length; i++) {
        htmlStr = htmlStr.replace(asetts.regexScrub[i], "");
      }
    }

    // Scrub the document
    htmlStr = dom._removeInnerScriptContent(htmlStr);
    htmlStr = dom._removeZeroWidthEntities(htmlStr);
    htmlStr = dom._fixPreTags(htmlStr);
    htmlStr = dom._fixViewState(htmlStr);
    htmlStr = dom._stripOptionTags(htmlStr);
    htmlStr = dom._convertSpecialChars(htmlStr, config);
    htmlStr = dom._stripInputValues(htmlStr);
    if (!maskStr) {
      htmlStr = dom._maskFSRHiddenBlocks(htmlStr, maskStr);
    } else {
      htmlStr = dom._whiteListBlock(htmlStr, maskStr);
    }
    // This has to be AFTER the masking stuff.
    if (!maskStr && (!fs.isDefined(asetts.keepComments) || asetts.keepComments !== true)) {
      htmlStr = dom._removeComments(htmlStr);
    }

    return htmlStr;
  };

  /**
   * Strips comments with regex
   * @param str
   * @returns {*}
   * @private
   */
  var __commentsRegexStripper = function (str) {
    if (str[0].indexOf("fsrHiddenBlock") < 0) {
      return "";
    } else {
      return str[0];
    }
  };

  /**
   * Remove comment tags
   * @param htmlString
   * @private
   */
  Serialize._removeComments = function (htmlStr) {
    if (/<!--/mig.test(htmlStr)) {
      return serialize._superReplace(htmlStr, /(<!--)[\w\W]*?(-->)/mig, __commentsRegexStripper);
    } else {
      return htmlStr;
    }
  };

  /**
   * Encode special characters to unicode if declared in Config.specialMappings;
   * @param htmlString
   * @private
   */
  Serialize._convertSpecialChars = function (htmlStr, config) {
    if (config.advancedSettings) {
      // quick reference
      var mappings = config.advancedSettings.specialMappings,
        i;

      if (fs.isDefined(mappings)) {
        for (i = 0, len = mappings.length; i < len; i++) {
          htmlStr = htmlStr.replace(mappings[i][0], mappings[i][1]);
        }
      }
    }
    return htmlStr;
  };

  /**
   * uses regex to locate the inner content of a script tag and then returns the htmlString with that content removed
   * @param elmString html string: either document.outerHTML or node.innerHTML
   * @private
   */
  Serialize._removeInnerScriptContent = function (htmlStr) {
    if (/script/mig.test(htmlStr)) {
      return serialize._superReplace(htmlStr, /(<script[^>]*?>)[\s\S]*?(<\/[\w]*script>)/mig, function (str) {
        return str[1] + str[2];
      });
    } else {
      return htmlStr;
    }
  };

  /**
   * Replace anything that is between the comment nodes <!--fsrHiddenBlockStart--> and <!--fsrHiddenBlockEnd--> with
   * asterisks
   * @param htmlStr {string} Serialized HTML
   * @private
   */
  Serialize._maskFSRHiddenBlocks = function (htmlStr, maskStr) {
    if (maskStr) {
      // replace all contents
      return this._superReplace(htmlStr, new RegExp(".+", "mig"), serialize._maskBlock);
    } else if (htmlStr.indexOf("fsrHiddenBlock") >= 0) {
      return Serialize._superReplace(htmlStr, new RegExp("<!--(\\W)*fsrHiddenBlockStart[\\w\\W]*?fsrHiddenBlockEnd(\\W)*-->", "mig"), serialize._maskBlock);
    } else {
      return htmlStr;
    }
  };

  /**
   * Removes character entities that display as zero width. Such as &#8203;, it will displays as "?" if we don't remove it.
   * When the html is read the character is translated from the entity code to the actual character. So you need to target the character using the unicode value.
   * @param htmlStr
   * @private
   */
  Serialize._removeZeroWidthEntities = function (htmlStr) {
    return htmlStr.replace(/(\u200B)|(\u200C)|(\u200D)|(\uFEFF)/g, '');
  };

  /**
   * Prevent faulty formatting of <pre> tags
   * @param htmlStr {string} Serialized HTML
   * @return {*}
   * @private
   */
  Serialize._fixPreTags = function (htmlStr) {
    // Fix <pre> tags formatting (if there are pre-tags in the document)
    if (htmlStr.indexOf("/pre") > -1 || htmlStr.indexOf("/PRE") > -1) {
      return serialize._superReplace(htmlStr, new RegExp("[\\s\\S]*?(?:\\/pre\\s*>)|[\\s\\S]+", "mig"), serialize._removeFormat);
    } else {
      return htmlStr;
    }
  };

  /**
   * Get rid of .NET VIEWSTATES
   * @param htmlStr {string} Serialized HTML
   * @return {*}
   * @private
   */
  Serialize._fixViewState = function (htmlStr) {
    if (htmlStr.indexOf("VIEWSTATE") > -1) {
      return htmlStr.replace(/<input[^>]*name=["']?__VIEWSTATE[^>]*>/gim, "<" + "input type=\"hidden\" name=\"__VIEWSTATE\" id=\"__VIEWSTATE\" />");
    } else {
      return htmlStr;
    }
  };

  /**
   * Replaces option tags with a regex
   * @param str
   * @returns {*}
   * @private
   */
  var __optionTagRegexFn = function (str) {
    // this function is only run when at least one opening select tag has already been found so there is no need for a conditional check of the selMatch value, it will always exist
    var selMatch = str[0].match(/<\/select[^>]*>/mig);
    if (selMatch) {
      return str[0];
    }
    return '';
  };

  /**
   * Get rid of option tags inside select tags (for PII purposes)
   * To handle the case where an opening select tag is in a comment, we check if htmlStr has an opening select tag contained within it and if so, use that as our new starting position.
   * @param htmlStr {string} Serialized HTML block
   * @return {*}
   * @private
   */
  Serialize._stripOptionTags = function (htmlStr) {
    if (/select/mig.test(htmlStr)) {
      return serialize._superReplace(htmlStr, /(<option[^>]*>[\s\S]*?<\/[\w]*option>)/mig, __optionTagRegexFn);
    } else {
      return htmlStr;
    }
  };

  /**
   * Strip input values from a regex
   * @param orig
   * @param a
   * @param b
   * @returns {string}
   * @private
   */
  var __inputValueStripperRegex = function (orig, a, b) {
    if (a) {
      return a + b.replace(/[\w\d\s]/g, "*") + '"';
    }
  };

  /**
   * Replace the content of the value attribute in input HTML tags with an asterisked equivalent
   * @param htmlString
   * @returns {*}
   * @private
   */
  Serialize._stripInputValues = function (htmlStr) {
    if (htmlStr.length > 0 && /value/.test(htmlStr)) {
      return htmlStr.replace(/(<(?:\s)*?input(?:[^>]+)value=\")([^>\"]*)\"/mig, __inputValueStripperRegex);
    }
    return htmlStr;
  };

  /**
   *
   * @param htmlStr {String} HTML in string form
   * @param regx {Regex} Identifies the blocks of data to lookup in the html string
   * @param handleFn {function} Call this on the block of data
   * @return {String}
   */
  Serialize._superReplace = function (htmlStr, regx, handleFn) {
    var result = regx.exec(htmlStr),
      res = "",
      currentPos = 0,
      newStr;
    while (fs.isDefined(result)) {
      res += htmlStr.substring(currentPos, result.index);
      // change to pass regex results array instead of results[0], so that regex results can be resued by the handleFn
      // handleFn have been updated to use results instead of results[0]
      newStr = handleFn(result);
      res += newStr;
      currentPos = result.index + result[0].length;
      result = regx.exec(htmlStr);
    }
    res += htmlStr.substring(currentPos, htmlStr.length);
    return res;
  };

  /**
   * Chooses between
   * @param orig
   * @param a
   * @param b
   * @param c
   * @returns {*|string}
   * @private
   */
  var __blockMaskChooser = function (orig, a, b, c) {
    return b || c || '*';
  };

  /**
   * Mask a block of HTML
   * @param htmlStr {string} Serialized HTML
   * @return {*}
   * @private
   */
  Serialize._maskBlock = function (value) {
    var htmlStr = (value instanceof Array) ? value[0] : value || "";
    if (htmlStr.length > 0) {
      // Replace all characters not in between & and ; and < and > with "*". Then replace all entities references that are not "&nbsp;" into "*".
      return htmlStr.replace(/^(?!<!--.*)(>)|(&[^\s;]*;)|(<[^<>]*?>)|(<)^(?!<--.*)|\w/g, __blockMaskChooser).replace(/&((?!nbsp| |amp|quot).)*?;/g, "*");
    }
    return "";
  };

  /**
   * Fix formatting for pre tags
   * @param htmlStr {string} Serialized HTML
   * @return {*}
   * @private
   */
  Serialize._removeFormat = function (results) {
    var rgxi = 0,
      res = results[0];
    if (res) {
      res = "";
      rgxi = Serialize._regexIndexOf(results[0], new RegExp("<\\s*?pre", "mig"));
      // White space character removal
      res += results[0].substring(0, rgxi).replace(/\t/g, " ").replace(/\s+/g, " ");
      res += results[0].substring(rgxi);
    }
    return res;
  };

  /**
   * Get the starting index of the regex inside the string
   * @param str {string} The target string
   * @param regex {RegEx} The regular expression being tested
   * @param startpos {integer} The point of the string that we start the test from
   * @return {*}
   */
  Serialize._regexIndexOf = function (str, regex, startpos) {
    var indexOf = str.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
  };

  /**
   * Get the final index of the regex inside the string
   * @param str {string} The target string
   * @param regex {RegEx} The regular expression being tested
   * @param startpos {integer} The point of the string that we start the test from
   * @return {*}
   */
  Serialize._regexLastIndexOf = function (str, regex, startpos) {
    var pos = startpos,
      nextPos = Serialize.regexIndexOf(str, regex, pos);
    while (nextPos > -1) {
      pos = nextPos;
      nextPos = Serialize.regexIndexOf(str, regex, pos + 1);
    }
    return pos;
  };

  /**
   * Get the doctype of a document in string form
   * @param docref Reference to the document
   * @return {String}
   * @private
   */
  Serialize._getDocType = function (docref) {
    var ct = "",
      dt = docref.doctype,
      outdt,
      ch = docref.childNodes,
      i = 0;

    // If IE and document not standards compliant, return empty string
    // Return empty string if the document is not standards compliant
    if (Capture._browser.isIE && (docref.compatMode != "CSS1Compat" || docref.documentMode == 5)) {
      return ct;
    }

    if (dt) {
      try {
        outdt = (new XMLSerializer().serializeToString(dt)).toString();
        if (outdt && outdt.length > 0) {
          return outdt;
        }
      } catch (e) {
      }
      // Build the doctype string using the doctype publicId and systemId
      ct = '<!DOCTYPE HTML';

      if (dt.publicId) {
        ct = ct + ' PUBLIC \"' + dt.publicId + '\"';
      }
      if (dt.systemId) {
        ct = ct + ' SYSTEM \"' + dt.systemId + '\"';
      }
      ct = ct + ">";

    } else {

      // If document doesn't have "doctype" get the childNodes of the doctype
      if (ch[i].text) {
        // Skip past any comment nodes
        while (ch[i].text && (ch[i].text.indexOf("<!--") === 0 || ch[i].text.indexOf("<?xml") === 0)) {
          i++;
        }

        // If the first non-comment node starts with <!doctype, use that as the doctype
        if (fs.isDefined(ch[i].text) && fs.toLowerCase(ch[i].text).indexOf("<!doctype") === 0) {
          ct = ch[i].text;
        }
      }
    }

    return ct;
  };

  /**
   * Regex replacement for whitelisted DOM blocking.
   * @param htmlStr
   * @return {*}
   * @private
   */
  Serialize._whiteListBlock = function (htmlStr, block) {
    var whiteListStart = htmlStr.indexOf("<!--fsrWhiteListStart"),
      htmlString = "";
    if (!block) {
      return htmlStr;
    } else if (whiteListStart >= 0) {
      htmlString += Serialize._maskBlock(htmlStr.substring(0, whiteListStart)) + Serialize._superReplace(htmlStr.substring(whiteListStart), new RegExp("<!--(\\W)*fsrWhiteListEnd(\\W)*-->([\\W\\D\\S](?!!--(\\W)*fsrWhiteListStart(\\W)*-->))*", "mig"), Serialize._maskBlock);
      return htmlString;
    } else {
      return this._superReplace(htmlStr, new RegExp(".+", "mig"), Serialize._maskBlock);
    }
  };

})();