/**
 * CSS tools.
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author Alexei White: alexei.white $
 *
 * @modified 8/29/2011: 2011-05-06 08:50:51 -0700 (Fri, 06 May 2011) $

 * Created: Feb. 16, 2011
 */

fs.provide("rp.Replay.Playback.CSS");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");

(function () {

  /**
   * Sets up the CSS namespace
   */
  Replay.Playback.CSS = {
    // hover styles that may cause elements to change position or visibility
    hoverChangeStyles: [],

    // The current hover node for the mouse and rollovers and what not
    currentHoverNode: null
  };

  /**
   * Init function
   * @param doc The Document object to reference
   */
  Replay.Playback.CSS.initInDOM = function (doc) {

    // Remap hover styles
    Replay.Playback.CSS.remapAllHoverStyles(doc);

    // Bind the hovers
    Replay.Playback.CSS.attachHoverElements(doc);

    // This check will work in preplayer because preplayer sets the user agent string correctly for when it creates the browser.
    if (browser.isMobile || !!window.FSREventData.isMobileSession) {
      // Create CSS rules to override removal of body style overflow-x/y
      Replay.Playback.CSS.overrideOverflow(doc);
    }
  };

  /*
   * Create css rules in top level CSS sheet to hide the scrollbars
   * @param doc The Document object to reference
   */
  Replay.Playback.CSS.overrideOverflow = function (doc) {
    /*var selector = "body",
     overflowStyle = "overflow-x: hidden !important; overflow-y: hidden !important;";
     this.createCSSClass(doc, selector, overflowStyle);*/
    this.createCSSClass(doc, "*::-webkit-scrollbar", "width: 0 !important; opacity: 0;");
    this.createCSSClass(doc, "*", "-ms-overflow-style: none; overflow: -moz-scrollbars-none;");
  };

  /**
   * Remap all the hover styles
   * @param doc The document to work with
   */
  Replay.Playback.CSS.remapAllHoverStyles = function (doc) {
    // remap any hover styles
    var ss = doc.styleSheets;
    for (var i = 0; i < ss.length; i++) {
      // Remap the hover styles for imports
      if (ss[i].imports)
        for (var x = 0; x < ss[i].imports.length; x++)
          this.remapHoverStyles(doc, ss[i].imports[x]);

      // Remap the hover styles for this stylesheet
      this.remapHoverStyles(doc, ss[i]);
    }
  };

  /**
   * Remap just the hover styles
   * @param sheet The stylesheet to work with
   */
  Replay.Playback.CSS.remapHoverStyles = function (doc, sheet) {
    var hoverRegex = /(,?)[^,]*?:hover[^,]*(,?)/gi,
      i;
    try {
      var rules = this.getRules(sheet);
      if (rules)
        for (i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (rule.styleSheet) {
            this.remapHoverStyles(doc, rule.styleSheet);
          } else {
            if (this.checkRemapHoverStyle(doc, rule)) {
              if (browser.isIE) {
                sheet.removeRule(i);
              } else if (!browser.isIE) {

                // In FF3.5 I was noticing adding a class or deleting one
                // causes the layout to spontaneously mess up for no reason
                // particularly on PitneyBowes but probably in other cases too.
                // Instead we now just make the selector meaningless like so:
                // the replacement only effects the rules in a selector that contain the hover pseduo class, and leaves the other rules alone, tom 5/15/2013
                rules[i].selectorText = rules[i].selectorText.replace(hoverRegex, "$1.FSRgarbage$2");
                // sheet.deleteRule(i);
              }
            }
          }
        }

      // IE6 imports bug - its actually a problem with using imports on dynamic stylesheets
      if (sheet.href !== "" && sheet.imports) {
        for (i = 0; i < sheet.imports.length; i++) {
          this.remapHoverStyles(doc, sheet.imports[i]);
        }
      }
    } catch (e) {
    }
  };

  /**
   * Check and remap hover styles on a specific rule.
   * @param rule The rule to work with
   */
  Replay.Playback.CSS.checkRemapHoverStyle = function(doc, rule) {
    var selectorGroup = rule.selectorText;
    if (!selectorGroup) {
      return false;
    }
    var self = this;
    var selectorArray = selectorGroup.match(/[^,]*:hover[\s]*[^,]*/gi);
    if (selectorArray) {
      selectorArray.forEach(function(selector) {
        var newSelector = selector.replace(/:hover/g, "[fsr_hover=true]"),
        newStyle = rule.style.cssText || rule.cssText;
        if (newStyle !== null) {
          newStyle = newStyle.replace(/{([^\}]*)}/, function(str, p1) {
              return p1;
          });
          if ((/left|right|top|bottom|visibility|display/i).test(newStyle)) {
            self.hoverChangeStyles.push(newSelector);
          }
          self.createCSSClass(doc, newSelector, newStyle);
        }
      });
      return true;
    }
    return false;
  };

  /**
   * Get the rules from a sheet.
   * @param sheet The sheet to work with
   */
  Replay.Playback.CSS.getRules = function (sheet) {
    if (sheet === null) {
      return null;
    }
    // Watch out here - you can't get cross domain CSS in Firefox
    try {
      if (sheet.cssRules) {
        return sheet.cssRules;
      }
      if (sheet.rules) {
        return sheet.rules;
      }
    } catch (e) { /*error is due to cross domain CSS*/
    }
    return null;

  };

  /**
   * Create a new CSS class
   * @param selector The selector to use
   * @param style The style of the rule
   */
  Replay.Playback.CSS.createCSSClass = function (doc, selector, style) {
    /**
     * Trims leading and trailing whitespace.
     * @param {String} str The string to trim
     * @private
     */
    var trim = function (str) {
      if (str) {
        return str.replace(/^\s+|\s+$/, '');
      }
      return '';
    };

    selector = trim(selector);
    // using information found at: http://www.quirksmode.org/dom/w3c_css.html
    // doesn't work in older versions of Opera (< 9) due to lack of styleSheets support
    if (!doc.styleSheets) {
      return;
    }
    if (doc.getElementsByTagName("head").length === 0) {
      return;
    }

    var styleSheet,
      mediaType,
      i,
      media;

    if (doc.styleSheets.length > 0) {
      for (i = doc.styleSheets.length - 1; i >= 0; i--) {
        if (doc.styleSheets[i].disabled || doc.styleSheets[i].ownerNode.parentNode.tagName != "HEAD") {
          continue;
        }
        media = doc.styleSheets[i].media;
        mediaType = typeof media;
        // IE
        if (mediaType == "string") {
          if (media === "" || media.indexOf("screen") != -1) {
            styleSheet = doc.styleSheets[i];
          }
        } else if (mediaType == "object") {
          if (media.mediaText === "" || media.mediaText.indexOf("screen") != -1) {
            styleSheet = doc.styleSheets[i];
          }
        }
        // stylesheet found, so break out of loop
        if (typeof styleSheet != "undefined") {
          break;
        }
      }

    }
    // if no style sheet is found
    if (typeof styleSheet == "undefined") {
      // create a new style sheet
      var styleSheetElement = doc.createElement("style");
      styleSheetElement.type = "text/css";
      // add to <head>
      doc.getElementsByTagName("head")[0].appendChild(styleSheetElement);
      // select it
      for (i = 0; i < doc.styleSheets.length; i++) {
        if (doc.styleSheets[i].disabled) {
          continue;
        }
        styleSheet = doc.styleSheets[i];
      }
      // get media type
      media = styleSheet.media;
      mediaType = typeof media;
    }
    Replay.Playback.CSS.addRule(selector, style, styleSheet);
  };

  /**
   * Add a new CSS rule to the page
   * @param selector
   * @param style
   * @param sheet
   */
  Replay.Playback.CSS.addRule = function (selector, style, sheet) {
    // This seems error in Firefox when the media attribute is not included on the <link> tag
    // IE
    var mediaType = typeof sheet.media;
    if (mediaType == "string") {
      sheet.addRule(selector, style);
    } else if (mediaType == "object") {
      sheet.insertRule(selector + "{" + style + "}", sheet.cssRules ? sheet.cssRules.length : 0);
    }
  };

  /**
   * Callback that's fired when mouse is over an element
   * @param html_element
   * @returns {Function}
   */
  Replay.Playback.CSS.eventMouseOver = function (html_element) {
    return function () {
      html_element.setAttribute("fsr_hover", "true");
    };
  };

  /**
   * Callback that's fired when mouse leaves an element
   * @param html_element
   * @returns {Function}
   */
  Replay.Playback.CSS.eventMouseOut = function (html_element) {
    return function () {
      html_element.setAttribute("fsr_hover", "false");
    };
  };

  /**
   * Applies hover events and what not to the appropriate elements
   * @param doc The Document object to reference
   */
  Replay.Playback.CSS.attachHoverElements = function (doc) {
    var hoverElements = ["li", "ul", "a", "ol", "div", "img", "dt", "dd", "dl", "form", "span"],
      elementArray;
    for (var i = 0; i < hoverElements.length; i++) {
      elementArray = doc.querySelectorAll(hoverElements[i]);
      for (var j = 0; j < elementArray.length; j++) {
        utils.BindOnce(elementArray[j], "mouseover", Replay.Playback.CSS.eventMouseOver(elementArray[j]));
        utils.BindOnce(elementArray[j], "mouseout", Replay.Playback.CSS.eventMouseOut(elementArray[j]));
      }
    }
  };

  /**
   * Set the currently hovering node. Important info here: https://developer.mozilla.org/en/DOM/event.initMouseEvent
   * @param node The HTML node we are hovering.
   * @param x The screen X.
   * @param y The screen Y.
   */
  Replay.Playback.CSS.setHoverNode = function (node, x, y) {

    var evObj;

    // Check to see if this is a new node
    if (node != Replay.Playback.CSS.currentHoverNode && (!node || node.tagName != "IFRAME")) {
      // If the last node exists, do the mouseout event there
      if (Replay.Playback.CSS.currentHoverNode) {
        // Create the mouse out event
        if (document.createEvent && navigator.userAgent.indexOf("MSIE") == -1) {
          // MOZ
          var mout = Replay.Playback.CSS.currentHoverNode.ownerDocument.createEvent("MouseEvents");
          mout.initMouseEvent("mouseout", true, true, Replay.Playback.CSS.currentHoverNode.contentWindow,
            null, x, y, x, y,
            false, false, false, false,
            0, node
          );
          Replay.Playback.CSS.currentHoverNode.dispatchEvent(mout);
        } else {
          // IE
          try {
            evObj = document.createEventObject();
            Replay.Playback.CSS.currentHoverNode.fireEvent('onmouseout', evObj);
          } catch (e) {
          }
        }
      }

      // Only fire the mouseover event if the node exists
      if (node) {
        // Create the mouse over event
        if (document.createEvent && navigator.userAgent.indexOf("MSIE") == -1) {
          // MOZ
          var mover = node.ownerDocument.createEvent("MouseEvents");
          mover.initMouseEvent("mouseover", true, true, node.contentWindow,
            null, x, y, x, y,
            false, false, false, false,
            0, Replay.Playback.CSS.currentHoverNode);
          node.dispatchEvent(mover);

        } else {
          // IE
          evObj = document.createEventObject();
          node.fireEvent('onmouseover', evObj);
        }
      }
    }

    // Set the hover node
    Replay.Playback.CSS.currentHoverNode = node;
  };

})();