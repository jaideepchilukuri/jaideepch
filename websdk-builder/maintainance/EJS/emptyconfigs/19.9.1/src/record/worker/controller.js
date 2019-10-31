/**
 * Separate thread for heavy lifting
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

// Holds all the code
function ___wrkr(extern) {
  /**
   * Fake a reference to the window.
   *
   * NOTE: yes this puts variables on the global scope, but be careful!
   * You must whitelist these in the Uglify settings in the gulpfile or
   * these get mangled. Also test with gulp test_prod to make sure your
   * changes survive minification.
   */
  const _W = this;

  /**
   * Holds the fs namespace
   */
  _W.fs = { ext: extern.fsExt };

  /**
   * Hold variables necessary to Compress
   */
  _W.utils = {};
  _W.Zlib = extern.zlib();
  _W.utils.debounce = extern.debounce;
  _W.utils.now = extern.now;
  _W.Compress = extern.Compress;

  /**
   * Sets up a new worker
   * @param config
   * @constructor
   */
  const WorkerController = () => {};

  /**
   * Handle a message from the main thread
   */
  WorkerController.handleMessage = e => {
    if (e.data && e.data.messageType) {
      switch (e.data.messageType) {
        case "INIT":
          {
            /* pragma:DEBUG_START */
            console.log("srw:", "worker received init");
            /* pragma:DEBUG_END */

            const tree = new (extern.___domtree())();

            // Initialize a new logger instance
            _W.logger = new (extern.___log())(
              _W.fs,
              _W.Compress,
              extern.___diff(),
              tree,
              new (extern.___treecensor())(tree, extern.pii),
              extern.EVENT_TYPES,
              WorkerController.handlePayloadReady.bind(WorkerController),
              WorkerController.handlePartial.bind(WorkerController)
            );
          }
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
        default:
        // ignore
      }
    }
  };

  /**
   * Send a message to the parent
   */
  WorkerController._sendMessage = (messageType, data) => {
    postMessage({
      messageType,
      data: data || (messageType === "PAYLOAD" ? "" : {}),
    });
  };

  /**
   * A payload is ready
   * @param {*} pl
   */
  WorkerController.handlePayloadReady = pl => {
    WorkerController._sendMessage("PAYLOAD", pl);
  };

  /**
   * A payload is ready
   * @param {*} pl
   */
  WorkerController.handlePartial = pl => {
    WorkerController._sendMessage("PARTIAL", pl);
  };

  /**
   * Clean up
   */
  WorkerController.dispose = () => {
    /* pragma:DEBUG_START */
    console.log("srw:", "disposing");
    /* pragma:DEBUG_END */
  };

  // Handle messages from the main thread
  _W.onmessage = WorkerController.handleMessage;
}

export { ___wrkr };
