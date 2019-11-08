/**
 * Separate thread for heavy lifting
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext, startTS, makeURI } from "../../fs/index";
import { now as currentTime, AjaxTransport } from "../../utils/utils";
import { WorkerMule } from "./mule";

/**
 * Describes types of messages passed between the worker and the main page
 */
const WORKER_MESSAGE_TYPES = {
  INIT: "INIT",
  DISPOSE: "DISPOSE",
  EVENTS: "EVENTS",
  WRAPUP: "WRAPUP",
  UNCORK: "UNCORK",
};

/**
 * Sets up a new worker
 * @param config
 * @constructor
 */
class RecordWorker {
  constructor(config, sesh, stg, masker) {
    // Assign props
    ext(
      this,
      {
        config,
        sesh,
        masker,
        stg,
        mule: new WorkerMule(sesh, this),
        _lastEventTime: startTS,
      },
      false
    );

    const url = makeURI("$fs.recordworker.js");

    /* pragma:DEBUG_START */
    console.warn("sr:", `Webworker location: ${url}`);
    /* pragma:DEBUG_END */

    let compressUrl = makeURI("$fs.compress.js");
    if (compressUrl.indexOf("//") === 0) {
      compressUrl = location.protocol + compressUrl;
    }

    this._sendMessage(WORKER_MESSAGE_TYPES.INIT, {
      pii: this.masker && this.masker.piiObj,
      compressUrl,
    });

    // Should run after worker init above, handles telling worker to stop
    // hoarding data
    this.sesh.beginTransmitting.subscribe(this._uncorkWorker.bind(this), true, true);

    if (
      (url.substr(0, 4) === "http" || url.substr(0, 2) === "//") &&
      url.indexOf(location.origin) !== 0
    ) {
      /* pragma:DEBUG_START */
      console.warn("sr:", "Required a cross-origin script download", location.origin);
      /* pragma:DEBUG_END */

      // To security conscientious onlookers: browsers do not allow Web Workers to be
      // created using cross-origin URLs. We must fetch the code via an AJAX call and
      // build a Worker from the downloaded blob instead. In on-prem versions of the
      // SDK this AJAX call shouldn't run
      new AjaxTransport().send({
        method: "GET",
        url,
        blob: true,
        success: blob => {
          // CC-4671: work around accidently overriding URL by leaking a global
          // this works only on browsers with URL still prefixed
          const URLImp = window.mozURL || window.msURL || window.webkitURL || window.URL;
          this._initWorker(URLImp.createObjectURL(blob));
        },
      });
    } else {
      /* pragma:DEBUG_START */
      console.warn("sr:", "No cross-origin script download required! yay!", location.origin);
      /* pragma:DEBUG_END */

      // We are on-prem, so we can construct the worker directly
      this._initWorker(url);
    }
  }

  _initWorker(url) {
    if (this._disposed) return;

    this.wrkr = new Worker(url, { name: "fs.recordworker.js" });
    if (this.wrkr.__zone_symbol__addEventListener) {
      // angular monkey patch escape
      this.wrkr.__zone_symbol__addEventListener("message", this._handleMessage.bind(this), true);
    } else {
      this.wrkr.addEventListener("message", this._handleMessage.bind(this), true);
    }

    const q = this._queue;
    delete this._queue;
    if (q) {
      q.forEach(m => this.wrkr.postMessage(m));
    }
  }

  /**
   * Handle a message from a worker
   */
  _handleMessage(e) {
    if (e.data && e.data.messageType && e.data.data != null && !this._disposed) {
      const dta = e.data;
      switch (dta.messageType) {
        case "PAYLOAD":
          /* pragma:DEBUG_START */
          // console.log("sr:", "got payload from worker of length", dta.data.length);
          /* pragma:DEBUG_END */
          if (dta.data === "") {
            // CC-4696: compression failed and produced an empty string
            // see utils/misc/compression.js
            // this happens on older safari due to a bug, so stop recording
            this.sesh.endSession();
            return;
          }
          this.mule.receive(dta.data);
          break;
        case "PARTIAL":
          this.mule.receivePartial(dta.data);
          break;
        default:
        // ignore
      }
    }
  }

  /**
   * Send a message to the worker
   */
  _sendMessage(messageType, data) {
    const packet = {
      messageType,
      data: data || {},
    };

    if (!this.wrkr) {
      this._queue = this._queue || [];
      this._queue.push(packet);
      return;
    }

    this.wrkr.postMessage(packet);
  }

  /**
   * Tell the worker it can stop hoarding data and send it freely to
   * the main thread now.
   */
  _uncorkWorker() {
    this._sendMessage(WORKER_MESSAGE_TYPES.UNCORK);
    this.flush();
  }

  /**
   * Send events directly to the worker
   */
  sendEvents(events) {
    if (events.length > 0 && !this._disposed) {
      /* pragma:DEBUG_START */
      // var bytes = JSON.stringify(events).length;
      // this._totalWorkerBytes = (this._totalWorkerBytes || 0) + bytes;
      // console.log("sr:", "sending " + events.length +
      //   " events (" + bytes + " b out of " +
      //   this._totalWorkerBytes + " b total) to worker");
      /* pragma:DEBUG_END */
      this._sendMessage(WORKER_MESSAGE_TYPES.EVENTS, events);
    }
  }

  /**
   * Flush stored data out to the server
   */
  flush() {
    if (this._disposed) {
      /* pragma:DEBUG_START */
      console.error("sr:", "flush called on disposed worker!!!!");
      /* pragma:DEBUG_END */
      return;
    }
    this.mule.flush();

    this._sendMessage(WORKER_MESSAGE_TYPES.WRAPUP);
  }

  /**
   * Send an action to the worker
   */
  queueAction(eventType, info, now) {
    /* pragma:DEBUG_START */
    // console.log("sr:", "queuing event", eventType, info, JSON.stringify(info));
    /* pragma:DEBUG_END */
    now = now || currentTime();
    this.mule.send({
      /**
       * Event type from the EVENT_TYPE table
       * @type {integer}
       */
      e: eventType,

      /**
       * Time delta, milliseconds since last event
       * @type {integer}
       */
      td: now - this._lastEventTime,

      /**
       * The data for this particular event type
       * @type {object}
       */
      d: info,
    });
    this._lastEventTime = now;
    return now;
  }

  /**
   * Shut down the worker
   */
  dispose() {
    /* pragma:DEBUG_START */
    console.log("sr:", "preparing to dispose record worker");
    /* pragma:DEBUG_END */
    this._disposed = true;
    this.mule.dispose();
    this._sendMessage(WORKER_MESSAGE_TYPES.DISPOSE);
    if (this.wrkr) {
      this.wrkr.terminate();
    }
  }
}

export { RecordWorker };
