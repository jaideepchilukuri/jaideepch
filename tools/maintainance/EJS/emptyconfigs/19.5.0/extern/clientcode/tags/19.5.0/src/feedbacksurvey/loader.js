/**
 * Activity indicator
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Loader");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");

(function () {

  /**
   * Created by alexei on 15-03-13.
   */
  var Loader = function () {
    // Create the loader html
    this.$el = $("<img src=\"" + _fsNormalizeUrl("$loader.gif") + "\" class=\"acs-loader\">");
    this.$el.setAttribute("alt", "loading survey");
    this.$el.setAttribute("tabindex", "-1");
    this.moveOffScreen();
  };

  /**
   * Center badge horizontally (and vertically by option)
   */
  Loader.prototype.center = function () {
    var fr = utils.getSize(window),
      fs = utils.getScroll(window),
      sw = this.$el.offsetWidth,
      sh = this.$el.offsetHeight;
    this.$el.css({
      "left": ((fr.w - sw) / 2) + 'px',
      "top": (((fr.h - sh) / 2) + fs.y) + 'px',
      "opacity": 1,
      "position": "absolute"
    });
  };

  /**
   * Move the loader off screen
   */
  Loader.prototype.moveOffScreen = function() {
    this.$el.css({
      "left": -999 + 'px',
      "top": -999 + 'px',
      "opacity":0
    });
  };

  /**
   * Remove loader
   */
  Loader.prototype.remove = function () {
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  };

})();