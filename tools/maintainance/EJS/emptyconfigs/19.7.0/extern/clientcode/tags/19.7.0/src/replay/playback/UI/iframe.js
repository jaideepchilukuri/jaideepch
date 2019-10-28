/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI.iframe");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.UI.css");

(function () {
  /**
   * Construct the containing iframe
   */
  UI.prototype.setupPlaybackIframe = function () {
    this.iframe = document.createElement("iframe");
    this.iframe.id = "playback";

    // this is so that the shade starts out covering most of the page
    // as well as not having the weird feeling of a small iframe turning
    // large after loading finishes
    this.iframe.width = window.innerWidth - 20;
    this.iframe.height = window.innerHeight - 20;

    document.body.appendChild(this.iframe);
  };

  /**
   * Clears out playback iframe and returns promise for when that's complete.
   */
  UI.prototype.clearPlaybackIframe = function (data) {
    return new Promise(function (resolve) {
      // need to wait for a load event to fire on iframe
      var done = function () {
        this.iframe.removeEventListener("load", done, false);
        resolve();
      }.bind(this);

      this.iframe.addEventListener("load", done, false);
      this.iframe.srcdoc = data.docType + "<html></html>";
    }.bind(this)).then(function () {
      var doc = this.iframe.contentWindow.document;

      var head = doc.head;
      head.parentNode.removeChild(head);

      var body = doc.body;
      body.parentNode.removeChild(body);

      // Listen to play/pause clicks on iframe contents
      this.setupClickHandler();
    }.bind(this));
  };
})();