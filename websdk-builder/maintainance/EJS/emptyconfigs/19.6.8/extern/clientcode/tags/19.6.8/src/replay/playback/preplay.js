/**
 * SessionReplay Playback Preplayer Module
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

fs.provide("rp.Replay.Playback.PrePlay");

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
   * The preplayer namespace
   */
  Replay.Playback.PrePlay = {};

  /**
   * @class Does web playback
   * @param player {Player} The Player instance for this window.
   * @constructor
   */
  Replay.Playback.PrePlay.PrePlayer = function (player) {

    /* pragma:DEBUG_START */
    console.warn("rp: starting preplay player");
    /* pragma:DEBUG_END */

    // The startup time - this is needed even for mp4 playback
    this.startTime = utils.now();

    // Time index
    this.timeIndex = 0;

    // Event index
    this.eventIndex = 0;

    // Are we ready to play?
    this.isReady = false;

    // Automatically advance to time index
    this.jumpTheGunTimeAdvance = 0;

    // The last event index actually played
    this.lastEventIndexPlayed = -1;

    // Keep a local copy of the data
    this.data = player.data;

    // Expose this instance to the window so that we can start playback with FSRReplayer.beginPlayback()
    window.FSRReplayer = this;

    // Pull down the dom fragments
    Replay.Fragments.addFragmentsFromEventStream(this.data.events);

    // Remap styles for this document
    Replay.Playback.CSS.initInDOM(document);

    // Set up the worker
    this.eventWorker = new Replay.Playback.Work.Worker(true, false, true, 0);

    // Bind to worker pause event
    this.eventWorker.Pause.subscribe(fs.proxy(function () {
      // Pause playback
      this.pause();
    }, this));

    // Bind to worker resume event
    this.eventWorker.Resume.subscribe(fs.proxy(function () {
      // Resume playback
      this.resume();
    }, this));

    // Would have normally bound to resume() here also.
    // Would have bound to framesized() here also.
    // Would have bound to beforedomupdated() here also.
    // Would have bound to DomUpdated here also.
    // Set a default scroll
    this.lastScroll = {
      x: 0,
      y: 0
    };

    // Bind to the scroll event
    this.eventWorker.Scroll.subscribe(fs.proxy(function (frameContext, currentScroll, x, y) {
      if (frameContext == window) {
        this.lastScroll = {
          x: x,
          y: y
        };
        // Restore the scroll position
        utils.setScroll(window, this.lastScroll.x, this.lastScroll.y);
      }
    }, this));

    // Start downloading the fragments
    Replay.Fragments.preloadFragments(fs.proxy(function () {
      // Apply the initial scroll positions
      this.eventWorker.applyInitialScrollPositions(this.data);

      // First, pre-populate the iFrames, then signal ready
      this.eventWorker.prepopulateIframes(this.eventIndex, this.data.events, fs.proxy(this.signalReady, this));
    }, this));

    // On error
    window.onerror = fs.proxy(function (e) {
      this.logMessage("Script error [" + Replay.version + "]: " + e);
    }, this);

  };

  /**
   * The message queue
   * @type {Array}
   * @private
   */
  Replay.Playback.PrePlay.PrePlayer._messageQueue = [];

  /**
   * Signal a message to the preplayer
   * @constructor
   */
  Replay.Playback.PrePlay.PrePlayer.SignalMessage = function (fn) {
    if (window.FsrPrePlayerInterface) {
      try {
        window.FsrPrePlayerInterface[fn](arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7]);
      } catch (e) {
      }
    } else {
      var newTitle = "FsrPrePlayerInterface:" + fn;
      for (var i = 1; i < arguments.length; i++) {
        newTitle += ":" + arguments[i];
      }
      Replay.Playback.PrePlay.PrePlayer._messageQueue.push(newTitle);
    }
  };

  /**
   * Handle the next message on the queue
   * @constructor
   */
  Replay.Playback.PrePlay.PrePlayer.PopMessages = function () {
    if (Replay.Playback.PrePlay.PrePlayer._messageQueue.length > 0) {
      var mastermsg = "";
      for (var i = 0; i < Replay.Playback.PrePlay.PrePlayer._messageQueue.length; i++) {
        if (i > 0)
          mastermsg += "^";
        mastermsg += Replay.Playback.PrePlay.PrePlayer._messageQueue[i];
      }
      Replay.Playback.PrePlay.PrePlayer._messageQueue = [];
      document.title = mastermsg;
    }
  };

  /**
   * Log the document information
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.logDocInfo = function (wWidth, wHeight) {
    // Get the document size too
    var docSize = Replay.Playback.Dom.getDomDimensions();

    // Notify the preplayer
    Replay.Playback.PrePlay.PrePlayer.SignalMessage("setFrameInfo", docSize.width, docSize.height, wWidth, wHeight);
  };

  /**
   * Signal to the PrePlayer
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.signalReady = function () {
    this.isReady = true;
    if (utils.now() - this.startTime < 3000)
      setTimeout(fs.proxy(function () {
        this.signalReady();
      }, this), 3000 - (utils.now() - this.startTime));
    else {
      // Message up to the preplayer by setting the title. This is the only time we
      // have to use the doc title to do this.
      window.document.title = "Mp4PlayerIsReady";

      if (this.jumpTheGunTimeAdvance > 0) {
        this.advanceToTimeIndex(this.jumpTheGunTimeAdvance);
      }

      /* pragma:DEBUG_START */
      console.warn("rp: playback is ready. total events: ", this.data.events.length);
      /* pragma:DEBUG_END */
    }
  };

  /**
   * Advance to a time index
   * @param time - the time index
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.advanceToTimeIndex = function (time) {

    // If we're not ready then keep track of this request
    if (!this.isReady) {
      this.jumpTheGunTimeAdvance = time;
      return;
    }

    // Remember the time index
    this.timeIndex = time;

    // See if its a skip ahead event
    var evt = this.data.events[this.eventIndex];

    // Only do the work to advance to the next event if there is one
    if (evt && evt.eventTime < time) {
      // Kick it off
      window.requestAnimationFrame(fs.proxy(function () {
        this.playFrame();
      }, this));
    } else {
      // Just signal done
      window.requestAnimationFrame(fs.proxy(function () {
        this.signalDoneWithAdvance();
      }, this));
    }
  };


  /**
   * Tell the browser we are done with the advance
   * @private
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.signalDoneWithAdvance = function () {
    /* pragma:DEBUG_START */
    console.warn("rp: advanceComplete");
    /* pragma:DEBUG_END */
    Replay.Playback.PrePlay.PrePlayer.SignalMessage("advanceComplete", true);
  };

  /**
   * Notify the event index
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.notifyEventIndex = function () {
    var sp = utils.getScroll(window);
    Replay.Playback.PrePlay.PrePlayer.SignalMessage("setEventIndex", this.eventIndex, sp.x, sp.y);
  };

  /**
   * Notify the event index
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.notifyTimelinePosition = function (timeIndex) {
    Replay.Playback.PrePlay.PrePlayer.SignalMessage("setEventTime", timeIndex);
  };

  /**
   * Pause playback
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.pause = function () {
    // set the flag
    this.paused = true;
  };

  /**
   * Resume playback
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.resume = function () {
    // Unset the flag
    this.paused = false;

    // Restore the scroll position
    utils.setScroll(window, this.lastScroll.x, this.lastScroll.y);

    // Play the timed frame
    window.requestAnimationFrame(fs.proxy(function () {
      this.advanceToTimeIndex(this.timeIndex);
    }, this));
  };

  /**
   * Log a debug message
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.logMessage = function (msg) {
    Replay.Playback.PrePlay.PrePlayer.SignalMessage("logMessage", msg);
  };

  /**
   * Play the next frame
   */
  Replay.Playback.PrePlay.PrePlayer.prototype.playFrame = function () {
    // Prevent playFrame when paused
    if (this.paused) {
      return;
    }
    // Get a quick reference to the event
    var evt = this.data.events[this.eventIndex];

    // Only do anything if there are any more events
    if (evt) {

      // Do the work of the event
      try {
        this.eventWorker.runEvent(evt);

        // Restore the scroll position
        utils.setScroll(window, this.lastScroll.x, this.lastScroll.y);
      } catch (e) {
      }

      // Bump the event index
      this.eventIndex++;
    } else {
      // Restore scroll position if it has shifted
      utils.setScroll(window, this.lastScroll.x, this.lastScroll.y);
    }

    // Advance to next frame
    window.requestAnimationFrame(fs.proxy(function () {
      this.advanceToTimeIndex(this.timeIndex);
    }, this));
  };

})();