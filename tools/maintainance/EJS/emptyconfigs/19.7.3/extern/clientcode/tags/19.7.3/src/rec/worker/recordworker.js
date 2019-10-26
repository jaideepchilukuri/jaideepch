/**
 * Separate thread for heavy lifting
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Worker.RecordWorker");

fs.require("rec.Top");
fs.require("rec.Worker.Controller");
fs.require("rec.Data.Log");
fs.require("rec.Data.Diff");
fs.require("rec.Data.TreeCensor");

(function () {

  /**
   * Describes types of messages passed between the worker and the main page
   */
  var WORKER_MESSAGE_TYPES = {
    INIT: "INIT",
    DISPOSE: "DISPOSE",
    EVENTS: "EVENTS",
    WRAPUP: "WRAPUP"
  };

  /**
   * Sets up a new worker
   * @param config
   * @constructor
   */
  var RecordWorker = function (config, sesh, stg, masker) {
    // Assign props
    fs.ext(this, {
      config: config,
      sesh: sesh,
      stg: stg,
      fasttrackNextTransmit: false,
      siteId: fs.toLowerCase(sesh.siteId.replace(/[^a-zA-Z0-9]*/g, "")),
      eventsBuffer: [],
      _lastTransmitTime: utils.now() - 10000,
      _lastEventTime: fs.startTS,
      isTransmitting: false,
      _failedTransmits: 0,
      _workerSendInterval: setInterval(this.transmitQueue.bind(this), 2000),
      _prevTimestamp: utils.now()
    }, false);


    // This sets up all the code that the worker needs.
    // Note: if you add code to pass to the worker you need to
    // ensure any depenancies are handled by passing them to
    // the worker and passing references properly. If you
    // decide to attach them to _W so they are available
    // globally, make sure the uglify settings are updated
    // so the names don't get mangled.
    var blobStr = [
      '(' + ___wrkr.toString() + ')',
      '({zlib: ' + utils.__zlib.toString(),
      ', Compress: ' + this._funcObjToString(utils.Compress),
      ', fsExt: ' + fs.ext.toString(),
      ', ___domtree: ' + ___domtree.toString(),
      ', ___log: ' + ___log.toString(),
      ', ___diff: ' + ___diff.toString(),
      ', ___treecensor: ' + ___treecensor.toString(),
      ', WORKER_MESSAGE_TYPES: ' + JSON.stringify(WORKER_MESSAGE_TYPES),
      ', EVENT_TYPES: ' + JSON.stringify(EVENT_TYPES),
      ', pii: ' + JSON.stringify(masker && masker.piiObj),
      '})'
    ];

    // Set up the worker
    var blob = new Blob(blobStr, { type: "application/javascript" });
    var blobURL = window.URL.createObjectURL(blob);
    this.wrkr = new Worker(blobURL);
    if (this.wrkr.__zone_symbol__addEventListener) {
      // angular monkey patch escape
      this.wrkr.__zone_symbol__addEventListener("message", this._handleMessage.bind(this), true);
    } else {
      this.wrkr.addEventListener("message", this._handleMessage.bind(this), true);
    }
    this._sendMessage(WORKER_MESSAGE_TYPES.INIT, {});

    // Handle when transmitting is supposed to begin
    sesh.beginTransmitting.subscribe(function () {
      /* pragma:DEBUG_START */
      console.log('sr: ' + (window === window.top ? '' : '[frm] ') + 'initiating transmit on recordworker');
      /* pragma:DEBUG_END */
      this.isTransmitting = true;
      this._transmit();
    }.bind(this), true, true);
  };

  /**
   * Send the current buffer
   */
  RecordWorker.prototype._actuallyTransmit = function () {
    // Reset the fast-track flag if needed
    this.fasttrackNextTransmit = false;

    // Make a note of the time
    this._lastTransmitTime = utils.now();

    // Get the service name as a string
    var sesh = this.sesh,
      str = this.sesh._storage,
      pls = str.get("rpls") || [];

    if (pls.length > 0) {
      /* pragma:DEBUG_START */
      console.log('sr: ' + (window === window.top ? '' : '[frm] ') + 'transmitting');
      /* pragma:DEBUG_END */

      // Perform the send
      var ajax = new utils.AjaxTransport();
      ajax.send({
        method: "POST",
        contentType: "application/json",
        url: fs.config.recUrl + "rest/web/event/" + fs.enc(Singletons.jrny.customerId) + "/" + fs.enc(sesh.sessionInfo[SESSION_SYMBOLS.GLOBALSESSIONID]) + "/" + fs.enc(sesh.sessionInfo[SESSION_SYMBOLS.SESSIONID]) + "?domain=" + fs.enc(document.domain) + "&site_id=" + fs.enc(this.siteId) + "&version=" + fs.enc(fs.config.codeVer == "symlink" ? "19.7.0" : fs.config.codeVer),
        skipEncode: true,
        data: { data: pls },
        failure: function (result) {
          /* pragma:DEBUG_START */
          console.error("sr: " + (window === window.top ? '' : '[frm] ') + "transport failed!", "(" + this._failedTransmits + " failures)");
          /* pragma:DEBUG_END */
          this._failedTransmits++;
          if (this._failedTransmits > 20) {
            /* pragma:DEBUG_START */
            console.error("sr: " + (window === window.top ? '' : '[frm] ') + "too many failed transmits! Cancelling.");
            /* pragma:DEBUG_END */
            if (sesh) {
              // it could be that this has already been disposed (which deletes sesh)
              // which can trigger one final attempt to save the data
              sesh.endSession();
            }
          }
        }.bind(this),
        // Handles successful response
        success: function (result) {
          result = JSON.parse(result);
          if (result.ids) {
            pls = str.get("rpls") || [];
            str.set("rpls", pls.filter(function (idb) {
              return result.ids.indexOf(idb.when) == -1;
            }));
          }
        }.bind(this)
      });
    }
  };

  /**
   * Send data to the recording endpoint
   */
  RecordWorker.prototype._transmit = function () {
    if (this.isTransmitting && !this._disposed) {
      /* pragma:DEBUG_START */
      console.log("sr:", "start transmitting!");
      /* pragma:DEBUG_END */

      var minThreshold = 5000,
        tdiff = utils.now() - this._lastTransmitTime;

      if (tdiff > minThreshold || this.fasttrackNextTransmit) {
        this._actuallyTransmit();
      } else {
        clearTimeout(this._transmitTimer);
        this._transmitTimer = setTimeout(this._actuallyTransmit.bind(this), minThreshold - tdiff);
      }
    }
  };

  /**
   * Convert an object of functions and other values to a string.
   * Main difference from JSON.stringify() is that functions are preserved.
   */
  RecordWorker.prototype._funcObjToString = function (obj) {
    var str = "{", k, v;
    for (k in obj) {
      if (fs.isObject(obj[k]) && obj[k] != null) {
        v = this._funcObjToString(obj[k]);
      } else if (!fs.isFunction(obj[k])) {
        v = JSON.stringify(obj[k]);
      } else {
        v = obj[k].toString();

        /* pragma:DEBUG_START */
        if (v.indexOf('[native code]') > -1) {
          throw new Error('Attempt to pass native code to worker!');
        }
        /* pragma:DEBUG_END */

        v = v.replace(/\[native code\]/g, '');
      }
      str += "\"" + k + "\":" + v + ",";
    }
    return str + "}";
  };

  /**
   * Handle a message from a worker
   */
  RecordWorker.prototype._handleMessage = function (e) {
    if (e.data && e.data.messageType && e.data.data && !this._disposed) {
      var dta = e.data;
      switch (dta.messageType) {
        case "PAYLOAD":
          /* pragma:DEBUG_START */
          console.log("sr:", "got payload from worker of length", e.data.data.length);
          /* pragma:DEBUG_END */
          var str = this.sesh._storage,
            pls = str.get("rpls") || [];
          pls.push({
            "when": this._getMonotonicTimestamp(),
            "data": dta.data
          });
          str.set("rpls", pls);
          str.commit();
          // Try to send data
          this._transmit();
          break;
      }
    }
  };

  /**
   * Date.now() is not monotonic -- it can go backwards as the system time
   * is adjusted to keep in step with internet time. This function is a bit
   * of a work around for that limitation so if the system time goes backwards
   * this will degrade into a glorified sequence counter until the system time
   * passes where it used to be.
   */
  RecordWorker.prototype._getMonotonicTimestamp = function () {
    var nextTimestamp = utils.now();
    if (nextTimestamp <= this._prevTimestamp) {
      /* pragma:DEBUG_START */
      console.error("sr:", "Detected system time going backwards or duplicating!!! (fixing)");
      /* pragma:DEBUG_END */

      nextTimestamp = this._prevTimestamp + 1;
    }
    this._prevTimestamp = nextTimestamp;
    return nextTimestamp;
  };

  /**
   * Send a message to the worker
   */
  RecordWorker.prototype._sendMessage = function (messageType, data) {
    this.wrkr.postMessage({
      messageType: messageType,
      data: data || {}
    });
  };

  /**
   * Send any buffer
   */
  RecordWorker.prototype.transmitQueue = function () {
    if (this.eventsBuffer.length > 0 && !this._disposed) {
      this._sendMessage(WORKER_MESSAGE_TYPES.EVENTS, this.eventsBuffer);
      this.eventsBuffer = [];
    }
  };

  /**
   * Wrap things up because we might be out of time
   */
  RecordWorker.prototype.emergency = function () {
    if (this._disposed || !this.wrkr) {
      /* pragma:DEBUG_START */
      console.error("sr:", "emergency called on disposed worker!!!!");
      /* pragma:DEBUG_END */
      return;
    }

    /* pragma:DEBUG_START */
    console.log("sr:", "recordworker emergency");
    /* pragma:DEBUG_END */
    this.transmitQueue();
    this.wrkr.postMessage({
      messageType: WORKER_MESSAGE_TYPES.WRAPUP
    });
    this.fasttrackNextTransmit = true;
  };

  /**
   * Send an action to the worker
   */
  RecordWorker.prototype.queueAction = function (eventType, info, now) {
    /* pragma:DEBUG_START */
    // console.log("sr:", "queuing event", eventType, info, JSON.stringify(info));
    /* pragma:DEBUG_END */
    now = now || utils.now();
    this.eventsBuffer.push({
      e: eventType,
      td: (now - this._lastEventTime),
      d: info
    });
    this._lastEventTime = now;
    return now;
  };

  /**
   * Shut down the worker
   */
  RecordWorker.prototype.dispose = function () {
    /* pragma:DEBUG_START */
    console.log("sr:", "preparing to dispose record worker");
    /* pragma:DEBUG_END */
    this._disposed = true;
    clearInterval(this._workerSendInterval);
    clearTimeout(this._transmitTimer);
    this.transmitQueue();
    this._sendMessage(WORKER_MESSAGE_TYPES.DISPOSE);
    this.wrkr.terminate();
    delete this.sesh;
    delete this.wrkr;
    delete this.config;
  };

})();