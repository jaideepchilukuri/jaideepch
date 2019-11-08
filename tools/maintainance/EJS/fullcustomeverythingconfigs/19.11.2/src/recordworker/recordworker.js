/**
 * Separate thread for heavy lifting
 *
 * (c) Copyright 2019 ForeSee, Inc.
 */

import { DomTree } from "../record/capture/domtree";
import { Logger } from "./log";

/**
 * Fake a reference to the window.
 *
 * NOTE: yes this puts variables on the global scope, but be careful!
 * You must whitelist these in the Uglify settings in the gulpfile or
 * these get mangled. Also test with gulp test_prod to make sure your
 * changes survive minification.
 */
const _W = self;

/**
 * Handle a message from the main thread
 */
const handleMessage = e => {
  if (e.data && e.data.messageType) {
    switch (e.data.messageType) {
      case "INIT":
        {
          /* pragma:DEBUG_START */
          console.log("srw:", "worker received init");
          /* pragma:DEBUG_END */

          const tree = new DomTree();

          _W.importScripts(e.data.data.compressUrl);

          /* pragma:DEBUG_START */
          console.log("srw:", "compression library loaded:", e.data.data.compressUrl);
          /* pragma:DEBUG_END */

          // Initialize a new logger instance
          _W.logger = new Logger(tree, e.data.data.pii, handlePayloadReady, handlePartial);
        }
        break;
      case "DISPOSE":
        dispose();
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
const _sendMessage = (messageType, data) => {
  postMessage({
    messageType,
    data: data || (messageType === "PAYLOAD" ? "" : {}),
  });
};

/**
 * A payload is ready
 * @param {*} pl
 */
const handlePayloadReady = pl => {
  _sendMessage("PAYLOAD", pl);
};

/**
 * A payload is ready
 * @param {*} pl
 */
const handlePartial = pl => {
  _sendMessage("PARTIAL", pl);
};

/**
 * Clean up
 */
const dispose = () => {
  /* pragma:DEBUG_START */
  console.log("srw:", "disposing");
  /* pragma:DEBUG_END */
};

// Handle messages from the main thread
_W.onmessage = handleMessage;
