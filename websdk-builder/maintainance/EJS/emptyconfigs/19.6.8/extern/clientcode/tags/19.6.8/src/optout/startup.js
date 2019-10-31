/**
 * Startup sequence for opt out
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("opt.Startup");

fs.require("opt.Top");
fs.require("opt.OptOut");
fs.require("opt.Misc.Template");

(function () {

  // When the DOM is ready, fire up the opt out script
  fs.domReady(function () {
    /* pragma:DEBUG_START */
    console.log("optout: domready for \"" + config.config.version + "\" *******************************");
    /* pragma:DEBUG_END */

    // Set up the browser
    var browser = new utils.Browser();

    // Bind to browser ready
    browser.ready.subscribe(function () {
      /* pragma:DEBUG_START */
      console.warn("outout: browser detected", browser);
      /* pragma:DEBUG_END */

      // Set up a new opt out
      var optout = new OptOut(browser);

      // Go grab the resources
      optout.loadResources(function () {

        // Render it out
        optout.render();

      });

    }, true, true);
  });

})();