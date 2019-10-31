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

/**
 * @class Monitors a subject with a specific event and throttles the output
 * @param recorder {Recorder} The Recorder instance for this window. This is needed so we can pass events up the event stream.
 * @param subject {HTMLElement} The HTML node to run the query on.
 * @param evt {String} The event type to bind to.
 * @param throttleTime {Number} The minimum time between events.
 * @param recFunction {Function} The function to call when we record an event.
 * @param {Bool} noInitCap Flag to indicate if the capture function should run before on init
 * @constructor
 */
var EventThrottle = function(subject, evt, throttleTime, recFunction) {
  // Assign props
  fs.ext(
    this,
    {
      throttleTime: throttleTime,
      recFunction: recFunction,
      subject: subject,
      lastCap: utils.now(),
    },
    false
  );

  utils.Bind(
    subject,
    evt,
    function(evt) {
      // Call the capture function if we're not disposing already
      if (this._capture) {
        this._capture(evt, subject);
      }
    }.bind(this)
  );
};

/**
 * Merge another listener with this throttle tracker
 * @param recorder {Recorder} The Recorder instance for this window. This is needed so we can pass events up the event stream.
 * @param subject {HTMLElement} The HTML node to run the query on.
 * @param evt {String} The event type to bind to.
 * @param throttleTime {Number} The minimum time between events.
 * @param recFunction {Function} The function to call when we record an event.
 */
EventThrottle.prototype.merge = function(subject, evt, data) {
  // Run it again when the event fires
  utils.Bind(
    subject,
    evt,
    function(evt) {
      // Call the capture function if we're not disposing already
      if (this._capture) {
        this._capture(evt, subject, data);
      }
    }.bind(this)
  );

  return this;
};

/**
 * Capture the screen size
 * @param evt {Event} The Event object if applicable.
 * @param subject {HTMLElement} The HTML node to run the query on.
 * @param recOverride {Recorder} Optional. The recorder to use.
 */
EventThrottle.prototype._capture = function(evt, subject, data) {
  // Clear the throttle timeout
  clearTimeout(this.lastCapThrottle);

  // We need to copy this event to a new object because we're using it in a timeout.  IE will only store a reference to this event
  // in the global namespace which will no longer exist once the timeout fires.
  this._eventCopy = fs.ext({}, evt, false);

  if (utils.now() - this.lastCap > this.throttleTime) {
    // Call the record function
    this.recFunction(evt, subject, data);

    // Set the last cap time
    this.lastCap = utils.now();
  } else {
    // Create a delayed event to capture this incase its the last resize event
    this.capCB = (function(evtObj, subject) {
      // Make a backup of the mouse coords in IE
      if (fs.isDefined(evtObj.clientX)) {
        evtObj.sX = evtObj.clientX;
        evtObj.sY = evtObj.clientY;
      }

      return function() {
        this.capCB = null;

        // Augment the capture object
        evtObj.delayed = true;

        // Call the record function
        this.recFunction(evtObj, subject, data);

        // Set the last cap time
        this.lastCap = utils.now();
      };
    })(this._eventCopy, subject).bind(this);
    this.lastCapThrottle = setTimeout(this.capCB, this.throttleTime - (utils.now() - this.lastCap));
  }
};

/**
 * Force the callback if it's waiting
 */
EventThrottle.prototype.trigger = function() {
  if (this.capCB) {
    clearTimeout(this.lastCapThrottle);
    this.capCB();
  }
};

/**
 * Free up any memory and stop timers
 */
EventThrottle.prototype.dispose = function() {
  clearTimeout(this.lastCapThrottle);
  fs.dispose(this);
};
