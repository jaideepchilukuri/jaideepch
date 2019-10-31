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
   * #counter
   * Lazily create the DOM Element for the skiptTime counter
   */
  UI.prototype._initCounter = function () {
    // make sure the overlay container is ready
    this._initOverlay();

    if (!this.elCounter) {
      this.elCounter = window.document.createElement("div");
      this.elCounter.id = "counter";
      this.elCounter.classList.add("hidden");
      this.elCounter.classList.add("center");

      // SVG
      this.elCounterSVG = window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.elCounterSVG.id = "graph";
      this.elCounterSVG.setAttribute("viewBox", "0 0 1 1");
      this.elCounter.appendChild(this.elCounterSVG);

      // Caption
      this.elCounterCaption = window.document.createElement("div");
      this.elCounterCaption.id = "caption";

      // assemble all the pieces
      this.elCounter.appendChild(this.elCounterCaption);
      this.elOverlayContainer.appendChild(this.elCounter);
    }

    /* pragma:DEBUG_START */
    if (this.elCounterSVGCircle) {
      console.error("To deal simply with CSS transitions, it has been decided to not recycle this SVG element. This element should not exist at this point");
    }
    /* pragma:DEBUG_END */

    // SVG Circle
    this.elCounterSVGCircle = window.document.createElementNS('http://www.w3.org/2000/svg', "circle");
    this.elCounterSVGCircle.id = "c";
    this.elCounterSVG.appendChild(this.elCounterSVGCircle);

    return this.elCounter;
  };

  UI.prototype.showCounter = function (t) {
    // make sure its DOM is ready
    this._initCounter();

    window.setTimeout(function () {
      this.elCounter.classList.remove("hidden");
      this.elCounterCaption.textContent = formatTime(t);
      this.elCounterSVGCircle.style.setProperty("stroke-dashoffset", 0);
    }.bind(this), 15);
  };

  UI.prototype.hideCounter = function () {
    this.elCounter.classList.add("hidden");

    // To deal simply with CSS transitions, it has been decided to not recycle these elements.
    if (this.elCounterSVGCircle) {
      this.elCounterSVGCircle.remove();
      delete this.elCounterSVGCircle;
    }
  };
})();