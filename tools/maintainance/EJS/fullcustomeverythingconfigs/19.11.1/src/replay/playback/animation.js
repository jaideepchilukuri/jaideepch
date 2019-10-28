/**
 * Animator.
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 */

import { ext } from "../../fs/index";
import { now } from "../../utils/utils";

/**
 * The Animation namespace
 */
const Animation = {
  /**
   * Holds the list of current animations.
   * @private
   */
  _animations: [],

  /**
   * Clear out the inactive animations
   * @private
   */
  _clearInactiveAnimations() {
    for (let i = 0; i < this._animations.length; i++) {
      if (this._animations[i].finished === true) {
        this._animations.splice(i--, 1);
      }
    }
  },

  /**
   * The tweening functions
   */
  TWEENS: {
    /**
     * Ease in circ
     * @param t - Current time elapsed
     * @param b - Begin value
     * @param c - Destination value
     * @param d - Duration of animation
     */
    EASE_IN(t, b, c, d) {
      return c * (t /= d) * t + b;
    },

    /**
     * Ease out circ
     * @param t - Current time elapsed
     * @param b - Begin value
     * @param c - Destination value
     * @param d - Duration of animation
     */
    EASE_OUT(t, b, c, d) {
      return -c * (t /= d) * (t - 2) + b;
    },

    /**
     * Ease in  and out circ
     * @param t - Current time elapsed
     * @param b - Begin value
     * @param c - Destination value
     * @param d - Duration of animation
     */
    EASE_IN_OUT(t, b, c, d) {
      if ((t /= d / 2) < 1) return (c / 2) * t * t + b;
      return (-c / 2) * (--t * (t - 2) - 1) + b;
    },
  },
};

/**
 * Performs animations on something. Options:
 *        <ul>
 *          <li>tween - The tween function to use. Default is ease out.</li>
 *          <li>frameCallback - The function that will be called on each frame. The percentage value as a float will be passed as the first argument, and the opts will be passed as the second.</li>
 *          <li>singleton - An optional object that can be used to force only one animation per object</li>
 *          <li>duration - The total time (in ms) to animate between the two values.</li>
 *          <li>frameTime - The time per frame</li>
 *          <li>finished - A callback for when the animation is complete.</li>
 *        </ul>
 *
 * @param [opts] {Object} Send option values.  If no different from those
 *      set during transport construction, only need to pass new "data" perhaps.
 */
class Animator {
  constructor(opts) {
    // The default set of XMLHttpRequest options
    const defaults = {
      tween: Animation.TWEENS.EASE_IN_OUT,
      frameCallback() {},
      singleton: {},
      duration: 2000,
      frameTime: 30,
      finished() {},
    };

    // Integrate the options passed by the user. Shallow copy.
    this.options = ext(defaults, opts, false);

    // A flag to indicate if this animation is finished
    this.finished = false;

    // Set the paused flag
    this.paused = false;

    // Manage the singleton
    if (this.options.singleton) {
      // Stop any pre-existing ones on the singleton
      if (this.options.singleton._animation) {
        this.options.singleton._animation.stop();
      }
      // Attach itself to the singleton
      this.options.singleton._animation = this;
    }

    // Do some quick cleanup
    Animation._clearInactiveAnimations();

    // Add ourselves to the stack
    Animation._animations[Animation._animations.length] = this;
  }

  /**
   * Begin the playback
   */
  go() {
    // Reset the flag
    this.finished = false;

    // Set the start time
    this.startTime = now();

    // Set up the interval
    this.animInterval = setInterval(
      (ctx => () => {
        ctx._anim();
      })(this),
      this.options.frameTime
    );
  }

  /**
   * Stop the animation if still playing
   */
  stop() {
    // Set the flag
    this.finished = true;

    // Clear the playback interval
    clearInterval(this.animInterval);

    // Do some quick cleanup
    Animation._clearInactiveAnimations();

    // Call the finished callback
    if (this.options.finished) {
      this.options.finished.call(this);
    }
  }

  /**
   * Pause the animation
   */
  pause() {
    // Set the flag
    this.paused = true;

    // Set the pause time
    this.pauseTime = now();

    // stop the timer
    clearInterval(this.animInterval);
  }

  /**
   * Resume the animation
   */
  resume() {
    // only do anything if we are paused
    if (this.paused === true) {
      // Set the flag
      this.paused = false;

      // Set the pause time
      this.startTime += now() - this.paseTime;

      // Reset the animation interval
      this.animInterval = setInterval(
        (ctx => () => {
          ctx._anim();
        })(this),
        this.options.frameTime
      );
    }
  }

  /**
   * Do a frame of animation
   */
  _anim() {
    // Get the current time from zero
    let currentTime = now() - this.startTime;

    if (currentTime > this.options.duration) {
      currentTime = this.options.duration;
    }

    // Calculate an adjusted progress
    let newVal = this.options.tween.call(this, currentTime, 0, 1, this.options.duration);

    // Adjust for isNaN
    if (isNaN(newVal)) {
      newVal = 1;
    }

    if (newVal > 1) {
      newVal = 1;
    } else if (newVal < 0) {
      newVal = 0;
    }

    // Do the callback
    this.options.frameCallback.call(this.options.singleton, newVal, this.options);

    if (newVal >= 1 || currentTime >= this.options.duration) {
      this.stop();
    }
  }
}

export { Animator };
