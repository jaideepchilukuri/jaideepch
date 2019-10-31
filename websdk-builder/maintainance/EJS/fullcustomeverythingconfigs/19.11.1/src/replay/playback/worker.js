/**
 * SessionReplay Playback Work Module
 *
 * Does the work of an event
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

import { CssMod } from "./cssmod";
import { EventInfo } from "./eventinfo";
import { FrameWorker } from "./frameworker";

/**
 * @class Does event work
 * @constructor
 */
class Worker {
  constructor(events, animWin, domWin, mouse, viewport) {
    // The event list
    this.events = events;

    // The window to perform animations in
    this.animWin = animWin;

    // The window to perform dom operations in
    this.domWin = domWin;

    // The mouse to animate
    this.mouse = mouse;

    // The window viewport simulator
    this.viewport = viewport;

    // Index into event list of current event
    this.eventIndex = 0;

    // Time from start of playback of current event
    this.timeIndex = 0;

    // The iframe workers, worker 0 is the main window
    this.frames = { 0: new FrameWorker(null, this.domWin) };

    this.cssmod = new CssMod(viewport);

    // Event handler lookup table
    this.handlers = {};

    // DOM stuff
    this.handlers[EventInfo.DOM_MODIFICATIONS] = this.modifyDOM.bind(this);
    this.handlers[EventInfo.PAGE_MARKER] = this.markPage.bind(this);
    this.handlers[EventInfo.PAGE_VISIBLE] = this.changePageVisible.bind(this);

    // Mouse stuff
    this.handlers[EventInfo.MOUSE_MOVE] = this.moveMouse.bind(this);
    this.handlers[EventInfo.WINDOW_MOUSEOUT_MOUSEENTER] = this.mouseEnterLeave.bind(this);
    this.handlers[EventInfo.MOUSE_CLICK] = this.clickMouse.bind(this);
    this.handlers[EventInfo.TOUCH] = this.touch.bind(this);
    this.handlers[EventInfo.MOUSE_DOWN] = this.mouseDown.bind(this);
    this.handlers[EventInfo.MOUSE_UP] = this.mouseUp.bind(this);

    // Sizing, zooming, scrolling the viewport
    this.handlers[EventInfo.ORIENTATION] = this.orientate.bind(this);
    this.handlers[EventInfo.ORIENTATION_CHANGE] = this.changeViewportOrientation.bind(this);
    this.handlers[EventInfo.ZOOM] = this.zoomViewport.bind(this);
    this.handlers[EventInfo.FRAME_SCROLL] = this.scrollViewport.bind(this);
    this.handlers[EventInfo.FRAME_SIZE] = this.resizeViewport.bind(this);

    // UI stuff
    this.handlers[EventInfo.SKIPTIME] = this.skipTime.bind(this);
    this.handlers[EventInfo.ASSET_ERROR] = this.assetError.bind(this);
    this.handlers[EventInfo.PAGE_ERROR] = this.pageError.bind(this);
    this.handlers[EventInfo.JAVASCRIPT_ERROR] = this.pageError.bind(this);
    this.handlers[EventInfo.NOT_RECORDED] = this.notRecorded.bind(this);
  }

  /**
   * Load the initial DOM
   *
   * @param {*} initialDOM
   */
  load(initialDOM, viewportParams) {
    this.viewport.update(viewportParams);
    const scrollPos = { x: viewportParams.vx, y: viewportParams.vy };

    return this.frames[0]
      .load(initialDOM, scrollPos)
      .then(() => this.cssmod.updatedDOM(this.domWin.document));
  }

  /**
   * Get the current event
   */
  getCurrentEvent() {
    return this.events[this.eventIndex];
  }

  /**
   * Play the current event and advance to next event
   */
  playNextEvent() {
    if (this.isDone()) {
      return Promise.resolve();
    }
    const evt = this.getCurrentEvent();

    this.eventIndex++;
    if (!this.isDone()) {
      this.timeIndex += this.getCurrentEvent().td;
    }
    return this.dispatch(evt).catch(err => {
      console.error(err, err.stack);
    });
  }

