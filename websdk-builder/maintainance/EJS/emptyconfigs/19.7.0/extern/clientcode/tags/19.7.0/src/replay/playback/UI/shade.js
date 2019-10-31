/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI.shade");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.UI.css");

(function () {
  /**
   * #shade
   * Lazily create the DOM ELement to shade the overall replay
   */
  UI.prototype._initShade = function () {
    // make sure the overlay container is ready
    this._initOverlay();

    var el = this.elShade;

    if (!el) {
      el = window.document.createElement("div");
      el.id = "shade";
    }

    el.classList.add("hidden");
    el.classList.add("center");
    el.classList.remove("pageEnd");

    // if it's a new Element, add it to the DOM
    if (!this.elShade) {
      this.elShade = this.elOverlayContainer.appendChild(el);
    }

    return this.elShade;
  };

  UI.prototype.showShade = function () {
    this._initShade().classList.remove("hidden");
  };

  UI.prototype.hideShade = function () {
    this._initShade().classList.add("hidden");
  };

  UI.prototype.showShadeEnd = function () {
    this._initShade();

    this.elShade.classList.remove("hidden");
    this.elShade.classList.add("pageEnd");
  };

  UI.prototype.hideShadeEnd = UI.prototype.hideShade;
})();