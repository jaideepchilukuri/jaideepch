/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

// ES6 methods are safe to use in replay
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */
class Counter {
  constructor(elParent) {
    this.elParent = elParent;
  }

  _initDOM() {
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
      this.elSVGCircle = window.document.createElementNS("http://www.w3.org/2000/svg", "circle");
      this.elSVGCircle.id = "c";
      this.elSVG.appendChild(this.elSVGCircle);
    }
  }

  start(caption, duration, resolve) {
    this._caption = caption;
    this._duration = duration;
    this._timeoutStart = Date.now();
    this._timeoutResolve = resolve;
    this._timeout = window.setTimeout(() => {
      this.hide();
      const cb = this._timeoutResolve;
      delete this._duration;
      delete this._timeoutStart;
      delete this._timeoutResolve;
      delete this._timeout;
      return cb();
    }, this._duration);

    this.show(caption);
  }

  show(caption) {
    this._initDOM();

    window.requestAnimationFrame(() => {
      this.el.classList.remove("hidden");
      this.elCaption.textContent = caption;
      window.requestAnimationFrame(() => {
        this.elSVGCircle.style.setProperty("stroke-dashoffset", 0);
      });
    });
  }

  hide() {
    window.clearTimeout(this._timeout);
    delete this._timeout;

    this.el.classList.add("hidden");

    // To deal simply with CSS transitions, it has been decided to not recycle these elements.
    if (this.elSVGCircle) {
      this.elSVGCircle.remove();
      delete this.elSVGCircle;
    }
  }

  pause() {
    if (!this._timeout) {
      return;
    }

    window.clearTimeout(this._timeout);
    delete this._timeout;

    this._duration -= Date.now() - this._timeoutStart;

    this.elSVGCircle.style.setProperty(
      "stroke-dashoffset",
      getComputedStyle(this.elSVGCircle).strokeDashoffset
    );
    this.elSVGCircle.style.setProperty("transition-duration", `${this._duration}ms`);
  }

  resume() {
    if (!this._timeoutResolve) {
      return;
    }

    this.start(this._caption, this._duration, this._timeoutResolve);
  }
}

Counter.prototype = Object.assign(Counter.prototype, {
  el: null,
  elParent: null,
  elSVG: null,
  elSVGCircle: null,
  elCaption: null,

  _timeout: null,
  _timeoutResolve: null,
});

export { Counter };
