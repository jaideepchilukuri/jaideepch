/**
 * SessionReplay Player - This replays all recorded data about a session,
 * optionally capturing this to a video.
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

fs.provide("rp.Replay.Playback.Player");

fs.require("rp.Replay.Playback.EventInfo");
fs.require("rp.Replay.Playback.Mouse");
fs.require("rp.Replay.Playback.Dom");
fs.require("rp.Replay.Playback.Animation");
fs.require("rp.Replay.Playback.Work");
fs.require("rp.Replay.Playback.Viewport");
fs.require("rp.Replay.Playback.VideoCapture");
fs.require("rp.Replay.Playback.UI");

(function () {

  /**
   * @class Does playback
   * @constructor
   */
  function Player(pagenumber, autoplay, videoParams, sessionData) {
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
  Player.prototype.initialize = function () {
    this.ui.initialize();
    this.ui.updatePageTitle(this.sessionData);

    this.iframe = this.ui.iframe;
  };

  /**
  * Signal a message to the preplayer
  */
  Player.prototype.signalMessage = function () {
    var cmdArr = Array.prototype.slice.call(arguments, 0);
    // Construct a base64 encoded message that the preplayer will understand
    fs.nextTick(function () {
      console.log("PPCMD:" + btoa(JSON.stringify({ cmds: cmdArr })));
    });
  };

  /**
   * Load the initial DOM
   */
  Player.prototype.load = function () {
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
    return this.ui.loading().
      then(function () {
        return this.loadThisPageData();
      }.bind(this)).then(function () {
        if (!this.preloaded) {
          this.preloaded = true;
          // TODO: special UI for preloading phase?
          return this.preloadAll();
        }
      }.bind(this)).then(function () {
        return this.ui.clearPlaybackIframe(this.data);
      }.bind(this)).then(function () {
        return this.loadWorker();
      }.bind(this)).then(function () {
        return this.capture.setup();
      }.bind(this)).then(function () {
        return this.finishLoading();
      }.bind(this)).then(function () {
        return this.ui.loadingDone();
      }.bind(this)).catch(function (e) {
        console.error(e.stack);
      });
  };

  /**
   * Grab the playback script from the server
   */
  Player.prototype.loadThisPageData = function () {
    return this.loadPageData(this.sessionData).
      then(function (data) {
        this.data = data;
      }.bind(this)).catch(function () {
        this.data = null;
      }.bind(this));
  };

  Player.prototype.loadPageData = function (sessionData) {
    if (this.cachedPageData[sessionData.page_number]) {
      return Promise.resolve(this.cachedPageData[sessionData.page_number]);
    }

    return new Promise(function (resolve, reject) {
      new utils.AjaxTransport().send({
        method: "GET",
        url: "/replay/page_data",
        data: sessionData,
        success: function (dtastr) {
          // Parse it
          var data = JSON.parse(dtastr);

          this.cachedPageData[sessionData.page_number] = data;

          /* pragma:DEBUG_START */
          console.warn("rp: received data for page " + sessionData.page_number + ":", data);
          /* pragma:DEBUG_END */

          resolve(data);
        }.bind(this),
        failure: function (o, response) {
          reject(new Error("Failed to fetch pageData: " + response[0]));
        }.bind(this)
      });
    }.bind(this));
  };

  Player.prototype.preloadAll = function () {
    var promises = [];
    for (var i = this.sessionData.page_number + 1; i < this.data.totalPageCount; i++) {
      promises.push(
        this.loadPageData(
          fs.ext({}, this.sessionData, { page_number: i })
        )
      );
    }
    return Promise.all(promises).then(function (dataList) {
      dataList.unshift(this.data);
      var preloader = new AssetPreloader();

      preloader.onProgress.subscribe(function (percent) {
        this.ui.updateProgress(percent);
      }.bind(this), false, true);

      return preloader.preloadAll(dataList);
    }.bind(this));
  };

  /**
   * Set up the worker
   */
  Player.prototype.loadWorker = function () {
    if (this.viewport) {
      this.viewport.dispose();
    }

    // The resizer for figuring out frame size and zooming
    this.viewport = new Viewport(this.iframe);

    // TODO: investigate why this page does not need the position
    // fixed fix... somehow it doesn't.
    if (
      this.data.url.indexOf('//online.citi.com') > -1
    ) {
      this.viewport.disablePositionFixedFix = true;
    }

    // TODO maybe we can reuse mouse.
    if (this.mouse) {
      this.mouse.dispose();
    }

    // The mouse for displaying mouse and touch events
    this.mouse = new Mouse(this.viewport, window, this.iframe);

    // Set up the worker
    var animWin = window;
    var domWin = this.iframe.contentWindow;
    this.worker = new Worker(this.data.events, animWin, domWin, this.mouse, this.viewport);

    var viewportParams = {
      dw: this.data.deviceSize.width,
      dh: this.data.deviceSize.height,
      lw: this.data.initialFrameSize.width,
      lh: this.data.initialFrameSize.height,
      vw: this.data.initialViewportSize.width,
      vh: this.data.initialViewportSize.height,
      vx: this.data.initialScrollPosition.x,
      vy: this.data.initialScrollPosition.y
    };

    return this.worker.load(this.data.initialDOM, viewportParams, this.data.knownAssetsProxied);
  };

  /**
   * Do after-load setup
   */
  Player.prototype.finishLoading = function () {
    this.loaded = true;

    if (this.autoplay) {
      this.videoSyncUp("pagescenestart");
      fs.nextTick(this.resume.bind(this));
    } else {
      this.ui.notify("Waiting for left-click to start!");
    }
  };

  /**
   * Check if there are more pages
   */
  Player.prototype.hasMorePages = function () {
    return (this.pageNumber + 1) < this.data.totalPageCount;
  };

  /**
   * Advance Page
   */
  Player.prototype.advancePage = function () {
    if (!this.hasMorePages()) {
      this.ui.notify("No more pages");
      return Promise.resolve();
    }

    this.ui.notify("Navigating to page " + (this.pageNumber + 1));

    return (this._pausePromise || Promise.resolve()).then(function () {
      this._pausePromise = null;
      return this.ui.advancePage(this.pageNumber);
    }.bind(this)).
      // Give time to the fade animation before starting to load the page.
      // It would look off to see the next page starting to load while
      // the screen is still fading out.
      then(function () {
        /* pragma:DEBUG_START */
        console.warn("rp: advancePage to page", (this.pageNumber + 1));
        /* pragma:DEBUG_END */

        var newURL = window.location.toString();
        if (newURL.indexOf("page_number=") > -1) {
          newURL = newURL.replace("page_number=" + this.pageNumber, "page_number=" + (this.pageNumber + 1));
        } else {
          newURL += "&page_number=" + (this.pageNumber + 1);
        }

        window.history.pushState({}, "", newURL);

        this.pageNumber += 1;
        this.sessionData.page_number = this.pageNumber;
        this.ui.updatePageTitle(this.sessionData);
      }.bind(this)).

      then(this.load.bind(this));
  };

  /**
   * Get the playback time
   */
  Player.prototype.getTimeIndex = function () {
    if (this.paused) {
      return this.timeOffset;
    }
    return (utils.now() - this.timeStart) + this.timeOffset;
  };

  /**
   * Pause playback
   */
  Player.prototype.pause = function () {
    if (this.paused) {
      return;
    }
    this.paused = true;
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
    this.timeOffset += utils.now() - this.timeStart;

    this.ui.pause();

    return this.capture.pause();
  };

  /**
   * Tell the preplayer what state we are in with video time and playback event index
   */
  Player.prototype.videoSyncUp = function (command) {
    command = command || "SYNC";
    this.signalMessage({
      command: command,
      videoTimeIndex: Math.round(this.capture.getDuration()),
      playbackTime: this.getTimeIndex(),
      eventIndex: this.eventIndex,
      pageNumber: this.pageNumber
    });
  };

  /**
   * Resume playback
   */
  Player.prototype.resume = function () {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.timeStart = utils.now();

    this.capture.resume().then(this.playNextEvent.bind(this));
    this.ui.resume();
  };

  /**
   * Either wait for the next frame if the time has not come, or
   * play back the frame then wait for the next frame to play it.
   */
  Player.prototype.playNextEvent = function () {
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

    var timeToSkip = this.worker.timeToSkip();
    var promise;

    // let evt = this.worker.getCurrentEvent()
    // console[evt.e == 27 ? "warn" : "log"]({
    //   ...evt,
    //   e: Object.keys(EventInfo)[Object.values(EventInfo).indexOf(evt.e)],
    // })

    if (timeToSkip > 0) {
      this.ui.notify("Skipping " + timeToSkip + " ms");
      promise = this.ui.skipTime(timeToSkip);
      timeToSkip -= UICSS.overlayShadeSkipTime;
      if (timeToSkip < 0) {
        timeToSkip = 0;
      }
    } else {
      promise = Promise.resolve();
    }

    promise.
      then(function () {
        this.timeOffset += timeToSkip;
        return this.worker.playNextEvent();
      }.bind(this)).
      then(function () {
        // If we skip time, we can sometimes get into a situation where
        // we need to skip hundreds of events... this can make the browser
        // unresponsive, so make sure we break the promise chain now and then
        if (this.busyEvents >= 10) {
          this.busyEvents = 0;
          window.requestAnimationFrame(this.playNextEvent.bind(this));
        } else {
          this.playNextEvent();
        }
      }.bind(this));
  };

  /**
   * Wait for the next frame then play it. Will skip over large
   * expanses of time if encountered. If it falls behind it will
   * try to catch up.
   */
  Player.prototype.awaitNextFrame = function () {
    var amount = this.worker.timeIndex - this.getTimeIndex();

    if (amount < 0) {
      amount = 0;
    }

    this.frameTimer = setTimeout(this.playNextEvent.bind(this), amount);
  };

  /**
   * Handle playback finishing.
   */
  Player.prototype.finishPlayback = function () {
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
  };

})();