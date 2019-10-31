/**
 * General utils.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.MouseTracker");

fs.require("trig.Top");

(function (trigger) {

  /**
   * Class for tracking whether or not mouse is over window
   * @constructor
   */
  var MouseTracker = function () {
    var ctx = this;
    this.isOver = true;
    utils.Bind(document, "trigger:mouseout", function (e) {
      e = e ? e : _W.event;
      var from = e.relatedTarget || e.toElement;
      if (!from || from.nodeName == "HTML") {
        // Signal that we're off the page
        if (ctx.isOver) {
          ctx.isOver = false;
        }
      }
    }, false);

    utils.Bind(document, "trigger:mouseover", function (e) {
      // Signal that we're ON the page
      if (!ctx.isOver) {
        ctx.isOver = true;
      }
    }, false);

    utils.Bind(document, "trigger:mousemove", function (e) {
      // Signal that we're ON the page
      if (!ctx.isOver) {
        ctx.isOver = true;
      }
    });
  };

})(trigger);