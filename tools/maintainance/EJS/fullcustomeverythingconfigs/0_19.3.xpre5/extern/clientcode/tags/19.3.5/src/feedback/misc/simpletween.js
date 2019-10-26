/**
 * Tweening
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Misc.SimpleTween");

fs.require("fs.Top");

(function () {

  /**
   * @class A very simple tweener.
   */
  var SimpleTween = function (from, to, callback) {
    this.from = from;
    this.to = to;
    this.diff = this.to - this.from;
    this.callback = callback || function() {};
  };

  /**
   * The API
   */
  SimpleTween.prototype = {
    /**
     * Quartic ease-out
     * @param t
     * @param b
     * @param c
     * @param d
     * @returns {*}
     * @private
     */
    _tween: function (t) {
      return (--t) * t * t + 1;
    },
    /**
     * Begin
     * @param tm
     */
    go: function (tm) {
      this.stop();
      this.tm = tm;
      this.startTime = new Date();
      this.timer = setInterval(fs.proxy(function () {

        var currentTime = new Date(),
          diff = currentTime - this.startTime,
          perc = Math.min(diff / this.tm, 1),
          aperc = this._tween(perc);

        if (perc >= 1) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.val = (aperc * this.diff) + this.from;
        this.callback(this.val);

      }, this), 20);
    },
    /**
     * Stop
     */
    stop: function () {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  };

})();