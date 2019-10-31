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

/**
 * Holds all DOM related utility functions
 */
var Dom = {};

/**
 * Get the dimensions of an element
 * @param el The HTML node
 */
Dom.getDimensions = function(el) {
  var _x = 0,
    _y = 0,
    _width = 0,
    _height = 0;
  if (window.getComputedStyle) {
    _width = Math.round(
      parseFloat(
        window
          .getComputedStyle(el, null)
          .getPropertyValue("width")
          .replace("px", "")
      )
    );
    _height = Math.round(
      parseFloat(
        window
          .getComputedStyle(el, null)
          .getPropertyValue("height")
          .replace("px", "")
      )
    );
  } else {
    _width = el.offsetWidth;
    _height = el.offsetHeight;
  }
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
    _x += el.offsetLeft - el.scrollLeft;
    _y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return { top: _y, left: _x, width: _width, height: _height };
};

/**
 * Determine the window chrome size so that we can do sizings properly
 * @param callback  A callback function for when we are done.
 */
Dom.setFrameSize = function(width, height) {
  if (!fs.isDefined(Dom._chromeInfo)) {
    // First we need to determine the chrome size
    // Don't actually do this in preplay!! will cause an error
    // window['resizeTo'](parseInt(width), parseInt(height));

    // Now loop back and check the actual frame size to see what the chrome size is for real
    setTimeout(
      (function(width, height, GetSize, win) {
        return function() {
          var nSize = GetSize(win);
          Dom._chromeInfo = {
            w: parseInt(width) - nSize.w,
            h: parseInt(height) - nSize.h,
          };
          // Dont actually do this!!
          // window['resizeBy'](Dom._chromeInfo.w, Dom._chromeInfo.h);
        };
      })(width, height, utils.getSize, window),
      10
    );
  } else {
    // Just set it using the chrome information we already have
    // Don't actually do this!!
    // window['resizeTo'](parseInt(width) + Dom._chromeInfo.w, parseInt(height) + Dom._chromeInfo.h);
  }
};

/**
 * Determine the document dimensions
 */
Dom.getDomDimensions = function() {
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
  return { width: viewportWidth, height: viewportHeight };
};

/**
 * Get an absolute url from a fragment one
 * @param relurl
 */
Dom.getAbsoluteFromFragmentURL = function(relurl) {
  return window.location.protocol.toString() + "//" + window.location.host.toString() + relurl;
};

/**
 * Get the window object of an iframe
 * @param {iFrame} ifr A reference to the iFrame object
 */
Dom.getFrameWindow = function(ifr) {
  if (ifr) {
    return ifr.contentWindow || (ifr.contentDocument ? ifr.contentDocument.defaultView : undefined);
  }
};

/**
 * A fast way to clear the innerHTML of an element without actually
 * using the innerHTML property.
 */
Dom.clearInnerHTML = function(obj) {
  // so long as obj has children, remove them
  while (obj.firstChild) {
    obj.removeChild(obj.firstChild);
  }
};
