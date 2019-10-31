/**
 * Tokens for data storage
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Misc.Symbols");

fs.require("rec.Top");

(function () {

  /**
   * Used for storing session id's and such into various types of storage
   */
  var SESSION_SYMBOLS = {
    SESSIONID: 'rpid',
    GLOBALSESSIONID: 'mid',
    TRANSMITTING: 'rt',
    CANCELED: 'cncl',
    CANCELEDPERMANENT: 'rcp',
    SESSION: 'SESSION',
    DATA: 'DATA',
    GLOBALREFRESHTIME: 'grft'
  };

})();