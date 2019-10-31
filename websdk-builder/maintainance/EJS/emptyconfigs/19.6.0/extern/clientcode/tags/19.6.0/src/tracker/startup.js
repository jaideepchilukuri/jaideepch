/**
 * Entry point for Tracker window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Startup");

fs.require("track.Top");
fs.require("track.Tracker");
fs.require("track.Misc.Template");
fs.require("track.Misc.Services");
fs.require("track.Misc.Base64");

(function (tracker) {

  // Main entry point
  fs.winReady(function () {
    // The close timer
    var killTimer = setTimeout(function () {
      window.close();
    }, 13000);

    /* pragma:DEBUG_START */
    console.log("tracker: window load - stopping kill timer due to debug mode");
    clearTimeout(killTimer);
    /* pragma:DEBUG_END */

    // Set up the browser
    var browser = new utils.Browser();

    // Holds the CPP's that may come from the main window
    var cppInfo;

    // Holds the eventual tracker instance
    var trackerInst;

    // Bind to browser ready
    browser.ready.subscribe(function () {
      /* pragma:DEBUG_START */
      console.log("tracker: browser detected", browser);
      /* pragma:DEBUG_END */

      // This is the server-based way: COOKIELESS or MICROCOOKIE
      var stg = utils.getBrainStorage(browser, fs.getParam('uid'));

      // Wait for storage to be ready
      stg.ready.subscribe(function () {
        /* pragma:DEBUG_START */
        console.log("tracker: storage is ready");
        /* pragma:DEBUG_END */

        // Set a 1s interval for to receive the trackerinfo ASAP
        stg.setUpdateInterval(1000);

        // Start checking to see when we get the information for the tracker window
        stg.watchForChanges(['trackerinfo', 'trackercmd', 'ckcpps'], function (key, olddata, tcfg) {
          // What time of key is this?
          if (key == 'trackercmd') {
            switch (tcfg.method) {
              case "close":
                window.close();
                break;
              case "survey":
                if (trackerInst && trackerInst.goToSurvey) {
                  trackerInst.goToSurvey();
                }
                break;
              default:
                break;
            }
          } else if (key == 'ckcpps' && trackerInst) {
            fs.ext(trackerInst.cpps._extras, tcfg);
            /* pragma:DEBUG_START */
            console.warn("tracker: syncing CPPs. new set:", trackerInst.cpps._extras);
            /* pragma:DEBUG_END */

          } else if (key == 'trackerinfo') {
            // Tone down the interval to 5s after tracker info received
            stg.setUpdateInterval(5000);
            /* pragma:DEBUG_START */
            console.warn("tracker: detected tracker data from main page: ", tcfg);
            /* pragma:DEBUG_END */

            // When the window loads, fire up the tracker
            if (fs.isDefined(trackerInst)) {
              trackerInst.update(browser, stg, tcfg);
            } else {
              trackerInst = new Tracker(browser, utils.getBrainStorage(browser, stg.uid), tcfg);
            }

            // Expose it
            window.Tracker = trackerInst;

            trackerInst.ready.subscribe(function () {
              /* pragma:DEBUG_START */
              console.log("tracker: is ready to draw itself");
              /* pragma:DEBUG_END */

              // Remove the kill timer
              clearTimeout(killTimer);

              // Set any CPPS
              if (cppInfo) {
                trackerInst.setCPPS(cppInfo);
              }

              // Do the rendering of the template
              trackerInst.renderTemplate();
            }, true, true);
          }
        }.bind(this), false, true);
      }.bind(this), true, true);

    }, true, true);
  });

})(tracker);