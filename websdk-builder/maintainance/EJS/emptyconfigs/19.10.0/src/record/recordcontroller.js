/**
 * Record plugin
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Criteria } from "./misc/criteria";
import { Singletons, RECLOGGING } from "./top";
import { globalConfig, ext, isFunction, getProductConfig } from "../fs/index";
import { RecordAPI } from "./misc/publicapi";
import { Recorder } from "./record";
import { Bind, Journey, getRootDomain, APPID } from "../utils/utils";

/**
 * Holds the singleton
 * @type {null}
 */
let controllerInstance = null;

/**
 * Creates a new instance of RecordController
 * @constructor
 */
class RecordController {
  constructor() {
    // TODO clean this up:
    //  - args, correct journey args, checking for feedback and trigger values
    //  - not use Singletons.jrny because Journeys are specific to products
    const storageArg = arguments[2];

    this.jrny = Singletons.jrny = new Journey({
      customerId: globalConfig.customerId || getRootDomain() || "record_customerId",
      appId: APPID.REPLAY,
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
        `sr: ${
          window === window.top ? "" : "[frm] "
        }Cannot instantiate more than one instance of RecordController. Use getInstance().`
      );
    }
    /* pragma:DEBUG_END */

    this.initialize.apply(this, arguments);
  }

  /**
   * Is this an iFrame?
   * @returns {boolean}
   */
  isIframe() {
    return window != window.top;
  }

  /**
   * Is this a cross domain iFrame?
   */
  isCrossDomainFrame() {
    if (this.isIframe()) {
      try {
        const a = window.top.document.body.toString().length;
        return a.length < 0;
      } catch (e) {
        return true;
      }
    }
    return false;
  }

