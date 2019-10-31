/**
 * Bottom file for feedback reporting ui
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Criteria } from "./criteria";
import { applyFeedbackCustomerHacks } from "../feedback/customerhacks";
import { setupDefaultFeedbackConfigs } from "../feedback/defaultconfigs";
import { checkTopicAllowed } from "./topictester";
import { Report } from "./report";
import { domReady, getProductConfig } from "../fs/index";
import { Browser } from "../utils/utils";

setupDefaultFeedbackConfigs();

function startup() {
  if (!applyFeedbackCustomerHacks()) {
    return;
  }

  // Wait for DOMReady
  domReady(whenDomReady);
}

// Main entry point.
function whenDomReady() {
  /* pragma:DEBUG_START */
  console.warn("fbr: domready");
  /* pragma:DEBUG_END */

  // The browser detector
  const config = getProductConfig("feedback");
  const browser = new Browser();
  const configInstances = config.instances;

  if (configInstances) {
    // Continue when things are ready
    browser.ready.subscribe(
      () => {
        /* pragma:DEBUG_START */
        console.warn("fbr: browser ready");
        /* pragma:DEBUG_END */

        // Set up a criteria checker
        const crit = new Criteria(browser, config);

        // Only continue if we are on a supported platform
        if (crit.platformOK()) {
          /* pragma:DEBUG_START */
          console.warn("fbr: platform check passed");
          /* pragma:DEBUG_END */
          let inPgProj;

          for (let i = 0; i < configInstances.length; i++) {
            const inst = configInstances[i];
            // Check for whitelisting to see if a project/badge is visible on this page.
            // Also check if the badge is not disabled.
            if (inst.topics && inst.topics.length) {
              for (let p = 0; p < inst.topics.length; p++) {
                if (checkTopicAllowed(inst.topics[p]) && !inst.disabled) {
                  inPgProj = inst;
                  break;
                }
              }
            }
            if (inPgProj) {
              break;
            }
          }

          // Pass in the browser config and the config of the project to be shown..
          const reporter = new Report(browser, inPgProj);
          reporter.ready.subscribe(() => {
            /* pragma:DEBUG_START */
            console.warn("fbr: reporter is ready");
            /* pragma:DEBUG_END */

            // Build the UI
            reporter.run();
          });
          reporter.initialize();
        } else {
          /* pragma:DEBUG_START */
          console.warn("fbr: platform check failed");
          /* pragma:DEBUG_END */
        }
      },
      true,
      true
    );
  } else {
    /* pragma:DEBUG_START */
    console.warn("fbr: no feedback instances detected");
    /* pragma:DEBUG_END */
  }
}

export { startup };
