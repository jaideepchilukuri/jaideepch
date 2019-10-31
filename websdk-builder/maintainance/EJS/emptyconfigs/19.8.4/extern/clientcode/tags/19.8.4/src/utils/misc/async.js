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

/**
 * A generalized async utility that can run instances of async in series or parallel
 * @param parallel {Bool} Do these functions get run in parallel or series?
 * @param success {Function} Callback for success
 * @param fail {Function} Callback for failure
 * @constructor
 */
utils.Async = function(parallel, success, fail) {
  this.isParallel = !!parallel;
  this._queue = [];
  this.success = success;
  this.fail = fail;
  this.isPending = true;
};

/**
 * Add a promise object to the storage
 * @param fn {Function} A function that returns a promise object
 */
utils.Async.prototype.enqueue = function(fn) {
  // Push it to the queue
  this._queue.push({
    fn: fn,
    resolved: false,
  });

  if (this.isParallel || this._queue.length == 1) {
    fn.apply(this, [
      {
        resolve: function() {
          fs.nextTick(
            function() {
              this.ctx.resolve(this.cb);
            }.bind(this)
          );
        }.bind({ cb: fn, ctx: this }),
        error: function() {
          this.ctx.error(this.cb);
        }.bind({ cb: fn, ctx: this }),
      },
    ]);
  }
};

/**
 * Callback that fires when a callback is finished.
 * @param prom {Function} The function being resolved
 * @private
 */
utils.Async.prototype.resolve = function(fn) {
  if (!this.isPending) {
    return;
  }
  if (!fn) {
    throw new Error("Missing caller argument.");
  }
  var foundOne = false,
    i,
    q;
  for (i = 0; i < this._queue.length; i++) {
    q = this._queue[i];
    if (q.fn === fn) {
      q.resolved = true;
    } else if (!q.resolved) {
      foundOne = true;
    }
  }
  if (!this.isParallel && foundOne) {
    var qobj;
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
};

/**
 * Callback that fires when a callback is finished.
 * @private
 */
utils.Async.prototype.error = function() {
  this.isPending = false;
  if (this.fail) {
    this.fail.call(this);
  }
};
