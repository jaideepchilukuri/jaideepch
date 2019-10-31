/**
 * CS SessionReplay
 *
 * This is the main entrypoint for Replay code
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2012-04-11 16:05:27 -0700 (Wed, 11 Apr 2012) $
 * @version $Revision: 12461 $

 * Created: May. 2, 2011
 */

fs.provide("rp.Replay");

fs.require("rp.Player");
fs.require("rp.Top");

(function () {

  // Set up a new browser detector
  var browser = new utils.Browser();

  // Set up the replayer on window.load and expose it. This is the main entry point for SessionReplay.
  fs.winReady(function () {
    /* pragma:DEBUG_START */
    console.warn("rp: window load");
    /* pragma:DEBUG_END */

    // This forces it to happen after all other initialization
    setTimeout(function () {
      /*
       * Make sure that we are only instantiating session recorder in the TOP frame and that
       * we only instantiate it once in case they include the JS twice on the same page, which
       * has happened in the past.
       */

      // Create a new replayer
      if (window === window.top && !window.replayer) {
        // Make sure we know which browser this is and what kind of device it is.
        browser.ready.subscribe(function () {
          /* pragma:DEBUG_START */
          console.warn("rp: browser ready");
          /* pragma:DEBUG_END */
          window.replayer = Replay.player = new Replay.Player(window);
        }, true, true);
      }
    }, 50);

  });

})();