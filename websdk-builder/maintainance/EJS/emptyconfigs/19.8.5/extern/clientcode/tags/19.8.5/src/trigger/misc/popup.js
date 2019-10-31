/**
 * A Popup util that tries to achieve pop-under when supported
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Launch a popup
 * @param url
 * @param w
 * @param h
 */
var popup = function(url, wname, args, brwsr, popunder, center) {
  var oargs = {
    width: 700,
    height: 350,
    left: 50,
    top: 50,
    resizable: "no",
    scrollbar: "1",
    scrollbars: "1",
    toolbar: "no",
    menubar: "no",
    location: "0",
    directories: "no",
    status: "no",
  };

  var centerPos = center
      ? determineCenter(args.width || oargs.width, args.height || oargs.height)
      : {},
    finalargs = fs.ext(oargs, args, centerPos),
    fstr = "";
  for (var attr in finalargs) {
    fstr += attr + "=" + finalargs[attr] + ",";
  }

  var popupWindow = (this._win = _W.open(url, wname, fstr));

  if (popupWindow && popunder) {
    popupWindow.blur();
    popupWindow.opener.window.focus();
    _W.focus();

    if (brwsr.browser.name == "Firefox") {
      var ghost = _W.open("about:blank");
      ghost.focus();
      ghost.close();
    } else if (brwsr.isIE) {
      setTimeout(function() {
        popupWindow.blur();
        popupWindow.opener.window.focus();
        _W.focus();
      }, 1000);
    }
  }

  return popupWindow;
};

/**
 * Figure out the left/top for the popup window to be centered on
 * the browser window.
 *
 * @param w width of popup
 * @param h height of popup
 * @returns {left, top} of popup
 */
var determineCenter = function(w, h) {
  var sleft = typeof window.screenLeft !== "undefined" ? window.screenLeft : screen.left;
  var stop = typeof window.screenTop !== "undefined" ? window.screenTop : screen.top;

  var width = window.innerWidth;
  if (!window.innerWidth) {
    if (document.documentElement.clientWidth) {
      width = document.documentElement.clientWidth;
    } else {
      width = screen.width;
    }
  }

  var height = window.innerHeight;
  if (!window.innerHeight) {
    if (document.documentElement.clientHeight) {
      height = document.documentElement.clientHeight;
    } else {
      height = screen.Height;
    }
  }

  return {
    left: width / 2 - w / 2 + sleft,
    top: height / 2 - h / 2 + stop,
  };
};
