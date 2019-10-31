/**
 * SessionReplay Player - This replays all recorded data about a session,
 * optionally capturing this to a video.
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

import { ext, nextTick } from "../../fs/index";
import { UI } from "./UI/UI";
import { UICSS } from "./UI/css";
import { AssetPreloader } from "./assetpreloader";
import { Mouse } from "./mouse";
import { VideoCapture } from "./videocap";
import { Viewport } from "./viewport";
import { Worker } from "./worker";
import { now as currentTime, AjaxTransport } from "../../utils/utils";

const WATCHDOG_GRACE_TIME = 120000;
const WATCHDOG_BOOT_TIME = 600000;

/**
 * @class Does playback
 * @constructor
 */
class Player {
  constructor(pagenumber, autoplay, videoParams, sessionData) {
    /* pragma:DEBUG_START */
    console.warn("rp: starting player");
    /* pragma:DEBUG_END */

    // info from server about session
    this.sessionData = sessionData;

    // we are running inside preplayer if we have an upload port
    this.preplayer = !!videoParams.uploadPort;

    // Whether loading initial dom and assets is done
    this.loaded = false;

    // start playing as soon as we are loaded, or wait for click first
    this.autoplay = autoplay;

    // The page (0 based)
    this.pageNumber = pagenumber;

    // The setTimeout timer that will trigger the next frame
    this.frameTimer = null;

    // The setTimeout timer that will trigger if for some reason
    // the replay crashes out, and force capture to stop so
    // preplayer can time out properly.
    this.watchdogTimer = null;

    // For capturing videos and downloading/uploading them
    this.capture = new VideoCapture(videoParams);

    // playback iframe set up by the UI
    this.iframe = null;

    // number of frames played without waiting
    this.busyEvents = 0;

    this.preloaded = false;

    this.cachedPageData = {};

    // the user interface
    this.ui = new UI(this);
  }

  /**
   * One time setup things
   */
  initialize() {
    this.ui.initialize();
    this.ui.updatePageTitle(this.sessionData);

    this.iframe = this.ui.iframe;
  }

  /**
   * Signal a message to the preplayer
   */
  signalMessage() {
    const cmdArr = Array.prototype.slice.call(arguments, 0);
    // Construct a base64 encoded message that the preplayer will understand
    nextTick(() => {
      console.log(`PPCMD:${btoa(JSON.stringify({ cmds: cmdArr }))}`);
    });
  }

  /**
   * Load the initial DOM
   */
  load() {
    // whether paused or not
    this.paused = true;

    // make sure the load phase is reactivated
    this.loaded = false;

    // Signals if playback is over
    this.playbackFinished = false;

    // Time offset (used when resuming from pause)
    this.timeOffset = 0;

    // Time of playback start
    this.timeStart = 0;

    // Grab the page data
    return this.ui
      .loading()
      .then(() => this.loadThisPageData())
      .then(() => {
        if (!this.preloaded) {
          this.preloaded = true;
          // TODO: special UI for preloading phase?
          return this.preloadAll();
        }
      })
      .then(() => this.ui.clearPlaybackIframe(this.data))
      .then(() => this.loadWorker())
      .then(() => this.capture.setup())
      .then(() => this.finishLoading())
      .then(() => this.ui.loadingDone())
      .catch(e => {
        console.error(e.stack);
      });
  }

  /**
   * Grab the playback script from the server
   */
  loadThisPageData() {
    return this.loadPageData(this.sessionData)
      .then(data => {
        this.data = data;
      })
      .catch(() => {
        this.data = null;
      });
  }

  loadPageData(sessionData) {
    if (this.cachedPageData[sessionData.page_number]) {
      return Promise.resolve(this.cachedPageData[sessionData.page_number]);
    }

    return new Promise((resolve, reject) => {
      new AjaxTransport().send({
        method: "GET",
        url: "/replay/page_data",
        data: sessionData,
        success: dtastr => {
          // Parse it
          const data = JSON.parse(dtastr);

          this.cachedPageData[sessionData.page_number] = data;

          /* pragma:DEBUG_START */
          console.warn(`rp: received data for page ${sessionData.page_number}:`, data);
          /* pragma:DEBUG_END */

          resolve(data);
        },
        failure(o, response) {
          reject(new Error(`Failed to fetch pageData: ${response[0]}`));
        },
      });
    });
  }

