/**
 * A simple progress bar UI.
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI.Progress");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.UI.css");

(function () {
  var Progress = function (shade) {
    this.shade = shade;
  };

  Progress.prototype = Object.assign(Progress.prototype, {
    el: null,
    shade: null,
    shown: false
  });

  Progress.prototype._initDOM = function () {
    if (!this.el) {
      this.el = window.document.createElement("div");
      this.el.id = "progress";
    }
    this.update(0);
    return this.el;
  };

  Progress.prototype.show = function () {
    if (!this.shown) {
      this.shown = true;
      this.shade.el.appendChild(this._initDOM());
    }
  };

  Progress.prototype.hide = function () {
    if (this.shown) {
      this.shown = false;
      this.shade.el.removeChild(this.el);
    }
  };

  Progress.prototype.update = function (percent) {
    this.el.style = "width: " + percent + "%";
  };
})();