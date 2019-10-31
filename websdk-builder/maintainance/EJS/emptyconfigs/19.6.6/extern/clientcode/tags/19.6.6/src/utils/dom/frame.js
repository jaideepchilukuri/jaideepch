/**
 * Frame utils
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Dom.Frame");

fs.require("fs.Top");

(function (utils) {
  /**
   * Gets the size of the window including the scrollbar.
   */
  utils.getSize = function (winObj) {
    var myWidth = 0,
      myHeight = 0,
      wd = winObj.document,
      wdd = wd.documentElement;

    if (typeof (winObj.innerWidth) == 'number') {
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

    return { 'w': myWidth, 'h': myHeight };
  };

  /**
   * Gets the scroll position of a window
   */
  utils.getScroll = function (winObj) {
    var scrOfX = 0, scrOfY = 0, doc = winObj.document, dd = doc.documentElement;
    if (typeof (winObj.pageYOffset) == 'number') {
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
    return { 'x': scrOfX, 'y': scrOfY };
  };

  /**
   * Sets the scroll position of a window
   */
  utils.setScroll = function (winObj, x, y) {
    winObj.scrollTo(x, y);
  };

  /*
   * Get the screen resolution width and height if it is available
   * If it is not available as a string or number, return 0 for both values.
   */
  utils.getScreenResolution = function () {
    var winScreen = window.screen;
    if (fs.isDefined(winScreen) && fs.isDefined(winScreen.width)) {
      if (typeof winScreen.width == "number") {
        return { w: winScreen.width, h: winScreen.height };
      }
    }
    return { w: 0, h: 0 };
  };

  /**
   * Get the window reference from the iframe node abstracting for browsers.
   * @param frameNode
   * @return {cross-browser iFrame window refrence}
   */
  utils.getFrameWindow = function (frameNode) {
    // In IE8 there is a special case where frameNode.contentWindow.top refers to itself. return Null in this case.
    var frameWindow;
    if (frameNode && frameNode.contentWindow) {
      frameWindow = frameNode.contentWindow;
    } else if (frameNode && frameNode.contentDocument && frameNode.contentDocument.defaultView) {
      frameWindow = frameNode.contentDocument.defaultView;
    }
    return (frameWindow && frameWindow != frameWindow.top) ? frameWindow : null;
  };

})(utils);