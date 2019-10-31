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
 * Holds the singleton
 * @type {null}
 */
var controllerInstance = null;

/**
 * Creates a new instance of RecordController
 * @constructor
 */
function RecordController() {
  // TODO clean this up:
  //  - args, correct journey args, checking for feedback and trigger values
  //  - not use Singletons.jrny because Journeys are specific to products
  var storageArg = arguments[2];

  this.jrny = Singletons.jrny = new utils.Journey({
    customerId: fs.config.customerId || utils.getRootDomain() || "record_customerId",
    appId: utils.APPID.REPLAY,
    stg: storageArg,
    browser: arguments[0],
    useSessionId: true,
    usePopupId: false,
  });

  this.jrny.addEventsDefault("properties", {
    fs_pageViews: [storageArg.get("pv")],
  });

  /* pragma:DEBUG_START */
  if (controllerInstance !== null) {
    console.error(
      "sr: " +
        (window === window.top ? "" : "[frm] ") +
        "Cannot instantiate more than one instance of RecordController. Use getInstance()."
    );
  }

  /* pragma:DEBUG_END */
  this.initialize.apply(this, arguments);
}

/**
 * Is this an iFrame?
 * @returns {boolean}
 */
RecordController.prototype.isIframe = function() {
  return window != window.top;
};

/**
 * Is this a cross domain iFrame?
 */
RecordController.prototype.isCrossDomainFrame = function() {
  if (this.isIframe()) {
    try {
      var a = window.top.document.body.toString().length;
      return a.length < 0;
    } catch (e) {
      return true;
    }
  }
  return false;
};

/**
 * The master initializer for recording
 * @param trigger {Trigger}
 * @param browser {Browser}
 * @param winobj {Window}
 * @param stg {GlobalStorage}
 * @constructor
 */
RecordController.prototype.initialize = function(browser, winobj, stg, extrasettings, cpps) {
  if (typeof Uint8Array == "undefined") {
    /* pragma:DEBUG_START */
    console.warn(
      "sr: " +
        (window === window.top ? "" : "[frm] ") +
        "browser is too old - no typed arrays - bombing out"
    );
    /* pragma:DEBUG_END */

    // Log rec event
    if (this.jrny) {
      this.jrny.addEventString(RECLOGGING.RECORDER_STOP_OLDBROWSER);
    }
    return;
  }

  var isIframe = this.isIframe(),
    isCrossDomainFrame = this.isCrossDomainFrame();

  if (isIframe && !isCrossDomainFrame) {
    /* pragma:DEBUG_START */
    console.warn(
      "sr: " +
        (window === window.top ? "" : "[frm] ") +
        "we're in an iFrame (%c" +
        document.title +
        "%c) but not a cross-domain iFrame. Stopping the normal record bootstrap process.",
      "color:green",
      "color:black"
    );
    /* pragma:DEBUG_END */
    return;
  }

  if (extrasettings) {
    fs.ext(recordconfig.advancedSettings || {}, extrasettings);
  }

  this.winobj = winobj;
  this.browser = browser;

  if (recordconfig && recordconfig.instances) {
    for (var l = 0; l < recordconfig.instances.length; l++) {
      var rinst = recordconfig.instances[l];
      if (!rinst.disabled) {
        fs.ext(recordconfig, rinst);
        break;
      }
    }
  }

  this.crit = new Criteria(recordconfig, browser);
  this.stg = stg;

  // Sync the storage object
  stg.ready.subscribe(
    function() {
      // Make sure we know about this device
      browser.ready.subscribe(
        function() {
          /* pragma:DEBUG_START */
          console.warn(
            "sr: " + (window === window.top ? "" : "[frm] ") + "record about to initialize"
          );
          /* pragma:DEBUG_END */

          // Check device and platform support
          if (this.crit.supported() || this.crit.didSkipOnPurpose) {
            var stgChecks = this.stg.get(["pv"]);

            // Only do the normal initialization if we're not in a cross-domain iFrame
            if (!isCrossDomainFrame) {
              // Set up a new recorder
              this.recorder = new Recorder(
                stg,
                browser,
                winobj,
                0,
                null,
                recordconfig,
                null,
                isCrossDomainFrame,
                null,
                null,
                null,
                null,
                !!this.crit.didSkipOnPurpose
              );
              this.recorder.ready.subscribe(
                function() {
                  cpps.set("replay_id", this.recorder.getGlobalId());
                  cpps.set("sessionid", this.recorder.getSessionId());

                  RecordAPI.ready(this);
                }.bind(this),
                true,
                true
              );

              // Log rec event only on page 1
              if (this.jrny && stgChecks.pv === 1) {
                this.jrny.addEventString(RECLOGGING.RECORDER_SESSION_STARTED);
              }

              // Free up the instance on unload
              utils.Bind(
                window,
                "beforeunload",
                function() {
                  /* pragma:DEBUG_START */
                  console.log(
                    "sr: " + (window === window.top ? "" : "[frm] ") + "unloading",
                    this.recorder
                  );
                  /* pragma:DEBUG_END */
                  if (this.recorder) {
                    this.recorder.dispose();
                    delete this.recorder;
                  }
                }.bind(this)
              );
            } else {
              /**
               * We are inside a cross-domain iFrame. Wait for a message instead
               * Free up the instance on unload
               */
              utils.Bind(
                window,
                "message",
                function(ed) {
                  // TODO: fix cross domain iframes
                  ed.data = ed.data + "";
                  if (
                    ed.data &&
                    fs.isFunction(ed.data.indexOf) &&
                    ed.data.length > 3 &&
                    ed.data.indexOf("{") > -1
                  ) {
                    var dt;
                    try {
                      dt = JSON.parse(ed.data);
                    } catch (e) {
                      return;
                    }

                    if (!(dt.src && dt.src == "fsframe")) {
                      // We don't do this in our own iFrame
                      if (dt.cxr && dt.id) {
                        /* pragma:DEBUG_START */
                        console.warn(
                          "sr: " +
                            (window === window.top ? "" : "[frm] ") +
                            "cross-origin iFrame received init event: ",
                          dt.id
                        );
                        /* pragma:DEBUG_END */

                        // Set up a new recorder
                        this.recorder = new Recorder(
                          stg,
                          browser,
                          winobj,
                          dt.xp,
                          null,
                          recordconfig,
                          null,
                          isCrossDomainFrame,
                          dt.id,
                          ed.source,
                          dt.sid,
                          dt.sp
                        );
                        this.recorder.ready.subscribe(
                          function() {
                            cpps.set("replay_id", this.recorder.getGlobalId());
                            cpps.set("sessionid", this.recorder.getSessionId());

                            RecordAPI.ready(this);
                          }.bind(this),
                          true,
                          true
                        );

                        if (!stgChecks.rt && stgChecks.i === "x") {
                          this.beginTransmitting();
                        }

                        // Free up the instance on unload
                        utils.Bind(
                          window,
                          "unload",
                          function() {
                            if (this.recorder) {
                              var frameId = this.recorder.ifrid;
                              //postMessage to parent frame notifying parent we are unloading iFrame.
                              //Send the frame id in postMessage data.
                              window.top.postMessage({ unloadiFrame: true, frameId: frameId }, "*");
                              this.recorder.dispose();
                              delete this.recorder;
                            }
                          }.bind(this)
                        );
                      } else if (dt.cxsp && this.recorder) {
                        // Set the scroll position and location of the frame
                        this.recorder.setXFrameScrollPosition(dt.sp);
                      }
                    }
                  }
                }.bind(this)
              );
            }
          } else {
            RecordAPI.ready(this);
          }
        }.bind(this),
        true,
        true
      );
    }.bind(this),
    true,
    true
  );
};

