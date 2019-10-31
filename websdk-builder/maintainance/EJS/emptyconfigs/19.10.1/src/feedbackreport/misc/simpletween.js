/**
 * Tweening
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * @class A very simple tweener.
 */
class SimpleTween {
  constructor(from, to, callback) {
    this.from = from;
    this.to = to;
    this.diff = this.to - this.from;
    this.callback = callback || (() => {});
  }

  /**
   * The API
   */
  /**
   * Quartic ease-out
   * @param t
   * @param b
   * @param c
   * @param d
   * @returns {*}
   * @private
   */
  _tween(t) {
    return --t * t * t + 1;
  }

  /**
   * Begin
   * @param tm
   */
  go(tm) {
    this.stop();
    this.tm = tm;
    this.startTime = new Date();
    this.timer = setInterval(() => {
      const currentTime = new Date();
      const diff = currentTime - this.startTime;
      const perc = Math.min(diff / this.tm, 1);
      const aperc = this._tween(perc);

      if (perc >= 1) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.val = aperc * this.diff + this.from;
      this.callback(this.val);
    }, 20);
  }

  /**
   * Stop
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export { SimpleTween };
