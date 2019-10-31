/**
 * Entry point for storage frame
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("frame.Trigger");

fs.require("frame.Top");
fs.require("frame.Storage.FrameController");
fs.require("frame.Communicator");

(function () {

  // Main entry point
  fs.winReady(function() {
    /* pragma:DEBUG_START */
    console.log("frame: window is ready");
    /* pragma:DEBUG_END */

    // Set up the browser
    var browser = new utils.Browser();

    // Bind to browser ready
    browser.ready.subscribe(function () {
      var frameUID = fs.getParam('uid');
      /* pragma:DEBUG_START */
      console.warn("frame: browser detected", browser, "uid: " + frameUID);
      /* pragma:DEBUG_END */

      // Set up a new frame
      var fr = new FrameController(browser),
        comm = new Comms(browser, frameUID);

      // When a message is received, transmit it via comm
      fr.messageReceived.subscribe(fs.proxy(comm.set, comm), false, false);

      // Initialize comm
      comm.init();
    }, true, true);
  });

})();