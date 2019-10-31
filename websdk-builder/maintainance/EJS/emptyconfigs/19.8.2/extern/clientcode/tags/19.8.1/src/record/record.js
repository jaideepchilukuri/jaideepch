/**
 * Record plugin
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * @class A class to initiate recording of sessions in a particular window context.
 * Each iFrame will have its own context with a pointer to the parent node.
 * @param stg {GlobalStorage} A reference to a globalstorage instance
 * @param winObj {Window} A reference to the window object to record.
 * @param instancePath {Number} The id of this frames instance.
 * @param parentInstance {Recorder} The parent instance that owns this SessionRecorder.
 * @param domTree {DomTree?} The parent DomTree instance or null to create a new one
 * @param isIframeMode {bool} Are we in postMessage iFrame mode
 * @param iFrameID {String} iFrame ID (if this is a cross-domain iFrame)
 * @param iFrameParentFr {Window} The parent with whom to communicate (for cross-origin iFrames)
 * @param iFrameIdPrefix {String} The id prefix (optional)
 * @param xIframePositionOffset {Object: {x, y}} The current location of the iFrame
 * @constructor
 */
var Recorder = function(
  stg,
  browser,
  winObj,
  instancePath,
  parentInstance,
  config,
  domTree,
  isIframeMode,
  iFrameID,
  iFrameParentFr,
  iFrameIdPrefix,
  xIframePositionOffset,
  skipPage
) {
  /* pragma:DEBUG_START */
  console.log(
    "sr: " + (window === window.top ? "" : "[frm] ") + "setting up record on ",
    !!instancePath ? instancePath : "top frame",
    winObj.document.title,
    winObj.window.location.toString()
  );
  /* pragma:DEBUG_END */

  // Assign props
  fs.ext(
    this,
    {
      browser: browser,
      config: config,
      stg: stg,
      win: winObj,
      ready: new utils.FSEvent(),
      isIframeMode: !!isIframeMode,
      recordParent: parentInstance,
      instancePath: instancePath,
      iFrameParentFr: iFrameParentFr,
      ifrid: iFrameID,
      skipPage: skipPage,
    },
    false
  );

  // Only proceed if there is a document
  if (this.win.document) {
    // Establish the session
    this.sesh =
      parentInstance && parentInstance.sesh ? parentInstance.sesh : new RecordSession(stg, config);

    // Bomb out if we're not supposed to record
    if (this.sesh.DONOTRECORD) {
      return;
    }

    // Bind to the stop recording event
    this.sesh.endSessionEvent.subscribe(this.dispose.bind(this));

    // Only set up the masker and domtree if we are not skipping the page
    if (!skipPage) {
      // Set up a masker
      this.masker = new Masker(config.advancedSettings.pii, this.win);

      // Update masking targets
      this.masker.updateMaskingTargets();
    }

    // Establish the worker
    this.worker =
      parentInstance && parentInstance.worker
        ? parentInstance.worker
        : new RecordWorker(config, this.sesh, stg, this.masker);

    /* pragma:DEBUG_START */
    console.log(
      "sr: " + (winObj === window.top ? "" : "[frm] ") + "logger ready on " + winObj.document.title
    );
    /* pragma:DEBUG_END */

    // Set up the capture stuff
    if (!skipPage) {
      this.cap = new Capture(
        browser,
        this.config,
        this.isIframeMode,
        this.getTop() === this,
        winObj,
        this.masker,
        this.worker,
        this,
        instancePath,
        domTree
      );
    } else {
      // Log that we skipped the page
      var url = this.win.location.href.toString();

      this.worker.queueAction(EVENT_TYPES.PAGE_MARKER, {
        ctx: this.getPath(),
        parent: this.recordParent ? this.recordParent.instancePath : 0,
        dt: null,
        doc: null,
        url: url,
        v: this.browser.agent,
        start: fs.startTS,
        tz: new Date().getTimezoneOffset(),
        domloadtime: utils.now() - fs.startTS,
        cid: config.clientId,
        customerId: fs.config.customerId,
        userId: this.getTop().stg.uid,
        f: document.referrer.toString(),
        t: document.title,
        bn: this.browser.name,
        bv: this.browser.version,
        // device size
        dw: 0,
        dh: 0,
        // page viewport
        pw: 0,
        ph: 0,
        // layout viewport
        lw: 0,
        lh: 0,
        // visual viewport
        vw: 0,
        vh: 0,
        landscape: null,
        mobile: this.browser.isMobile,
        whiteListMode: null,
        sid: this.getSessionId(),
        gid: this.getGlobalId(),
        vs: true,
        scroll: { x: 0, y: 0 },
      });

      fs.nextTick(
        function() {
          this.worker.queueAction(EVENT_TYPES.NOT_RECORDED, { ctx: this.getPath() });
          this.worker.flush();
        }.bind(this)
      );
    }

    // Signal ready
    this.ready.fire();

    /* pragma:DEBUG_START */
    console.warn(
      "sr: " +
        (winObj === window.top ? "" : "[frm] ") +
        "record initialization complete on page: %c" +
        winObj.document.title,
      "color:green"
    );
    /* pragma:DEBUG_END */
  }
};

