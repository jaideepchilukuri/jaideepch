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

import { dispose, ext, isDefined } from "../../fs/index";
import { Bind, now as currentTime } from "../../utils/utils";

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
class EventThrottle {
  constructor(subject, evt, throttleTime, recFunction) {
    // Assign props
    ext(
      this,
      {
        throttleTime,
        recFunction,
        subject,
        lastCap: currentTime(),
      },
      false
    );

    Bind(subject, evt, evt => {
      // Call the capture function if we're not disposing already
      if (this._capture) {
        this._capture(evt, subject);
      }
    });
  }

  /**
   * Merge another listener with this throttle tracker
   * @param recorder {Recorder} The Recorder instance for this window. This is needed so we can pass events up the event stream.
   * @param subject {HTMLElement} The HTML node to run the query on.
   * @param evt {String} The event type to bind to.
   * @param throttleTime {Number} The minimum time between events.
   * @param recFunction {Function} The function to call when we record an event.
   */
  merge(subject, evt, data) {
    // Run it again when the event fires
    Bind(subject, evt, evt => {
      // Call the capture function if we're not disposing already
      if (this._capture) {
        this._capture(evt, subject, data);
      }
    });

    return this;
  }

  /**
   * Capture the screen size
   * @param evt {Event} The Event object if applicable.
   * @param subject {HTMLElement} The HTML node to run the query on.
   * @param recOverride {Recorder} Optional. The recorder to use.
   */
  _capture(evt, subject, data) {
    // Clear the throttle timeout
    clearTimeout(this.lastCapThrottle);

    // We need to copy this event to a new object because we're using it in a timeout.  IE will only store a reference to this event
    // in the global namespace which will no longer exist once the timeout fires.
    this._eventCopy = ext({}, evt, false);

    if (currentTime() - this.lastCap > this.throttleTime) {
      // Call the record function
      this.recFunction(evt, subject, data);

      // Set the last cap time
      this.lastCap = currentTime();
    } else {
      // Create a delayed event to capture this incase its the last resize event
      this.capCB = ((evtObj, subject) => {
        // Make a backup of the mouse coords in IE
        if (isDefined(evtObj.clientX)) {
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
          this.lastCap = currentTime();
        };
      })(this._eventCopy, subject).bind(this);
      this.lastCapThrottle = setTimeout(
        this.capCB,
        this.throttleTime - (currentTime() - this.lastCap)
      );
    }
  }

  /**
   * Force the callback if it's waiting
   */
  trigger() {
    if (this.capCB) {
      clearTimeout(this.lastCapThrottle);
      this.capCB();
    }
  }

  /**
   * Free up any memory and stop timers
   */
  dispose() {
    clearTimeout(this.lastCapThrottle);
    dispose(this);
  }
}

export { EventThrottle };
