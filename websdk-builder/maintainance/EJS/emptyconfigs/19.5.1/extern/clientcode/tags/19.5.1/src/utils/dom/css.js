/**
 * A CSS loader
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Dom.CSS");

fs.require("fs.Top");

(function () {

  // Holds the history so we don't constantly re-download the same files
  var _cssLoadHistory = {},
    _cssCount = 0;

  /**
   * Load a CSS file with a callback
   * @param url
   * @param successcallback (Function) The callback to fire when the load is successful
   * @param failcallback (Function) The callback to fire when the load is unsuccessful
   * @returns {Element|*}
   */
  utils.loadCSS = function (url, successcallback, failcallback, browser) {
    if (!browser) {
      throw new Error("loadCSS missing browser instance");
    }

    var oldOne = _cssLoadHistory[url];
    if (oldOne) {
      if (oldOne.link.parentElement) {
        oldOne.success.subscribe(successcallback || function () { }, true, true);
        oldOne.fail.subscribe(failcallback || function () { }, true, true);
        return oldOne.link;
      } else {
        delete _cssLoadHistory[url];
      }
    }

    var id,
      link,
      resolved = false;

    _cssCount++;
    id = 'fs-css-' + _cssCount;

    link = document.createElement('link');
    link.setAttribute('id', id);
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');

    var dlobj = {
      link: link,
      url: url,
      didfail: false,
      didsucceed: false,
      success: new utils.FSEvent(),
      fail: new utils.FSEvent()
    };
    dlobj.success.subscribe(successcallback, true, true);
    dlobj.fail.subscribe(failcallback, true, true);
    _cssLoadHistory[url] = dlobj;

    link.addEventListener('load', function () {
      resolved = true;
      dlobj.didsucceed = true;
      dlobj.success.fire(link);
    }, false);
    link.addEventListener('error', function () {
      dlobj.didfail = true;
      dlobj.fail.fire(link);
    }, false);

    var targetEl = document.documentElement,
      head = document.getElementsByTagName('head');
    if (head && head.length > 0) {
      targetEl = head[0];
    }
    targetEl.appendChild(link);
    link.setAttribute('href', url);
    return link;
  };

})();