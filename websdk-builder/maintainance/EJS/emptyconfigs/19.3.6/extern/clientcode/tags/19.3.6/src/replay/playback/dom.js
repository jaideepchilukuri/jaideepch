/**
 * Dom utilities for replay.
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2011-08-26 07:54:30 -0700 (Fri, 26 Aug 2011) $
 * @version $Revision: 7257 $

 * Created: May. 2, 2011
 */

fs.provide("rp.Replay.Playback.Dom");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");
fs.require("rp.Misc.XPath");

(function () {

  /**
   * Holds all DOM related utility functions
   */
  Replay.Playback.Dom = {};

  /**
   * Retreive a DOM node by its xpath using our xpath lib
   * @param xpath
   * @param ctx The DOM node to act as context. Optional.
   */
  Replay.Playback.Dom.retrieveDomNodeByXPath = function (xpath, ctx) {
    var i;

    // Failsafe
    if (!xpath) {
      return;
    }

    // Only execute this if we have a valid xpath
    var compareStr = "html";
    if (xpath.length < compareStr.length || xpath.substr(0, compareStr.length) != compareStr) {
      return;
    }

    // Set a default value for the context
    if (!ctx) {
      ctx = window.document;
    }

    // Return the special window case
    if (xpath === "") {
      return window;
    }

    // Split things up based on embedded iframes
    var xpBits = xpath.split(",html"),
      node = null,
      realctx,
      xpb;

    for (i = 1; i < xpBits.length; i++) {
      xpBits[i] = "html" + xpBits[i];
    }

    for (i = xpBits.length - 1; i >= 0; i--) {
      xpb = xpBits[i];
      realctx = (i == xpBits.length - 1) ? ctx : utils.getFrameWindow(node).document;
      node = XPath.getNode(xpb, realctx);

      if (!node && Replay.Playback.Dom._checkXpathForMultipleForms(xpb)) {
        // We have more than one form tag in the xpath and have not successfully found the node.
        var newXPath = Replay.Playback.Dom._removeExtraForm(xpb);

        // Lets assume that this either return Null, or an updated xPath
        node = XPath.getNode(newXPath, realctx);
      }
      //SESSIONREPLAY-1560 - without returning at this stage in the forloop, on the next pass node
      //would be null or undefined causing utils.getFrameWindow(node).document above to error out causing
      //a crash in replay js and by extension the preplayer.
      if (!node) {
        return null;
      }
    }

    return node;
  };

  /**
   * Removes 2nd form tags from xpaths when they exist.
   * @param xPath {String} The xpath we're looking at.
   * @returns {*}
   * @private
   */
  Replay.Playback.Dom._removeExtraForm = function (xPath) {
    var indexOfSecondForm = xPath.lastIndexOf(',form');
    if (indexOfSecondForm >= 0) {
      // function removes extra form tag in xPath by slicing it out and then joining them
      var startOfXPath = xPath.slice(0, indexOfSecondForm);
      var trailingXPath = xPath.slice(indexOfSecondForm + 1);
      var newXp = trailingXPath.slice(trailingXPath.indexOf(',') + 1);
      newXp = startOfXPath + "," + newXp;
      return newXp;
    }
    return xPath;
  };

  /**
   * See if an xpath has more than one form reference in it
   * @param xPath
   * @returns {number|*|Number|boolean}
   * @private
   */
  Replay.Playback.Dom._checkXpathForMultipleForms = function (xPath) {
    var xpf = xPath.indexOf(",form");
    var lxpf = xPath.lastIndexOf(",form");
    return (xpf && xpf != lxpf && lxpf > -1);
  };

  /**
   * Get the dimensions of an element
   * @param el The HTML node
   */
  Replay.Playback.Dom.getDimensions = function (el) {
    var _x = 0,
      _y = 0,
      _width = 0,
      _height = 0;
    if (window.getComputedStyle) {
      _width = Math.round(parseFloat(window.getComputedStyle(el, null).getPropertyValue("width").replace("px", "")));
      _height = Math.round(parseFloat(window.getComputedStyle(el, null).getPropertyValue("height").replace("px", "")));
    } else {
      _width = el.offsetWidth;
      _height = el.offsetHeight;
    }
    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
      _x += el.offsetLeft - el.scrollLeft;
      _y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
    }
    return {"top": _y, "left": _x, "width": _width, "height": _height};
  };

  /**
   * Determine the window chrome size so that we can do sizings properly
   * @param callback  A callback function for when we are done.
   */
  Replay.Playback.Dom.setFrameSize = function (width, height) {

    if (!fs.isDefined(Replay.Playback.Dom._chromeInfo)) {

      // First we need to determine the chrome size
      // Don't actually do this in preplay!! will cause an error
      // window['resizeTo'](parseInt(width), parseInt(height));

      // Now loop back and check the actual frame size to see what the chrome size is for real
      setTimeout(function (width, height, GetSize, win) {
        return function () {
          var nSize = GetSize(win);
          Replay.Playback.Dom._chromeInfo = {
            w: parseInt(width) - nSize.w,
            h: parseInt(height) - nSize.h
          };
          // Dont actually do this!!
          // window['resizeBy'](Replay.Playback.Dom._chromeInfo.w, Replay.Playback.Dom._chromeInfo.h);
        };
      }(width, height, utils.getSize, window), 10);
    } else {
      // Just set it using the chrome information we already have
      // Don't actually do this!!
      // window['resizeTo'](parseInt(width) + Replay.Playback.Dom._chromeInfo.w, parseInt(height) + Replay.Playback.Dom._chromeInfo.h);
    }
  };

  /**
   * Determine the document dimensions
   */
  Replay.Playback.Dom.getDomDimensions = function () {
    // document dimensions
    var viewportWidth,
      viewportHeight,
      doc = window.document,
      win = window;
    if (win.innerHeight && win.scrollMaxY) {
      viewportWidth = doc.body.scrollWidth;
      viewportHeight = win.innerHeight + win.scrollMaxY;
    } else if (doc.body.scrollHeight > doc.body.offsetHeight) {
      // all but explorer mac
      viewportWidth = doc.body.scrollWidth;
      viewportHeight = doc.body.scrollHeight;
    } else {
      // explorer mac...would also work in explorer 6 strict, mozilla and safari
      viewportWidth = doc.body.offsetWidth;
      viewportHeight = doc.body.offsetHeight;
    }
    return {"width": viewportWidth, "height": viewportHeight};
  };

  /**
   * Get an absolute url from a fragment one
   * @param relurl
   */
  Replay.Playback.Dom.getAbsoluteFromFragmentURL = function (relurl) {
    return window.location.protocol.toString() + "//" + window.location.host.toString() + relurl;
  };

  /**
   * Get the window object of an iframe
   * @param {iFrame} ifr A reference to the iFrame object
   */
  Replay.Playback.Dom.getFrameWindow = function (ifr) {
    if (ifr) {
      return ifr.contentWindow || (ifr.contentDocument ? ifr.contentDocument.defaultView : undefined);
    }
  };

  /**
   * A fast way to clear the innerHTML of an element without actually
   * using the innerHTML property.
   */
  Replay.Playback.Dom.clearInnerHTML = function (obj) {
    // so long as obj has children, remove them
    while (obj.firstChild) {
      obj.removeChild(obj.firstChild);
    }
  };

})();