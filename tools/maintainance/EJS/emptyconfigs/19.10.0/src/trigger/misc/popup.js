/**
 * A Popup util that tries to achieve pop-under when supported
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext } from "../../fs/index";
import { _W } from "../top";

/**
 * Launch a popup
 * @param url
 * @param w
 * @param h
 */
function popup(url, wname, args, brwsr, popunder, center) {
  const oargs = {
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

  const centerPos = center
    ? determineCenter(args.width || oargs.width, args.height || oargs.height)
    : {};

  const finalargs = ext(oargs, args, centerPos);
  let fstr = "";
  for (const attr in finalargs) {
    fstr += `${attr}=${finalargs[attr]},`;
  }

  const popupWindow = (this._win = _W.open(url, wname, fstr));

  if (popupWindow && popunder) {
    popupWindow.blur();
    popupWindow.opener.window.focus();
    _W.focus();

    if (brwsr.browser.name == "Firefox") {
      const ghost = _W.open("about:blank");
      ghost.focus();
      ghost.close();
    } else if (brwsr.isIE) {
      setTimeout(() => {
        popupWindow.blur();
        popupWindow.opener.window.focus();
        _W.focus();
      }, 1000);
    }
  }

  return popupWindow;
}

/**
 * Figure out the left/top for the popup window to be centered on
 * the browser window.
 *
 * @param w width of popup
 * @param h height of popup
 * @returns {left, top} of popup
 */
function determineCenter(w, h) {
  const sleft = typeof window.screenLeft !== "undefined" ? window.screenLeft : screen.left;
  const stop = typeof window.screenTop !== "undefined" ? window.screenTop : screen.top;

  let width = window.innerWidth;
  if (!window.innerWidth) {
    if (document.documentElement.clientWidth) {
      width = document.documentElement.clientWidth;
    } else {
      width = screen.width;
    }
  }

  let height = window.innerHeight;
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
}

export { popup };
