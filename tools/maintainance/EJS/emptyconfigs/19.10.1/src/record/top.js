/**
 * Top file for the record script
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

// Top file
const Singletons = {};

/**
 * Quickreference the window
 */
const _W = window;

/**
 * Journey Event types list
 */
const RECLOGGING = {
  RECORDER_SESSION_STARTED: "fs_sessionStarted",
  RECORDER_CANCELED: "fs_recorderCanceled",
  RECORDER_STOP_OLDBROWSER: "fs_recorderStoppedOldBrowser",
  RECORDER_STOP_UNHEALTHY_SERVER: "fs_recorderUnhealthyServer",
  RECORDER_TRANSMIT_FAILED: "fs_recorderTransmitFailed",
};

/**
 * Used for storing session id's and such into various types of storage
 */
const SESSION_SYMBOLS = {
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

export { Singletons, _W, RECLOGGING, SESSION_SYMBOLS };
