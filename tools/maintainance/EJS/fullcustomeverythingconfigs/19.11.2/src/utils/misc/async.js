/**
 * An asynchronous queue that fires for queueing up a series of promises that need to be fired
 * in order.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { nextTick } from "../../fs/index";

/**
 * A generalized async utility that can run instances of async in series or parallel
 * @param parallel {Bool} Do these functions get run in parallel or series?
 * @param success {Function} Callback for success
 * @param fail {Function} Callback for failure
 * @constructor
 */
class Async {
  constructor(parallel, success, fail) {
    this.isParallel = !!parallel;
    this._queue = [];
    this.success = success;
    this.fail = fail;
    this.isPending = true;
  }

  /**
   * Add a promise object to the storage
   * @param fn {Function} A function that returns a promise object
   */
  enqueue(fn) {
    // Push it to the queue
    this._queue.push({
      fn,
      resolved: false,
    });

    if (this.isParallel || this._queue.length == 1) {
      fn.apply(this, [
        {
          resolve: function() {
            nextTick(() => {
              this.ctx.resolve(this.cb);
            });
          }.bind({ cb: fn, ctx: this }),
          error: function() {
            this.ctx.error(this.cb);
          }.bind({ cb: fn, ctx: this }),
        },
      ]);
    }
  }

  /**
   * Callback that fires when a callback is finished.
   * @param prom {Function} The function being resolved
   * @private
   */
  resolve(fn) {
    if (!this.isPending) {
      return;
    }
    if (!fn) {
      throw new Error("Missing caller argument.");
    }
    let foundOne = false;
    let i;
    let q;
    for (i = 0; i < this._queue.length; i++) {
      q = this._queue[i];
      if (q.fn === fn) {
        q.resolved = true;
      } else if (!q.resolved) {
        foundOne = true;
      }
    }
    if (!this.isParallel && foundOne) {
      let qobj;
      for (i = 0; i < this._queue.length; i++) {
        q = this._queue[i];
        if (q.resolved === false) {
          qobj = q;
          break;
        }
      }
      if (qobj) {
        qobj.fn.apply(this, [
          {
            resolve: function() {
              this.ctx.resolve(this.cb);
            }.bind({ cb: qobj.fn, ctx: this }),
            error: function() {
              this.ctx.error(this.cb);
            }.bind({ cb: qobj.fn, ctx: this }),
          },
        ]);
        return;
      }
    }
    if (!foundOne) {
      this.isPending = false;
      // We're done
      this.success.call(this);
    }
  }

  /**
   * Callback that fires when a callback is finished.
   * @private
   */
  error() {
    this.isPending = false;
    if (this.fail) {
      this.fail.call(this);
    }
  }
}

export { Async };
