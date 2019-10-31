/**
 * SessionReplay Playback Web Module
 *
 * This namespace holds all things related to playback
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2011-08-26 07:54:30 -0700 (Fri, 26 Aug 2011) $
 * @version $Revision: 7257 $

 * Created: May. 2, 2011
 */

fs.provide("rp.Replay.Playback.Web");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");
fs.require("rp.Replay.Fragments");
fs.require("rp.Replay.Playback.EventInfo");
fs.require("rp.Replay.Playback.Mouse");
fs.require("rp.Replay.Playback.Dom");
fs.require("rp.Replay.Playback.Animation");
fs.require("rp.Replay.Playback.Typing");
fs.require("rp.Replay.Playback.CSS");
fs.require("rp.Replay.Playback.Work");

(function () {

  /**
   * The web playback namespace
   */
  Replay.Playback.Web = {};

  /**
   * @class Does web playback
   * @param player {Player} The Player instance for this window.
   * @constructor
   */
  Replay.Playback.Web.WebPlayer = function (player, browsermode, pagenumber, autoplay) {
    /* pragma:DEBUG_START */
    console.warn("rp: starting web player, browsermode: ", browsermode);
    /* pragma:DEBUG_END */

    // Indicate to the viewer we are starting up
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    // Sets whether we've begun actual playback or not
    this.hasBegunPlayback = false;

    // Signals if playback is over
    this.playbackIsOver = false;

    // Auto playback
    this.autoplay = autoplay;

    // The page (0 based)
    this.pageNumber = pagenumber;

    // Get the browser mode "IE" or "CHROME"
    this.browserMode = browsermode;

    // Time index
    this.timeIndex = 0;

    // Event index
    this.eventIndex = 0;

    // How many pauses have been called
    this.pause_count = 0;

    // Keep a local copy of the data
    this.data = player.data;

    // Pull down the dom fragments
    Replay.Fragments.addFragmentsFromEventStream(this.data.events);

    // Set up the mouse
    this.mouse = new Replay.Playback.Mouse(this.data.events, 1);

    // Remap styles for this document
    Replay.Playback.CSS.initInDOM(window.document);

    // Set up the worker
    this.eventWorker = new Replay.Playback.Work.Worker(true, true, true, 1);

    // Bind to worker resume event
    this.eventWorker.Resume.subscribe(fs.proxy(function () {
      this.resume();
    }, this));

    // Bind to worker hide mouse event
    this.eventWorker.HideMouse.subscribe(fs.proxy(function () {
      this.mouse.hide();
    }, this));

    // Bind to worker show mouse event
    this.eventWorker.ShowMouse.subscribe(fs.proxy(function () {
      this.mouse.unhide();
    }, this));

    // Bind to worker remove mouse event
    this.eventWorker.RemoveMouse.subscribe(fs.proxy(function () {
      this.mouse.removeMouse();
    }, this));

    // Bind to worker add mouse event
    this.eventWorker.AddMouse.subscribe(fs.proxy(function () {
      this.mouse.addMouse();
    }, this));

    // Bind to worker mouse click event
    this.eventWorker.SetMouseClick.subscribe(fs.proxy(function (x, y) {
      this.mouse.setClick(x, y);
    }, this));

    // Bind to worker DOM updated event
    this.eventWorker.DomUpdated.subscribe(fs.proxy(function (node) {
      // Rebind hovers
      Replay.Playback.CSS.attachHoverElements(node);
    }, this));

    // Bind to worker scroll event
    this.eventWorker.Scroll.subscribe(fs.proxy(function (doc, currentScroll, x, y) {
      if (doc == window) {
        this.lastScroll = {
          x: x,
          y: y
        };
      }
    }, this));

    // Set up the playback over event
    this.PlaybackOver = new utils.FSEvent();

    // The playback over event handler
    this.PlaybackOver.subscribe(fs.proxy(function () {
      // Stop the mouse
      this.mouse.pause();

      if (this.autoplay) {
        // Advance a page
        this.advancePage();
      } else {
        this.alertViewer("cxReplay Web Playback", "Playback is over. Type advancePage() to go to the next page.");
      }
    }, this));

    // Paused flag
    this.paused = false;

    this.fragmentsLoaded = false;

    // Start downloading the fragments
    Replay.Fragments.preloadFragments(fs.proxy(function () {
      // First, pre-populate the iFrames, then signal ready
      this.eventWorker.prepopulateIframes(this.eventIndex, this.data.events, fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.warn("rp: fragments loaded");
        /* pragma:DEBUG_END */

        // Remember that this happened
        this.fragmentsLoaded = true;

        // Apply the initial scroll positions
        this.eventWorker.applyInitialScrollPositions(this.data);

        if (pagenumber === 0) {
          if (this.autoplay) {
            this.alertViewer("cxReplay Web Playback", "Playback is ready and beginning on its own.");
          } else {
            this.alertViewer("cxReplay Web Playback", "Playback is ready. Type beginPlayback() to start.");
          }
        }
        if (this.autoplay) {
          this.beginPlayback();
        }
      }, this));
    }, this));

    /**
     * Expose Begin Playback
     */
    window.beginPlayback = fs.proxy(function () {
      this.beginPlayback();
    }, this);

    /**
     * Expose Advance Page
     */
    window.advancePage = fs.proxy(function () {
      this.advancePage();
    }, this);

    /**
     * Expose pause
     */
    window.pause = fs.proxy(function () {
      this.pause();
    }, this);

    /**
     * Expose resume
     */
    window.resume = fs.proxy(function () {
      this.resume();
    }, this);

    // On error
    window.onerror = fs.proxy(function (e) {
      console.error("Script error [" + Replay.version + "]: " + e);
    }, this);

    // Mouse controls
    utils.Bind(document.body, "click", fs.proxy(function (e) {
      if (this.fragmentsLoaded) {
        if (!this.hasBegunPlayback) {
          this.alertViewer("cxReplay Web Playback - MOUSE COMMAND", "Beginning playback. Left-click to pause.");
          this.beginPlayback();
        } else if (this.playbackIsOver) {
          this.advancePage();
        } else {
          if (this.paused) {
            this.alertViewer("cxReplay Web Playback - MOUSE COMMAND", "Resuming playback. Left-click to pause.");
            this.resume();
          } else {
            this.alertViewer("cxReplay Web Playback - MOUSE COMMAND", "Pausing playback. Left-click to resume.");
            this.pause();
          }
        }
      } else {
        /* pragma:DEBUG_START */
        console.warn("rp: cannot begin playback. Fragments not loaded - wait a bit longer.");
        /* pragma:DEBUG_END */
      }
    }, this));
  };

  /**
   * Show a local notification
   */
  Replay.Playback.Web.WebPlayer.prototype.alertViewer = function (title, msg) {
    if (!Notification) {
      alert('Desktop notifications not available in your browser. Try Chromium.');
      return;
    }
    if (Notification.permission !== "granted")
      Notification.requestPermission();
    else {
      var notification = new Notification(title, {
        icon: '/special_assets/notification.png',
        body: msg
      });
    }
  };

  /**
   * Log a debug message
   */
  Replay.Playback.Web.WebPlayer.prototype.logMessage = function (msg) {
    if (fs.isDefined(window.FsrPreplayInterface)) {
      window.FsrPreplayInterface.logMessage(msg);
    }
  };

  /**
   * Advance Page
   */
  Replay.Playback.Web.WebPlayer.prototype.advancePage = function () {
    var newURL = window.location.toString(),
      currentPage = parseInt(fs.getParam("page_number"));

    /* pragma:DEBUG_START */
    console.warn("rp: advancePage. index: ", this.eventIndex);
    /* pragma:DEBUG_END */

    newURL = newURL.replace("page_number=" + currentPage, "page_number=" + (currentPage + 1));

    // Change the page on a small timeout
    setTimeout(function () {
      window.location = newURL;
    }, 20);
  };

  /**
   * Begin playback
   */
  Replay.Playback.Web.WebPlayer.prototype.beginPlayback = function () {
    if (!this.hasBegunPlayback) {
      this.hasBegunPlayback = true;
      // Set the start time
      this.startTime = this.pauseTime = utils.now();

      // Set the mouse start time
      this.mouse.startTime = this.startTime;

      // Start playing things
      this.playTimedFrame();

      // Start the mouse playback
      this.mouse.animate();
    }
  };

  /**
   * Pause playback
   */
  Replay.Playback.Web.WebPlayer.prototype.pause = function (allow_multiple_pauses) {
    /* pragma:DEBUG_START */
    console.warn("rp: pause. index: ", this.eventIndex);
    /* pragma:DEBUG_END */

    // Tally this as a pause event
    if (allow_multiple_pauses) {
      this.pause_count++;
    }

    // Prevent multiple pause actions
    if ((this.paused === false && !allow_multiple_pauses) || this.pause_count == 1) {
      // Set the start time
      this.pauseTime = utils.now();

      // set the flag
      this.paused = true;

      // Clear the animation timer
      clearTimeout(this.timeObj);

      // pause the mouse
      this.mouse.pause();
    } else {
      /* pragma:DEBUG_START */
      console.warn("rp: can't pause. paused: ", this.paused, "allow_multiple_pauses: ", allow_multiple_pauses, "this.pause_count: ", this.pause_count);
      /* pragma:DEBUG_END */
    }
  };

  /**
   * Resume playback
   * @param allow_multiple_pauses {boolean} Allow multiple calls to pause. Then require an equal number of calls to resume.
   */
  Replay.Playback.Web.WebPlayer.prototype.resume = function (allow_multiple_pauses) {
    if (!this.hasBegunPlayback) {
      this.beginPlayback();
    } else {
      /* pragma:DEBUG_START */
      console.warn("rp: resume. index: ", this.eventIndex);
      /* pragma:DEBUG_END */

      if (allow_multiple_pauses) {
        this.pause_count--;
      } else {
        this.pause_count = 0;
      }

      if (this.pause_count < 0) {
        this.pause_count = 0;
      }

      // Prevent multiple resume actions
      if ((this.paused === true && !allow_multiple_pauses) || this.pause_count === 0 && !this.isScrollUpdating) {
        // Do some timeline adjustment
        var currentTime = utils.now();
        this.startTime += currentTime - this.pauseTime;

        // Unset the flag
        this.paused = false;

        // Play the timed frame
        this.playTimedFrame();

        // Resume the mouse
        this.mouse.resume();

        // Restore the scroll position
        if (this.lastScroll) {
          utils.setScroll(window, this.lastScroll.x, this.lastScroll.y);
        }
      } else {
        /* pragma:DEBUG_START */
        console.warn("rp: can't resume. paused: ", this.paused, "allow_multiple_pauses: ", allow_multiple_pauses, "this.pause_count: ", this.pause_count, "this.isScrollUpdating: ", this.isScrollUpdating);
        /* pragma:DEBUG_END */
      }
    }
  };

  /**
   * Play the next timed frame
   */
  Replay.Playback.Web.WebPlayer.prototype.playTimedFrame = function () {
    // Get the current time
    this.currentTime = utils.now();

    // Calculate the time index
    this.timeIndex = this.currentTime - this.startTime;

    // Set the mouse
    this.mouse.setMinimumEventTime(this.timeIndex);

    // Only do the work to advance to the next event if there is one
    if (this.eventIndex < this.data.events.length) {

      // Only do anything if we aren't paused
      if (this.paused === false) {
        // Calculate the wait time until the next event
        // Subtract a little extra for the overhead we know we have in general
        var timeUntilNextEvent = this.data.events[this.eventIndex].eventTime - this.timeIndex - 5;

        // Is the time until the next session longer than 20 seconds?
        if (timeUntilNextEvent > 2000) {
          // Advance
          this.startTime -= timeUntilNextEvent;
          timeUntilNextEvent = 1500;
        }

        // Adjust for negativity
        if (timeUntilNextEvent <= 0) {
          timeUntilNextEvent = 1;
        }

        // Set the timer
        clearTimeout(this.timeObj);
        this.timeObj = setTimeout(function (ctx) {
          return function () {
            ctx.playFrame();
          };
        }(this), timeUntilNextEvent);
      } else {
        // Restore the event index
        this.eventIndex--;
      }
    } else {

      // Playback has completed
      this.playbackIsOver = true;
      this.PlaybackOver.fire();
    }
  };

  /**
   * Play the next frame
   */
  Replay.Playback.Web.WebPlayer.prototype.playFrame = function () {

    // Get a quick reference to the event
    var evt = this.data.events[this.eventIndex];

    // Only do anything if there are any more events
    if (evt) {
      // Help the mouse class out by telling it what our minimum event index is
      this.mouse.setMinimumEventIndex(this.eventIndex);

      var startTime = new Date();

      // Do the work of the event
      this.eventWorker.runEvent(evt);

      // See if its a skip ahead event
      evt = this.data.events[this.eventIndex];
      /*if (evt.eventType == Replay.Playback.EventInfo.SKIPTIME) {
        // Advance
        this.startTime -= evt.iVal;
        this.mouse.startTime -= evt.iVal;
      }*/

      var endTime = new Date(),
        tDiff = endTime - startTime;
      this.startTime += tDiff;
      this.mouse.startTime += tDiff;

      // Only call playtimedframe if we aren't paused
      if (this.paused === false) {
        // Do the next frame
        this.playTimedFrame();
      }

      // Bump the event index
      this.eventIndex++;
    } else {
      /* pragma:DEBUG_START */
      console.warn("rp: playback over. index: ", this.eventIndex);
      /* pragma:DEBUG_END */

      // Playback has completed
      this.playbackIsOver = true;
      this.PlaybackOver.fire();
    }
  };

})();