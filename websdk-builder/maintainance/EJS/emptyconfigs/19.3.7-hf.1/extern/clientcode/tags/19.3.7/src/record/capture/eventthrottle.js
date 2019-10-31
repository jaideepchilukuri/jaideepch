/**
 * Event Throttler
 *
 * Does throttled tracking of events.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Capture.EventThrottle");

fs.require("rec.Top");

(function () {

  /**
   * The Event throttle namespace
   */
  var EventThrottle = {
    _trackers: []
  };

  /**
   * @class Monitors a subject with a specific event and throttles the output
   * @param recorder {Recorder} The Recorder instance for this window. This is needed so we can pass events up the event stream.
   * @param subject {HTMLElement} The HTML node to run the query on.
   * @param evt {String} The event type to bind to.
   * @param throttleTime {Number} The minimum time between events.
   * @param recFunction {Function} The function to call when we record an event.
   * @param noInitCap {Bool} Flag to indicate if the capture function should run before on init
   * @constructor
   */
  EventThrottle.Tracker = function (recorder, subject, evt, throttleTime, recFunction, noInitCap) {
    // Keep a reference to the recorder
    this.recorder = recorder;

    // Keep track of the throttle time
    this.throttleTime = throttleTime;

    // Keep track of the record function
    this.recFunction = recFunction;

    // The event type
    this.subject = subject;

    // Run the capture function right off the bat unless instructed not to. This help page load performance
    if (!noInitCap) {
      this._capture({}, subject);
    }

    // Loop over all the nodes
    utils.Bind(subject, evt, function (ctx, subject) {
      return function (evt) {
        // Call the capture function if we're not disposing already
        if (ctx._capture) {
          ctx._capture(evt, subject);
        }

        // Free up some stuff
        evt = null;
        subject = null;
      };
    }(this, subject));

    // Add it to the list
    EventThrottle._trackers.push(this);

    // Free up some stuff
    subject = null;
    recorder = null;
    evt = null;
    recFunction = null;
  };

  /**
   * Merge another listener with this throttle tracker
   * @param recorder {Recorder} The Recorder instance for this window. This is needed so we can pass events up the event stream.
   * @param subject {HTMLElement} The HTML node to run the query on.
   * @param evt {String} The event type to bind to.
   * @param throttleTime {Number} The minimum time between events.
   * @param recFunction {Function} The function to call when we record an event.
   */
  EventThrottle.Tracker.prototype.merge = function (recorder, subject, evt, recFunction) {
    // Run it again when the event fires
    utils.Bind(subject, evt, function (ctx, subject, recorder) {
      return function (evt) {
        // Call the capture function if we're not disposing already
        if (ctx._capture)
          ctx._capture(evt, subject, recorder);

      };
    }(this, subject, recorder));

    recorder = null;
    evt = null;
    recFunction = null;
  };

  /**
   * Capture the screen size
   * @param evt {Event} The Event object if applicable.
   * @param subject {HTMLElement} The HTML node to run the query on.
   * @param recOverride {Recorder} Optional. The recorder to use.
   */
  EventThrottle.Tracker.prototype._capture = function (evt, subject, recOverride) {
    // Clear the throttle timeout
    clearTimeout(this.lastCapThrottle);

    // Set the recorder
    var rec = recOverride || this.recorder;

    if (!this.lastCap || (utils.now() - this.lastCap) > this.throttleTime) {

      // Call the record function
      this.recFunction.call(this, evt, subject, rec);

      // Set the last cap time
      this.lastCap = utils.now();

    } else {

      // We need to copy this event to a new object because we're using it in a timeout.  IE will only store a reference to this event
      // in the global namespace which will no longer exist once the timeout fires.
      var eventCopy = {};
      for (var i in evt) {
        // We check the length so we don't get deprecated warnings
        if (i.length == 6 && i != "layerX" && i != "layerY") {
          eventCopy[i] = evt[i];
        }
      }

      // Create a delayed event to capture this incase its the last resize event
      this.lastCapThrottle = setTimeout(function (ctx, evtObj, subject, rec) {

        // Make a backup of the mouse coords in IE
        if (fs.isDefined(evtObj.clientX)) {
          evtObj.sX = evtObj.clientX;
          evtObj.sY = evtObj.clientY;
        }

        return function () {
          // Augment the capture object
          evtObj.delayed = true;

          // Call the capture function
          if (ctx._capture) {
            ctx._capture(evtObj, subject, rec);
          }
        };
      }(this, eventCopy, subject, rec), this.throttleTime);
    }

    // Free up some stuff
    rec = null;
    recOverride = null;
    evt = null;
    subject = null;
  };

  /**
   * Free up any memory
   */
  EventThrottle.Tracker.prototype.dispose = function () {
    if (this.lastCapThrottle) {
      clearTimeout(this.lastCapThrottle);
    }

    fs.dispose(this);
  };

  // Quickreference to the event throttler
  var EventThrottler = EventThrottle.Tracker;

})();