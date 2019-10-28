/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI.Counter");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.UI.css");

(function () {
  var Counter = function (elParent) {
    this.elParent = elParent;
  };

  Counter.prototype = Object.assign(Counter.prototype, {
    el: null,
    elParent: null,
    elSVG: null,
    elSVGCircle: null,
    elCaption: null,

    _timeout: null,
    _timeoutResolve: null
  });

  Counter.prototype._initDOM = function () {
    if (!this.el) {
      this.el = window.document.createElement("div");
      this.el.id = "counter";
      this.el.classList.add("hidden");
      this.el.classList.add("center");
      this.elParent.appendChild(this.el);
    }

    if (!this.elSVG) {
      this.elSVG = window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.elSVG.id = "graph";
      this.elSVG.setAttribute("viewBox", "0 0 1 1");
      this.el.appendChild(this.elSVG);
    }

    if (!this.elCaption) {
      this.elCaption = window.document.createElement("div");
      this.elCaption.id = "caption";
      this.el.appendChild(this.elCaption);
    }

    if (!this.elSVGCircle) {
      this.elSVGCircle = window.document.createElementNS('http://www.w3.org/2000/svg', "circle");
      this.elSVGCircle.id = "c";
      this.elSVG.appendChild(this.elSVGCircle);
    }
  };

  Counter.prototype.start = function (caption, duration, resolve, reject) {
    this._caption = caption;
    this._duration = duration;
    this._timeoutStart = Date.now();
    this._timeoutResolve = resolve;
    this._timeout = window.setTimeout(function () {
      this.hide();
      var cb = this._timeoutResolve;
      delete this._duration;
      delete this._timeoutStart;
      delete this._timeoutResolve;
      delete this._timeout;
      return cb();
    }.bind(this), this._duration);

    this.show(caption);
  };

  Counter.prototype.show = function (caption) {
    this._initDOM();

    window.requestAnimationFrame(function () {
      this.el.classList.remove("hidden");
      this.elCaption.textContent = caption;
      window.requestAnimationFrame(function () {
        this.elSVGCircle.style.setProperty("stroke-dashoffset", 0);
      }.bind(this));
    }.bind(this));
  };

  Counter.prototype.hide = function () {
    window.clearTimeout(this._timeout);
    delete this._timeout;

    this.el.classList.add("hidden");

    // To deal simply with CSS transitions, it has been decided to not recycle these elements.
    if (this.elSVGCircle) {
      this.elSVGCircle.remove();
      delete this.elSVGCircle;
    }
  };

  Counter.prototype.pause = function () {
    if (!this._timeout) { return; }

    window.clearTimeout(this._timeout);
    delete this._timeout;

    this._duration -= Date.now() - this._timeoutStart;

    this.elSVGCircle.style.setProperty(
      "stroke-dashoffset",
      getComputedStyle(this.elSVGCircle).strokeDashoffset
    );
    this.elSVGCircle.style.setProperty("transition-duration", this._duration + "ms");
  };

  Counter.prototype.resume = function () {
    if (!this._timeoutResolve) { return; }

    this.start(this._caption, this._duration, this._timeoutResolve);
  };
})();