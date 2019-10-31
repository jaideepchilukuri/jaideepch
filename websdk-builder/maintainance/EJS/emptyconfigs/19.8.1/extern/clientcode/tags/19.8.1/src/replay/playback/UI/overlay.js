/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

var Overlay = function() {};

Overlay.prototype = Object.assign(Overlay.prototype, {
  el: null,
  // Container for every UI effects needed on top of the replay
  elContainer: null,
});

Overlay.prototype.init = function(options) {
  options = Object.assign(
    {
      width: 0,
      height: 0,
      transform: "",
    },
    options
  );

  var el = this.el;

  if (!el) {
    el = window.document.createElement("div");
    el.classList.add("overlay");

    // hack to cover the iframe border and some magical offset
    el.style.setProperty("zoom", "1.01");

    /* The container will be relative to allow every children to stack
     * onto each other.
     * position:absolute siblings only stack up if their common parent
     * is (a) relative.
     */
    this.elContainer = window.document.createElement("div");
    this.elContainer.style.position = "relative";
    this.elContainer.style.width = "100%";
    this.elContainer.style.height = "100%";
    el.appendChild(this.elContainer);
  }

  el.style.setProperty("width", options.width + "px");
  el.style.setProperty("height", options.height + "px");
  el.style.setProperty("transform", options.transform);

  // if it's a new Element, add it to the DOM
  if (!this.el) {
    this.el = window.document.body.appendChild(el);
  }
};
