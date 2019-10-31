/**
 * Handles recording initialization
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.Record");

fs.require("trig.Top");

(function (trigger) {

  /**
   * Do the work of setting up recording
   * @param trig
   * @param isinpool
   * @param cpps
   * @constructor
   */
  var SetupRecording = function (browser, dorecord, stg, isinpool, cpps, trig) {
    // Handle cxReplay only if this is a newer browser
    if (dorecord) {
      /* pragma:DEBUG_START */
      console.log("trigger: " + (isinpool ? "in the pool" : "not in pool."));
      /* pragma:DEBUG_END */
      if (isinpool) {
        // Check if record has been disabled and only proceed if it is not disabled
        if (!(fs.isDefined(fs.config.products.record) && fs.config.products.record === false) || !fs.productConfig.record) {
          /* pragma:DEBUG_START */
          console.log("trigger: loading record.js");
          /* pragma:DEBUG_END */
          // We'll require this, but chances are it's already been loaded, so this will be quick
          require([fs.makeURI("$fs.record.js")], function (RecordController) {
            // Set that we are recording
            stg.set('rc', 'true');

            /* pragma:DEBUG_START */
            console.warn("trigger: record module loaded. setting it up next");
            /* pragma:DEBUG_END */

            var extraSettings = {
              // customerId is in the process of moving from trigger/record config to global config (CC-3987)
              id: config.config.id
            };

            // Set up an instance of the recorder
            Singletons.RecordController = RecordController;

            Singletons.rec = RecordController.getInstance(browser, _W, stg, extraSettings, cpps);

            if (trig) {
              trig.recordController = rec;
            }
          });
        }
      }
    } else if (dorecord) {
      /* pragma:DEBUG_START */
      console.warn("trigger: we would have loaded record but Uint8Array is not defined");
      /* pragma:DEBUG_END */
    }
  };

})(trigger);