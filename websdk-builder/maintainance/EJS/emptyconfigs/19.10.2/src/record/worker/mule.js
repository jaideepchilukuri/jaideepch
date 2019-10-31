/**
 * Handles sending/receiving data from worker
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 */

import { ext } from "../../fs/index";
import { Transmitter } from "./transmitter";
import { now as currentTime, debounce } from "../../utils/utils";
import { compress } from "../../compress/compress";

// Wait at least this long for more data to come in before
// sending to the worker
const MIN_WORKER_SEND_TIME = 50;

// But send to the worker at least every this long
const MAX_WORKER_SEND_TIME = 100;

/**
 * Handle reliable communication of data with the worker.
 *
 * @constructor
 * @param {RecordSession} sesh
 * @param {RecordWorker} worker
 * @param {Transmitter} transmitter
 */
class WorkerMule {
  constructor(sesh, worker) {
    ext(
      this,
      {
        sesh,
        worker,
        transmitter: new Transmitter(sesh),
        eventsBuffer: [],
        partialBuffer: [],
        firstPacket: true,
        _maybeTransmitQueue: debounce(
          this.transmitQueue.bind(this),
          MIN_WORKER_SEND_TIME,
          MAX_WORKER_SEND_TIME
        ),
      },
      false
    );
  }

  /**
   * Receive data from the worker to be forwarded to the transmitter
   */
  receive(msg) {
    this.partialBuffer = [];
    this.transmitter.enqueue(msg);
  }

  /**
   * Receive data from the worker to be held in case of emergency compress
   */
  receivePartial(events) {
    this.partialBuffer = this.partialBuffer.concat(events);
    /* pragma:DEBUG_START */
    // console.log("sr: got partial data for " + events.length + " events, " + JSON.stringify(this.partialBuffer).length + " bytes");
    /* pragma:DEBUG_END */
  }

  /**
   * Enqueue an event to send to the worker later
   */
  send(msg) {
    this.eventsBuffer.push(msg);
    if (this.firstPacket) {
      this.firstPacket = false;
      this.transmitQueue();
    } else {
      this._maybeTransmitQueue();
    }
  }

  /**
   * Flush held data
   */
  flush() {
    this._maybeTransmitQueue.cancel();
    this.transmitQueue();
  }

  /**
   * Send any buffered events
   */
  transmitQueue() {
    if (this.eventsBuffer.length > 0) {
      this.worker.sendEvents(this.eventsBuffer);
      this.eventsBuffer = [];
    }
  }

  /**
   * If we are holding on to partial uncompressed data, compress it
   * and give it to the transmitter to save it to storage / send it.
   */
  emergencySavePartialState() {
    if (this.partialBuffer.length === 0 || this.sesh.DONOTRECORD) return;

    /* pragma:DEBUG_START */
    const startTime = currentTime();
    const originalSize = JSON.stringify(this.partialBuffer).length;
    /* pragma:DEBUG_END */

    const buff = compress(JSON.stringify(this.partialBuffer));

    /* pragma:DEBUG_START */
    console.log(
      `sr: compressed ${originalSize} bytes down to ${
        buff.length
      } bytes of partial data in ${currentTime() - startTime} ms`
    );
    /* pragma:DEBUG_END */

    this.transmitter.save(buff);
  }

  /**
   * On unload / recording cancel
   */
  dispose() {
    this.emergencySavePartialState();

    this.transmitter.dispose();
  }
}

export { WorkerMule };