  /**
   * Are we done the event stream?
   */
  isDone() {
    return this.eventIndex >= this.events.length;
  }

  /**
   * Is the current event a SKIPTIME and if so how much time to skip?
   */
  timeToSkip() {
    if (this.getCurrentEvent().e === EventInfo.SKIPTIME) {
      return this.getCurrentEvent().d.i;
    }
    return 0;
  }

  /**
   * Do the work associated with an event.
   * @param evt {Object} The event object
   */
  dispatch(evt) {
    const handler = this.handlers[evt.e];
    if (!handler) {
      // if a frame worker can handle it, let it
      if (this.frames[evt.d.ctx]) {
        return this.frames[evt.d.ctx].dispatch(evt);
      }

      console.error("Unhandled event type:", evt);
      return Promise.resolve();
    }
    return handler(evt) || Promise.resolve();
  }

  /**
   * Handle mark page event which introduces a new iframe/page
   * @param {*} evt
   */
  markPage(evt) {
    if (evt.d.ctx !== 0) {
      return this.iframeIntro(evt);
    }

    // The CssMod needs to change behaviour on mobile in some cases
    this.cssmod.mobile = evt.d.mobile;
  }

  /**
   * Create a new FrameWorker to handle events on a new iframe.
   *
   * @param {*} evt
   */
  iframeIntro(evt) {
    const frameId = evt.d.ctx;

    // These three checks will detect a corrupt replay and tolerate
    // it well enough to at least get to the next page.
    if (!this.frames[evt.d.parent]) {
      console.error("Unable to find parent frame for iframe", frameId, evt);
      return;
    }

    const el = this.frames[evt.d.parent].getElement(frameId);
    if (!el) {
      console.error("Unable to find iframe element for", frameId, evt);
      return;
    }

    if (el.nodeName.toUpperCase() !== "IFRAME") {
      console.error("iframe intro on a non-iframe!", el);
      return;
    }

    el.width = evt.d.lw;
    el.height = evt.d.lh;

    this.frames[frameId] = new FrameWorker(el, el.contentWindow);

    if (evt.d.doc) {
      // empty the iframe contents
      const contents = el.contentWindow.document.documentElement;
      while (contents.childNodes.length) {
        contents.removeChild(contents.childNodes[0]);
      }

      return this.frames[frameId].load(evt.d.doc, evt.d.scroll).then(() => {
        this.cssmod.updatedDOM(el.contentWindow.document);
      });
    }
  }

  /**
   * A batch of DOM modifications.
   *
   * @param {*} evt
   */
  modifyDOM(evt) {
    const promises = [];
    let i;
    let subevt;
    let doc;

    if (!evt.d.length) {
      console.error("Received empty DOM_MODIFICATIONS event!");
      return Promise.resolve();
    }

    for (i = 0; i < evt.d.length; i++) {
      subevt = evt.d[i];
      if (this.frames[subevt.d.ctx]) {
        // save document for replacing hover styles
        // a modifyDOM event should only contain actions for one document
        doc = this.frames[subevt.d.ctx].window.document;

        promises.push(this.frames[subevt.d.ctx].dispatch(subevt));
      } else {
        console.error("Unknown frame:", subevt.d.ctx, subevt);
      }
    }

    return Promise.all(promises).then(() => {
      this.cssmod.updatedDOM(doc);
      this.viewport.update({});
    });
  }

  /**
   * Move the mouse to the new location, possibly animating a spline
   *
   * @param {*} evt
   */
  moveMouse(evt) {
    // console.log("mouse evt", evt.td, evt.p, evt.spline);
    this.mouse.setVisible(true);
    this.mouse.setPos(evt.p.x, evt.p.y, evt.spline);
  }

