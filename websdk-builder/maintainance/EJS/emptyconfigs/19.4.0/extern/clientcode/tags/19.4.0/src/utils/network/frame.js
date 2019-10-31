/**
 * Class that interfaces with the iFrame worker
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.Frame");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Dom.Event");
fs.require("fs.Utils.Misc.MakeURI");

(function (utils) {

  /**
   * Holds a reference to the ready function for frame
   */
  var __cframeReady;

  /**
   * Controller for doing certain types of communication inside an iFrame
   * @constructor
   */
  utils.Frame = function (browser) {
    // This will be our permanent frame. A singleton.
    this.frameId = '_fsCtrlFr';

    // Holds the iFrame source
    var frameSrc = _fsNormalizeUrl('$fs.frame.html?d=' + fs.enc(document.domain) + '&_cv_=' + fs.enc(fs.config.codeVer) + '&_vt_=' + fs.enc(fs.tagVersion)) + "&uid=" + fs.enc(browser.fp || '');


    // fs.hasSSL can be 'true', true, undefined, or 'false'. We are only worried about the (type string) 'false' case
    // because this means that the client has set false on their html page.
    if (fs.hasSSL !== 'false') {
      // FORCE https (needed for ie)
      if (frameSrc.substr(0, 2) == '//') {
        frameSrc = 'https:' + frameSrc;
      } else if (frameSrc.substr(0, 4) != 'http' && /^\//.test(frameSrc)) {
        // Handle Relative URLs
        frameSrc = 'https://' + _W.location.host + frameSrc;
      }
    }
    // Keep track of whether or not we're doing SSL here
    this.isSSL = (fs.toLowerCase(frameSrc).indexOf('https') > -1);

    if (_W.location.hostname === 'localhost') {
      // Keep the port in localhost testing
      frameSrc = frameSrc.replace(/:8080/gi, ':443');
    } else if (this.isSSL) {
      // Get rid of port if its SSL
      frameSrc = frameSrc.replace(/:[0-9]+/gi, '');
    }

    // Keep track of the src url
    this.iframeSrc = frameSrc;

    // The ready event
    if (!__cframeReady) {
      __cframeReady = new utils.FSEvent();
    }
    this.ready = __cframeReady;

    /* pragma:DEBUG_START */
    console.log("utils: setting up frame");
    var readyTimeout = setTimeout(function() {
      console.warn("utils: frame never loaded!");
    }, 3000);
    this.ready.subscribe(function() {
      clearTimeout(readyTimeout);
      console.log("utils: frame is ready");
    }, true, true);
    /* pragma:DEBUG_END */

    // The tracker window message
    this.trackerReady = new utils.FSEvent();

    /**
     * Holds the list of pending ajax calls
     * @type {{}}
     * @private
     */
    this._ajaxCalls = {};

    // Create the iFrame element that this class will communicate with
    this._ensureFrame();

    // Start listening for messages from the iframe
    utils.Bind(window, "message", fs.proxy(function (e) {
      this._onMessage(e);
    }, this));
  };

  /**
   * Ensure the actual iFrame exists - and that only one exists
   * @private
   */
  utils.Frame.prototype._ensureFrame = function () {
    this._iframeElement = document.getElementById(this.frameId);
    if (!this._iframeElement) {
      /* pragma:DEBUG_START */
      console.log("utils: setting up frame with src " + this.iframeSrc);
      /* pragma:DEBUG_END */
      // If it wasn't, create a new one and add it to the document
      var fe = document.createElement('iframe');
      fe.src = this.iframeSrc;
      fe.id = this.frameId;
      fe.className = '_FSFRAME_';
      // Add the cross-site-request forgery flag that granite.js requires
      fe._csrf = true;
      fe.style.display = 'none';
      fe.setAttribute('title', 'ForeSee Control Frame');
      fe.setAttribute('_fsrB', 'true');
      fe.setAttribute('aria-hidden', 'true');
      if (document && document.body) {
        document.body.appendChild(fe);
      }
      this._iframeElement = fe;
      if (this.ready.didFire) {
        this.ready = new utils.FSEvent();
      }
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
  utils.Frame.prototype._postMessage = function (method, params) {
    // Make sure we still have a frame
    this._ensureFrame();

    // Construct the postMessage payload
    var messagePayload = JSON.stringify({
      "src": "fstop",
      "method": method,
      "params": params || {}
    });

    // Function that posts the payload to the iFrame
    var postTheData = fs.proxy(function () {
      this._iframeElement.contentWindow.postMessage(messagePayload, "*");
    }, this);

    // If the iFrame isn't ready, add the above callback to the 'onReady' queue, otherwise just call the method now
    if (!this.ready.didFire) {
      this.ready.subscribe(postTheData);
    } else {
      postTheData();
    }
  };

  /**
   * Callback for onMessage event. Fired when receive message from iFrame.
   * @param e
   * @private
   */
  utils.Frame.prototype._onMessage = function (e) {
    // Try to parse the event data.
    var eventDataObj;

    // Is this a likely message from our stuff?
    if (!e.data || (e.data + '').indexOf('frame') == -1) {
      return;
    }

    try {
      eventDataObj = JSON.parse(e.data);
    } catch (err) {
      return;
    }

    // Don't do anything if the message came from a different iframe or if the namespace doesn't match or the event data could not be parsed
    if (eventDataObj.src != "fsframe") {
      return;
    }

    // If we haven't done so already, call the 'ready' event
    if (!this.ready.didFire) {
      /* pragma:DEBUG_START */
      console.log("utils: received a message from the frame - signalling ready");
      /* pragma:DEBUG_END */
      this.ready.fire();
    }

    // Handle the different kinds of messages
    switch (eventDataObj.method) {
      case 'ajaxreturn':
        // Is this an ajax return method?
        var ajaxid = eventDataObj.params.params.ajaxid;
        if (this._ajaxCalls[ajaxid] && this._ajaxCalls[ajaxid].cb) {
          this._ajaxCalls[ajaxid].cb(!!eventDataObj.params.success, eventDataObj.params.res || '');
          delete this._ajaxCalls[ajaxid];
        }
        break;
      case 'trackerready':
        // The tracker signalled ready
        if (!this.trackerReady.didFire) {
          this.trackerReady.fire();
        }
        break;
      case 'securityerror':
        this._3pDisabled = __3pDataDisabled = true;
        break;
    }
  };

  /**
   * Do an ajax call.
   * @param method (String) "GET" or "POST" or "DELETE", etc
   * @param url (String) the URL
   * @param data (Object) the data
   * @param cb (Function) The callback
   */
  utils.Frame.prototype.ajax = function (method, url, data, cb, skipencode, contenttype) {
    var ajaxid = '_' + Math.round(Math.random() * 99999999);
    skipencode = !!skipencode;
    contenttype = contenttype || "application/x-www-form-urlencoded";
    this._ajaxCalls[ajaxid] = {
      payload: {
        method: method,
        url: url,
        data: data,
        ajaxid: ajaxid,
        skipencode: skipencode,
        contenttype: contenttype
      },
      cb: cb
    };
    return this._postMessage("ajax", this._ajaxCalls[ajaxid].payload);
  };

  /**
   * Broadcast a message to any other windows or tracker windows
   * @param key
   * @param value
   * @param expiration {Number}
   */
  utils.Frame.prototype.broadcast = function (key, value, expiration) {
    return this._postMessage("broadcast", {key: key, value: value, x: expiration});
  };

})(utils);