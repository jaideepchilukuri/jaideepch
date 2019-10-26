/**
 * Ajax class. Handles CORS when needed.
 *
 * (c) Copyright 2015 ForeSee, Inc.
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
  utils.AjaxTransport = function (options) {
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
  utils.AjaxTransport.prototype.send = function (opts) {
    var sendOptions = fs.ext({}, this.options, opts || {});

    // Use XDomainRequest for any IE versions before 10
    if (window.XDomainRequest && window.navigator.userAgent.indexOf("MSIE 10") == -1) {
      this._sendViaXDR(sendOptions);
    }
    // Otherwise, just use XMLHttpRequest
    else if (window.XMLHttpRequest) {
      this._sendViaXHR(sendOptions);
    }

    // Free up stuff
    sendOptions = null;
  };

  /**
   * Free up any unused assets
   */
  utils.AjaxTransport.prototype.dispose = function () {
    fs.dispose(this.options);
  };

  /**
   * Returns <code>true</code> if the browser the library is running on currently supports
   * this type of network transport.
   * @return {Boolean}
   * @static
   */
  utils.AjaxTransport.isSupported = function () {
    return true;
  };

  /**
   * Calls the "transport ready" callback as soon as the transport is initialized.  In this
   * case, the transport is ready as soon as it has been determined it is supported.
   * @param readyCallback {Function} The callback to call when the transport is ready
   * @static
   */
  utils.AjaxTransport.initialize = function (readyCallback) {
    readyCallback.call(utils.AjaxTransport);
  };

  /**
   * Send data via XMLHttpRequest
   * @param opts
   * @private
   */
  utils.AjaxTransport.prototype._sendViaXHR = function (opts) {
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
      return;
    }
    xhr.setRequestHeader('Accept', '*' + '/' + '*');
    xhr.setRequestHeader('Content-Type', contentType);
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

  /**
   * Send data using Microsoft's legacy XDomainRequest specification
   * @param opts {Object} send options
   * @private
   */
  utils.AjaxTransport.prototype._sendViaXDR = function (opts) {
    var sendable = (fs.isDefined(opts.skipEncode) && opts.skipEncode === true && opts.method.toUpperCase() !== 'GET') ?
        opts.data :
        fs.toQueryString(opts.data, null, false),
      furl = opts.url;

    opts.failure = opts.failure || function () {
      };

    if (opts.method == 'GET' && sendable && sendable.length > 0) {
      sendable = sendable.replace('?', '');
      if (furl.indexOf('?') > -1) {
        furl += '&';
      } else {
        furl += '?';
      }
      furl += sendable;
    }

    var xhr = new window.XDomainRequest();
    xhr.onerror = opts.failure || function () {
      };
    xhr.ontimeout = opts.failure || function () {
      };
    xhr.onprogress = function () {
    };

    xhr.onload = function (cx, opts) {
      return function () {
        opts.success(cx.responseText);
        cx = null;
        opts = null;
      };
    }(xhr, opts);
    xhr.timeout = 60000;
    /* pragma:DEBUG_START */
    console.warn('utils: XDR sending ' + opts.method + ' to ' + furl);
    /* pragma:DEBUG_END */

    // Set up the request
    // use try catch for IE10 access denied error 6/28/2013, tom
    try {
      xhr.open(opts.method, furl);
    } catch (e) {
      /* pragma:DEBUG_START */
      console.warn('utils: error on XDR ' + JSON.stringify(e));
      /* pragma:DEBUG_END */
      if (opts.failure) {
        opts.failure(e);
      }
      return;
    }
    // Send it on the next tick to avoid IE9 aborting the req..
    fs.nextTick(function () {
      if (sendable) {
        if (!fs.isString(sendable)) {
          sendable = JSON.stringify(sendable);
        }
        xhr.send(sendable);
      } else {
        xhr.send();
      }
    });
  };

})(utils);