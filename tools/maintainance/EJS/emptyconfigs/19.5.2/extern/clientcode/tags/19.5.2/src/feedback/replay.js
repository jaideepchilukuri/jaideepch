/**
 * Replay Class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Replay");

fs.require("fs.Top");

(function () {

  // Holds a permanent reference to the record controller
  var _recordController = null,
    _recordStg = null,
    _recordCfg = null,
    transmitStart = utils.now();

  /**
   * All interactions with cxReplay
   * @type {{setup: Replay.setup, startRecording: Replay.startRecording}}
   */
  var Replay = {
    /**
     * Set things up
     * @param inst
     * @param callback
     */
    setup: function (browser, cpps, inst, callback) {
      // If the product is disabled in the global config, don't proceed
      if ((fs.isDefined(fs.config.products.record) && fs.config.products.record === false) || !fs.productConfig.record) {
        fs.nextTick(callback);
      } else {
        // We'll require this, but chances are it's already been loaded, so this will be quick
        require([fs.makeURI('$fs.record.js'), 'recordconfig'], function (RecordController, recordconfig) {
          // Keep a local copy
          _recordCfg = recordconfig;

          /* pragma:DEBUG_START */
          console.warn("fb: record module loaded. starting transmit..");
          /* pragma:DEBUG_END */

          // Make a storage unit
          if (!_recordStg) {
            _recordStg = utils.getGlobalStore(browser);
          }

          // Set up an instance of the recorder
          _recordController = RecordController.getInstance(browser, window, _recordStg, { id: recordconfig.id }, cpps);

          // Call the callback
          callback(_recordController);
        });
      }
    },

    /**
     * Start the processing
     */
    startProcessing: function (browser, cpps, inst) {
      Replay.startTransmitting(browser, cpps, inst, function (ctrlr) {
        // Make the server request to process immediately
        if (ctrlr && ctrlr.recorder) {
          ctrlr.recorder.processImmediately(Math.max(20000 - (utils.now() - transmitStart), 0));
        }
      });
    },

    /**
     * Remove any recording controllers
     */
    dispose: function () {
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
    startTransmitting: function (browser, cpps, inst, cb) {
      transmitStart = utils.now();
      if (inst.replay === true) {
        if (_recordController) {
          // Start transmitting
          _recordController.beginTransmitting();

          if (cb) {
            cb(_recordController);
          }
        } else {
          Replay.setup(browser, cpps, inst, function (ctrlr) {
            // Start transmitting
            ctrlr.setTransmitOK();

            if (cb) {
              cb(ctrlr);
            }
          });
        }
      }
    }
  };

})();