  preloadAll() {
    const promises = [];
    for (let i = this.sessionData.page_number + 1; i < this.data.totalPageCount; i++) {
      promises.push(this.loadPageData(ext({}, this.sessionData, { page_number: i })));
    }
    return Promise.all(promises).then(dataList => {
      dataList.unshift(this.data);
      const preloader = new AssetPreloader();

      preloader.onProgress.subscribe(
        percent => {
          this.ui.updateProgress(percent);
        },
        false,
        true
      );

      return preloader.preloadAll(dataList);
    });
  }

  /**
   * Set up the worker
   */
  loadWorker() {
    if (this.viewport) {
      this.viewport.dispose();
    }

    // The resizer for figuring out frame size and zooming
    this.viewport = new Viewport(this.iframe);

    // TODO: investigate why this page does not need the position
    // fixed fix... somehow it doesn't.
    if (this.data.url.indexOf("//online.citi.com") > -1) {
      this.viewport.disablePositionFixedFix = true;
    }

    // TODO maybe we can reuse mouse.
    if (this.mouse) {
      this.mouse.dispose();
    }

    // The mouse for displaying mouse and touch events
    this.mouse = new Mouse(this.viewport, window, this.iframe);

    // Set up the worker
    const animWin = window;
    const domWin = this.iframe.contentWindow;
    this.worker = new Worker(this.data.events, animWin, domWin, this.mouse, this.viewport);

    const viewportParams = {
      dw: this.data.deviceSize.width,
      dh: this.data.deviceSize.height,

      // Default sizes are used for non recorded pages where these are 0
      lw: this.data.initialFrameSize.width || 640,
      lh: this.data.initialFrameSize.height || 480,
      vw: this.data.initialViewportSize.width || 640,
      vh: this.data.initialViewportSize.height || 480,
      vx: this.data.initialScrollPosition.x,
      vy: this.data.initialScrollPosition.y,
    };

    return this.worker.load(this.data.initialDOM, viewportParams, this.data.knownAssetsProxied);
  }

  /**
   * Do after-load setup
   */
  finishLoading() {
    this.loaded = true;

    this.resetWatchdog(WATCHDOG_BOOT_TIME);

    if (this.autoplay) {
      this.videoSyncUp("pagescenestart");
      nextTick(this.resume.bind(this));
    } else {
      this.ui.notify("Waiting for left-click to start!");
    }
  }

  /**
   * Check if there are more pages
   */
  hasMorePages() {
    return this.pageNumber + 1 < this.data.totalPageCount;
  }

  /**
   * Advance Page
   */
  advancePage() {
    if (!this.hasMorePages()) {
      this.ui.notify("No more pages");
      return Promise.resolve();
    }

    this.ui.notify(`Navigating to page ${this.pageNumber + 1}`);

    return (
      (this._pausePromise || Promise.resolve())
        .then(() => {
          this._pausePromise = null;
          return this.ui.advancePage(this.pageNumber);
        })
        // Give time to the fade animation before starting to load the page.
        // It would look off to see the next page starting to load while
        // the screen is still fading out.
        .then(() => {
          /* pragma:DEBUG_START */
          console.warn("rp: advancePage to page", this.pageNumber + 1);
          /* pragma:DEBUG_END */

          let newURL = window.location.toString();
          if (newURL.indexOf("page_number=") > -1) {
            newURL = newURL.replace(
              `page_number=${this.pageNumber}`,
              `page_number=${this.pageNumber + 1}`
            );
          } else {
            newURL += `&page_number=${this.pageNumber + 1}`;
          }

          window.history.pushState({}, "", newURL);

          this.pageNumber += 1;
          this.sessionData.page_number = this.pageNumber;
          this.ui.updatePageTitle(this.sessionData);
        })
        .then(this.load.bind(this))
    );
  }

  /**
   * Get the playback time
   */
  getTimeIndex() {
    if (this.paused) {
      return this.timeOffset;
    }
    return currentTime() - this.timeStart + this.timeOffset;
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.paused) {
      return;
    }
    this.paused = true;
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    this.timeOffset += currentTime() - this.timeStart;

    this.ui.pause();

