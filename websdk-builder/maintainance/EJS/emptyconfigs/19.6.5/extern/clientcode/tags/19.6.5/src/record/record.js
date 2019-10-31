/**
 * Record plugin
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Record");

fs.require("rec.Top");
fs.require("rec.Misc.Symbols");

fs.require("rec.Capture.Capture");
fs.require("rec.Capture.EventThrottle");
fs.require("rec.Capture.FrameBinding");
fs.require("rec.Capture.InputCapture");
fs.require("rec.Capture.ModThrottle");
fs.require("rec.Capture.Mutation");
fs.require("rec.Capture.XPath");

fs.require("rec.Data.Cache");
fs.require("rec.Data.Diff");
fs.require("rec.Data.Log");
fs.require("rec.Data.Meta");

fs.require("rec.Dom.Dom");
fs.require("rec.Dom.Mask");
fs.require("rec.Dom.Serializer");

fs.require("rec.Capture.XDomainFrame");

(function () {

  /**
   * @class A class to initiate recording of sessions in a particular window context.
   * Each iFrame will have its own context with a pointer to the parent node.
   * @param stg {GlobalStorage} A reference to a globalstorage instance
   * @param winObj {Window} A reference to the window object to record.
   * @param instancePath {String} The xPath of this frames instance.
   * @param [parentInstance] {Recorder} The parent instance that owns this SessionRecorder.
   * @param isIframeMode {bool} Are we in postMessage iFrame mode
   * @param iFrameID {String} iFrame ID (if this is a cross-domain iFrame)
   * @param iFrameParentFr {Window} The parent with whom to communicate (for cross-origin iFrames)
   * @param iFramexPathPrefix {String} The xpath prefix (optional)
   * @param xIframePositionOffset {Object: {x, y}} The current location of the iFrame
   * @constructor
   */
  var Recorder = function (stg, browser, winObj, instancePath, parentInstance, config, isIframeMode, iFrameID, iFrameParentFr, iFramexPathPrefix, xIframePositionOffset) {
    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "setting up record on ", !!instancePath ? instancePath : 'top frame', winObj.document.title, winObj.window.location.toString());
    /* pragma:DEBUG_END */

    // Keep a copy of the browser handy on the cache class
    Cache._browser = Capture._browser = this.browser = browser;

    // Keep track of the iFrame position if it exists
    if (xIframePositionOffset) {
      this.setXFrameScrollPosition(xIframePositionOffset);
    }

    // Are we running in postMessage iFrame mode?
    this.isIframeMode = !!isIframeMode;

    // The XPath prefix (optional)
    this.iFramexPathPrefix = iFramexPathPrefix || '';

    // Keep the iFrame ID (if applicable)
    this.ifrid = iFrameID;

    // Keep the parent reference (if applicable)
    this.iFrameParentFr = iFrameParentFr;

    /* pragma:DEBUG_START */
    if (this.isIframeMode) {
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "running in iFrame mode: (%c" + winObj.document.title + "%c)", "color:green", "color:black");
    }
    /* pragma:DEBUG_END */

    // The configuration
    this.config = config;

    // Keep track of the global storage instance
    this.stg = stg;

    // set the window reference
    this.win = winObj;

    // signals when we are ready
    this.ready = new utils.FSEvent();

    // holds the list of child recorders
    this.childRecorders = [];

    // Is this the top frame?
    this.disposed = false;

    // Set up a custom event for dom updated
    this.DomUpdated = new utils.FSEvent();

    // Subscribe to the DomUpdated event
    this.DomUpdated.subscribe(fs.proxy(function () {
      this.update.apply(this, arguments);
    }, this));

    // Fires when an emerge
    this.EmergencySendRequired = new utils.FSEvent();

    // set the instance path
    this.instancePath = instancePath || [];

    // default the mouse over flag
    this.isMousedOverWindow = false;

    // Define some vars
    this.logger = this.eventcap = this.recordParent = null;

    // Only proceed if there is a document
    if (this.win.document) {
      // if there is a parent instance, set it here
      this.recordParent = parentInstance;

      // Is this the top instance?
      if (!parentInstance) {
        // Set up the logger
        this.logger = new Logger(stg, browser, this, this.config);
      }

      // Get the top logger and bind to the ready FN
      this.getLogger().StorageReady.subscribe(fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.log("sr: " + (window === window.top ? '' : '[frm] ') + "StorageReady on " + this.win.document.title);
        /* pragma:DEBUG_END */

        // Signal ready
        this.ready.fire();

        // Apply the PII rules defined in config
        if (config.advancedSettings) {
          this.masker = new Masker();
          this.masker.maskDocument(config.advancedSettings.pii, this.win);
        }

        // Serialize and log the dom
        this.serializeDom();

        // Set up the recorder
        this.eventcap = new Capture(this, browser, this.config, this.isIframeMode);

        // Bind to iFrames
        FrameBinding.performFrameBindings(this);

        // If we're not IN a cross-domain iFrame, then transmit up
        if (!isIframeMode) {
          XDomainFrame.BeginTrackingChildFrames(this);
        }

        // At the end of the recorder initialization, send an emergency Transmit / commit if not transmitting and in mobile.
        if (!parentInstance) {
          this.logger._flushAndTransmit(true);
        }

        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "record initialization complete on page: %c" + this.win.document.title, "color:green");
        /* pragma:DEBUG_END */

        if (browser.isMobile) {
          /* pragma:DEBUG_START */
          console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "starting transmit automatically due to mobile device");
          /* pragma:DEBUG_END */

          this.setTransmitOK();
        }

      }, this), true, true);
    }

    // Free up some things
    parentInstance = null;
    winObj = null;
    instancePath = null;
  };

  /**
   * Does a selective re-binding in response to new DOM elements.
   * @param tNode {HTMLElement} The HTML Node to focus on. Optional.
   */
  Recorder.prototype.update = function (tNode) {
    // If no target node was specified, use the body
    if (!tNode) {
      tNode = this.doc.body;
    }

    if (tNode.childNodes.length === 0) {
      return;
    }

    // First update capture
    this.eventcap.updateNodeBinding(tNode, tNode ? true : false);

    // Now check for new iFrames
    FrameBinding.performFrameBindings(this, tNode);
  };

  /**
   * Get the top instance of SessionRecord
   */
  Recorder.prototype.getLogger = function () {
    if (this.recordParent) {
      return this.recordParent.getLogger();
    }
    // Spit it out
    return this.logger || {
      log: function () {
        // no-op
      }
    };
  };

  /**
   * Push a custom event to the logger
   * @param customName (string) name to identify the type of custom event
   * @param optionalCustomData optional parameter. Whatever is passed will be stringify-ied
   */
  Recorder.prototype.logCustomEvent = function (customName, optionalCustomData, eventType) {
    // Set default if behavior name is not a valid string.
    if (!fs.isDefined(customName) || (typeof customName !== "string")) {
      customName = "";
    }

    // Log the custom event
    this.getLogger().log(this, eventType, { 'attrName': customName, 'v': JSON.stringify(optionalCustomData) });
  };

  /**
   * Get the path to this instance of the recorder
   */
  Recorder.prototype.getPath = function () {
    if (!this._getPathCache) {
      if (this.recordParent) {
        this._getPathCache = this.instancePath.concat(this.recordParent.getPath());
      } else {
        this._getPathCache = this.instancePath;
      }
    }
    return this._getPathCache;
  };

  /**
   * Get the top instance of SessionRecord
   */
  Recorder.prototype.getTop = function () {
    if (this.recordParent) {
      return this.recordParent.getTop();
    }
    return this;
  };

  /**
   * Tell the recorder that we can transmit at will.
   */
  Recorder.prototype.setTransmitOK = function () {
    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "setTransmitOK()");
    /* pragma:DEBUG_END */

    this.getLogger().setTransmitOK();
  };

  /**
   * Make the server request to start processing on this global session id
   * @param delay {Number} (Optional) How many MS to delay
   */
  Recorder.prototype.processImmediately = function (delay) {
    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "processImmediately()");
    /* pragma:DEBUG_END */

    this.getLogger().processImmediately(delay);
  };

  /**
   * Tell the recorder that we can NOT transmit at will.
   */
  Recorder.prototype.setTransmitNotOK = function () {
    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "setTransmitNotOK()");
    /* pragma:DEBUG_END */

    this.getLogger().setTransmitNotOK();
  };

  /**
   * Tell the recorder that we can NOT transmit at will.
   */
  Recorder.prototype.cancelRecord = function (permanent) {
    /* pragma:DEBUG_START */
    console.warn("sr: ' + (window === window.top ? '' : '[frm] ') + 'cancel record (permanent: " + !!permanent + ")");
    /* pragma:DEBUG_END */
    this.getLogger().cancelRecord(permanent);
  };

  /**
   * Dispose the object and free up everything
   */
  Recorder.prototype.dispose = function () {
    /* pragma:DEBUG_START */
    console.warn('sr: ' + (window === window.top ? '' : '[frm] ') + 'disposing Recorder instance.');
    /* pragma:DEBUG_END */

    // Reset the cache
    Cache.reset();

    var ref = this;
    if (!ref.win) {
      ref = ref.recorder;
    }

    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose of all child recorders
    for (var i = 0; i < ref.childRecorders.length; i++) {
      ref.childRecorders[i].dispose();
    }

    // Free up the capture instance
    if (ref.eventcap) {
      ref.eventcap.dispose();
    }

    if (ref.lastRawMouseCoords) {
      ref.lastRawMouseCoords = null;
    }

    ref.eventcap = null;
    ref.win = null;
    ref.recordParent = null;
    ref.DomUpdated.unsubscribeAll();
    ref.DomUpdated = null;
    if (ref.logger) {
      ref.logger.dispose();
      ref.logger = null;
    }
    ref = null;

    // Remove all straggler event bindings
    utils.Unbind('record:*');
  };

  /**
   * Clear any state information in persistent storage
   */
  Recorder.prototype.clearState = function () {
    if (this.logger) {
      this.logger.clearState();
    }
  };

  /**
   * Do the actual serializing of the DOM.
   */
  Recorder.prototype.serializeDom = function () {
    // Serialize the DOM
    if (this.getLogger()) {
      // Cache the body. This is a performance enhancement that prevents the entire body from being serialized again.
      var body_uid;
      if (this.win == this.win.top) {
        var body = this.win.document.body;
        body_uid = Cache.getCacheableObject(body.innerHTML, XPath.getMapping(body)).uid;
      }

      // Enable outerHTML serialization ie CSStext property
      this.getLogger().log(this, Logger.EVENT_TYPES.DOM_SERIALIZE, {
        'dom': Serialize(this.win, this.getPath(), this.config),
        'url': this.win.location.href.toString(),
        'v': this.browser.agent,
        'buid': body_uid,
        'start': fs.startTS,
        'tz': new Date().getTimezoneOffset(),
        'domloadtime': utils.now() - fs.startTS
      });
    }
  };

  /**
   * Get the global session id
   */
  Recorder.prototype.getGlobalId = function () {
    return this.getLogger().gsessionid;
  };

  /**
   * Set the position of the containing iFrame
   * @param pos
   */
  Recorder.prototype.setXFrameScrollPosition = function (pos) {
    this.ifrFrameOffset = pos;
  };

})();
