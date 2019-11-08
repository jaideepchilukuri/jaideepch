/**
 * Startup sequence for Survey Admin
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { domReady, isString, getProductConfig } from "../fs/index";
import { Browser, b64DecodeUnicode, compile } from "../utils/utils";
import { Admin } from "./admin";

function startup() {
  const config = getProductConfig("trigger");

  // Decode survey definitions
  if (config && config.surveydefs) {
    for (let p = 0; p < config.surveydefs.length; p++) {
      if (isString(config.surveydefs[p])) {
        config.surveydefs[p] = compile(b64DecodeUnicode(config.surveydefs[p]));
      }
    }
  }

  // When the DOM is ready, fire up the opt out script
  domReady(() => {
    /* pragma:DEBUG_START */
    console.log(
      `sva: domready for survey admin "${config.config.version}" *******************************`
    );
    /* pragma:DEBUG_END */

    // Set up the browser
    const browser = new Browser();

    // Bind to browser ready
    browser.ready.subscribe(
      () => {
        /* pragma:DEBUG_START */
        console.log("sva: browser detected", browser);
        /* pragma:DEBUG_END */

        // Set up a new admin instance
        const admin = new Admin(browser);

        // Pull down the template and stylesheet
        admin.loadResources(() => {
          /* pragma:DEBUG_START */
          console.log("sva: loaded resources");
          /* pragma:DEBUG_END */
          // Display
          admin.render();
        });
      },
      true,
      true
    );
  });
}

export { startup };
