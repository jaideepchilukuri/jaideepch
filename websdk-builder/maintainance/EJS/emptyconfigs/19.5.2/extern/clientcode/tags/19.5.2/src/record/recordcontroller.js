/**
 * Record plugin
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.RecordController");

fs.require("rec.Top");
fs.require("rec.Record");
fs.require("rec.Misc.Criteria");
fs.require("rec.Misc.PublicAPI");

(function () {

  /**
   * Holds the singleton
   * @type {null}
   */
  var controllerInstance = null;

  /**
   * Creates a new instance of RecordController
   * @constructor
   */
  function RecordController(browser, winObj, stg, extraSettings, cpps) {
    this.jrny = Singletons.jrny = new utils.Journey(
      extraSettings.id || utils.getRootDomain(),
      utils.APPID.REPLAY,
      stg.uid || stg.get("rid") || 'record_userId',
      browser
    );

    this.jrny.addEventsDefault('properties', {
      "fs_pageViews": [stg.get('pv')]
    });

    /* pragma:DEBUG_START */
    if (controllerInstance !== null) {
      console.error("sr: " + (window === window.top ? '' : '[frm] ') +
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
  RecordController.prototype.isIframe = function () {
    return (window != window.top);
  };

  /**
   * Is this a cross domain iFrame?
   */
  RecordController.prototype.isCrossDomainFrame = function () {
    if (this.isIframe()) {
      try {
        var a = window.top.document.body.toString().length;
        return (a.length < 0);
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
   * @param winObj {Window}
   * @param stg {GlobalStorage}
   * @constructor
   */
  RecordController.prototype.initialize = function (browser, winObj, stg, extraSettings, cpps) {

    if (typeof (Uint8Array) == 'undefined') {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "browser is too old - no typed arrays - bombing out");
      /* pragma:DEBUG_END */

      // Log rec event
      if (this.jrny) {
        this.jrny.addEventString(RECLOGGING.RECORDER_STOP_OLDBROWSER);
      }
      return;
    }

    // Check if the server is healthy
    utils.Healthy(browser, ["cxreplay"], fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.log("sr: " + (window === window.top ? '' : '[frm] ') + "server is healthy, proceeding");
      /* pragma:DEBUG_END */
      var isIframe = this.isIframe(),
        isCrossDomainFrame = this.isCrossDomainFrame();

      if (isIframe && !isCrossDomainFrame) {
        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "we're in an iFrame (%c" + document.title + "%c) but not a cross-domain iFrame. Stopping the normal record bootstrap process.", 'color:green', 'color:black');
        /* pragma:DEBUG_END */
        return;
      }

      if (extraSettings) {
        fs.ext(recordconfig.advancedSettings || {}, extraSettings);
      }

      this.winobj = winObj;
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
      stg.ready.subscribe(fs.proxy(function () {
        // Make sure we know about this device
        browser.ready.subscribe(fs.proxy(function () {
          /* pragma:DEBUG_START */
          console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "record about to initialize");
          /* pragma:DEBUG_END */

          // Check device and platform support
          if (this.crit.supported()) {
            var stgChecks = this.stg.get(['rt', 'i', 'pv']);

            // Only do the normal initialization if we're not in a cross-domain iFrame
            if (!isCrossDomainFrame) {
              // Set up a new recorder
              this.recorder = new Recorder(stg, browser, winObj, null, null, recordconfig, isCrossDomainFrame);
              this.recorder.ready.subscribe(fs.proxy(function () {
                cpps.set('replay_id', this.recorder.logger.gsessionid);
                cpps.set('sessionid', this.recorder.logger.sessionid);
              }, this), true, true);

              // Log rec event only on page 1
              if (this.jrny && stgChecks.pv === 1) {
                this.jrny.addEventString(RECLOGGING.RECORDER_SESSION_STARTED);
              }

              // We might have not been transmitting already due to blacklisting on previous pages
              if (!stgChecks.rt && stgChecks.i === 'x') {
                this.beginTransmitting();
              }

              // Free up the instance on unload
              utils.Bind(window, 'unload', fs.proxy(function () {
                if (this.recorder) {
                  this.recorder.dispose();
                  this.recorder = null;
                }
              }, this));

              // Set up API as long as we're not in an iFrame
              if (!isIframe) {
                CompleteAPI(this);
              }
            } else {
              /**
               * We are inside a cross-domain iFrame. Wait for a message instead
               * Free up the instance on unload
               */
              utils.Bind(window, 'message', fs.proxy(function (ed) {
                ed.data = ed.data + '';
                if (ed.data && fs.isFunction(ed.data.indexOf) && ed.data.length > 3 && ed.data.indexOf('{') > -1) {
                  var dt;
                  try {
                    dt = JSON.parse(ed.data);
                  } catch (e) {
                    return;
                  }

                  if (!(dt.src && dt.src == 'fsframe')) {
                    // We don't do this in our own iFrame
                    if (dt.cxr && dt.id) {
                      /* pragma:DEBUG_START */
                      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "cross-origin iFrame received init event: ", dt.id);
                      /* pragma:DEBUG_END */

                      // Set up a new recorder
                      this.recorder = new Recorder(stg, browser, winObj, dt.xp, null, recordconfig, isCrossDomainFrame, dt.id, ed.source, dt.sid, dt.sp);
                      this.recorder.ready.subscribe(fs.proxy(function () {
                        cpps.set('replay_id', this.recorder.logger.gsessionid);
                        cpps.set('sessionid', this.recorder.logger.sessionid);
                      }, this), true, true);

                      if (!stgChecks.rt && stgChecks.i === 'x') {
                        this.beginTransmitting();
                      }
                      // Free up the instance on unload
                      utils.Bind(window, 'unload', fs.proxy(function () {
                        if (this.recorder) {
                          var frameId = this.recorder.ifrid;
                          //postMessage to parent frame notifying parent we are unloading iFrame.
                          //Send the frame id in postMessage data.
                          window.top.postMessage({ "unloadiFrame": true, "frameId": frameId }, "*");
                          this.recorder.dispose();
                          this.recorder = null;
                        }
                      }, this));
                    } else if (dt.cxsp && this.recorder) {
                      // Set the scroll position and location of the frame
                      this.recorder.setXFrameScrollPosition(dt.sp);
                    }
                  }
                }
              }, this));
            }
          }
        }, this), true, true);
      }, this), true, true);
    }, this), function () {

      /* pragma:DEBUG_START */
      console.error("sr: " + (window === window.top ? '' : '[frm] ') + "did not initialize because the server is not healthy");
      /* pragma:DEBUG_END */

      // Log rec event
      if (this.jrny) {
        this.jrny.addEventString(RECLOGGING.RECORDER_STOP_UNHEALTHY_SERVER);
      }
    });
  };

  /**
   * Start transmitting
   */
  RecordController.prototype.beginTransmitting = function () {
    if (this.recorder) {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "beginTransmitting");
      /* pragma:DEBUG_END */
      this.recorder.setTransmitOK();
    } else {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "no recorder to transmit with");
      /* pragma:DEBUG_END */
    }
  };

  /**
   * Dispose
   */
  RecordController.prototype.dispose = function () {
    if (this.recorder) {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "controller dispose");
      /* pragma:DEBUG_END */
      this.transmitIfCan();
      this.recorder.dispose();
      controllerInstance = null;
    }
  };

  /**
   * Do a transmit if possible
   */
  RecordController.prototype.transmitIfCan = function () {
    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "transmitIfCan()");
    /* pragma:DEBUG_END */
    var rec = this.recorder;
    if (rec) {
      var lg = rec.getLogger();
      if (lg && lg.transmitting) {
        lg._flushAndTransmit();
      }
    }
  };

  /**
   * Stop recording
   */
  RecordController.prototype.cancelRecord = function () {
    if (this.recorder) {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "cancelRecord");
      /* pragma:DEBUG_END */
      this.recorder.dispose();
      this.recorder = null;
    } else {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "no recorder to cancel");
      /* pragma:DEBUG_END */
    }

    // Log rec event
    if (this.jrny) {
      this.jrny.addEventString(RECLOGGING.RECORDER_CANCELED);
    }
  };

  /**
   * Get the active instance
   * @param browser
   * @param winObj
   * @param stg
   * @param extraSettings
   * @returns {null}
   */
  RecordController.getInstance = function (browser, winObj, stg, extraSettings, cpps) {
    if (controllerInstance === null) {
      controllerInstance = new RecordController(browser, winObj, stg, extraSettings, cpps);
    }
    return controllerInstance;
  };

  /**
   * Delete the instance
   */
  RecordController.disposeInstance = function () {
    if (controllerInstance) {
      controllerInstance.dispose();
      controllerInstance = null;
    }
  };

})();