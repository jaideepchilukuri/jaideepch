/**
 * Handles cross-browser CORS issues
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.CORS");

fs.require("fs.Top");

(function (utils) {
  /**
   * Sets up a CORS handler
   * @param browser {Browser} The browser instance
   * @constructor
   */
  var Cors = function (browser) {
    this.browser = browser;
    this.ready = new utils.FSEvent();
    if (browser.isIE && browser.browser.version < 11 && location.protocol != 'https:') {
      this.fstg = new utils.Frame(browser);
      /* pragma:DEBUG_START */
      console.warn("utils: using frame controller CORS due to unfavorable non-secure page and old IE");
      /* pragma:DEBUG_END */
      fs.nextTick(fs.proxy(function () {
        this.fstg.ready.subscribe(fs.proxy(function () {
          this.ready.fire();
        }, this), true, true);
      }, this));
    } else {
      /* pragma:DEBUG_START */
      console.warn("utils: using standard CORS transport");
      /* pragma:DEBUG_END */
      this.ajax = new utils.AjaxTransport();
      fs.nextTick(fs.proxy(function () {
        this.ready.fire();
      }, this));
    }
  };

  /**
   * Call the transport method to send data from the client to the server.  Options:
   *        <ul>
   *          <li>method - Transport method <i>POST</i> or GET</li>
   *          <li>url - Transport destination URL</li>
   *          <li>data - Data object to send to URL</li>
   *          <li>contentType - Data transmission type: <i>"application/x-www-form-urlencoded"</i></li>
   *          <li>success - Success callback function. Called upon successful completion of transport, passed
   *              "payload" object as only argument, called in the scope of the transport itself.</li>
   *          <li>failure - Failure callback function.  Called when transport fails, passed "status" code as
   *              only argument, called in the scope of the transport itself.</li>
   *        </ul>
   *
   * @param [opts] {Object} Send option values.  If no different from those
   *      set during transport construction, only need to pass new "data" perhaps.
   */
  Cors.prototype.send = function (opts) {
    this.ready.subscribe(fs.proxy(function () {
      if (this.ajax) {
        this.ajax.send(opts);
      } else {
        var fopts = fs.ext({
          method: 'GET',
          contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
          success: function () {
          },
          failure: function () {
          }
        }, opts);
        // frame storage ajax
        this.fstg.ajax(fopts.method, fopts.url, fopts.data, function (pts) {
          return function (passfail, dta) {
            if (passfail) {
              pts.success(dta);
            } else {
              pts.failure(dta);
            }
          };
        }(fopts), ((fs.isDefined(opts.skipEncode)) ? !!opts.skipEncode : true), fopts.contentType);
      }
    }, this), true, true);
  };


  /**
   * Dispose and free up memory
   */
  Cors.prototype.dispose = function () {
    if (this.ajax) {
      this.ajax.dispose();
    }
  };

  // Expose CORS to the world
  utils.CORS = Cors;

})(utils);