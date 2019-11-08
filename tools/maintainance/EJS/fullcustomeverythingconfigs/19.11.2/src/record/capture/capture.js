/**
 * cxRecord Capture
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, ext, isDefined, nextTick, startTS } from "../../fs/index";
import {
  BindOnce,
  getScroll,
  getScreenResolution,
  now as currentTime,
  testSameDomain,
} from "../../utils/utils";
import { EVENT_TYPES } from "./actions";
import { Dom } from "./dom";
import { DomTree } from "./domtree";
import { EventThrottle } from "./eventthrottle";
import { InputCapture } from "./inputcapture";
import { Mutation } from "./mutation";

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
 */
class Capture {
  constructor(
    browser,
    config,
    isXDRIFrameMode,
    isTop,
    fr,
    masker,
    worker,
    recorder,
    ctxPath,
    domTree
  ) {
    let i;
    let mouseMoveTarget;

    // Assign props
    ext(
      this,
      {
        config,
        masker,
        worker,
        browser,
        rec: recorder,
        recTop: recorder.getTop(),
        ctx: ctxPath || 0,
        isXDRIFrameMode,
        isTop,
        fr,
        _framesBeingTracked: [],
        isMousedOverPage: true,
        lastOrientation: { alpha: 0, beta: 0, gamma: 0 },
        lastSizes: {},
        tree: domTree || new DomTree(),
      },
      false
    );

    // Scan the document
    this.tree.scan(fr.document.documentElement);

    // Set up the input scanner
    this.inputCap = new InputCapture(masker, worker, recorder, this.tree);

    // Serialize the doc
    this._serializeDom();

    // Set up the mutation watcher
    this.mutation = new Mutation(
      fr,
      config,
      masker,
      worker,
      nodes => {
        // New nodes to scan!
        // Scan for inputs
        this.inputCap.scanForInputs(nodes);

        // Scan for iframes
        this.scanForIframes(nodes);
      },
      ctxPath,
      this.inputCap,
      this.tree
    );

    // Scan for inputs
    this.inputCap.scanForInputs([fr.document.body]);

    // Some stuff we only do in the top frame
    if (isTop) {
      const pageHiddenKeys = this._getHiddenKeys();

      // Handle page visibility change
      this.rec.bind(window, pageHiddenKeys.visibilityChange, () => {
        this.worker.queueAction(EVENT_TYPES.PAGE_VISIBLE, {
          /**
           * Frame this applies to. Always 0 for the whole page.
           * @type {0}
           */
          ctx: 0,

          /**
           * Whether or not the document is visible
           * @type {boolean}
           */
          v: !document[pageHiddenKeys.hidden],
        });
      });

      // Mouse leave / enter window
      this.rec.bind(recorder.win.document, "mouseout", e => {
        if (this.isMousedOverPage) {
          const from = e.relatedTarget || e.toElement;
          const mmc = this.mouseMoveCapture;

          if (mmc && mmc.trigger && (!from || from.nodeName === "HTML")) {
            mmc.trigger();
            // stop your drag event here
            // for now we can just use an alert
            this.isMousedOverPage = false;
            this.worker.queueAction(EVENT_TYPES.WINDOW_MOUSEOUT_MOUSEENTER, {
              /**
               * Frame this applies to. Always 0 for whole page.
               * @type {0}
               */
              ctx: 0,

              /**
               * Whether the mouse is on the page (true) or not (false).
               * @type {boolean}
               */
              v: false,
            });
          }
        }
      });
      this.rec.bind(recorder.win.document, "mouseenter", () => {
        if (!this.isMousedOverPage) {
          this.isMousedOverPage = true;
          this.worker.queueAction(EVENT_TYPES.WINDOW_MOUSEOUT_MOUSEENTER, {
            /**
             * Frame this applies to. Always 0 for whole page.
             * @type {0}
             */
            ctx: 0,

            /**
             * Whether the mouse is on the page (true) or not (false).
             * @type {boolean}
             */
            v: true,
          });
        }
      });

      // Capture and then monitor the window size
      this.sizeCapture = new EventThrottle(
        recorder.win,
        `${recorder.getBindNS()}:resize`,
        750,
        evt => {
          const recorder = this.rec;
          const vsp = Dom.getViewportSizePos(recorder.win);

          if (this.lastSizes.lw !== vsp.lw || this.lastSizes.lh !== vsp.lh) {
            // Log the frame size
            this.worker.queueAction(EVENT_TYPES.FRAME_SIZE, {
              /**
               * Frame id, always 0 for whole page.
               * @type {0}
               */
              ctx: 0,

              /**
               * Layout width in CSS pixels (aka clientWidth)
               * @type {number}
               */
              w: vsp.lw,

              /**
               * Layout height in CSS pixels (aka clientHeight)
               * @type {number}
               */
              h: vsp.lh,

              /**
               * Visual viewport width in CSS pixels
               * @type {number}
               */
              vw: vsp.vw,

              /**
               * Visual viewport height in CSS pixels
               * @type {number}
               */
              vh: vsp.vh,
            });
            this.lastSizes.lw = vsp.lw;
            this.lastSizes.lh = vsp.lh;
          }

          if (this.lastSizes.pw !== vsp.pw || this.lastSizes.ph !== vsp.ph) {
            // Log the document size
            this.worker.queueAction(EVENT_TYPES.DOC_SIZE, {
              /**
               * Frame id, always 0 for whole page.
               * @type {0}
               */
              ctx: 0,

              /**
               * Width of the entire page in CSS pixels
               * @type {number}
               */
              w: vsp.pw,

              /**
               * Height of the entire page in CSS pixels
               * @type {number}
               */
              h: vsp.ph,
            });
            this.lastSizes.pw = vsp.pw;
            this.lastSizes.ph = vsp.ph;
          }

          // emit zoom messages if required
          this._handleScroll(evt, true);
        }
      );
    }

    // Errors
    this.rec.bind(recorder.win, "error", e => {
      this.recordedErrors = (this.recordedErrors || 0) + 1;
      if (this.recordedErrors > 50) {
        // don't flood the recording with thousands of errors please
        return;
      }

      // This will fire for all kinds of errors
      if (e.message) {
        // Log the error
        this.worker.queueAction(EVENT_TYPES.JAVASCRIPT_ERROR, {
          /**
           * Frame id the error occurred in
           * @type {number}
           */
          ctx: this.ctx,

          /**
           * Message of the error
           * @type {string?}
           */
          v: e.message,

          /**
           * Line number error happened on
           * @type {number?}
           */
          l: e.lineno,

          /**
           * Column number error happened at
           * @type {number?}
           */
          cl: e.colno,

          /**
           * Source file for the error
           * @type {string?}
           */
          s: e.source,

          /**
           * Stack trace for the error if available
           * @type {string?}
           */
          st: e.error && e.error.stack,
        });
      } else {
        // Handle other kinds of errors
        const targ = e.target;
        if (targ) {
          const node = this.tree.get(targ);
          this.worker.queueAction(EVENT_TYPES.ASSET_ERROR, {
            /**
             * Frame id the error occurred in
             * @type {number}
             */
            ctx: this.ctx,

            /**
             * DomTree node id of the element if known whose
             * asset failed to load if known.
             * @type {number?}
             */
            tg: node && node.id,

            /**
             * Attributes of the dom node whose asset failed to load.
             * @type {object?}
             */
            a: node && node.a,

            /**
             * Unix timestamp that the error happened.
             * @type {number}
             */
            ts: e.timeStamp,
          });
        }
      }
    });

    // Only do mouse stuff if it's not a mobile device
    if (!browser.isMobile) {
      // Set the target object to watch for mouse movement depending on the browser
      mouseMoveTarget = browser.isIE ? recorder.win.document : recorder.win;

      // If we're in the top frame, then create a new instance, otherwise merge with the top instance
      if (isTop) {
        this.mouseMoveCapture = new EventThrottle(
          mouseMoveTarget,
          `${this.rec.getBindNS()}:mousemove`,
          150,
          this._handleMouseEvents.bind(this)
        );
      } else {
        this.mouseMoveCapture = this.recTop.cap.mouseMoveCapture.merge(
          mouseMoveTarget,
          `${this.rec.getBindNS()}:mousemove`,
          this,
          true
        );
      }

      // Track clicks, mousedowns, and mouseups
      this.rec.bind(recorder.win.document, "mousedown", e => {
        if (!this.mouseMoveCapture) return;
        // force any throttle-delayed mouse move to trigger right now
        // this will increase the accuracy lastMousePosition
        this.mouseMoveCapture.trigger();

        const node = this.tree.get(e.target);
        const lmp = this.recTop.cap.lastMousePosition;
        if (lmp) {
          this.worker.queueAction(EVENT_TYPES.MOUSE_DOWN, {
            /**
             * Frame id, always 0 for whole window.
             * @type {0}
             */
            ctx: 0,

            /**
             * X coord of mouse button down in CSS pixels relative to top
             * left of the page.
             * @type {number}
             */
            x: Math.round(lmp.x),

            /**
             * Y coord of mouse button down in CSS pixels relative to top
             * left of the page.
             * @type {number}
             */
            y: Math.round(lmp.y),

            /**
             * DomTree node id of the element clicked on.
             * @type {number}
             */
            id: node && node.id,
          });
        }
      });

      this.rec.bind(recorder.win.document, "mouseup", e => {
        // force any throttle-delayed mouse move to trigger right now
        // this will increase the accuracy lastMousePosition
        this.mouseMoveCapture.trigger();

        const node = this.tree.get(e.target);
        const lmp = this.recTop.cap.lastMousePosition;
        if (lmp) {
          this.worker.queueAction(EVENT_TYPES.MOUSE_UP, {
            /**
             * Frame id, always 0 for whole window.
             * @type {0}
             */
            ctx: 0,

            /**
             * X coord of mouse button up in CSS pixels relative to top
             * left of the page.
             * @type {number}
             */
            x: Math.round(lmp.x),

            /**
             * Y coord of mouse button up in CSS pixels relative to top
             * left of the page.
             * @type {number}
             */
            y: Math.round(lmp.y),

            /**
             * DomTree node id of the element clicked on.
             * @type {number}
             */
            id: node && node.id,
          });
        }
      });

      this.rec.bind(recorder.win.document, "click", e => {
        // force any throttle-delayed mouse move to trigger right now
        // this will increase the accuracy lastMousePosition
        this.mouseMoveCapture.trigger();

        const node = this.tree.get(e.target);
        const lmp = this.recTop.cap.lastMousePosition;
        if (lmp) {
          this.worker.queueAction(EVENT_TYPES.MOUSE_CLICK, {
            /**
             * Frame id, always 0 for whole window.
             * @type {0}
             */
            ctx: 0,

            /**
             * X coord of mouse click in CSS pixels relative to top
             * left of the page.
             * @type {number}
             */
            x: Math.round(lmp.x),

            /**
             * Y coord of mouse click in CSS pixels relative to top
             * left of the page.
             * @type {number}
             */
            y: Math.round(lmp.y),

            /**
             * DomTree node id of the element clicked on.
             * @type {number}
             */
            id: node && node.id,
          });
        }
      });
    }

    // many desktop devices have touch support these days, so we listen on all platforms
    // The touch events to watch
    const tevents = ["start", "end", "cancel", "leave", "move"];

    for (i = 0; i < tevents.length; i++) {
      // Bind to each kind of touch event
      // Note the passive: true to ensure good scrolling performance on mobile
      this.rec.bind(
        recorder.win.document,
        `touch${tevents[i]}`,
        (evttype =>
          function(e) {
            this._handleTouchEvents(e, evttype);
          })(tevents[i]).bind(this),
        { passive: true }
      );
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
      const doOrientationChange = () => {
        const rec = this.rec;
        let isLandscape = false;
        const vsp = Dom.getViewportSizePos(rec.win);

        // If orientation is 90 or -90 it is true
        if (rec.win.orientation >= -90 && rec.win.orientation <= 90) {
          isLandscape = true;
        }

        // Signal an orientation event
        this.worker.queueAction(EVENT_TYPES.ORIENTATION_CHANGE, {
          /**
           * Frame id, always 0 for whole window.
           * @type {0}
           */
          ctx: 0,

          /**
           * Visual viewport top left X coord in CSS pixels
           * relative to top left of page.
           * @type {number}
           */
          x: vsp.vx,

          /**
           * Visual viewport top left Y coord in CSS pixels
           * relative to top left of page.
           * @type {number}
           */
          y: vsp.vy,

          /**
           * Landscape (true) or portrait (false)
           * @type {boolean}
           */
          isL: isLandscape,

          /**
           * Layout width in CSS pixels (aka clientWidth)
           * @type {number}
           */
          lw: vsp.lw,

          /**
           * Layout height in CSS pixels (aka clientHeight)
           * @type {number}
           */
          lh: vsp.lh,

          /**
           * Page width in CSS pixels
           * @type {number}
           */
          pw: vsp.pw,

          /**
           * Page height in CSS pixels
           * @type {number}
           */
          ph: vsp.ph,

          /**
           * Visual viewport width in CSS pixels
           * @type {number}
           */
          vw: vsp.vw,

          /**
           * Visual viewport height in CSS pixels
           * @type {number}
           */
          vh: vsp.vh,
        });
        this.lastSizes.vw = vsp.vw;
        this.lastSizes.vh = vsp.vh;
        this.lastSizes.lw = vsp.lw;
        this.lastSizes.lh = vsp.lh;
      };

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

    // Scan for iFrames
    this.scanForIframes([fr.document.body]);
  }

  /**
   * Get the page visible/hidden keys
   */
  _getHiddenKeys() {
    let hidden;
    let visibilityChange;

    // hidden - the browser-specific property for page visibility
    // visibilityChange - browser specific event name
    if (typeof document.hidden !== "undefined") {
      // Opera 12.10 and Firefox 18 and later support
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
      hidden,
      visibilityChange,
    };
  }

  /**
   * Do the actual serializing of the DOM.
   * @private
   */
  _serializeDom() {
    const doc = this.fr.document;
    const br = this.browser.browser;
    const screenRes = getScreenResolution();
    const vsp = Dom.getViewportSizePos(this.fr);
    const url = this.fr.location.href.toString();
    const pageHiddenKeys = this._getHiddenKeys();
    let isLandscape = false;

    // keep copy of previous sizes to reduce event spam
    this.lastSizes = vsp;

    // If orientation is 90 or -90 it is true
    if (this.fr.orientation >= -90 && this.fr.orientation <= 90) {
      isLandscape = true;
    }

    // Serialize the DOM
    this.worker.queueAction(EVENT_TYPES.PAGE_MARKER, {
      /**
       * Frame id of the frame this page loaded in
       * @type {number}
       */
      ctx: this.ctx,

      /**
       * Frame id of the parent frame
       * @type {number}
       */
      parent: this.rec.recordParent ? this.rec.recordParent.instancePath : this.ctx,

      /**
       * Doctype string for the document
       * @type {string?}
       */
      dt: Dom.getDocType(this.browser, doc),

      /**
       * JSON dump of the initial DomTree contents.
       * This will be null if the page is not recorded (blacklisted).
       * @type {object?}
       */
      doc: JSON.parse(JSON.stringify(this.tree.get(doc.documentElement))),

      /**
       * Removed from this in the webworker before sending to the server.
       * This is the masking targets.
       *
       * @private
       * @type {object}
       */
      maskingTargets: this.masker.getCurrentMaskingTargetIds(this.tree),

      /**
       * URL of the webpage
       * @type {string}
       */
      url,

      /**
       * The browser user agent string.
       * @type {string}
       */
      v: this.browser.agent,

      /**
       * The unix timestamp when the gateway of the SDK started
       * running on the page in milliseconds.
       * @type {number}
       */
      start: startTS,

      /**
       * The timezone offset in minute from UTC.
       * @type {number}
       */
      tz: new Date().getTimezoneOffset(),

      /**
       * The number of milliseconds it took to load the SDK and
       * start recording.
       * @type {number}
       */
      domloadtime: currentTime() - startTS,

      /**
       * The replayId from the SDK config.
       * @type {string}
       */
      cid: globalConfig.replayId,

      /**
       * The journey/big data customerId.
       * @type {string}
       */
      customerId: globalConfig.customerId,

      /**
       * The journey/big data userId as a UUID.
       * @type {string}
       */
      userId: this.recTop.stg.uid,

      /**
       * The referrer url (or as much as SSL will allow).
       * @type {string}
       */
      f: document.referrer.toString(),

      /**
       * The document title
       * @type {string}
       */
      t: this.fr.document.title,

      /**
       * The SDK detected browser name
       * (not from WURFL except on android!)
       * @type {string}
       */
      bn: br.name,

      /**
       * The SDK detected browser version
       * (not from WURFL except on android!)
       * @type {string}
       */
      bv: br.version,

      /**
       * Device width in OS (screen) pixels
       * (may be scaled down by device pixel ratio)
       * @type {number}
       */
      dw: screenRes.w,

      /**
       * Device height in OS (screen) pixels
       * (may be scaled down by device pixel ratio)
       * @type {number}
       */
      dh: screenRes.h,

      /**
       * Page width in CSS pixels
       * @type {number}
       */
      pw: vsp.pw,

      /**
       * Page height in CSS pixels
       * @type {number}
       */
      ph: vsp.ph,

      /**
       * Layout width (clientWidth) in CSS pixels
       * @type {number}
       */
      lw: vsp.lw,

      /**
       * Layout height (clientHeight) in CSS pixels
       * @type {number}
       */
      lh: vsp.lh,

      /**
       * Visual viewport width in CSS pixels
       * @type {number}
       */
      vw: vsp.vw,

      /**
       * Visual viewport height in CSS pixels
       * @type {number}
       */
      vh: vsp.vh,

      /**
       * Orientation in landscape (true) or portrait (false)
       * @type {boolean?}
       */
      landscape: isLandscape,

      /**
       * SDK detected a mobile browser
       * @type {boolean}
       */
      mobile: this.browser.isMobile,

      /**
       * PII config is in whitelist (selectiveUnMasking) mode
       * @type {boolean?}
       */
      whiteListMode: this.masker.piiObj.useWhiteListing,

      /**
       * Replay Session ID
       * @type {string}
       */
      sid: this.rec.getSessionId(),

      /**
       * Replay Global Session ID
       * @type {string}
       */
      gid: this.rec.getGlobalId(),

      /**
       * Page is currently visible (true) or hidden (false)
       * @type {boolean}
       */
      vs: !document[pageHiddenKeys.hidden],

      /**
       * Current visual viewport top left position (scroll position)
       * in CSS pixels relative to top left of the page
       * @type {{x: number, y: number}}
       */
      scroll: { x: vsp.vx, y: vsp.vy },
    });
  }

  /**
   * Process scroll capturing
   */
  _handleScroll(evt, zoom) {
    if (!this.rec) return; // already disposed

    const targ = evt.target;
    const pos = {
      x: targ.scrollLeft,
      y: targ.scrollTop,
    };
    const win = this.rec.win;
    const rectop = this.recTop;
    let lastRawMouse;
    let lastMouse;
    let topPos;
    let vsp;

    if (targ === win.document || targ === win.visualViewport || zoom) {
      vsp = Dom.getViewportSizePos(win);

      // Do mobile zoom
      if (win === win.top && (this.lastSizes.vw !== vsp.vw || this.lastSizes.vh !== vsp.vh)) {
        // Send all the zoom details
        this.worker.queueAction(EVENT_TYPES.ZOOM, {
          /**
           * Frame id, always 0 for whole page
           * @type {0}
           */
          ctx: 0,

          /**
           * Visual viewport width in CSS pixels
           * @type {number}
           */
          vw: vsp.vw,

          /**
           * Visual viewport height in CSS pixels
           * @type {number}
           */
          vh: vsp.vh,

          /**
           * Layout width (clientWidth) in CSS pixels
           * @type {number}
           */
          lw: vsp.lw,

          /**
           * Layout height (clientHeight) in CSS pixels
           * @type {number}
           */
          lh: vsp.lh,
        });

        // remember this so we don't spam events
        this.lastSizes.vw = vsp.vw;
        this.lastSizes.vh = vsp.vh;
      }

      if (this.lastSizes.vx !== vsp.vx || this.lastSizes.vy !== vsp.vy) {
        // Log the position of the visual viewport
        this.worker.queueAction(EVENT_TYPES.FRAME_SCROLL, {
          /**
           * Frame id of the frame that scrolled
           * @type {number}
           */
          ctx: this.rec.getPath(),

          /**
           * X coord of top left of visual viewport in CSS pixels
           * @type {number}
           */
          x: vsp.vx,

          /**
           * Y coord of top left of visual viewport in CSS pixels
           * @type {number}
           */
          y: vsp.vy,
        });
        this.lastSizes.vx = vsp.vx;
        this.lastSizes.vy = vsp.vy;
      }

      // The last mouse position
      if (rectop.cap && this.isMousedOverPage) {
        lastRawMouse = rectop.cap._lastUnscrolledMouse;
        lastMouse = rectop.cap.lastMousePosition;

        if (lastRawMouse) {
          topPos = getScroll(rectop.win);

          // don't spam unecessary msgs
          if (
            lastRawMouse.x + topPos.x !== lastMouse.x ||
            lastRawMouse.y + topPos.y !== lastMouse.y
          ) {
            // Log the mouse move
            this.worker.queueAction(EVENT_TYPES.MOUSE_MOVE, {
              /**
               * Frame ID, always 0 for whole window.
               * Mouse movements inside iframes are translated to
               * parent coordinate space.
               * @type {0}
               */
              ctx: 0,

              /**
               * X Coord of mouse in CSS pixels from top left of page.
               * @type {number}
               */
              x: Math.round(lastRawMouse.x + topPos.x),

              /**
               * Y Coord of mouse in CSS pixels from top left of page.
               * @type {number}
               */
              y: Math.round(lastRawMouse.y + topPos.y),
            });
          }
        }
      }
    } else {
      // Log the position
      this.worker.queueAction(EVENT_TYPES.SCROLL_EL, {
        /**
         * Frame id of frame containing an element that scrolled
         * @type {number}
         */
        ctx: this.rec.getPath(),

        /**
         * DomTree id of the element that is being scrolled.
         * @type {number}
         */
        id: this.tree.get(targ).id,

        /**
         * X offset of top left of visual part of element (scrollLeft)
         * @type {number}
         */
        x: Math.round(pos.x),

        /**
         * Y offset of top left of visual part of element (scrollTop)
         * @type {number}
         */
        y: Math.round(pos.y),
      });
    }
  }

  /**
   * Process touch events
   */
  _handleTouchEvents(evt, subject) {
    // return early if already disposed of
    if (!this.rec) return;

    // Note: spelled wrong on purpose so it doesn't use a reserved word which google will not shorten.
    const tuches = [];
    let i;
    let t;
    let node;

    if (isDefined(evt.touches)) {
      for (i = 0; i < evt.touches.length; i++) {
        t = evt.touches[i];
        node = this.tree.get(t.target);
        let x = Math.round(t.pageX);
        let y = Math.round(t.pageY);

        // If we are inside an iframe, correct the coordinates to be
        // relative to the top page and not the iframe's page
        if (this.recTop !== this.rec) {
          const tf = this.rec.win.frameElement;
          const tPos = Dom.getPositionRelativeToMainView(tf, Dom.getParentWindow(tf), false);
          const scrollPos = getScroll(this.rec.win);
          if (tPos) {
            x += tPos.x - scrollPos.x;
            y += tPos.y - scrollPos.y;
          }
        }

        tuches.push({
          /**
           * ID the browser assigned to this touch. The ID can be used
           * to track a single finger on the screen for the duration
           * it is touching the screen.
           * IDs are often reused, they are valid just for the
           * duration of this touch start through to end.
           * @type {number}
           */
          n: t.identifier,

          /**
           * X coord of touch, relative to top left of page, in CSS pixels.
           * @type {number}
           */
          x,

          /**
           * Y coord of touch, relative to top left of page, in CSS pixels.
           * @type {number}
           */
          y,

          /**
           * DomTree ID of the node currently under the touch event.
           * @type {number}
           */
          id: node && node.id,
        });
      }
    }

    this.worker.queueAction(EVENT_TYPES.TOUCH, {
      /**
       * Frame ID, always 0 for whole window.
       * iFrame touches are converted into top window coord space.
       * @type {0}
       */
      ctx: 0,

      /**
       * List of touches that are the subject of this event, each
       * touch will be a separate digit contacting the screen.
       * @type {Touch[]}
       */
      ts: tuches,

      /**
       * The kind of touch event being reported. Most interesting
       * are:
       *   * start: digit began touching screen
       *   * move: digit moved around on screen
       *   * end: digit left screen
       * @type {"start" | "end" | "cancel" | "leave" | "move"]}
       */
      et: subject,
    });

    // Update scroll on end
    if (subject === "end" || tuches.length > 1) {
      this._handleScroll(evt, true);
    }
  }

  /**
   * Process mouse events and scroll events
   */
  _handleMouseEvents(evt, subject, altrec) {
    // Don't bother if we are not moused over the page
    if (!this.isMousedOverPage || !evt) {
      return;
    }

    // Get a reference to a generic mouse coordinate object that we'll use several times
    const rawMouseCoords = {
      x:
        typeof evt.clientX != "undefined"
          ? evt.clientX
          : typeof evt.screenX != "undefined"
          ? evt.screenX
          : evt.sX,
      y:
        typeof evt.clientY != "undefined"
          ? evt.clientY
          : typeof evt.screenY != "undefined"
          ? evt.screenY
          : evt.sY,
    };

    const recorder = altrec ? altrec.rec : this.rec;
    if (!recorder) {
      // already been disposed of
      return;
    }

    // Get the scroll position
    const scrollPosition = getScroll(recorder.win);

    // Add the scroll position to the coordinates
    const pos = {
      x: scrollPosition.x + rawMouseCoords.x,
      y: scrollPosition.y + rawMouseCoords.y,
    };

    // The last unscrolled mouse position
    this._lastUnscrolledMouse = rawMouseCoords;

    // Is this an iFrame?
    if (altrec) {
      // Check if we're in a cross-domain iFrame
      if (!altrec.isXDRIFrameMode) {
        // We're in a regular iFrame it seems
        // Climb up the DOM to find the real position
        const tf = recorder.win.frameElement;
        const tPos = Dom.getPositionRelativeToMainView(tf, Dom.getParentWindow(tf), false);
        const topFramePos = getScroll(this.recTop.win);
        if (tPos) {
          pos.x += tPos.x - scrollPosition.x;
          pos.y += tPos.y - scrollPosition.y;
        }
        this._lastUnscrolledMouse = ext({}, pos);
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
      /**
       * Frame ID, always 0 for the whole window
       * @type {0}
       */
      ctx: 0,

      /**
       * X coord of mouse position from top left of page, in CSS pixels
       * @type {number}
       */
      x: Math.round(pos.x),

      /**
       * Y coord of mouse position from top left of page, in CSS pixels
       * @type {number}
       */
      y: Math.round(pos.y),
    });
  }

  /**
   * Get the frame window
   */
  getFrameWindow(frameNode) {
    // In IE8 there is a special case where frameNode.contentWindow.top refers to itself. Return null in this case.
    let frameWindow;
    if (frameNode && frameNode.contentWindow) {
      frameWindow = frameNode.contentWindow;
    } else if (frameNode && frameNode.contentDocument && frameNode.contentDocument.defaultView) {
      frameWindow = frameNode.contentDocument.defaultView;
    }
    return frameWindow && frameWindow != frameWindow.top ? frameWindow : null;
  }

  /**
   * See if the iFrame is in the same origin
   */
  isFrameSameOrigin(frameNode, hostName) {
    if (frameNode.getAttribute("srcdoc") && !frameNode.getAttribute("src")) {
      // allow iframes built with srcdoc
      return true;
    }

    const srcAttr = frameNode.getAttribute("src");
    if (!srcAttr) {
      return false;
    }

    // Array containing bad iFrame sources
    // Javascript: is not a valid source, it is used to create a blank iframe in IE
    // shim.gif is a foresee control, having problems trying to capture it, so block

    // eslint-disable-next-line no-script-url
    const blockedSources = ["javascript:", "about:blank"];
    for (let i = 0; i < blockedSources.length; i++) {
      if (srcAttr.indexOf(blockedSources[i]) > -1) {
        return false;
      }
    }

    // Return false if no src attribute present or src starts with whitespace
    if (!srcAttr || srcAttr.indexOf(" ") === 0) {
      return false;
    }

    // Get the source of the iFrame
    const iFrameSrc = frameNode.src;

    const isSameDomain = testSameDomain(hostName || window.location.href, iFrameSrc);

    if (!isSameDomain) return false;

    // if an iframe is originally a cross-domain frame but then changes its url
    // to point to the same domain as the parent domain, it will throw an exception
    // if you try to touch the contentWindow
    try {
      const contentWindow = this.getFrameWindow(frameNode);
      contentWindow.__test = true;
      delete contentWindow.__test;
    } catch (e) {
      return false;
    }

    return true;
  }

  /**
   * Bind to a Frame once it loads
   */
  bindToFrame(frm, winRef) {
    let frmrec;

    // Create a new recorder
    winRef.__fsrec__ = frmrec = this.rec.newIframeRecorder(
      winRef,
      this.tree.get(frm).id,
      this.tree
    );

    // make sure on frame navigation that we record the navigation
    this.rec.bind(
      winRef,
      "unload",
      () => {
        // needs to be in next tick or document will be null and there
        nextTick(() => {
          // make sure we dispose of old record for this frame
          frmrec.dispose();

          // remove tracked status
          delete winRef.__fsrec__;
          this._framesBeingTracked.splice(this._framesBeingTracked.indexOf(frm), 1);

          // re-bind to frame
          this.scanForIframes([frm.parentNode]);
        });
      },
      true
    );
  }

  /**
   * Scan for untracked iframes
   */
  scanForIframes(nds) {
    const elsBeingTracked = this._framesBeingTracked;

    for (let i = 0; i < nds.length; i++) {
      if (!nds[i]) continue;
      const frms = nds[i].querySelectorAll("iframe");
      if (frms.length > 0) {
        const elsToDealWith = Array.prototype.filter.call(
          frms,
          el => elsBeingTracked.indexOf(el) == -1
        );

        for (let j = 0; j < elsToDealWith.length; j++) {
          elsBeingTracked.push(elsToDealWith[j]);

          // skip cross origin iframes
          if (!this.isFrameSameOrigin(elsToDealWith[j])) continue;

          // skip iframes we are already bound to
          const fwn = this.getFrameWindow(elsToDealWith[j]);
          if (fwn.__fsrec__) continue;

          // Bind to it!
          if (fwn.document.readyState === "complete" || fwn.document.readyState === "interactive") {
            // Do it now
            nextTick(
              ((ifr, wobj) =>
                function() {
                  this.bindToFrame(ifr, wobj);
                })(elsToDealWith[j], fwn).bind(this)
            );
          } else {
            // Wait for onload
            BindOnce(
              fwn,
              `${this.rec.getBindNS()}:load`,
              ((ifr, wobj) =>
                function() {
                  this.bindToFrame(ifr, wobj);
                })(elsToDealWith[j], fwn).bind(this)
            );
          }
        }
      }
    }
  }

  /**
   * Dispose of the object
   */
  dispose() {
    if (this.mutation) {
      this.mutation.dispose();
    }

    if (this.mouseMoveCapture && this.recTop === this.rec) {
      this.mouseMoveCapture.dispose();
    }
    if (this.orientationCapture) {
      this.orientationCapture.dispose();
    }
    if (this.sizeCapture) {
      this.sizeCapture.dispose();
    }
    if (this.inputCap) {
      this.inputCap.dispose();
    }

    // Remove document from the tree and inform the worker about it
    const root = this.tree.get(this.fr.document.documentElement);
    if (root) {
      this.tree.remove(this.fr.document.documentElement);
      this.worker.queueAction(EVENT_TYPES.MOD_LIST, [
        {
          e: EVENT_TYPES.NODE_REMOVED,
          d: {
            ctx: this.ctx,
            id: root.id,
          },
        },
      ]);
    }
  }
}

export { Capture };
