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
fs.require("rec.Capture.Mutation");
fs.require("rec.Capture.EventThrottle");
fs.require("rec.Capture.Dom");
fs.require("rec.Capture.InputCapture");

(function () {

  /**
   * Captures interaction on the page
   * @param browser {Browser} Browser info
   * @param config {Object} Configuration
   * @param isXDRIFrameMode {Bool} Are we in a cross-domain iFrame?
   * @param isTop {Bool} Is this the top recorder?
   * @param fr {Window} Which frame to watch
   * @param masker {Masker} The Masker instance
   * @param worker {Worker} The web worker controller
   * @param ctxPath {Array} The context xpath for everything
   * @param urlmd5 {String} The MD5 of the URL
   */
  var Capture = function (browser, config, isXDRIFrameMode, isTop, fr, masker, worker, recorder, ctxPath, urlmd5, domTree, sessionInfo) {
    var hidden,
      visibilityChange,
      tevents,
      i,
      mouseMoveTarget;

    // Assign props
    fs.ext(this, {
      config: config,
      masker: masker,
      worker: worker,
      browser: browser,
      rec: recorder,
      urlmd5: urlmd5,
      recTop: recorder.getTop(),
      ctx: ctxPath || 0,
      isXDRIFrameMode: isXDRIFrameMode,
      isTop: isTop,
      fr: fr,
      _framesBeingTracked: [],
      isMousedOverPage: true,
      lastOrientation: { alpha: 0, beta: 0, gamma: 0 },
      lastSizes: {},
      sessionInfo: sessionInfo,
      tree: domTree || new DomTree()
    }, false);

    // Scan the document
    this.tree.scan(fr.document.documentElement);

    // Set up the input scanner
    this.inputCap = new InputCapture(masker, worker, recorder, this.tree);

    // Input the masking targets
    Mutation.markTreeMaskingChanges(this.tree, masker.getCurrentMaskingTargets(), this.ctx, []);

    // Serialize the doc
    this._serializeDom();

    // Set up the mutation watcher
    this.mutation = new Mutation(fr, config, masker, worker, function (nodes) {
      // New nodes to scan!
      // Scan for inputs
      this.inputCap.scanForInputs(nodes);

      // Scan for iframes
      this.scanForIframes(nodes);
    }.bind(this), ctxPath, this.inputCap, urlmd5, this.tree);

    // Scan for inputs
    this.inputCap.scanForInputs([fr.document.body]);

    // Some stuff we only do in the top frame
    if (isTop) {
      var pageHiddenKeys = this._getHiddenKeys();

      // Handle page visibility change
      this.rec.bind(window, pageHiddenKeys.visibilityChange, function (e) {
        this.worker.queueAction(EVENT_TYPES.PAGE_VISIBLE, {
          "ctx": 0,
          "v": !document[pageHiddenKeys.hidden]
        });
      }.bind(this));

      // Mouse leave / enter window
      this.rec.bind(recorder.win.document, "mouseout", function (e) {
        if (this.isMousedOverPage) {
          var from = e.relatedTarget || e.toElement,
            rectop = this.recTop,
            mmc = this.mouseMoveCapture;

          if (mmc && (!from || from.nodeName === "HTML")) {
            mmc.trigger();
            // stop your drag event here
            // for now we can just use an alert
            this.isMousedOverPage = false;
            this.worker.queueAction(EVENT_TYPES.WINDOW_MOUSEOUT_MOUSEENTER, {
              "ctx": 0,
              "v": false
            });
            // Signal an emergency
            this.worker.emergency();
          }
        }
      }.bind(this));
      this.rec.bind(recorder.win.document, "mouseenter", function (e) {
        if (!this.isMousedOverPage) {
          this.isMousedOverPage = true;
          this.worker.queueAction(EVENT_TYPES.WINDOW_MOUSEOUT_MOUSEENTER, {
            "ctx": 0,
            "v": true
          });
        }
      }.bind(this));

      // Capture and then monitor the window size
      this.sizeCapture = new EventThrottle(recorder.win, recorder.getBindNS() + ":resize", 750, function (evt, subject) {
        var recorder = this.rec,
          vsp = Dom.getViewportSizePos(recorder.win);

        if (this.lastSizes.lw !== vsp.lw || this.lastSizes.lh !== vsp.lh) {
          // Log the frame size
          this.worker.queueAction(EVENT_TYPES.FRAME_SIZE, {
            "ctx": 0,
            "w": vsp.lw,
            "h": vsp.lh,
            "vw": vsp.vw,
            "vh": vsp.vh
          });
          this.lastSizes.lw = vsp.lw;
          this.lastSizes.lh = vsp.lh;
        }

        if (this.lastSizes.pw !== vsp.pw || this.lastSizes.ph !== vsp.ph) {
          // Log the document size
          this.worker.queueAction(EVENT_TYPES.DOC_SIZE, {
            "ctx": 0,
            "w": vsp.pw,
            "h": vsp.ph
          });
          this.lastSizes.pw = vsp.pw;
          this.lastSizes.ph = vsp.ph;
        }

        // emit zoom messages if required
        this._handleScroll(evt, true);
      }.bind(this));
    }

    // Errors
    this.rec.bind(recorder.win, "error", function (e) {
      // This will fire for all kinds of errors
      if (e.message) {
        // Log the error
        this.worker.queueAction(EVENT_TYPES.JAVASCRIPT_ERROR, {
          "ctx": this.ctx,
          "v": e.message,
          "l": e.lineno,
          "cl": e.colno,
          "s": e.source,
          "st": e.error && e.error.stack
        });
      } else {
        // Handle other kinds of errors
        var targ = e.target;
        if (targ) {
          this.worker.queueAction(EVENT_TYPES.ASSET_ERROR, {
            "ctx": this.ctx,
            "tg": this.tree.get(targ).id,
            "a": this.tree.get(targ).a,
            "ts": e.timeStamp
          });
        }
      }
    }.bind(this));

    // Only do mouse stuff if it's not a mobile device
    if (!browser.isMobile) {
      // Set the target object to watch for mouse movement depending on the browser
      mouseMoveTarget = browser.isIE ? recorder.win.document : recorder.win;

      // If we're in the top frame, then create a new instance, otherwise merge with the top instance
      if (isTop) {
        this.mouseMoveCapture = new EventThrottle(mouseMoveTarget, this.rec.getBindNS() + ":mousemove", 150, this._handleMouseEvents.bind(this));
      } else {
        this.mouseMoveCapture = this.recTop.cap.mouseMoveCapture.merge(mouseMoveTarget, this.rec.getBindNS() + ":mousemove", this, true);
      }

      // Track clicks, mousedowns, and mouseups
      this.rec.bind(recorder.win.document, "mousedown", function (e) {
        if (!this.mouseMoveCapture) return;
        // force any throttle-delayed mouse move to trigger right now
        // this will increase the accuracy lastMousePosition
        this.mouseMoveCapture.trigger();

        var node = this.tree.get(e.target);
        var lmp = this.recTop.cap.lastMousePosition;
        if (lmp) {
          this.worker.queueAction(EVENT_TYPES.MOUSE_DOWN, {
            "ctx": 0,
            "x": Math.round(lmp.x),
            "y": Math.round(lmp.y),
            "id": node && node.id
          });
          // Signal an emergency
          this.worker.emergency();
        }
      }.bind(this));

      this.rec.bind(recorder.win.document, "mouseup", function (e) {
        // force any throttle-delayed mouse move to trigger right now
        // this will increase the accuracy lastMousePosition
        this.mouseMoveCapture.trigger();

        var node = this.tree.get(e.target);
        var lmp = this.recTop.cap.lastMousePosition;
        if (lmp) {
          this.worker.queueAction(EVENT_TYPES.MOUSE_UP, {
            "ctx": 0,
            "x": Math.round(lmp.x),
            "y": Math.round(lmp.y),
            "id": node && node.id
          });
        }
      }.bind(this));

      this.rec.bind(recorder.win.document, "click", function (e) {
        // force any throttle-delayed mouse move to trigger right now
        // this will increase the accuracy lastMousePosition
        this.mouseMoveCapture.trigger();

        var node = this.tree.get(e.target);
        var lmp = this.recTop.cap.lastMousePosition;
        if (lmp) {
          this.worker.queueAction(EVENT_TYPES.MOUSE_CLICK, {
            "ctx": 0,
            "x": Math.round(lmp.x),
            "y": Math.round(lmp.y),
            "id": node && node.id
          });
        }
      }.bind(this));
    }

    // many desktop devices have touch support these days, so we listen on all platforms
    // The touch events to watch
    tevents = ["start", "end", "cancel", "leave", "move"];

    for (i = 0; i < tevents.length; i++) {
      // Bind to each kind of touch event
      // Note the passive: true to ensure good scrolling performance on mobile
      this.rec.bind(recorder.win.document, "touch" + tevents[i], function (evttype) {
        return function (e) {
          this._handleTouchEvents(e, evttype);
        };
      }(tevents[i]).bind(this), { passive: true });
    }

    // Top frame stuff
    if (isTop) {
      // Device orientation
      // TODO: commenting this out because so far we don't use it for anything and it
      // just makes replays larger
      // this.orientationCapture = new EventThrottle(this.rec.win, this.rec.getBindNS() + ":deviceorientation", 250, function (event) {
      //   if (fs.isDefined(event.alpha)) {
      //     var a = Math.round(event.alpha),
      //       b = Math.round(event.beta),
      //       g = Math.round(event.gamma),
      //       lor = this.lastOrientation,
      //       tol = 10;

      //     if (Math.abs(a - lor.alpha) > tol || Math.abs(b - lor.beta) > tol || Math.abs(g - lor.gamma) > tol) {
      //       lor.alpha = a;
      //       lor.beta = b;
      //       lor.gamma = g;

      //       this.worker.queueAction(EVENT_TYPES.ORIENTATION, {
      //         "ctx": 0,
      //         "ota": a,
      //         "otb": b,
      //         "otg": g
      //       });
      //     }
      //   }
      // }.bind(this));

      // Capture major orientation changes (landscape / portrait)
      var doOrientationChange = function (event) {
        var rec = this.rec,
          isLandscape = false,
          vsp = Dom.getViewportSizePos(rec.win);

        // If orientation is 90 or -90 it is true
        if (rec.win.orientation >= -90 && rec.win.orientation <= 90) {
          isLandscape = true;
        }

        // Signal an orientation event
        this.worker.queueAction(EVENT_TYPES.ORIENTATION_CHANGE, {
          "ctx": 0,
          "x": vsp.vx,
          "y": vsp.vy,
          "isL": isLandscape,
          "lw": vsp.lw,
          "lh": vsp.lh,
          "pw": vsp.pw,
          "ph": vsp.ph,
          "vw": vsp.vw,
          "vh": vsp.vh
        });
        this.lastSizes.vw = vsp.vw;
        this.lastSizes.vh = vsp.vh;
        this.lastSizes.lw = vsp.lw;
        this.lastSizes.lh = vsp.lh;
      }.bind(this);

      // Capture orientation change
      this.rec.bind(this.rec.win, "orientationchange", doOrientationChange);

    }

    if (isTop && window.visualViewport) {
      // in browsers supporting visualViewport, there is inert visual viewport implemented
      // which means the visual viewport may scroll independantly of the main layout viewport
      // so window.scroll might not fire. Thankfully the viewport also has a scroll event
      // that *does* fire
      this.rec.bind(window.visualViewport, "resize", this._handleScroll.bind(this));
      this.rec.bind(window.visualViewport, "scroll", this._handleScroll.bind(this));
    }

    // Scroll capture
    this.rec.bind(fr, "scroll", this._handleScroll.bind(this));

    /* pragma:DEBUG_START */
    console.log("sr: " + (fr === window.top ? '' : '[frm] ') + "capture init on", fr);
    /* pragma:DEBUG_END */

    // Scan for iFrames
    this.scanForIframes([fr.document.body]);
  };

  /**
   * Get the page visible/hidden keys
   */
  Capture.prototype._getHiddenKeys = function () {
    // hidden - the browser-specific property for page visibility
    // visibilityChange - browser specific event name
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }
    return {
      hidden: hidden,
      visibilityChange: visibilityChange
    };
  };

  /**
   * Do the actual serializing of the DOM.
   * @private
   */
  Capture.prototype._serializeDom = function () {
    var doc = this.fr.document,
      config = this.config,
      br = this.browser.browser,
      screenRes = utils.getScreenResolution(),
      vsp = Dom.getViewportSizePos(this.fr),
      url = this.fr.location.href.toString(),
      urlmd5 = utils.md5(url),
      pageHiddenKeys = this._getHiddenKeys(),
      isLandscape = false;

    // Keep track of the url md5
    this.urlmd5 = urlmd5;

    // keep copy of previous sizes to reduce event spam
    this.lastSizes = vsp;

    // If orientation is 90 or -90 it is true
    if (this.fr.orientation >= -90 && this.fr.orientation <= 90) {
      isLandscape = true;
    }

    // Serialize the DOM
    this.worker.queueAction(EVENT_TYPES.PAGE_MARKER, {
      "ctx": this.ctx,
      "parent": this.rec.recordParent ? this.rec.recordParent.instancePath : this.ctx,
      "dt": Dom.getDocType(this.browser, doc),
      "doc": JSON.parse(JSON.stringify(this.tree.get(doc.documentElement))),
      "url": url,
      "urlmd5": urlmd5,
      "v": this.browser.agent,
      "start": fs.startTS,
      "tz": new Date().getTimezoneOffset(),
      "domloadtime": utils.now() - fs.startTS,
      "cid": config.clientId,
      "f": document.referrer.toString(),
      "t": this.fr.document.title,
      "bn": br.name,
      "bv": br.version,
      // device size
      "dw": screenRes.w,
      "dh": screenRes.h,
      // page viewport
      "pw": vsp.pw,
      "ph": vsp.ph,
      // layout viewport
      "lw": vsp.lw,
      "lh": vsp.lh,
      // visual viewport
      "vw": vsp.vw,
      "vh": vsp.vh,
      "landscape": isLandscape,
      "mobile": this.browser.isMobile,
      "whiteListMode": this.masker.piiObj.useWhiteListing,
      "sid": this.sessionInfo[SESSION_SYMBOLS.SESSIONID],
      "gid": this.sessionInfo[SESSION_SYMBOLS.GLOBALSESSIONID],
      "vs": !document[pageHiddenKeys.hidden],
      "scroll": { x: vsp.vx, y: vsp.vy }
    });
  };

  /**
   * Process scroll capturing
   */
  Capture.prototype._handleScroll = function (evt, zoom) {
    if (!this.rec) return; // already disposed

    var targ = evt.target,
      pos = {
        'x': targ.scrollLeft,
        'y': targ.scrollTop
      },
      win = this.rec.win,
      rectop = this.recTop,
      lastRawMouse,
      topPos,
      vsp;

    if (targ === win.document || targ === win.visualViewport || zoom) {
      vsp = Dom.getViewportSizePos(win);

      // Do mobile zoom
      if (win === win.top && (this.lastSizes.vw !== vsp.vw || this.lastSizes.vh !== vsp.vh)) {
        // Send all the zoom details
        this.worker.queueAction(EVENT_TYPES.ZOOM, {
          "ctx": 0,

          // visual viewport dimensions
          "vw": vsp.vw,
          "vh": vsp.vh,

          // layout viewport dimentions
          "lw": vsp.lw,
          "lh": vsp.lh,
        });

        // remember this so we don't spam events
        this.lastSizes.vw = vsp.vw;
        this.lastSizes.vh = vsp.vh;
      }

      if (this.lastSizes.vx !== vsp.vx || this.lastSizes.vy !== vsp.vy) {
        // Log the position of the visual viewport
        this.worker.queueAction(EVENT_TYPES.FRAME_SCROLL, {
          "ctx": this.rec.getPath(),
          "x": vsp.vx,
          "y": vsp.vy
        });
        this.lastSizes.vx = vsp.vx;
        this.lastSizes.vy = vsp.vy;
      }

      // The last mouse position
      if (rectop.cap && this.isMousedOverPage) {
        lastRawMouse = rectop.cap._lastUnscrolledMouse;
        lastMouse = rectop.cap.lastMousePosition;

        if (lastRawMouse) {
          topPos = utils.getScroll(rectop.win);

          // don't spam unecessary msgs
          if (
            (lastRawMouse.x + topPos.x) !== lastMouse.x ||
            (lastRawMouse.y + topPos.y) !== lastMouse.y
          ) {
            // Log the mouse move
            this.worker.queueAction(EVENT_TYPES.MOUSE_MOVE, {
              "ctx": 0,
              "x": Math.round(lastRawMouse.x + topPos.x),
              "y": Math.round(lastRawMouse.y + topPos.y)
            });
          }
        }
      }
    } else {
      // Log the position
      this.worker.queueAction(EVENT_TYPES.SCROLL_EL, {
        "ctx": this.rec.getPath(),
        "id": this.tree.get(targ).id,
        "x": Math.round(pos.x),
        "y": Math.round(pos.y)
      });
    }
  };

  /**
   * Process touch events
   */
  Capture.prototype._handleTouchEvents = function (evt, subject) {
    // return early if already disposed of
    if (!this.rec) return;

    // Note: spelled wrong on purpose so it doesn't use a reserved word which google will not shorten.
    var tuches = [],
      i,
      t,
      node;

    if (fs.isDefined(evt.touches)) {
      for (i = 0; i < evt.touches.length; i++) {
        t = evt.touches[i];
        node = this.tree.get(t.target);
        var x = Math.round(t.pageX);
        var y = Math.round(t.pageY);

        // If we are inside an iframe, correct the coordinates to be
        // relative to the top page and not the iframe's page
        if (this.recTop !== this.rec) {
          var tf = this.rec.win.frameElement,
            tPos = Dom.getPositionRelativeToMainView(tf, Dom.getParentWindow(tf), false),
            scrollPos = utils.getScroll(this.rec.win);
          if (tPos) {
            x += tPos.x - scrollPos.x;
            y += tPos.y - scrollPos.y;
          }
        }

        tuches.push({
          "n": t.identifier,
          "x": x,
          "y": y,
          "id": node && node.id
        });
      }
    }

    this.worker.queueAction(EVENT_TYPES.TOUCH, {
      "ctx": 0,
      "ts": tuches,
      "et": subject
    });

    // Update scroll on end
    if (subject === "end" || tuches.length > 1) {
      this._handleScroll(evt, true);
    }

    if (subject === "end") {
      this.worker.emergency();
    }
  };

  /**
   * Process mouse events and scroll events
   */
  Capture.prototype._handleMouseEvents = function (evt, subject, altrec) {
    // Don't bother if we are not moused over the page
    if (!this.isMousedOverPage || !evt) {
      return;
    }

    // Get a reference to a generic mouse coordinate object that we'll use several times
    var rawMouseCoords = {
      "x": (typeof (evt.clientX) != 'undefined' ? evt.clientX : (typeof (evt.screenX) != 'undefined') ? evt.screenX : evt.sX),
      "y": (typeof (evt.clientY) != 'undefined' ? evt.clientY : (typeof (evt.screenY) != 'undefined') ? evt.screenY : evt.sY)
    },
      recorder = !!altrec ? altrec.rec : this.rec;

    if (!recorder) {
      // already been disposed of
      return;
    }

    // Get the scroll position
    var scrollPosition = utils.getScroll(recorder.win);

    // Add the scroll position to the coordinates
    var pos = {
      "x": scrollPosition.x + rawMouseCoords.x,
      "y": scrollPosition.y + rawMouseCoords.y
    };

    // The last unscrolled mouse position
    this._lastUnscrolledMouse = rawMouseCoords;

    // Is this an iFrame?
    if (altrec) {
      // Check if we're in a cross-domain iFrame
      if (!altrec.isXDRIFrameMode) {
        // We're in a regular iFrame it seems
        // Climb up the DOM to find the real position
        var tf = recorder.win.frameElement,
          tPos = Dom.getPositionRelativeToMainView(tf, Dom.getParentWindow(tf), false),
          topFramePos = utils.getScroll(this.recTop.win);
        if (tPos) {
          pos.x += tPos.x - scrollPosition.x;
          pos.y += tPos.y - scrollPosition.y;
        }
        this._lastUnscrolledMouse = fs.ext({}, pos);
        this._lastUnscrolledMouse.x -= topFramePos.x;
        this._lastUnscrolledMouse.y -= topFramePos.y;
      } else {
        // Cross-domain iFrame mode
        pos.x += recorder.ifrFrameOffset.x - scrollPosition.x;
        pos.y += recorder.ifrFrameOffset.y - scrollPosition.y;
      }
    }

    if (
      this.recTop.cap.lastMousePosition &&
      pos.x === this.recTop.cap.lastMousePosition.x &&
      pos.y === this.recTop.cap.lastMousePosition.y
    ) {
      // ignore redundant events
      return;
    }

    // Keep track of the mouse
    this.recTop.cap.lastMousePosition = pos;

    // Log the mouse move
    this.worker.queueAction(EVENT_TYPES.MOUSE_MOVE, {
      "ctx": 0,
      "x": Math.round(pos.x),
      "y": Math.round(pos.y)
    });
  };

  /**
   * Get the frame window
   */
  Capture.prototype.getFrameWindow = function (frameNode) {
    // In IE8 there is a special case where frameNode.contentWindow.top refers to itself. Return null in this case.
    var frameWindow;
    if (frameNode && frameNode.contentWindow) {
      frameWindow = frameNode.contentWindow;
    } else if (frameNode && frameNode.contentDocument && frameNode.contentDocument.defaultView) {
      frameWindow = frameNode.contentDocument.defaultView;
    }
    return (frameWindow && frameWindow != frameWindow.top) ? frameWindow : null;
  };

  /**
   * See if the iFrame is in the same origin
   */
  Capture.prototype.testFrameOrigin = function (frameNode, hostName) {
    if (frameNode.getAttribute("srcdoc") && !frameNode.getAttribute("src")) {
      // allow iframes built with srcdoc
      return true;
    }

    var srcAttr = frameNode.getAttribute("src");
    if (!srcAttr) {
      return false;
    }
    // Array containing bad iFrame sources
    // Javascript: is not a valid source, it is used to create a blank iframe in IE
    // shim.gif is a foresee control, having problems trying to capture it, so block

    /* jshint ignore:start */
    var blockedSources = ['javascript:', 'about:blank'],
      i;
    for (i = 0; i < blockedSources.length; i++) {
      if (srcAttr.indexOf(blockedSources[i]) > -1) {
        return false;
      }
    }
    /* jshint ignore:end */

    // Return false if no src attribute present or src starts with whitespace
    if (!srcAttr || srcAttr.indexOf(" ") === 0) {
      return false;
    }

    // Get the source of the iFrame
    var iFrameSrc = frameNode.src;

    return utils.testSameDomain(hostName || window.location.href, iFrameSrc);
  };

  /**
   * Bind to a Frame once it loads
   */
  Capture.prototype.bindToFrame = function (frm, winRef) {
    var frmrec;

    // Create a new recorder
    winRef.__fsrec__ = frmrec = new Recorder(this.rec.stg, this.rec.browser, winRef, this.tree.get(frm).id, this.rec, this.rec.config, this.tree, this.rec.isIframeMode);

    // make sure on frame navigation that we record the navigation
    this.rec.bind(winRef, "unload", function () {
      // needs to be in next tick or document will be null and there
      fs.nextTick(function () {
        // make sure we dispose of old record for this frame
        frmrec.dispose();

        // remove tracked status
        delete winRef.__fsrec__;
        this._framesBeingTracked.splice(this._framesBeingTracked.indexOf(frm), 1);


        // re-bind to frame
        this.scanForIframes([frm.parentNode]);
      }.bind(this));
    }.bind(this), true);
  };

  /**
   * Scan for untracked iframes
   */
  Capture.prototype.scanForIframes = function (nds) {
    var frms,
      i,
      j,
      fwn,
      elsToDealWith,
      elsBeingTracked = this._framesBeingTracked;

    for (i = 0; i < nds.length; i++) {
      frms = nds[i].querySelectorAll("iframe");
      if (frms.length > 0) {
        /* jshint ignore:start */
        elsToDealWith = Array.prototype.filter.call(frms, function (el) {
          return elsBeingTracked.indexOf(el) == -1;
        });
        /* jshint ignore:end */
        for (j = 0; j < elsToDealWith.length; j++) {
          elsBeingTracked.push(elsToDealWith[j]);
          // Bind to it!
          fwn = this.getFrameWindow(elsToDealWith[j]);
          if (this.testFrameOrigin(elsToDealWith[j]) && !fwn.__fsrec__) {
            if (fwn.document.readyState === "complete" || fwn.document.readyState === "interactive") {
              // Do it now
              fs.nextTick(function (ifr, wobj) {
                return function () {
                  this.bindToFrame(ifr, wobj);
                };
              }(elsToDealWith[j], fwn).bind(this));
            } else {
              // Wait for onload
              utils.BindOnce(fwn, this.rec.getBindNS() + ":load", function (ifr, wobj) {
                return function () {
                  this.bindToFrame(ifr, wobj);
                };
              }(elsToDealWith[j], fwn).bind(this));
            }
          }
        }
      }
    }
  };

  /**
   * Dispose of the object
   */
  Capture.prototype.dispose = function () {
    var node;

    this.mutation.dispose();
    if (this.mouseMoveCapture && this.recTop === this.rec) {
      this.mouseMoveCapture.dispose();
      delete this.mouseMoveCapture;
    }
    if (this.orientationCapture) {
      this.orientationCapture.dispose();
      delete this.orientationCapture;
    }
    if (this.sizeCapture) {
      this.sizeCapture.dispose();
      delete this.sizeCapture;
    }
    if (this.inputCap) {
      this.inputCap.dispose();
      delete this.inputCap;
    }

    // Remove document from the tree and inform the worker about it
    var root = this.tree.get(this.fr.document.documentElement);
    if (root) {
      this.tree.remove(this.fr.document.documentElement);
      this.worker.queueAction(EVENT_TYPES.MOD_LIST, [{
        e: EVENT_TYPES.NODE_REMOVED,
        d: {
          "ctx": this.ctx,
          "id": root.id
        }
      }]);
    }

    delete this.rec;
  };

})();