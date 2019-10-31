/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

// ES6 methods are safe to use in replay
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */
class Shade {
  constructor(elParent) {
    this.elParent = elParent;
  }

  _initDOM() {
    let el = this.el;

    if (!el) {
      el = window.document.createElement("div");
      el.id = "shade";
    }

    el.classList.add("hidden");
    el.classList.add("center");
    el.classList.remove("pageEnd");

    // if it's a new Element, add it to the DOM
    if (!this.el) {
      this.el = this.elParent.appendChild(el);
    }

    return this.el;
  }

  show() {
    this._initDOM().classList.remove("hidden");
  }

  hide() {
    this._initDOM().classList.add("hidden");
  }

  showEnd() {
    this._initDOM();

    this.el.classList.remove("hidden");
    this.el.classList.add("pageEnd");
  }
}

Shade.prototype = Object.assign(Shade.prototype, {
  el: null,
  elParent: null,
});

Shade.prototype.hideEnd = Shade.prototype.hide;

export { Shade };
