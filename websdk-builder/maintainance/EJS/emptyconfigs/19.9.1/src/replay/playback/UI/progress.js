/**
 * A simple progress bar UI.
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

// ES6 methods are safe to use in replay
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */
class Progress {
  constructor(shade) {
    this.shade = shade;
  }

  _initDOM() {
    if (!this.el) {
      this.el = window.document.createElement("div");
      this.el.id = "progress";
    }
    this.update(0);
    return this.el;
  }

  show() {
    if (!this.shown) {
      this.shown = true;
      this.shade.el.appendChild(this._initDOM());
    }
  }

  hide() {
    if (this.shown) {
      this.shown = false;
      this.shade.el.removeChild(this.el);
    }
  }

  update(percent) {
    this.el.style = `width: ${percent}%`;
  }
}

Progress.prototype = Object.assign(Progress.prototype, {
  el: null,
  shade: null,
  shown: false,
});

export { Progress };
