/**
 * Top file for the record script
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/* pragma:DEBUG_START */
console.warn("sr: loading 19.7+ record");
/* pragma:DEBUG_END */

// Top file
var Singletons = {};

/**
 * Quickreference the window
 */
var _W = window;

/**
 * Journey Event types list
 */
var RECLOGGING = {
  RECORDER_SESSION_STARTED: "fs_sessionStarted",
  RECORDER_CANCELED: "fs_recorderCanceled",
  RECORDER_STOP_OLDBROWSER: "fs_recorderStoppedOldBrowser",
  RECORDER_STOP_UNHEALTHY_SERVER: "fs_recorderUnhealthyServer",
  RECORDER_TRANSMIT_FAILED: "fs_recorderTransmitFailed",
};

/**
 * Used for storing session id's and such into various types of storage
 */
var SESSION_SYMBOLS = {
  SESSIONID: "rpid",
  GLOBALSESSIONID: "mid",
  TRANSMITTING: "rt",
  CANCELED: "cncl",
  CANCELEDPERMANENT: "rcp",
  SESSION: "SESSION",
  DATA: "DATA",
  GLOBALREFRESHTIME: "grft",
  DONOTRECORD: "norec",
  PAGENUM: "rpn",
};