/**
 * Start transmitting
 */
RecordController.prototype.beginTransmitting = function() {
  if (this.recorder) {
    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? "" : "[frm] ") + "beginTransmitting");
    /* pragma:DEBUG_END */
    this.recorder.setTransmitOK();
  } else {
    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? "" : "[frm] ") + "no recorder to transmit with");
    /* pragma:DEBUG_END */
  }
};

/**
 * Dispose
 */
RecordController.prototype.dispose = function() {
  if (this.recorder) {
    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? "" : "[frm] ") + "controller dispose");
    /* pragma:DEBUG_END */
    this.recorder.dispose();
    delete this.recorder;

    controllerInstance = null;
  }
};

/**
 * Stop recording
 */
RecordController.prototype.cancelRecord = function() {
  if (this.recorder) {
    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? "" : "[frm] ") + "cancelRecord");
    /* pragma:DEBUG_END */
    this.recorder.clearState();
    delete this.recorder;
  } else {
    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? "" : "[frm] ") + "no recorder to cancel");
    /* pragma:DEBUG_END */
  }

  // Log rec event
  if (this.jrny) {
    this.jrny.addEventString(RECLOGGING.RECORDER_CANCELED);
  }
};

/**
 * Return the GID
 */
RecordController.prototype.getGlobalId = function() {
  return this.recorder && this.recorder.getGlobalId();
};

/**
 * Return the SID
 */
RecordController.prototype.getSessionId = function() {
  return this.recorder && this.recorder.getSessionId();
};

/**
 * Send a custom event to the server via the public API.
 * @see Recorder for more info
 */
RecordController.prototype.sendCustomEvent = function(type, defmsg, msg, meta) {
  return this.recorder && this.recorder.sendCustomEvent(type, defmsg, msg, meta);
};

/**
 * Get the active instance
 * @param browser
 * @param winobj
 * @param stg
 * @param extrasettings
 * @returns {null}
 */
RecordController.getInstance = function(browser, winobj, stg, extrasettings, cpps) {
  if (controllerInstance === null) {
    controllerInstance = new RecordController(browser, winobj, stg, extrasettings, cpps);
  }
  return controllerInstance;
};

/**
 * Delete the instance
 */
RecordController.disposeInstance = function() {
  if (controllerInstance) {
    controllerInstance.dispose();
    controllerInstance = null;
  }
};
