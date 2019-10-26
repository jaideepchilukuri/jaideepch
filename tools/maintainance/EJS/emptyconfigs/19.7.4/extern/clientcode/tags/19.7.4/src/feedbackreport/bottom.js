/**
 * Bottom file for feedback reporting ui
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Bottom");

fs.require("fs.Top");
fs.require("fs.Report");
fs.require("fs.Criteria");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.UI.Badge");
fs.require("fs.Misc.SimpleTween");
fs.require("fs.TopicTester");

(function () {

  // Begin by extending the config with some default params
  config = fs.ext({
    /**
     * List of unsupported browsers and platforms supported
     * Note: IE 𝓍 means we support 𝓍 and above
     */
    browser_cutoff: {
      Edge: 1,
      IE: 11,
      Safari: 4,
      Firefox: 30,
      Chrome: 20,
      Opera: 1000
    },

    /**
     * List of unsupported platforms
     * Note: Android 4 means we support 4 and above
     */
    platform_cutoff: {
      Android: 99,
      Winphone: 99,
      iPod: 99,
      iPhone: 99,
      iPad: 99
    }
  }, config);

  // Main entry point. Wait for DOMReady
  fs.domReady(function () {
    /* pragma:DEBUG_START */
    console.warn("fbr: domready");
    /* pragma:DEBUG_END */

    // The browser detector
    var browser = new utils.Browser(),
      configInstances = config.instances;

    if (configInstances) {
      // Continue when things are ready
      browser.ready.subscribe(function () {
        /* pragma:DEBUG_START */
        console.warn("fbr: browser ready");
        /* pragma:DEBUG_END */

        // Set up a criteria checker
        var crit = new Criteria(browser, config);

        // Only continue if we are on a supported platform
        if (crit.platformOK()) {
          /* pragma:DEBUG_START */
          console.warn("fbr: platform check passed");
          /* pragma:DEBUG_END */
          var inPgProj;

          for (var i = 0; i < configInstances.length; i++) {
            var inst = configInstances[i];
            // Check for whitelisting to see if a project/badge is visible on this page.
            // Also check if the badge is not disabled.
            if (inst.topics && inst.topics.length) {
              for (var p = 0; p < inst.topics.length; p++) {
                if (TopicTester(inst.topics[p]) && !inst.disabled) {
                  inPgProj = inst;
                  break;
                }
              }
            }
            if (!!inPgProj) {
              break;
            }
          }

          // Pass in the browser config and the config of the project to be shown..
          var reporter = new Report(browser, inPgProj);
          reporter.ready.subscribe(function () {
            /* pragma:DEBUG_START */
            console.warn("fbr: reporter is ready");
            /* pragma:DEBUG_END */

            // Build the UI
            reporter.run();

          }.bind(this));
          reporter.initialize();
        } else {
          /* pragma:DEBUG_START */
          console.warn("fbr: platform check failed");
          /* pragma:DEBUG_END */
        }

      }, true, true);
    } else {
      /* pragma:DEBUG_START */
      console.warn("fbr: no feedback instances detected");
      /* pragma:DEBUG_END */
    }
  });

})();