  /**
   * The master initializer for recording
   * @param trigger {Trigger}
   * @param browser {Browser}
   * @param winobj {Window}
   * @param stg {GlobalStorage}
   * @constructor
   */
  initialize(browser, winobj, stg, extrasettings, cpps) {
    const recordconfig = getProductConfig("record");

    if (
      !recordconfig ||
      !recordconfig.advancedSettings ||
      !recordconfig.advancedSettings.pii ||
      !recordconfig.advancedSettings.browser_cutoff
    ) {
      throw new Error(
        "Looks like record is trying to run without a config. " +
          "Please push a proper config for record to fix this error."
      );
    }

    if (typeof Uint8Array == "undefined") {
      /* pragma:DEBUG_START */
      console.warn(
        `sr: ${
          window === window.top ? "" : "[frm] "
        }browser is too old - no typed arrays - bombing out`
      );
      /* pragma:DEBUG_END */

      // Log rec event
      if (this.jrny) {
        this.jrny.addEventString(RECLOGGING.RECORDER_STOP_OLDBROWSER);
      }
      return;
    }

    const isIframe = this.isIframe();
    const isCrossDomainFrame = this.isCrossDomainFrame();

    if (isIframe && !isCrossDomainFrame) {
      /* pragma:DEBUG_START */
      console.warn(
        `sr: ${window === window.top ? "" : "[frm] "}we're in an iFrame (%c${
          document.title
        }%c) but not a cross-domain iFrame. Stopping the normal record bootstrap process.`,
        "color:green",
        "color:black"
      );
      /* pragma:DEBUG_END */
      return;
    }

    if (extrasettings) {
      ext(recordconfig.advancedSettings || {}, extrasettings);
    }

    this.winobj = winobj;
    this.browser = browser;

    if (recordconfig && recordconfig.instances) {
      for (let l = 0; l < recordconfig.instances.length; l++) {
        const rinst = recordconfig.instances[l];
        if (!rinst.disabled) {
          ext(recordconfig, rinst);
          break;
        }
      }
    }

    this.crit = new Criteria(recordconfig, browser);
    this.stg = stg;

    // Sync the storage object
    stg.ready.subscribe(
      () => {
        // Make sure we know about this device
        browser.ready.subscribe(
          () => {
            /* pragma:DEBUG_START */
            console.warn(`sr: ${window === window.top ? "" : "[frm] "}record about to initialize`);
            /* pragma:DEBUG_END */

            // Check device and platform support
            if (this.crit.supported() || this.crit.didSkipOnPurpose) {
              const stgChecks = this.stg.get(["pv"]);

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
                  () => {
                    cpps.set("replay_id", this.recorder.getGlobalId());
                    cpps.set("sessionid", this.recorder.getSessionId());

                    RecordAPI.ready(this);
                  },
                  true,
                  true
                );

                // Log rec event only on page 1
                if (this.jrny && stgChecks.pv === 1) {
                  this.jrny.addEventString(RECLOGGING.RECORDER_SESSION_STARTED);
                }

                // Free up the instance on unload
                Bind(window, "beforeunload", () => {
                  /* pragma:DEBUG_START */
                  console.log(
                    `sr: ${window === window.top ? "" : "[frm] "}unloading`,
                    this.recorder
                  );
                  /* pragma:DEBUG_END */
                  if (this.recorder) {
                    this.recorder.dispose();
                    delete this.recorder;
                  }
                });
              } else {
                /**
                 * We are inside a cross-domain iFrame. Wait for a message instead
                 * Free up the instance on unload
                 */
                Bind(window, "message", ed => {
                  // TODO: fix cross domain iframes
                  ed.data += "";
                  if (
                    ed.data &&
                    isFunction(ed.data.indexOf) &&
                    ed.data.length > 3 &&
                    ed.data.indexOf("{") > -1
                  ) {
                    let dt;
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
                          `sr: ${
                            window === window.top ? "" : "[frm] "
                          }cross-origin iFrame received init event: `,
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
                          () => {
                            cpps.set("replay_id", this.recorder.getGlobalId());
                            cpps.set("sessionid", this.recorder.getSessionId());

                            RecordAPI.ready(this);
                          },
                          true,
                          true
                        );

                        if (!stgChecks.rt && stgChecks.i === "x") {
                          this.beginTransmitting();
                        }

                        // Free up the instance on unload
                        Bind(window, "unload", () => {
                          if (this.recorder) {
                            const frameId = this.recorder.ifrid;
                            //postMessage to parent frame notifying parent we are unloading iFrame.
                            //Send the frame id in postMessage data.
                            window.top.postMessage({ unloadiFrame: true, frameId }, "*");
                            this.recorder.dispose();
                            delete this.recorder;
                          }
                        });
                      } else if (dt.cxsp && this.recorder) {
                        // Set the scroll position and location of the frame
                        this.recorder.setXFrameScrollPosition(dt.sp);
                      }
                    }
                  }
                });
              }
            } else {
              RecordAPI.ready(this);
            }
          },
          true,
          true
        );
      },
      true,
      true
    );
  }

  /**
   * Start transmitting
   */
  beginTransmitting() {
    if (this.recorder) {
      /* pragma:DEBUG_START */
      console.warn(`sr: ${window === window.top ? "" : "[frm] "}beginTransmitting`);
      /* pragma:DEBUG_END */
      this.recorder.setTransmitOK();
    } else {
      /* pragma:DEBUG_START */
      console.warn(`sr: ${window === window.top ? "" : "[frm] "}no recorder to transmit with`);
      /* pragma:DEBUG_END */
    }
  }

  /**
   * Dispose
   */
  dispose() {
    if (this.recorder) {
      /* pragma:DEBUG_START */
      console.warn(`sr: ${window === window.top ? "" : "[frm] "}controller dispose`);
      /* pragma:DEBUG_END */
      this.recorder.dispose();
      delete this.recorder;

      controllerInstance = null;
    }
  }

  /**
   * Stop recording
   */
  cancelRecord() {
    if (this.recorder) {
      /* pragma:DEBUG_START */
      console.warn(`sr: ${window === window.top ? "" : "[frm] "}cancelRecord`);
      /* pragma:DEBUG_END */
      this.recorder.clearState();
      delete this.recorder;
    } else {
      /* pragma:DEBUG_START */
      console.warn(`sr: ${window === window.top ? "" : "[frm] "}no recorder to cancel`);
      /* pragma:DEBUG_END */
    }

    // Log rec event
    if (this.jrny) {
      this.jrny.addEventString(RECLOGGING.RECORDER_CANCELED);
    }
  }

  /**
   * Return the GID
   */
  getGlobalId() {
    return this.recorder && this.recorder.getGlobalId();
  }

  /**
   * Return the SID
   */
  getSessionId() {
    return this.recorder && this.recorder.getSessionId();
  }

  /**
   * Send a custom event to the server via the public API.
   * @see Recorder for more info
   */
  sendCustomEvent(type, defmsg, msg, meta) {
    return this.recorder && this.recorder.sendCustomEvent(type, defmsg, msg, meta);
  }
}

/**
 * Get the active instance
 * @param browser
 * @param winobj
 * @param stg
 * @param extrasettings
 * @returns {null}
 */
RecordController.getInstance = (browser, winobj, stg, extrasettings, cpps) => {
  if (controllerInstance === null) {
    controllerInstance = new RecordController(browser, winobj, stg, extrasettings, cpps);
  }
  return controllerInstance;
};

/**
 * Delete the instance
 */
RecordController.disposeInstance = () => {
  if (controllerInstance) {
    controllerInstance.dispose();
    controllerInstance = null;
  }
};

export default RecordController;