    // make sure the watchdog won't trigger while we are paused
    // we will also pause for loading, but because the capture is paused,
    // preplayer should still timeout if loading crashes/hangs
    this.stopWatchdog();

    return this.capture.pause();
  }

  /**
   * Tell the preplayer what state we are in with video time and playback event index
   */
  videoSyncUp(command) {
    command = command || "SYNC";
    this.signalMessage({
      command,
      videoTimeIndex: Math.round(this.capture.getDuration()),
      playbackTime: this.getTimeIndex(),
      eventIndex: this.eventIndex,
      pageNumber: this.pageNumber,
    });
  }

  /**
   * Resume playback
   */
  resume() {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.timeStart = currentTime();

    this.capture.resume().then(this.playNextEvent.bind(this));
    this.ui.resume();
  }

  /**
   * Either wait for the next frame if the time has not come, or
   * play back the frame then wait for the next frame to play it.
   */
  playNextEvent() {
    if (this.paused) {
      // if we are paused, exit event loop
      return;
    }

    if (this.getTimeIndex() < this.worker.timeIndex) {
      this.busyEvents = 0;
      this.awaitNextFrame();
      return;
    } else {
      this.busyEvents++;
    }

    if (this.worker.isDone()) {
      this.finishPlayback();
      return;
    }

    let timeToSkip = this.worker.timeToSkip();
    let promise;

    // let evt = this.worker.getCurrentEvent()
    // console[evt.e == 27 ? "warn" : "log"]({
    //   ...evt,
    //   e: Object.keys(EventInfo)[Object.values(EventInfo).indexOf(evt.e)],
    // })

    if (timeToSkip > 0) {
      this.ui.notify(`Skipping ${timeToSkip} ms`);
      promise = this.ui.skipTime(timeToSkip);
      timeToSkip -= UICSS.overlayShadeSkipTime;
      if (timeToSkip < 0) {
        timeToSkip = 0;
      }
    } else {
      promise = Promise.resolve();
    }

    promise
      .then(() => {
        this.timeOffset += timeToSkip;
        return this.worker.playNextEvent();
      })
      .then(() => {
        // If we skip time, we can sometimes get into a situation where
        // we need to skip hundreds of events... this can make the browser
        // unresponsive, so make sure we break the promise chain now and then
        if (this.busyEvents >= 10) {
          this.busyEvents = 0;
          window.requestAnimationFrame(this.playNextEvent.bind(this));
        } else {
          this.playNextEvent();
        }
      });
  }

  /**
   * Pauses/stops the watchdog so it won't trip.
   */
  stopWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Resets/resumes the watchdog so it will fire in `timeout` ms plus a grace period.
   */
  resetWatchdog(timeout) {
    this.stopWatchdog();
    this.watchdogTimer = setTimeout(
      () => this.tripWatchdog(),
      (timeout || 0) + WATCHDOG_GRACE_TIME
    );
  }

  /**
   * Trip the watchdog after we stop the capture so hopefully preplayer will
   * notice and fail the session.
   */
  tripWatchdog() {
    this.capture.stop();
    this.ui.notify("FATAL: watchdog tripped!");
    throw new Error("FATAL: watchdog trippped!");
  }

  /**
   * Wait for the next frame then play it. Will skip over large
   * expanses of time if encountered. If it falls behind it will
   * try to catch up.
   */
  awaitNextFrame() {
    let amount = this.worker.timeIndex - this.getTimeIndex();

    if (amount < 0) {
      amount = 0;
    }

    this.resetWatchdog(amount);

    this.frameTimer = setTimeout(this.playNextEvent.bind(this), amount);
  }

  /**
   * Handle playback finishing.
   */
  finishPlayback() {
    this.videoSyncUp();
    this._pausePromise = this.pause();
    if (!this.hasMorePages()) {
      // DON'T EVER CHANGE THE TEXT OF THIS NOTIFY MESSAGE HERE:
      this.ui.notify("Playback finished");
      this.ui.endOfPlayback();
    }
    this.playbackFinished = true;
    // TODO: fire an event?
    this.videoSyncUp("pagesceneend");
    if (this.autoplay && this.hasMorePages()) {
      this.advancePage();
    } else {
      this.capture.stop();
    }
  }
}

export { Player };
