/**
 * Frame controller for interfacing with the parent frame
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("frame.Storage.FrameController");

fs.require("frame.Top");

(function () {

  /**
   * Deals with messaging between the parent frame and this one.
   * @constructor
   */
  var FrameController = function (browser) {
    // The browser
    this.br = browser;

    // The sec error event
    this.securityError = new utils.FSEvent();
    this.securityError.subscribe(fs.proxy(function() {
      this._postMessage("securityerror", {});
    }, this), true);

    this.messageReceived = new utils.FSEvent();

    // Start listening for messages from the parent window
    utils.Bind(window, "message", fs.proxy(function (e) {
      this._onMessage(e);
    }, this), "*");

    // Signal ready
    this._postMessage("ready", {});

    var didSignalTrackerReady = false;

    // Periodically remind the world we are ready
    setInterval(fs.proxy(function () {
        this._postMessage("ready", {});
        if (!didSignalTrackerReady) {
          if (document.cookie.toString().indexOf('fsIce=broke') > -1) {
            didSignalTrackerReady = true;
            this._postMessage('trackerready', 1);
          }
        }
      }, this), 250);
  };

  /**
   * When the parent frame messages the child frame
   * @param e
   * @private
   */
  FrameController.prototype._onMessage = function (e) {
    var dobj,
      params,
      skipencode,
      contenttype,
      headers,
      mth;

    try {
      dobj = JSON.parse(e.data);
      mth = dobj.method;
      params = dobj.params;
      if (typeof mth == "undefined" || typeof params == "undefined") {
        return;
      }
    } catch (err) {
      return;
    }

    skipencode = params.skipencode;
    contenttype = params.contenttype;
    headers = params.headers;

    switch (mth) {
      case "broadcast":
        if (params && params.key && params.value) {
          this.messageReceived.fire(params.key, params.value, params.x);
        }
        break;
      case "ajax":
        var ajaxcall = new utils.AjaxTransport({
          url: params.url,
          method: params.method,
          skipEncode: skipencode,
          contentType: contenttype,
          headers: headers,
          success: function (p, ctx) {
            return function (res) {
              ctx._postMessage("ajaxreturn", {
                params: params,
                res: res,
                success: true
              });
            };
          }(params, this),
          failure: function (p, ctx) {
            return function (res) {
              /* pragma:DEBUG_START */
              console.error("frame: failed ajax request ", + res);
              /* pragma:DEBUG_END */
              ctx._postMessage("ajaxreturn", {
                params: params,
                success: false,
                res: res
              });
            };
          }(params, this),
          data: params.data
        });
        ajaxcall.send();
        break;
    }
  };

  /**
   * Post message to the iframe
   * @param transaction_id {number} ID that uniquely identifies the transaction that we're posting
   * @param namespace {string} N
   * @param method
   * @param params
   * @private
   */
  FrameController.prototype._postMessage = function (method, params) {
    // Construct the postMessage payload
    var messagePayload = JSON.stringify({
      "src": "fsframe",
      "method": method,
      "params": params
    });
    window.parent.postMessage(messagePayload, '*');
  };

})();