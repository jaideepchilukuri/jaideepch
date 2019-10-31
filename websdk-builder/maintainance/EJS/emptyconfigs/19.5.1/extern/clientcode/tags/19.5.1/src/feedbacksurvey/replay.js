/**
 * cxReplay Interface
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Replay");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");

(function () {

  /**
   * Replay namespace
   * @type {{}}
   */
  var Replay = {

    /**
     * Global Session ID (if applicable)
     */
    cxrid: fs.getParam('cxrid'),

    /**
     * Transmission/processing URL (if applicable)
     */
    cxrurl: fs.getParam('cxrurl'),

    /**
     * Call process immediate if applicable
     */
    processImmediate: function () {
      if (Replay.cxrid && Replay.cxrurl) {
        var ajx = new utils.AjaxTransport();
        ajx.send({
          method: 'GET',
          url: utils.sign(Replay.cxrurl + 'process/' + fs.enc(Replay.cxrid)),
          failure: fs.proxy(function (result) {
            /* pragma:DEBUG_START */
            console.warn("fbs: Session processing request failed for global", Replay.cxrid, "Note: this doesn't necessarily mean there is a problem. The processing may already have been started.");
            /* pragma:DEBUG_END */
          }, this),
          success: fs.proxy(function (result) {
            /* pragma:DEBUG_START */
            console.log("fbs: Session processing started for global", Replay.cxrid);
            /* pragma:DEBUG_END */
          }, this)
        });
      }
    }
  };

})();