/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI.overlay");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.UI.css");

(function () {
  /**
   * #overlay
   * Lazily create the DOM element and resize it to fit over the
   * player's iframe.
   */
  UI.prototype._initOverlay = function () {
    var el = this.elOverlay;

    if (!el) {
      el = window.document.createElement("div");
      el.classList.add("overlay");

      /* The container will be relative to allow every children to stack
       * onto each other.
       * position:absolute siblings only stack up if their common parent
       * is (a) relative.
       */
      this.elOverlayContainer = window.document.createElement("div");
      this.elOverlayContainer.style.position = "relative";
      this.elOverlayContainer.style.width = "100%";
      this.elOverlayContainer.style.height = "100%";
      el.appendChild(this.elOverlayContainer);
    }

    el.style.width = this.iframe.clientWidth + "px";
    el.style.height = this.iframe.clientHeight + "px";
    el.style.zoom = this.player.viewport ? (this.player.viewport.frameScale + 0.001) : 1;

    // if it's a new Element, add it to the DOM
    if (!this.elOverlay) {
      this.elOverlay = window.document.body.appendChild(el);
    }

    return this.elOverlay;
  };
})();