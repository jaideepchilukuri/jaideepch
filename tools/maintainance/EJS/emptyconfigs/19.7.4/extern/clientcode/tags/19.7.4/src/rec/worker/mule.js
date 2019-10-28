/**
 * Handles sending/receiving data from worker
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 */

fs.provide("rec.Worker.Mule");

fs.require("rec.Top");
fs.require("rec.Worker.Transmitter");

(function () {

  // Wait at least this long for more data to come in before
  // sending to the worker
  var MIN_WORKER_SEND_TIME = 50;

  // But send to the worker at least every this long
  var MAX_WORKER_SEND_TIME = 100;

  /**
   * Handle reliable communication of data with the worker.
   *
   * @constructor
   * @param {RecordSession} sesh
   * @param {RecordWorker} worker
   * @param {Transmitter} transmitter
   */
  function WorkerMule(sesh, worker) {
    fs.ext(this, {
      sesh: sesh,
      worker: worker,
      transmitter: new Transmitter(sesh),
      eventsBuffer: [],
      partialBuffer: [],
      firstPacket: true,
      _maybeTransmitQueue: utils.debounce(
        this.transmitQueue.bind(this),
        MIN_WORKER_SEND_TIME, MAX_WORKER_SEND_TIME)
    }, false);
  }

  /**
   * Receive data from the worker to be forwarded to the transmitter
   */
  WorkerMule.prototype.receive = function (msg) {
    this.partialBuffer = [];
    this.transmitter.enqueue(msg);
  };

  /**
   * Receive data from the worker to be held in case of emergency compress
   */
  WorkerMule.prototype.receivePartial = function (events) {
    this.partialBuffer = this.partialBuffer.concat(events);
    /* pragma:DEBUG_START */
    // console.log("sr: got partial data for " + events.length + " events, " + JSON.stringify(this.partialBuffer).length + " bytes");
    /* pragma:DEBUG_END */
  };

  /**
   * Enqueue an event to send to the worker later
   */
  WorkerMule.prototype.send = function (msg) {
    this.eventsBuffer.push(msg);
    if (this.firstPacket) {
      this.firstPacket = false;
      this.transmitQueue();
    } else {
      this._maybeTransmitQueue();
    }
  };

  /**
   * Flush held data
   */
  WorkerMule.prototype.flush = function () {
    this._maybeTransmitQueue.cancel();
    this.transmitQueue();
  };

  /**
   * Send any buffered events
   */
  WorkerMule.prototype.transmitQueue = function () {
    if (this.eventsBuffer.length > 0) {
      this.worker.sendEvents(this.eventsBuffer);
      this.eventsBuffer = [];
    }
  };

  /**
   * If we are holding on to partial uncompressed data, compress it
   * and give it to the transmitter to save it to storage / send it.
   */
  WorkerMule.prototype.emergencySavePartialState = function () {
    if (this.partialBuffer.length === 0 || this.sesh.DONOTRECORD) return;

    /* pragma:DEBUG_START */
    var startTime = utils.now();
    var originalSize = JSON.stringify(this.partialBuffer).length;
    /* pragma:DEBUG_END */

    var buff = utils.Compress.compress(JSON.stringify(this.partialBuffer));

    /* pragma:DEBUG_START */
    console.log('sr: compressed ' + originalSize + ' bytes down to ' + buff.length + ' bytes of partial data in ' + (utils.now() - startTime) + ' ms');
    /* pragma:DEBUG_END */

    this.transmitter.save(buff);
  };

  /**
   * On unload / recording cancel
   */
  WorkerMule.prototype.dispose = function () {
    this.emergencySavePartialState();

    this.transmitter.dispose();
  };

})();