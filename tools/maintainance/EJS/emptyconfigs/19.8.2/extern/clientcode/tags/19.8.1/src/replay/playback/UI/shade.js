/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

var Shade = function(elParent) {
  this.elParent = elParent;
};

Shade.prototype = Object.assign(Shade.prototype, {
  el: null,
  elParent: null,
});

Shade.prototype._initDOM = function() {
  var el = this.el;

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
};

Shade.prototype.show = function() {
  this._initDOM().classList.remove("hidden");
};

Shade.prototype.hide = function() {
  this._initDOM().classList.add("hidden");
};

Shade.prototype.showEnd = function() {
  this._initDOM();

  this.el.classList.remove("hidden");
  this.el.classList.add("pageEnd");
};

Shade.prototype.hideEnd = Shade.prototype.hide;
