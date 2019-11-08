/**
 * The UI portions of the replay player.
 *
 * Entry point
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

import { Bind, Unbind } from "../../../utils/utils";
import { Counter } from "./counter";
import { UICSS } from "./css";
import { Overlay } from "./overlay";
import { Progress } from "./progress";
import { Shade } from "./shade";

/**
 * The UI portions of the player.
 * @class
 */
class UI {
  constructor(player) {
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
  initialize() {
    this.fixUndefinedInPage();
    this.setupPageTitle();
    this.setupPageStyles();
    this.setupPlaybackIframe();
    this.setupOverlay();
    this.setupClickHandler();
    this.requestNotifyPermission();
  }

  /**
   * Ask to display our status
   */
  requestNotifyPermission() {
    if (Notification.permission !== "granted" && !this.player.preplayer) {
      Notification.requestPermission();
    }
  }

  /**
   * Show a local notification
   */
  notify(msg) {
    console.log("rp: notify:", msg);
    if (!Notification || this.preplayer) {
      return;
    }
    if (Notification.permission === "granted") {
      // eslint-disable-next-line no-new
      new Notification("cxReplay Web Playback", {
        icon: "/special_assets/notification.png",
        body: msg,
      });
    }
  }

  /**
   * Start loading.
   */
  loading() {
    this.shade.show();
    return Promise.resolve();
  }

  /**
   * Show a percentage progress.
   */
  updateProgress(percent) {
    if (percent < 100) {
      this.progress.show();
      this.progress.update(percent);
    } else {
      this.progress.hide();
    }
  }

  /**
   * Display a visual clue that the replay is moving to the next page
   */
  advancePage() {
    this.shade.show();

    return new Promise(resolve => {
      window.setTimeout(resolve, UICSS.overlayShadeFadeTime);
    });
  }

  loadingDone() {
    this.shade.hide();
    this.progress.hide();
    return Promise.resolve();
  }

  /**
   * Show that the recording is skipping over some time.
   * @param {Integer} timeToSkip hoow long is the recording skipping
   */
  skipTime(timeToSkip) {
    return new Promise((resolve, reject) => {
      this.counter.start(formatTime(timeToSkip), UICSS.overlayShadeSkipTime, resolve, reject);
    });
  }

  pause() {
    this.counter.pause();
  }

  resume() {
    this.counter.resume();
  }

  endOfPlayback() {
    this.shade.showEnd();
    // Note: If it is preferred to wait for the end of the animation before resolving:
    // wait UICSS.overlayShadeSkipTime
    return Promise.resolve();
  }

  ///////////////// Iframe Functions //////////////////

  /**
   * Construct the containing iframe
   */
  setupPlaybackIframe() {
    this.iframe = document.createElement("iframe");
    this.iframe.id = "playback";

    // this is so that the shade starts out covering most of the page
    // as well as not having the weird feeling of a small iframe turning
    // large after loading finishes
    this.iframe.width = window.innerWidth - 20;
    this.iframe.height = window.innerHeight - 20;

    new ResizeObserver(() => {
      this.overlay.init({
        width: this.iframe.width,
        height: this.iframe.height,
        transform: this.iframe.style.transform,
      });
    }).observe(this.iframe);

    document.body.appendChild(this.iframe);
  }

  /**
   * Clears out playback iframe and returns promise for when that's complete.
   */
  clearPlaybackIframe(data) {
    return new Promise(resolve => {
      // need to wait for a load event to fire on iframe
      const done = () => {
        this.iframe.removeEventListener("load", done, false);
        resolve();
      };

      this.iframe.addEventListener("load", done, false);
      this.iframe.srcdoc = `${data.docType || "<!DOCTYPE html>"}<html></html>`;
    }).then(() => {
      const doc = this.iframe.contentWindow.document;

      const head = doc.head;
      head.parentNode.removeChild(head);

      const body = doc.body;
      body.parentNode.removeChild(body);

      // Listen to play/pause clicks on iframe contents
      this.setupClickHandler();
    });
  }

  //////////////// Page related functions ///////////////////

  /**
   * Sometimes the server writes "undefined" to the page
   */
  fixUndefinedInPage() {
    const node = document.body.childNodes[0];
    if (node && node.textContent.indexOf("undefined") > -1) {
      document.body.removeChild(node);
    }
  }

  /**
   * Listen to click events for pause/resume/advance
   */
  setupClickHandler() {
    const handler = e => {
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
      } else if (this.player.paused) {
        this.player.videoSyncUp();
        this.notify("Resuming playback. Left-click to pause.");
        this.player.resume();
      } else {
        this.player.videoSyncUp();
        this.notify("Pausing playback. Left-click to resume.");
        this.player.pause();
      }
    };

    Unbind("ui:*");
    Bind(document.body, "ui:click", handler);
    Bind(this.iframe.contentWindow.document, "ui:click", handler);
  }

  /**
   * Create/assign page title
   */
  setupPageTitle() {
    let title = document.getElementsByTagName("title")[0];
    if (!title) {
      title = document.createElement("title");
      document.head.appendChild(title);
    }
  }

  /**
   * Update helpful debugging page title
   */
  updatePageTitle(sessionData) {
    const title = document.getElementsByTagName("title")[0];
    title.innerText = `Replay ${sessionData.session_id.substr(0, 5)} Page ${
      sessionData.page_number
    }`;
  }

  /**
   * Style the page so it looks nice & player iframe is centered
   */
  setupPageStyles() {
    // prepare the shade background
    const lRel = window.document.createElement("link");
    lRel.setAttribute("rel", "preload");
    lRel.setAttribute("as", "image");
    lRel.setAttribute("href", UICSS.pathFSLogo);
    document.head.appendChild(lRel);

    const elStyle = document.createElement("style");
    elStyle.appendChild(document.createTextNode(UICSS.data));
    document.head.appendChild(elStyle);
  }

  setupOverlay() {
    this.overlay = new Overlay();
    this.overlay.init({
      width: this.iframe.width,
      height: this.iframe.height,
      transform: this.iframe.style.transform,
    });

    this.shade = new Shade(this.overlay.elContainer);
    this.progress = new Progress(this.shade);
    this.counter = new Counter(this.overlay.elContainer);
  }
}

/**
 * miscellaneous
 */
function formatTime(dt) {
  let t = dt;
  const hh = ~~(t / (1000 * 60 * 60));
  t -= hh * (1000 * 60 * 60);
  const mm = ~~(t / (1000 * 60));
  t -= mm * (1000 * 60);
  const ss = ~~(t / 1000);
  t -= ss * 1000;
  const ms = ~~(t / 100);

  return [
    hh < 10 ? "0" : "",
    hh,
    ":",
    mm < 10 ? "0" : "",
    mm,
    ":",
    ss < 10 ? "0" : "",
    ss,
    ".",
    ms,
  ].join("");
}

export { UI };
