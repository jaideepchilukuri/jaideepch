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

  // Top file
  var Singletons = {};

  /**
   * Quickreference the window
   */
  var _W = window;

  // Journey Event types list
  var RECLOGGING = {
    RECORDER_STARTED: "fs_RecorderStarted",
    RECORDER_CANCELED: "fs_RecorderCanceled",
    RECORDER_STOP_OLDBROWSER: "fs_RecorderStoppedOldBrowser",
    RECORDER_STOP_UNHEALTHY_SERVER: "fs_RecorderUnhealthyServer"
  };

})();