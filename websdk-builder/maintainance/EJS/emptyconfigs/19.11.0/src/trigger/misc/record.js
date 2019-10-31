/**
 * Handles recording initialization
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Singletons, _W } from "../top";
import { globalConfig, makeURI } from "../../fs/index";
import { getRootDomain } from "../../utils/utils";

/**
 * Do the work of setting up recording
 * @param trig
 * @param isinpool
 * @param cpps
 * @constructor
 */
const SetupRecording = (browser, dorecord, stg, isinpool, cpps, trig) => {
  // Handle cxReplay only if this is a newer browser
  if (dorecord) {
    /* pragma:DEBUG_START */
    console.log(`trigger: ${isinpool ? "in the pool" : "not in pool."}`);
    /* pragma:DEBUG_END */
    if (isinpool) {
      // Check if record has been disabled and only proceed if it is not disabled
      if (globalConfig.products.record) {
        // We'll require this, but chances are it's already been loaded, so this will be quick
        _W._fsRequire([makeURI("$fs.record.js")], RecordController => {
          // Set that we are recording
          stg.set("rc", "true");

          /* pragma:DEBUG_START */
          console.warn("trigger: record module loaded. setting it up next");
          /* pragma:DEBUG_END */

          const extraSettings = {
            id: globalConfig.customerId || getRootDomain() || "record_customerId",
          };

          // Set up an instance of the recorder
          Singletons.RecordController = RecordController;
          Singletons.rec = RecordController.getInstance(browser, _W, stg, extraSettings, cpps);

          if (trig) {
            trig.recordController = Singletons.rec;
          }
        });
      } else {
        /* pragma:DEBUG_START */
        console.error("trigger: Wanted to load record but it's turned off in globalConfig");
        /* pragma:DEBUG_END */
      }
    }
  }
};

export { SetupRecording };
