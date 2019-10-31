/**
 * A Script loader
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Ani Pendakur(ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("fs.Dom.ScriptLoad");

fs.require("fs.Top");

(function () {

  /**
   * A simple script loader
   * @param url {String} The URL to load
   * @param id {String} (Optional) The ID of the script tag
   */
  var ScriptLoader = function (src, id) {
    // Just have the events for interfacing, let the parent handle it.
    this.loadSuccess = new utils.FSEvent();
    this.loadFailure = new utils.FSEvent();
    this.st = document.createElement('script');
    this.st.type = "text/javascript";
    this.st.src = src;
    if (id) {
      this.st.id = id;
    }
    this.br = utils.getBrowserInstance();

    if (typeof this.st.addEventListener !== 'undefined') {
      this._loadOnOthers();
    } else if (typeof this.st.attachEvent !== 'undefined') {
      this._loadOnIE();
    }
  };

  /**
   * Loads script for IE.
   */
  ScriptLoader.prototype._loadOnIE = function () {
    var ctx = this,
      scriptag = this.st;
    scriptag.onreadystatechange = function () {
      if (scriptag.readyState == 3) {
        scriptag.onreadystatechange = function () {
          ctx.loadSuccess.fire(scriptag.src);
          ctx.loadFailure = null;
        };
        // Error handling goes here..
        if (ctx.loadFailure) {
          ctx.loadFailure.fire(scriptag.src);
        }
      }
    };
    document.body.appendChild(scriptag);
  };

  /**
   * Loads script for WebKit & Gecko browsers.
   */
  ScriptLoader.prototype._loadOnOthers = function () {
    this.st.addEventListener('load', fs.proxy(function () {
      this.loadSuccess.fire(this.st.src);
    }, this), false);
    this.st.addEventListener('error', fs.proxy(function () {
      this.loadFailure.fire(this.st.src);
    }, this), false);
    document.body.appendChild(this.st);
  };

})();