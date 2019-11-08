/**
 * Replay Class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, makeURI, nextTick } from "../fs/index";
import { now as currentTime, getRootDomain, getGeneralStorage } from "../utils/utils";

// Holds a permanent reference to the record controller
let _recordController = null;
let _recordStg = null;
let transmitStart = currentTime();

/**
 * All interactions with cxReplay
 * @type {{setup: Replay.setup, startRecording: Replay.startRecording}}
 */
const Replay = {
  /**
   * Set things up
   * @param inst
   * @param callback
   */
  setup(browser, cpps, inst, callback) {
    // If the product is disabled in the global config, don't proceed
    if (!globalConfig.products.record) {
      nextTick(callback);
    } else {
      // We'll require this, but chances are it's already been loaded, so this will be quick
      window._fsRequire([makeURI("$fs.record.js")], RecordController => {
        /* pragma:DEBUG_START */
        console.warn("fb: record module loaded.");
        /* pragma:DEBUG_END */

        // Make a storage unit
        if (!_recordStg) {
          _recordStg = getGeneralStorage(browser);
        }

        const extraSettings = {
          id: globalConfig.customerId || getRootDomain() || "feedback_customerId",
        };

        // Set up an instance of the recorder
        _recordController = RecordController.getInstance(
          browser,
          window,
          _recordStg,
          extraSettings,
          cpps
        );

        // Call the callback
        callback(_recordController);
      });
    }
  },

  /**
   * Start the processing
   */
  startProcessing(browser, cpps, inst) {
    Replay.startTransmitting(browser, cpps, inst, ctrlr => {
      // Make the server request to process immediately
      if (ctrlr && ctrlr.recorder) {
        ctrlr.recorder.processImmediately(Math.max(20000 - (currentTime() - transmitStart), 0));
      }
    });
  },

  /**
   * Remove any recording controllers
   */
  dispose() {
    if (_recordController) {
      /* pragma:DEBUG_START */
      console.warn("fb: disposing cxrecord");
      /* pragma:DEBUG_END */
      _recordController.dispose();
      _recordController = null;
    }
  },

  /**
   * Begin recording
   * @param inst
   */
  startTransmitting(browser, cpps, inst, cb) {
    transmitStart = currentTime();
    if (inst.replay === true) {
      if (_recordController) {
        // Start transmitting
        _recordController.beginTransmitting();

        if (cb) {
          return cb(_recordController);
        }
      } else {
        Replay.setup(browser, cpps, inst, ctrlr => {
          // Start transmitting
          ctrlr.beginTransmitting();

          if (cb) {
            return cb(ctrlr);
          }
        });
      }
    }
  },
};

export { _recordController, _recordStg, Replay };
