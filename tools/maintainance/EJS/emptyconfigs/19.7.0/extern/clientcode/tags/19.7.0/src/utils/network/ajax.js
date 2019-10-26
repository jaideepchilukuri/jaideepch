/**
 * XMLHTTPRequest Wrapper.
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.Ajax");

fs.require("fs.Top");

(function (utils) {
  /**
   * @class Create a new instance of an Ajax transport.  Pass a default set of options to use
   *        when calling the {@link #send} method.  Options:
   *        <ul>
   *          <li>method - Transport method <i>POST</i> or GET</li>
   *          <li>url - Transport destination URL</li>
   *          <li>data - Data object to send to URL</li>
   *          <li>contentType - Data transmission type: <i>"application/x-www-form-urlencoded"</i></li>
   *          <li>success - Success callback function. Called upon successful completion of transport, passed
   *              "payload" object as only argument, called in the scope of the transport itself.</li>
   *          <li>failure - Failure callback function.  Called when transport fails, passed "status" code as
   *              only argument, called in the scope of the transport itself.</li>
   *          <li>timeout - (Optional) How many MS to wait before timing out.</li>
   *        </ul>
   *
   * @param [options] {Object} An optional set of configuration values which can be
   *      overridden by each call to {@link #send}
   */
  var AjaxTransport = function (options) {
    // The default set of XMLHttpRequest options
    var _defaultXHROptions = {
      method: "POST",
      data: {},
      contentType: "application/x-www-form-urlencoded",
      success: function () {
      },
      failure: function () {
      }
    };
    this.options = fs.ext(_defaultXHROptions, options);
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
  AjaxTransport.prototype.send = function (opts) {
    var sendOptions = fs.ext({}, this.options, opts || {});
    this._sendViaXHR(sendOptions);
    // Free up stuff
    sendOptions = null;
  };

  /**
   * Free up any unused assets
   */
  AjaxTransport.prototype.dispose = function () {
    fs.dispose(this.options);
  };

  /**
   * Calls the "transport ready" callback as soon as the transport is initialized.  In this
   * case, the transport is ready as soon as it has been determined it is supported.
   * @param readyCallback {Function} The callback to call when the transport is ready
   * @static
   */
  AjaxTransport.initialize = function (readyCallback) {
    readyCallback.call(AjaxTransport);
  };

  /**
   * Send data via XMLHttpRequest
   * @param opts
   * @private
   */
  AjaxTransport.prototype._sendViaXHR = function (opts) {
    var xhr = new window.XMLHttpRequest(),
      contentType = !!opts.contentType ? ((fs.toLowerCase(opts.contentType).indexOf('json') > -1) ? 'application/json; charset=utf-8' : opts.contentType) : 'application/x-www-form-urlencoded',
      isJSON = fs.toLowerCase(contentType).indexOf('json') > -1,
      sendable = !!isJSON ? (opts.method == 'GET' ? fs.enc(JSON.stringify(opts.data)) : JSON.stringify(opts.data)) : ((fs.isDefined(opts.skipEncode) && opts.skipEncode === true) ?
        opts.data :
        fs.toQueryString(opts.data)
      ),
      furl = opts.url;

    opts.failure = opts.failure || function () {
    };

    if (opts.method == 'GET' && sendable && sendable.length > 0) {
      if (furl.indexOf('?') > -1) {
        furl += '&';
      } else {
        furl += '?';
      }
      furl += sendable;
    }

    /**
     * Set up the request
     * Use try catch for IE10 access denied error 6/28/2013, tom
     */
    try {
      xhr.open(opts.method, furl, true);
    } catch (e) {
      /* pragma:DEBUG_START */
      console.error("ajax: error", furl, e);
      /* pragma:DEBUG_END */
      return;
    }

    xhr.setRequestHeader('Accept', '*' + '/' + '*');
    xhr.setRequestHeader('Content-Type', contentType);

    if (fs.isObject(opts.headers)) {
      for (var hdr in opts.headers) {
        if (fs.isDefined(hdr) && fs.isDefined(opts.headers[hdr])) {
          xhr.setRequestHeader(hdr, opts.headers[hdr]);
        }
      }
    }

    xhr.timeout = opts.timeout || 0;

    // Execute the success or failure callback depending on the result of the XHR send
    xhr.onreadystatechange = function (opts, xh) {
      return function () {
        if (xh.readyState == 4 && xh.status == 200) {
          // readyState 4 and response code 200 means the transmission was successful
          if (opts.success) {
            opts.success.apply(opts, [xh.responseText]);
          }
        } else if (xh.readyState == 4 && xh.status != 200) {
          // readyState 4 and response code not 200 means the transmission was a failure
          if (opts.failure) {
            opts.failure.apply(opts, [xh.responseText]);
          }
        }
      };
    }(opts, xhr);

    xhr.send(sendable);
  };

  // Expose it
  utils.AjaxTransport = AjaxTransport;

})(utils);