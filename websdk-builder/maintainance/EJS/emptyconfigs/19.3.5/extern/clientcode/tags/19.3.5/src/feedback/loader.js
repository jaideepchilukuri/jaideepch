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
    var el = $("<img src=\"" + fs.makeURI("$loader.gif") + "\" class=\"acs-loader\">");
    this.$el = el;
  };

  /**
   * Center badge horizontally (and vertically by option)
   */
  Loader.prototype.center = function (verticalAlso) {
    var pw = this.$el.parentNode.offsetWidth,
      ph = this.$el.parentNode.offsetHeight,
      sw = this.$el.offsetWidth,
      sh = this.$el.offsetHeight;
    this.$el.css({
      "left": ((pw - sw) / 2) + 'px',
      "top": !!verticalAlso ? ((pw - sw) / 2) + 'px' : 'auto'
    });
  };

  /**
   * Remove badge
   */
  Loader.prototype.remove = function () {
    this.$el.parentNode.removeChild(this.$el);
  };

})();