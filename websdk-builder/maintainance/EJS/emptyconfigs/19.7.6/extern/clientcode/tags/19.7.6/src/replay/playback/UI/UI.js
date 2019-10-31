/**
 * The UI portions of the replay player.
 *
 * Entry point
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.UI");

fs.require("rp.Top");

fs.require("rp.Replay.Playback.UI.css");
fs.require("rp.Replay.Playback.UI.page");
fs.require("rp.Replay.Playback.UI.Shade");
fs.require("rp.Replay.Playback.UI.Progress");
fs.require("rp.Replay.Playback.UI.Overlay");
fs.require("rp.Replay.Playback.UI.Counter");

(function () {
  /**
   * The UI portions of the player.
   * @class
   */
  function UI(player) {
    // player
    this.player = player;

    // Playback iframe used for dom events
    this.iframe = null;

    // Layer that will fit over the replay iframe
    this.overlay = null;

    // Shade the whole replay (page transition, last screen)
    this.shade = null;

    // skipTime animation
    this.counter = null;

    // loading progress bar
    this.progress = null;
  }

  /**
   * One time setup of UI related things
   */
  UI.prototype.initialize = function () {
    this.fixUndefinedInPage();
    this.setupPageTitle();
    this.setupPageStyles();
    this.setupPlaybackIframe();
    this.setupOverlay();
    this.setupClickHandler();
    this.requestNotifyPermission();
  };

  /**
   * Ask to display our status
   */
  UI.prototype.requestNotifyPermission = function () {
    if (Notification.permission !== "granted" && !this.player.preplayer) {
      Notification.requestPermission();
    }
  };

  /**
   * Show a local notification
   */
  UI.prototype.notify = function (msg) {
    console.log("rp: notify:", msg);
    if (!Notification || this.preplayer) {
      return;
    }
    if (Notification.permission === "granted") {
      var notification = new Notification("cxReplay Web Playback", {
        icon: '/special_assets/notification.png',
        body: msg
      });
    }
  };

  /**
   * Start loading.
   */
  UI.prototype.loading = function () {
    this.shade.show();
    return Promise.resolve();
  };

  /**
   * Show a percentage progress.
   */
  UI.prototype.updateProgress = function (percent) {
    if (percent < 100) {
      this.progress.show();
      this.progress.update(percent);
    } else {
      this.progress.hide();
    }
  };

  /**
   * Display a visual clue that the replay is moving to the next page
   */
  UI.prototype.advancePage = function (pageNumber) {
    this.shade.show();

    return new Promise(function (resolve, reject) {
      window.setTimeout(resolve, UICSS.overlayShadeFadeTime);
    });
  };

  UI.prototype.loadingDone = function () {
    this.shade.hide();
    this.progress.hide();
    return Promise.resolve();
  };

  /**
   * Show that the recording is skipping over some time.
   * @param {Integer} timeToSkip hoow long is the recording skipping
   */
  UI.prototype.skipTime = function (timeToSkip) {
    return new Promise(function (resolve, reject) {
      this.counter.start(formatTime(timeToSkip), UICSS.overlayShadeSkipTime, resolve, reject);
    }.bind(this));
  };

  UI.prototype.pause = function () {
    this.counter.pause();
  };

  UI.prototype.resume = function () {
    this.counter.resume();
  };

  UI.prototype.endOfPlayback = function () {
    this.shade.showEnd();
    // Note: If it is preferred to wait for the end of the animation before resolving:
    // wait UICSS.overlayShadeSkipTime
    return Promise.resolve();
  };

  /**
   * miscellaneous
   */
  function formatTime(dt) {
    var t = dt;
    hh = ~~(t / (1000 * 60 * 60)); t -= hh * (1000 * 60 * 60);
    mm = ~~(t / (1000 * 60)); t -= mm * (1000 * 60);
    ss = ~~(t / (1000)); t -= ss * (1000);
    ms = ~~(t / 100);

    return [
      (hh < 10 ? "0" : ""), hh, ":",
      (mm < 10 ? "0" : ""), mm, ":",
      (ss < 10 ? "0" : ""), ss, ".",
      ms
    ].join("");
  }
})();