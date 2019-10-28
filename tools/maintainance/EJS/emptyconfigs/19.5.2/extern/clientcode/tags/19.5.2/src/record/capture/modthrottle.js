/**
 * DOM Modification Throttler
 *
 * Does throttled tracking of dom modifications
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Capture.ModThrottle");

fs.require("rec.Top");

(function () {

  /**
   * @class Throttles DOM updates during record
   * @constructor
   */
  var ModThrottle = function (recorder) {
    /**
     * Holds the event list
     * @type {Object}
     * @private
     */
    this._elementCache = {};

    /**
     * Holds the callback timer
     * @type {Number} The reference to a timer
     * @private
     */
    this._callbackTimer = null;

    /**
     * A reference to the recorder
     * @type {*}
     */
    this.recorder = recorder;

    /**
     * Used to make unique ids
     * @type {Number}
     */
    this.cacheIndex = 0;

    // Free up some stuff
    recorder = null;
  };

  /**
   * Free up any references
   */
  ModThrottle.prototype.dispose = function () {
    fs.dispose(this._elementCache);
    this._elementCache = null;
    this.recorder = null;
    clearTimeout(this._callbackTimer);
  };

  /**
   * Add an event to the stack
   * @param target {HTMLElement} Applies to this target element
   * @param callback {Function} Will call back this function if the event is allowed to proceed
   * @param isattrevent {Boolean} Is this an attribute change event?
   * @param propname {String} The property name (if applicable)
   */
  ModThrottle.prototype.push = function (target, callback, isattrevent, propname) {
    // The eventual event object
    var eventObj = {
      t: target,
      c: callback,
      i: isattrevent,
      p: propname,
      d: utils.now()
    };

    // Make sure the property name is non-null
    propname = propname || '';

    if (target && target.nodeType != 1) {
      target = target.parentNode;
    }

    if (!target || !this._elementCache) {
      return;
    }

    if (!target._fsrKey) {
      target._fsrKey = {
        id: '_' + this.cacheIndex++
      };
    }

    this._elementCache[target._fsrKey.id + fs.toLowerCase(propname)] = eventObj;

    if (!this._callbackTimer) {
      this._callbackTimer = setTimeout(fs.proxy(function () {
        this.handleEvents();
      }, this), 1000);
    }

    target = null;
    callback = null;
  };

  /**
   * Handle firing all the callbacks as appropriate.
   * @private
   */
  ModThrottle.prototype.handleEvents = function () {
    // Null this out so our check in push() is reset
    this._callbackTimer = null;

    // Adding a try/catch test block for an edge case
    // Edge case is when the click event happened on an iFrame, and then the iFrame closes, and then we try to access the iframe contents. HomeDepot IE8 tom 2/25/2013
    try {
      var dummy = this.recorder.win.document;
    }
    catch (e) {
      return;
    }

    // Quickreference the element cache
    var ellist = this._elementCache,
      dn = utils.now(),
      ecd;

    for (var n in ellist) {
      ecd = ellist[n];
      ecd._fsrKey = null;

      // Validate that target node still exists in DOM before executing callback. Add check to see if the nodeName is SVG which is not supported (no innerHtml).
      if (typeof (ecd) == "object" && ecd.t && ecd.t.nodeName && ecd.t.nodeName != 'svg') {
        ecd.c(dn - ecd.d);
        fs.dispose(ecd);
        ecd = null;
      }
    }

    // Clear the buffer
    fs.dispose(this._elementCache);
    this._elementCache = {};
    ellist = null;
  };

  /**
   * Stop all timers, and rush to insert any last minute updates
   */
  ModThrottle.prototype.accelerate = function () {
    /* pragma:DEBUG_START */
    console.warn('accelerating mod throttler.');
    /* pragma:DEBUG_END */
    this.handleEvents();
  };

})();