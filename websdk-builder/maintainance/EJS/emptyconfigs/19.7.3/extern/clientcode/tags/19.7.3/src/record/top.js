/**
 * Top file for the cx record script
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Top");

(function () {

  /* pragma:DEBUG_START */
  console.warn("sr: loading pre-19.7 record");
  /* pragma:DEBUG_END */

  // Top file
  var Singletons = {};

  /**
   * Quickreference the window
   */
  var _W = window;

  // Journey Event types list
  var RECLOGGING = {
    RECORDER_SESSION_STARTED: "fs_sessionStarted",
    RECORDER_CANCELED: "fs_recorderCanceled",
    RECORDER_STOP_OLDBROWSER: "fs_recorderStoppedOldBrowser",
    RECORDER_TRANSMIT_FAILED: "fs_recorderTransmitFailed"
  };

})();
