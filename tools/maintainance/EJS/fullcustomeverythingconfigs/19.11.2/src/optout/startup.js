/**
 * Startup sequence for opt out
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { domReady } from "../fs/index";
import { Browser } from "../utils/utils";
import { OptOut } from "./optout";

function startup() {
  domReady(onDomReady);
}

function onDomReady() {
  /* pragma:DEBUG_START */
  console.log("optout: domready");
  /* pragma:DEBUG_END */

  // Set up the browser
  const browser = new Browser();

  // Bind to browser ready
  browser.ready.subscribe(
    () => {
      /* pragma:DEBUG_START */
      console.warn("outout: browser detected", browser);
      /* pragma:DEBUG_END */

      // Set up a new opt out
      const optout = new OptOut(browser);

      // Go grab the resources
      optout.loadResources(() => {
        // Render it out
        optout.render();
      });
    },
    true,
    true
  );
}

export { startup };
