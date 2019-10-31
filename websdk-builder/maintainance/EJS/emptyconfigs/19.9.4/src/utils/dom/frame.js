/**
 * Frame utils
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isDefined } from "../../fs/index";

/**
 * Gets the size of the window including the scrollbar.
 */
const getSize = winObj => {
  let myWidth = 0;
  let myHeight = 0;
  const wd = winObj.document;
  const wdd = wd.documentElement;

  if (typeof winObj.innerWidth == "number") {
    // Non-IE
    myWidth = winObj.innerWidth;
    myHeight = winObj.innerHeight;
  } else if (wdd && (wdd.clientWidth || wdd.clientHeight)) {
    // IE 6+ in 'standards compliant mode'
    myWidth = wdd.clientWidth;
    myHeight = wdd.clientHeight;
  } else if (wd.body && (wd.body.clientWidth || wd.body.clientHeight)) {
    // IE 4 compatible
    myWidth = wd.body.clientWidth;
    myHeight = wd.body.clientHeight;
  }

  return { w: myWidth, h: myHeight };
};

/**
 * Gets the scroll position of a window
 */
const getScroll = winObj => {
  let scrOfX = 0;
  let scrOfY = 0;
  const doc = winObj.document;
  const dd = doc.documentElement;
  if (typeof winObj.pageYOffset == "number") {
    // Netscape compliant
    scrOfY = winObj.pageYOffset;
    scrOfX = winObj.pageXOffset;
  } else if (doc.body && (doc.body.scrollLeft || doc.body.scrollTop)) {
    // DOM compliant
    scrOfY = doc.body.scrollTop;
    scrOfX = doc.body.scrollLeft;
  } else if (dd && (dd.scrollLeft || dd.scrollTop)) {
    // IE6 standards compliant mode
    scrOfY = dd.scrollTop;
    scrOfX = dd.scrollLeft;
  }
  return { x: scrOfX, y: scrOfY };
};

/**
 * Sets the scroll position of a window
 */
const setScroll = (winObj, x, y) => {
  winObj.scrollTo(x, y);
};

/**
 * Get the screen resolution width and height if it is available
 * If it is not available as a string or number, return 0 for both values.
 */
const getScreenResolution = () => {
  const winScreen = window.screen;
  if (isDefined(winScreen) && isDefined(winScreen.width)) {
    if (typeof winScreen.width == "number") {
      return { w: winScreen.width, h: winScreen.height };
    }
  }
  return { w: 0, h: 0 };
};

export { getSize, getScroll, setScroll, getScreenResolution };
