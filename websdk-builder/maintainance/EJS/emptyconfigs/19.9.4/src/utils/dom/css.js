/**
 * A CSS loader
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { FSEvent } from "./event";

// Holds the history so we don't constantly re-download the same files
const _cssLoadHistory = {};
let _cssCount = 0;

/**
 * Load a CSS file with a callback
 * @param url
 * @param successcallback (Function) The callback to fire when the load is successful
 * @param failcallback (Function) The callback to fire when the load is unsuccessful
 * @returns {Element|*}
 */
const loadCSS = (url, successcallback, failcallback) => {
  const oldOne = _cssLoadHistory[url];
  if (oldOne) {
    if (oldOne.link.parentElement) {
      oldOne.success.subscribe(successcallback || (() => {}), true, true);
      oldOne.fail.subscribe(failcallback || (() => {}), true, true);
      return oldOne.link;
    } else {
      delete _cssLoadHistory[url];
    }
  }

  _cssCount++;
  const id = `fs-css-${_cssCount}`;

  const link = document.createElement("link");
  link.setAttribute("id", id);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");

  const dlobj = {
    link,
    url,
    didfail: false,
    didsucceed: false,
    success: new FSEvent(),
    fail: new FSEvent(),
  };
  dlobj.success.subscribe(successcallback, true, true);
  dlobj.fail.subscribe(failcallback || (() => {}), true, true);
  _cssLoadHistory[url] = dlobj;

  link.addEventListener(
    "load",
    () => {
      dlobj.didsucceed = true;
      dlobj.success.fire(link);
    },
    false
  );
  link.addEventListener(
    "error",
    () => {
      dlobj.didfail = true;
      dlobj.fail.fire(link);
    },
    false
  );

  let targetEl = document.documentElement;
  const head = document.getElementsByTagName("head");
  if (head && head.length > 0) {
    targetEl = head[0];
  }
  targetEl.appendChild(link);
  link.setAttribute("href", url);
  return link;
};

export { loadCSS };
