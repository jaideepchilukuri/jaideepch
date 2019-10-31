/**
 * Dom utilities for replay.
 *
 * (c) Copyright 2011 Foresee, Inc.
 */

import { isDefined } from "../../fs/index";
import { getSize } from "../../utils/utils";

/**
 * Holds all DOM related utility functions
 */
const Dom = {};

/**
 * Get the dimensions of an element
 * @param el The HTML node
 */
Dom.getDimensions = el => {
  let _x = 0;
  let _y = 0;
  let _width = 0;
  let _height = 0;
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
Dom.setFrameSize = (width, height) => {
  if (!isDefined(Dom._chromeInfo)) {
    // First we need to determine the chrome size
    // Don't actually do this in preplay!! will cause an error
    // window['resizeTo'](parseInt(width), parseInt(height));

    // Now loop back and check the actual frame size to see what the chrome size is for real
    setTimeout(
      ((width, height, GetSize, win) => () => {
        const nSize = GetSize(win);
        Dom._chromeInfo = {
          w: parseInt(width, 10) - nSize.w,
          h: parseInt(height, 10) - nSize.h,
        };
        // Dont actually do this!!
        // window['resizeBy'](Dom._chromeInfo.w, Dom._chromeInfo.h);
      })(width, height, getSize, window),
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
Dom.getDomDimensions = () => {
  // document dimensions
  let viewportWidth;
  let viewportHeight;
  const doc = window.document;
  const win = window;

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
Dom.getAbsoluteFromFragmentURL = relurl =>
  `${window.location.protocol.toString()}//${window.location.host.toString()}${relurl}`;

/**
 * Get the window object of an iframe
 * @param {iFrame} ifr A reference to the iFrame object
 */
Dom.getFrameWindow = ifr => {
  if (ifr) {
    return ifr.contentWindow || (ifr.contentDocument ? ifr.contentDocument.defaultView : undefined);
  }
};

/**
 * A fast way to clear the innerHTML of an element without actually
 * using the innerHTML property.
 */
Dom.clearInnerHTML = obj => {
  // so long as obj has children, remove them
  while (obj.firstChild) {
    obj.removeChild(obj.firstChild);
  }
};

export { Dom };
