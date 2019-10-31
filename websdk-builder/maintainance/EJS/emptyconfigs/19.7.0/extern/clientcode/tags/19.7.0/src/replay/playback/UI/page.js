/**
 * The UI portions of the replay player.
 *
 * Everything handling the DOM manipulation
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI.page");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.UI.css");

(function () {
  /**
   * Listen to click events for pause/resume/advance
   */
  UI.prototype.setupClickHandler = function () {
    var handler = function (e) {
      if (e.target.id === "fsrVideoDownloadLink") {
        // allow clicks on this please!
        return;
      }

      // don't follow links or other things please
      e.preventDefault();
      e.stopPropagation();

      if (!this.player.loaded) {
        // don't do anything in loading phase
        return;
      }

      if (this.player.playbackFinished) {
        this.player.advancePage();
      } else {
        if (this.player.paused) {
          this.player.videoSyncUp();
          this.notify("Resuming playback. Left-click to pause.");
          this.player.resume();
        } else {
          this.player.videoSyncUp();
          this.notify("Pausing playback. Left-click to resume.");
          this.player.pause();
        }
      }
    }.bind(this);

    utils.Unbind("ui:*");
    utils.Bind(document.body, "ui:click", handler);
    utils.Bind(this.iframe.contentWindow.document, "ui:click", handler);
  };

  /**
   * Create/assign page title
   */
  UI.prototype.setupPageTitle = function () {
    var title = document.getElementsByTagName("title")[0];
    if (!title) {
      title = document.createElement("title");
      document.head.appendChild(title);
    }
  };

  /**
   * Update helpful debugging page title
   */
  UI.prototype.updatePageTitle = function (sessionData) {
    var title = document.getElementsByTagName("title")[0];
    title.innerText = "Replay " +
      sessionData.session_id.substr(0, 5) +
      " Page " + sessionData.page_number;
  };

  /**
   * Style the page so it looks nice & player iframe is centered
   */
  UI.prototype.setupPageStyles = function () {
    // prepare the shade background
    var lRel = window.document.createElement("link");
    lRel.setAttribute("rel", "preload");
    lRel.setAttribute("as", "image");
    lRel.setAttribute("href", UICSS.pathFSLogo);
    document.head.appendChild(lRel);

    var elStyle = document.createElement("style");
    elStyle.appendChild(document.createTextNode(UICSS.data));
    document.head.appendChild(elStyle);
  };
})();