  /**
   * Mouse enters or leaves page, so set the visibility of cursor
   *
   * @param {*} evt
   */
  mouseEnterLeave(evt) {
    this.mouse.setVisible(evt.d.v);
  }

  /**
   * Handle mouse click
   *
   * @param {*} evt
   */
  clickMouse(evt) {
    // console.log('mouse click', evt);
    this.mouse.click(evt.p);
  }

  /**
   * Handle touch event
   *
   * @param {*} evt
   */
  touch(evt) {
    // types: ["start", "end", "cancel", "leave", "move"]
    switch (evt.d.et) {
      case "start":
      case "move":
        this.mouse.touchUpdate(evt.d.ts);
        break;

      case "end":
        if (evt.d.ts.length < 1) {
          this.mouse.touchEnd();
        } else {
          // TODO: this isn't quite right but close
          // ideally there would be some touch points ending too
          this.mouse.touchUpdate(evt.d.ts);
        }
        break;

      case "cancel":
      case "leave":
        console.log("not sure what this means touch", evt.d.et);
        break;

      default:
      //ignore
    }
  }

  /**
   * Handle mouse down
   *
   * @param {*} evt
   */
  mouseDown() {
    this.mouse.mouseDown();
  }

  /**
   * Handle mouse up
   *
   * @param {*} evt
   */
  mouseUp() {
    this.mouse.mouseUp();
  }

  /**
   * Got an change of down, but didn't cause a layout change
   *
   * @param {*} evt
   */
  orientate() {
    // this is not useful, so ignore
  }

  /**
   * Change orientation of the viewport causing a layout change
   *
   * @param {*} evt
   */
  changeViewportOrientation(evt) {
    this.viewport.update({ vw: evt.d.vw, vh: evt.d.vh, lw: evt.d.lw, lh: evt.d.lh });
  }

  /**
   * Zoom the viewport
   *
   * @param {*} evt
   */
  zoomViewport(evt) {
    this.viewport.update({ vw: evt.d.vw, vh: evt.d.vh, lw: evt.d.lw, lh: evt.d.lh });
  }

  /**
   * Change size of the viewport
   *
   * @param {*} evt
   */
  resizeViewport(evt) {
    if (evt.d.ctx !== 0) {
      // handle iframe resizing
      return this.frames[evt.d.ctx].dispatch(evt);
    }

    this.viewport.update({ vw: evt.d.vw, vh: evt.d.vh, lw: evt.d.w, lh: evt.d.h });
  }

  /**
   * Scroll the viewport or frame
   *
   * @param {*} evt
   */
  scrollViewport(evt) {
    // let the frame scroll itself
    return this.frames[evt.d.ctx].dispatch(evt).then(() => {
      if (evt.d.ctx === 0) {
        // make sure mouse positions update when the viewport scrolls
        // this also updates fixed:position elements etc
        this.viewport.update({ vx: evt.p.x, vy: evt.p.y });
      }
    });
  }

  /**
   * Handle when the page is re-visible
   *
   * @param {*} evt
   */
  changePageVisible() {
    // TODO?
  }

  /**
   * Handle time skip
   *
   * @param {*} evt
   */
  skipTime() {
    // TODO: Implement a skip time animation here in this.animWin
  }

  /**
   * Handle asset error. This is usually something that failed to load.
   *
   * @param {*} evt
   */
  assetError(evt) {
    // TODO: display this in UI maybe?
    console.warn(`Error loading asset on recorded page: ${evt.d.a.src || evt.d.a.href}`);
  }

  /**
   * Handle page error. This is usually a javascript error during recording.
   *
   * @param {*} evt
   */
  pageError(evt) {
    // TODO: display this in UI maybe?
    console.warn(`Error on recorded page: ${evt.d.st || evt.d.v}`);
  }

  /**
   * Handle page error. This is usually a javascript error during recording.
   *
   * @param {*} evt
   */
  notRecorded() {
    return new Promise(resolve => {
      setTimeout(resolve, 5000);
    });
  }
}

export { Worker };
