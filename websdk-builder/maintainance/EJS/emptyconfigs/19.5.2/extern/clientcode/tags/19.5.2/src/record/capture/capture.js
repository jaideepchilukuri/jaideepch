/**
 * cxRecord Capture
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Capture.Capture");

fs.require("rec.Top");
fs.require("rec.Capture.EventThrottle");

(function () {

  /**
   * Captures interaction on the page
   * @param frame (Window) The window frame.
   * @param browser {Browser} Browser info
   * @param config {Object} Configuration
   * @param isXDRIFrameMode {Bool} Are we in a cross-domain iFrame?
   */
  var Capture = function (recorder, browser, config, isXDRIFrameMode) {
    // The config
    this.config = config;

    // Keep track of the browser
    this.browser = browser;

    // Keep track of whether we are in a cross-domain iFrame
    this.isXDRIFrameMode = isXDRIFrameMode;

    // Get a ref to the top recorder
    this.isTop = (recorder.getTop() == recorder);

    // The window
    this.recorder = recorder;

    // Set up the mutation watcher
    this.mutation = new Mutation(recorder);

    // Set up the mouse tracking
    this._setupMouseTracking();

    // Capture and then monitor the window size
    this.sizeCapture = new EventThrottler(this.recorder, this.recorder.win, "resize", 700, function (evt, subject, recorder) {
      var frsize = utils.getSize(recorder.win), availSize = { 'w': 0, 'h': 0 }, ornt = 0, logger = recorder.getLogger();

      // Measure the document
      var sz = Dom.getDocSize(recorder.doc), avs = { "w": sz.width, "h": sz.height };

      // make a note of it
      recorder.docSize = sz;

      // Some mobile-specific stuff
      if (browser.isMobile) {
        var tmp = frsize;
        frsize = avs;
        avs = tmp;

        // Get the orientation
        ornt = window.orientation;
      }

      // Log the new frame size
      logger.log(recorder, Logger.EVENT_TYPES.FRAME_SIZE, {
        "sz": frsize,
        "avs": avs,
        "st": ornt,
        "m": browser.isMobile
      }, null, -350);

      // log it
      logger.log(recorder, Logger.EVENT_TYPES.DOC_SIZE, { "sz": { "w": sz.width, "h": sz.height } }, null, -340);

    });

    // Capture errors
    var oldErrorHandler = this.recorder.win.onerror;
    this.recorder.win.onerror = fs.proxy(function (msg, url, linenumber) {
      // Log the error
      this.getLogger().log(this, Logger.EVENT_TYPES.JAVASCRIPT_ERROR, { "v": msg + ", " + url + ", " + linenumber });

      // If there is an existing handler, use it now
      if (oldErrorHandler) {
        oldErrorHandler.apply(this.win, arguments);
      }
    }, this.recorder);

    //  Create a collection of input captures for all the form fields on the page
    this.inputCaptures = [];

    // Do a setup of all inputs
    this.updateNodeBinding(this.recorder.win.document.body, false, true);

    // Serialize inputs on mouseclicks
    this.inputReserialize = function (ctx, recorder, capcollection) {
      return function () {
        // Defer serialization by 100ms
        setTimeout(function () {
          // Adding a try/catch test block for an edge case
          // Edge case is when the click event happened on an iFrame, and then the iFrame closes, and then we try to access the iframe contents. HomeDepot IE8 tom 2/25/2013
          try {
            var dummy = ctx.recorder.win.document;
          }
          catch (e) {
            return;
          }

          for (var i = 0; i < capcollection.length; i++) {
            var ipt = capcollection[i];
            if (capcollection[i].hasChanged() && fs.isDefined(ipt.input) && ipt.input.nodeName != "SELECT") {
              ipt.lastValue = ipt.input.value;
              ipt.serialize();
            }
          }
        }, 20);

        if (!ctx.isTop) {
          ctx.recorder.getTop().eventcap.inputReserialize.apply();
        }
      };
    }(this, this.recorder, this.inputCaptures);

    // Bind to the actual event
    utils.Bind(this.recorder.win.document, "record:click", this.inputReserialize);
    utils.Bind(this.recorder.win.document, "record:touchstart", this.inputReserialize);

    if (this.config.advancedSettings && this.config.advancedSettings.scrollEls) {
      this._setupScrollTracking();

      recorder.DomUpdated.subscribe(fs.proxy(function (node) {
        // Rebind
        this._setupScrollTracking(node);
      }, this));
    }

    // Free up stuff
    recorder = null;
  };

  /**
   * Sets up element scroll attachment
   * @param elemContext the context to search for scrollable element attachment
   * @private
   */
  Capture.prototype._setupScrollTracking = function (elemContext) {
    if (!elemContext) {
      elemContext = document;
    }

    var scElls = this.config.advancedSettings.scrollEls;

    if (fs.isString(scElls)) {
      // Check to see if any scroll binding is required on DOM elements
      var scrollEls = elemContext.querySelectorAll(scElls);

      // Log scroll event on requested elements
      var scrollClbk = function (rec) {
        return function (evt, subject) {
          // Log the scroll event
          if (!subject)
            subject = evt.target || evt.srcElement;
          if (subject) {
            rec.getLogger().log(rec, Logger.EVENT_TYPES.SCROLL_EL, {
              "x": rec.getLogger().logXPath(rec, XPath.getMapping(subject)),
              "ps": { 'x': subject.scrollLeft, 'y': subject.scrollTop }
            });
          }
        };
      };

      // Loop over the scroll elements and set up bindings - making sure we don't double-bind
      for (var i = 0; i < scrollEls.length; i++) {
        // Checks if element already has scroll binding
        if (!scrollEls[i]._fsrScrollCapture) {
          scrollEls[i]._fsrScrollCapture = new EventThrottler(this.recorder, scrollEls[i], "scroll", 400, scrollClbk(this.recorder));
        }
      }
    }
  };

  /**
   * Sets up mouse tracking
   */
  Capture.prototype._setupMouseTracking = function () {
    // Quickreference the context
    var ctx = this;

    /**
     * Create a generic event handler for mouse position that also handles scroll events
     * @param evt
     * @param subject
     * @param recorder
     * @param evtType
     */
    var mouseHandler = function (evt, subject, recorder, evtType) {
      // Quickreference the event types
      var eTypes = Logger.EVENT_TYPES,
        logger = recorder.getLogger();

      // If this is not a simulated event and we're moused over the window, then bring us back
      if (!evt.delayed && !recorder.getTop().isMousedOverWindow) {
        // bring us back
        logger.log(recorder, eTypes.WINDOW_MOUSEOUT_MOUSEENTER, { "st": 1 });
        recorder.getTop().isMousedOverWindow = true;
      }

      // Only do anything if we're moused over the window
      if (recorder.getTop().isMousedOverWindow) {
        // Use the event type passed OR a default one
        evtType = evtType || eTypes.MOUSE_MOVE;

        // Get a reference to a generic mouse coordinate object that we'll use several times
        var rawMouseCoords = {
          'x': (typeof (evt.clientX) != 'unknown' ? evt.clientX : (typeof (evt.screenX) != 'unknown') ? evt.screenX : evt.sX),
          'y': (typeof (evt.clientY) != 'unknown' ? evt.clientY : (typeof (evt.screenY) != 'unknown') ? evt.screenY : evt.sY)
        };

        // Get the target
        var xp = -1;

        if (evtType == eTypes.MOUSE_CLICK || evtType == eTypes.MOUSE_DOWN) {
          var targ = evt.explicitOriginalTarget || evt.originalTarget || evt.target || evt.srcElement;
          if (targ) {
            xp = logger.logXPath(recorder, XPath.getMapping(targ));
          }
        }

        // Get the scroll position
        var scrollPosition = utils.getScroll(recorder.win);

        // Is this a real mouse position event or a scroll event?
        if (typeof rawMouseCoords.x == 'undefined') {
          rawMouseCoords = recorder.lastRawMouseCoords;
        }

        // If this is the first time, this will still be null. So check again.
        if (fs.isDefined(rawMouseCoords)) {
          // Record these mouse coordinates for next time
          recorder.lastRawMouseCoords = rawMouseCoords;

          // Add the scroll position to the coordinates
          var pos = {
            'x': scrollPosition.x + rawMouseCoords.x,
            'y': scrollPosition.y + rawMouseCoords.y
          };

          // Is this an iFrame?
          if (recorder.win !== recorder.win.top) {
            // Check if we're in a cross-domain iFrame
            if (!ctx.isXDRIFrameMode) {
              // We're in a regular iFrame it seems
              // Climb up the DOM to find the real position
              var tf = recorder.win.frameElement,
                tPos = Dom.getPositionRelativeToMainView(tf, Dom.getParentWindow(tf), false);
              if (tPos) {
                pos.x += tPos.x - scrollPosition.x;
                pos.y += tPos.y - scrollPosition.y;
              }
            } else {
              // Cross-domain iFrame mode
              pos.x += recorder.ifrFrameOffset.x - scrollPosition.x;
              pos.y += recorder.ifrFrameOffset.y - scrollPosition.y;
            }
          }

          // Log the position
          logger.log(recorder, evtType, { "ps": pos, "x": xp });
        }
      }
    };

    // The interval for event throttling for things like scrolling
    var winEventThrottleDelay = 250;

    // Only do mouse stuff if it's not a mobile device
    if (!this.browser.isMobile) {
      // Set the target object to watch for mouse movement depending on the browser
      var mouseMoveTarget = this.browser.isIE ? this.recorder.win.document : this.recorder.win;

      // If we're in the top frame, then create a new instance, otherwise merge with the top instance
      if (this.isTop) {
        this.mouseMoveCapture = new EventThrottler(this.recorder, mouseMoveTarget, "record:mousemove", 200, mouseHandler, true);
      } else {
        this.mouseMoveCapture = this.recorder.getTop().eventcap.mouseMoveCapture.merge(this.recorder, mouseMoveTarget, "record:mousemove", mouseHandler, true);
      }

      // Track clicks, mousedowns, and mouseups
      utils.Bind(this.recorder.win.document, "record:mousedown", fs.proxy(function (e) {
        this.mHandler.call(this.ctx, e, null, this.rec, Logger.EVENT_TYPES.MOUSE_CLICK);
      }, { ctx: this, rec: this.recorder, mHandler: mouseHandler }));

    } else {
      // This is a mobile device.
      // Remap mouseHandler
      mouseHandler = null;

      // Make scrolling update faster
      winEventThrottleDelay = 100;

      // Bind to orientation changes
      if (this.isTop) {
        // Exact orientation
        this.lastOrientation = { alpha: 0, beta: 0, gamma: 0 };

        /*
         * Connect to the exact device orientation. Newer iOS only
         */
        utils.Bind(window, "record:deviceorientation", fs.proxy(function (event) {
          if (fs.isDefined(event.alpha)) {
            var a = Math.round(event.alpha),
              b = Math.round(event.beta),
              g = Math.round(event.gamma),
              tol = 10,
              rec = this.recorder;

            if (Math.abs(a - this.lastOrientation.alpha) > tol || Math.abs(b - this.lastOrientation.beta) > tol || Math.abs(g - this.lastOrientation.gamma) > tol) {
              this.lastOrientation.alpha = a;
              this.lastOrientation.beta = b;
              this.lastOrientation.gamma = g;

              rec.getLogger().log(rec, Logger.EVENT_TYPES.ORIENTATION, { "ot": { "a": a, "b": b, "g": g } });
            }
          }
        }, this));

        // Capture orientation changes
        this.doOrientationChange = fs.proxy(function (event) {
          var wdd = this.recorder.win.document.documentElement,
            sz = Dom.getDocSize(this.recorder.doc),
            isLandscape = 0;

          // If orientation is 90 or -90 it is true
          if (Math.abs(window.orientation) > 0) {
            isLandscape = 1;
          }

          this.recorder.getLogger().log(this.recorder, Logger.EVENT_TYPES.ORIENTATION_CHANGE, {
            "ps": utils.getScroll(this.recorder.win),
            "oc": {
              "isL": isLandscape,
              'ww': wdd.clientWidth,
              'wh': wdd.clientHeight,
              "dw": sz.width,
              "dh": sz.height,
              'wiw': window.innerWidth,
              'wih': window.innerHeight
            }
          });
        }, this);

        /*
         * Capture orientation change
         */
        utils.Bind(window, "record:orientationchange", this.doOrientationChange);

        /*
         * Capture orientation change on page load
         */
        this.doOrientationChange();

        // Touch event handler
        var teventhandler = function (evt, subject, rec) {
          // Note: spelled wrong on purpose so it doesn't use a reserved word which google will not shorten.
          var tuches = [];
          if (fs.isDefined(evt.touches)) {
            for (var i = 0; i < evt.touches.length; i++) {
              var t = evt.touches[i];
              tuches.push({ "x": t.pageX, "y": t.pageY });
            }
          }

          // Log the touch events
          rec.getLogger().log(rec, Logger.EVENT_TYPES.TOUCH, { "ts": tuches });
        };

        // The touch events to watch
        var tevents = ["start", "end", "cancel", "leave", "move"],
          touchClbk = function (ctx) {
            return function (evt) {
              teventhandler(evt, "", ctx);
            };
          };

        for (var g = 0; g < tevents.length; g++) {
          /*
           * Do the bindings for each
           */
          utils.Bind(window, "record:touch" + tevents[g], touchClbk(this.recorder));
        }

        /*
         * Set up an emergency save on touchstart
         */
        utils.Bind(window, "record:touchstart", fs.proxy(function () {
          // Trigger an emergency send
          this.EmergencySendRequired.fire();
        }, this.recorder));
      }
    }

    // Capture and then monitor the scroll position
    // Note: we're also handing the event off to the mouse handler because we need to fire a mouse event at that time also
    this.scrollCapture = new EventThrottler(this.recorder, this.recorder.win, "record:scroll", winEventThrottleDelay, function (mhandler) {
      return function (evt, subject, rec) {
        // Should we go ahead with recording the scroll event?
        var recordScrollEvent = true;

        // Stuff for the top frame
        if (rec.win == rec.win.top) {
          // Get Zoom info
          if (Cache._browser.isMobile) {

            // Send all the zoom details
            var sz = Dom.getDocSize(rec.doc),
              z = { "cw": window.innerWidth, "ch": window.innerHeight, "w": sz.width, "h": sz.height },
              info = { "z": z, "ps": utils.getScroll(rec.win) };

            recordScrollEvent = false;

            rec.getLogger().log(rec, Logger.EVENT_TYPES.ZOOM, info);
          } else {
            // Is the mouse handler defined? It wont be if its mobile
            if (mouseHandler) {
              mhandler.call(this, evt, subject, rec);
            }
          }
        }

        /**
         * Should we go ahead with noting the scroll event by itself? We don't do this if we already
         * Recorded a zoom event, which has all the information we need.
         */
        if (recordScrollEvent) {
          // Log the scroll event
          rec.getLogger().log(rec, Logger.EVENT_TYPES.FRAME_SCROLL, { "ps": utils.getScroll(rec.win) });
        }
      };
    }(mouseHandler));

    // If we're in the top frame, track when the user leaves the window with their mouse
    if (this.isTop) {

      // Only do window MouseOver stuff if its not a mobile browser
      if (!this.browser.isMobile) {

        // Desktop browser

        // Make a note that we are moused over the window by default
        this.recorder.isMousedOverWindow = true;

        // Bind to the window mousemove to reactivate the window
        utils.Bind(this.recorder.win.document, "record:mouseover", function (ctx, recorder) {
          return function (e) {
            if (recorder && !recorder.isMousedOverWindow && !(e.relatedTarget || e.fromElement)) {
              recorder.getLogger().log(recorder, Logger.EVENT_TYPES.WINDOW_MOUSEOUT_MOUSEENTER, { "st": 1 });
              recorder.isMousedOverWindow = true;
            }
          };
        }(this, this.recorder));

        // Bind to the window mouseout
        utils.Bind(this.recorder.win.document, "record:mouseout", fs.proxy(function (e) {
          e = e ? e : this.recorder.win.event;
          var recorder = this.recorder, nn, from = e.relatedTarget || e.toElement;
          try {
            if (from) {
              nn = from.nodeName;
            }
          } catch (err) {
          }
          if (recorder && recorder.isMousedOverWindow && (!from || (nn && nn == "HTML"))) {
            recorder.getLogger().log(recorder, Logger.EVENT_TYPES.WINDOW_MOUSEOUT_MOUSEENTER, { "st": 0 });
            recorder.isMousedOverWindow = false;

            // Trigger an emergency send
            recorder.EmergencySendRequired.fire();
          }
        }, this));
      }

      // If we're in the top recorder, track the page size
      // Create a callback function for measuring and comparing the document size
      var pSizeRec = function (ctx) {
        return function () {
          // Measure the document
          var sz = Dom.getDocSize(ctx.doc);
          if (!ctx.docSize || ctx.docSize.width != sz.width || ctx.docSize.height != sz.height) {
            // make a note of it
            ctx.docSize = sz;
            // log it
            ctx.getLogger().log(ctx, Logger.EVENT_TYPES.DOC_SIZE, { "sz": { "w": sz.width, "h": sz.height } });
          }
        };
      }(this.recorder);

      // Call it now
      pSizeRec.apply(this, []);

      // Bind to the DomUpdated event
      this.recorder.DomUpdated.subscribe(pSizeRec);

      // Free it
      pSizeRec = null;
    }

    // Free up the mouse handler reference
    mouseHandler = null;
  };

  /**
   * The maximum amount of time we wait for 'updateNodeBinding()' to execute
   * @type {Number}
   */
  Capture.MAX_UPDATE_NODE_BINDING_EXECUTION_TIME = 500;

  /**
   * Does a selective re-binding to new DOM contents
   * @param tNode {HTMLElement} The HTML Node to focus on.
   * @param include_tNode {boolean} If true, updates tNode and tNode's children. Otherwise it only updates tNode's children.
   * @param skipNodeSpecificBinding {boolean} should we skip setNodeSpecificBinding?
   */
  Capture.prototype.updateNodeBinding = function (tNode, include_tNode, skipNodeSpecificBinding) {

    // Track how long this function call is taking
    var start_time = +(new Date());

    // Re-bind to all form fields, preventing double-binding
    var inodes = tNode.querySelectorAll("input, select, textarea");

    // Quickreference the collection of input captures
    var capcollection = this.inputCaptures;

    // Re-bind to reset buttons - prevent double binding
    var clkClbk = function (capcol) {
      return function () {
        setTimeout(fs.proxy(function () {
          for (var i = 0; i < this.length; i++)
            this[i].serialize();
        }, capcol), 1);
      };
    };

    // Loop over them all and make sure all the inputs are bound
    for (var i = inodes.length - 1; i >= 0; i--) {

      // Cancel updateNodeBindings if it has taken over 500ms
      if ((utils.now() - start_time) > Capture.MAX_UPDATE_NODE_BINDING_EXECUTION_TIME) {

        // Log to the eventstream that we missed binding some inputs

        /* pragma:DEBUG_START */
        console.log("record: Canceling updateNodeBindings due to poor performance.");
        /* pragma:DEBUG_END */

        this.recorder.logger.log(
          this.recorder,
          Logger.EVENT_TYPES.INCOMPLETE_INPUT_CAPTURE,
          {}
        );
        break;
      }

      var qnode = inodes[i];
      if (!qnode._fsrTracker) {
        // Set up a new input capture for the new input
        capcollection[capcollection.length] = new InputCapture(this.recorder, qnode);

        if (qnode.getAttribute("type") == "reset") {
          utils.Bind(qnode, "record:click", clkClbk(capcollection));
        }
      } else {
        for (var j = capcollection.length - 1; j >= 0; j--) {
          var capture_elem = capcollection[j];
          if (capture_elem.input == qnode && capture_elem.hasChanged()) {
            capture_elem.serialize();
            break;
          }
        }
      }
      qnode = null;
    }
    // Update the dom manipulation captures
    if (!skipNodeSpecificBinding && this.browser.isIE) {
      this.mutation.setNodeSpecificBindings(tNode, include_tNode);
    }

    // Free up the nodes list
    inodes = null;
    capcollection = null;
    tNode = null;
  };

  /**
   * Dispose of the object
   */
  Capture.prototype.dispose = function () {
    this.mutation.dispose();
    this.mutation = null;
    this.recorder = null;
    this.inputCaptures = null;
    this.inputReserialize = null;
    var t = EventThrottle._trackers, i;
    for (i = 0; i < t.length; i++) {
      t[i].dispose();
      t.splice(i--, 1);
    }
    var tpy = _inputCaptureList;
    for (i = 0; i < tpy.length; i++) {
      tpy[i].dispose();
      tpy.splice(i--, 1);
    }
  };

})();