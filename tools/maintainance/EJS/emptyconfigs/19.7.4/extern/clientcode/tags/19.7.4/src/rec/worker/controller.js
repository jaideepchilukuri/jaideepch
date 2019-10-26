/**
 * Separate thread for heavy lifting
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Worker.Controller");

fs.require("rec.Top");

(function () {

  // Holds all the code
  var ___wrkr = function (extern) {
    /**
     * Fake a reference to the window.
     *
     * NOTE: yes this puts variables on the global scope, but be careful!
     * You must whitelist these in the Uglify settings in the gulpfile or
     * these get mangled. Also test with gulp test_prod to make sure your
     * changes survive minification.
     */
    var _W = this;

    /**
     * Holds the fs namespace
     */
    _W.fs = { ext: extern.fsExt };

    /**
     * Hold variables necessary to Compress
     */
    _W.utils = {};
    _W.utils.Zlib = extern.zlib();
    _W.utils.debounce = extern.debounce;
    _W.utils.now = extern.now;
    _W.Compress = extern.Compress;

    /**
     * Sets up a new worker
     * @param config
     * @constructor
     */
    var WorkerController = function () {
    };

    /**
     * Handle a message from the main thread
     */
    WorkerController.handleMessage = function (e) {
      if (e.data && e.data.messageType) {
        switch (e.data.messageType) {
          case "INIT":
            /* pragma:DEBUG_START */
            console.log("srw:", "worker received init");
            /* pragma:DEBUG_END */

            var tree = new (extern.___domtree())();
            var censor = new (extern.___treecensor())(tree, extern.pii);

            // Initialize a new logger instance
            _W.logger = new (extern.___log())(
              _W.fs, _W.Compress, extern.___diff(), tree, censor, extern.EVENT_TYPES,
              WorkerController.handlePayloadReady.bind(WorkerController),
              WorkerController.handlePartial.bind(WorkerController)
            );
            break;
          case "DISPOSE":
            WorkerController.dispose();
            break;
          case "EVENTS":
            _W.logger.addEvents(e.data.data);
            break;
          case "WRAPUP":
            _W.logger.wrapup();
            break;
          case "UNCORK":
            _W.logger.uncork();
            break;
        }
      }
    };

    /**
     * Send a message to the parent
     */
    WorkerController._sendMessage = function (messageType, data) {
      postMessage({
        messageType: messageType,
        data: data || {}
      });
    };

    /**
     * A payload is ready
     * @param {*} pl
     */
    WorkerController.handlePayloadReady = function (pl) {
      WorkerController._sendMessage("PAYLOAD", pl);
    };


    /**
     * A payload is ready
     * @param {*} pl
     */
    WorkerController.handlePartial = function (pl) {
      WorkerController._sendMessage("PARTIAL", pl);
    };

    /**
     * Clean up
     */
    WorkerController.dispose = function () {
      /* pragma:DEBUG_START */
      console.log("srw:", "disposing");
      /* pragma:DEBUG_END */
    };

    // Handle messages from the main thread
    _W.onmessage = WorkerController.handleMessage;
  };

})();