/**
 * Separate thread for heavy lifting
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Describes types of messages passed between the worker and the main page
 */
var WORKER_MESSAGE_TYPES = {
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
var RecordWorker = function(config, sesh, stg, masker) {
  // Assign props
  fs.ext(
    this,
    {
      config: config,
      sesh: sesh,
      stg: stg,
      mule: new WorkerMule(sesh, this),
      _lastEventTime: fs.startTS,
    },
    false
  );

  // This sets up all the code that the worker needs.
  // Note: if you add code to pass to the worker you need to
  // ensure any depenancies are handled by passing them to
  // the worker and passing references properly. If you
  // decide to attach them to _W so they are available
  // globally, make sure the uglify settings are updated
  // so the names don't get mangled.
  var blobStr = [
    "(" + ___wrkr.toString() + ")",
    "({zlib: " + utils.__zlib.toString(),
    ", Compress: " + this._funcObjToString(utils.Compress),
    ", fsExt: " + fs.ext.toString(),
    ", ___domtree: " + ___domtree.toString(),
    ", ___log: " + ___log.toString(),
    ", ___diff: " + ___diff.toString(),
    ", ___treecensor: " + ___treecensor.toString(),
    ", debounce: " + utils.debounce.toString(),
    ", now: " + utils.now.toString(),
    ", WORKER_MESSAGE_TYPES: " + JSON.stringify(WORKER_MESSAGE_TYPES),
    ", EVENT_TYPES: " + JSON.stringify(EVENT_TYPES),
    ", pii: " + JSON.stringify(masker && masker.piiObj),
    "})",
  ];

  // Set up the worker
  var blob = new Blob(blobStr, { type: "application/javascript" });

  // CC-4671: work around accidently overriding URL by leaking a global
  // this works only on browsers with URL still prefixed
  var URLImp = window.mozURL || window.msURL || window.webkitURL || window.URL;

  var blobURL = URLImp.createObjectURL(blob);
  this.wrkr = new Worker(blobURL);
  if (this.wrkr.__zone_symbol__addEventListener) {
    // angular monkey patch escape
    this.wrkr.__zone_symbol__addEventListener("message", this._handleMessage.bind(this), true);
  } else {
    this.wrkr.addEventListener("message", this._handleMessage.bind(this), true);
  }
  this._sendMessage(WORKER_MESSAGE_TYPES.INIT, {});

  // Should run after worker init above, handles telling worker to stop
  // hoarding data
  sesh.beginTransmitting.subscribe(this._uncorkWorker.bind(this), true, true);
};

/**
 * Convert an object of functions and other values to a string.
 * Main difference from JSON.stringify() is that functions are preserved.
 */
RecordWorker.prototype._funcObjToString = function(obj) {
  var str = "{",
    k,
    v;
  for (k in obj) {
    if (fs.isObject(obj[k]) && obj[k] != null) {
      v = this._funcObjToString(obj[k]);
    } else if (!fs.isFunction(obj[k])) {
      v = JSON.stringify(obj[k]);
    } else {
      v = obj[k].toString();

      /* pragma:DEBUG_START */
      if (v.indexOf("[native code]") > -1) {
        throw new Error("Attempt to pass native code to worker!");
      }
      /* pragma:DEBUG_END */

      v = v.replace(/\[native code\]/g, "");
    }
    str += '"' + k + '":' + v + ",";
  }
  return str + "}";
};

/**
 * Handle a message from a worker
 */
RecordWorker.prototype._handleMessage = function(e) {
  if (e.data && e.data.messageType && e.data.data != null && !this._disposed) {
    var dta = e.data;
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
    }
  }
};

/**
 * Send a message to the worker
 */
RecordWorker.prototype._sendMessage = function(messageType, data) {
  this.wrkr.postMessage({
    messageType: messageType,
    data: data || {},
  });
};

/**
 * Tell the worker it can stop hoarding data and send it freely to
 * the main thread now.
 */
RecordWorker.prototype._uncorkWorker = function() {
  this._sendMessage(WORKER_MESSAGE_TYPES.UNCORK);
  this.flush();
};

/**
 * Send events directly to the worker
 */
RecordWorker.prototype.sendEvents = function(events) {
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
};

/**
 * Flush stored data out to the server
 */
RecordWorker.prototype.flush = function() {
  if (this._disposed || !this.wrkr) {
    /* pragma:DEBUG_START */
    console.error("sr:", "flush called on disposed worker!!!!");
    /* pragma:DEBUG_END */
    return;
  }
  this.mule.flush();

  this.wrkr.postMessage({
    messageType: WORKER_MESSAGE_TYPES.WRAPUP,
  });
};

/**
 * Send an action to the worker
 */
RecordWorker.prototype.queueAction = function(eventType, info, now) {
  /* pragma:DEBUG_START */
  // console.log("sr:", "queuing event", eventType, info, JSON.stringify(info));
  /* pragma:DEBUG_END */
  now = now || utils.now();
  this.mule.send({
    e: eventType,
    td: now - this._lastEventTime,
    d: info,
  });
  this._lastEventTime = now;
  return now;
};

/**
 * Shut down the worker
 */
RecordWorker.prototype.dispose = function() {
  /* pragma:DEBUG_START */
  console.log("sr:", "preparing to dispose record worker");
  /* pragma:DEBUG_END */
  this._disposed = true;
  this.mule.dispose();
  this._sendMessage(WORKER_MESSAGE_TYPES.DISPOSE);
  this.wrkr.terminate();
};