/**
 * Get the top instance of SessionRecord
 */
Recorder.prototype.getTop = function() {
  return !!this.recordParent ? this.recordParent.getTop() : this;
};

/**
 * Get the path to this instance of the recorder
 */
Recorder.prototype.getPath = function() {
  return this.instancePath;
};

/**
 * The namespace for util.Bind for this record instance
 */
Recorder.prototype.getBindNS = function() {
  return "record" + this.getPath();
};

/**
 * Namespace event handlers to the current frame for easy unbinding.
 *
 * @param {*} targ
 * @param {*} event
 * @param {*} fn
 * @param {*} options
 */
Recorder.prototype.bind = function(targ, event, fn, options) {
  utils.Bind(targ, this.getBindNS() + ":" + event, fn, options);
};

/**
 * Start transmitting if we aren"t already
 */
Recorder.prototype.setTransmitOK = function() {
  /* pragma:DEBUG_START */
  console.log("sr: " + (this.win === window.top ? "" : "[frm] ") + "setTransmitOK");
  /* pragma:DEBUG_END */

  // Signal to all frames that we should start transmitting
  this.sesh.setTransmitting();
};

/**
 * Flush held data
 */
Recorder.prototype.flush = function() {
  if (this.worker) {
    this.worker.flush();
  }
};

/**
 * Delete any data
 */
Recorder.prototype.clearState = function() {
  // Clear data
  this.sesh.clear();
  this.dispose();
};

/**
 * Return the GID
 */
Recorder.prototype.getGlobalId = function() {
  return this.sesh.getGlobalId();
};

/**
 * Return the SID
 */
Recorder.prototype.getSessionId = function() {
  return this.sesh.getSessionId();
};

/**
 * Return the masker config for this page
 */
Recorder.prototype.getPIIConfig = function() {
  return this.masker && this.masker.piiObj;
};

/**
 * Return the masking target elements for this page
 */
Recorder.prototype.getMaskingTargets = function() {
  return this.masker && this.masker.getCurrentMaskingTargets();
};

/**
 * Make the server request to start processing
 * @param delay {Number} (optional) How many MS to delay the start of processing
 */
Recorder.prototype.processImmediately = function(delay) {
  // Ask the server to process after the delay or now
  new utils.AjaxTransport().send({
    method: "GET",
    url:
      fs.config.recUrl +
      "process/" +
      fs.enc(this.getGlobalId()) +
      "?version=" +
      fs.enc(fs.config.codeVer == "symlink" ? "19.7.0" : fs.config.codeVer) +
      "&delay=" +
      (delay || 0),
    failure: function(result) {
      /* pragma:DEBUG_START */
      console.warn(
        "sr: " +
          (window === window.top ? "" : "[frm] ") +
          "Session processing request failed for global",
        this.getGlobalId(),
        "Note: this doesn't necessarily mean there is a problem. The processing may already have been started."
      );
      /* pragma:DEBUG_END */
    }.bind(this),
    success: function(result) {
      /* pragma:DEBUG_START */
      console.log(
        "sr: " + (window === window.top ? "" : "[frm] ") + "Session processing started for global",
        this.getGlobalId()
      );
      /* pragma:DEBUG_END */
    }.bind(this),
  });
};

var META_TOO_LARGE = "Meta object too large";

/**
 * Send a custom event to the server via the public API.
 *
 * @param {Number} type the event type to send
 * @param {String} defmsg the default msg
 * @param {String} msg the msg -- max 256 chars
 * @param {Object} meta the meta object -- max 10k chars
 */
Recorder.prototype.sendCustomEvent = function(type, defmsg, msg, meta) {
  msg = msg || defmsg;
  meta = JSON.stringify(meta || {});
  if (msg.length > 256) {
    msg = msg.substr(0, 256);
  }
  if (meta.length > 10000) {
    meta = JSON.stringify({ msg: META_TOO_LARGE });
  }
  this.worker.queueAction(type, {
    msg: msg,
    meta: meta,
  });
};

/**
 * Dispose the object and free up everything
 */
Recorder.prototype.dispose = function() {
  /* pragma:DEBUG_START */
  console.log(
    "sr: " +
      (window === window.top ? "" : "[frm] ") +
      "disposing Recorder instance. already disposed?",
    !!this.disposed
  );
  /* pragma:DEBUG_END */

  // Prevent disposed from firing a second time
  if (this.disposed) {
    return false;
  }
  this.disposed = true;

  // Dispose the masker
  if (this.masker) {
    this.masker.dispose();
  }

  // Unsubscribe it all
  this.ready.unsubscribeAll();

  // don't dispose of the worker or the sesh unless we own them
  if (this.getTop() === this) {
    // Dispose of the worker
    this.worker.dispose();

    // Dispose the session
    this.sesh.dispose();
  }

  // Dispose the capture object
  if (this.cap) {
    this.cap.dispose();
  }

  // Unbind any record events for this iframe only
  utils.Unbind(this.getBindNS() + ":*");

  // Success
  return true;
};
