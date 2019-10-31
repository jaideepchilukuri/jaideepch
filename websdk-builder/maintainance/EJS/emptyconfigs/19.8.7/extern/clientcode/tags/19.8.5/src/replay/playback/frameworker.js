/**
 * Does iframe work
 *
 * (c) Copyright 2018 Foresee, Inc.
 *
 * @author Ryan Sanche (ryan.sanche@foresee.com)
 * @author $Author: ryan.sanche $
 *
 */

/**
 * Handles events on iframes
 * @constructor
 */
function FrameWorker(iframeEl, win) {
  // The window of the iframe
  this.window = win;

  // The iframe element in the parent frame
  this.iframeEl = iframeEl;

  // The domreplay for mod playback
  this.domreplay = new DomReplay(win.document.documentElement);
  this.keyboard = new Keyboard(this.domreplay);

  // keep track of viewport size for resizing purposes
  this.viewportSize = {};

  // The window scroll pos
  this.scrollPos = utils.getScroll(win);

  // Event handler lookup table
  this.handlers = {};

  // DOM manipulations
  this.handlers[EventInfo.NODE_ADDED] = this.addNode.bind(this);
  this.handlers[EventInfo.NODE_MOVED] = this.moveNode.bind(this);
  this.handlers[EventInfo.NODE_REMOVED] = this.removeNode.bind(this);
  this.handlers[EventInfo.CHAR_DATA] = this.updateCharData.bind(this);
  this.handlers[EventInfo.ATTR_MODIFIED] = this.modifyAttr.bind(this);

  // Keyboard events
  this.handlers[EventInfo.INPUT_SERIALIZE] = this.deserializeInput.bind(this);
  this.handlers[EventInfo.FOCUS_BLUR] = this.focusBlurInput.bind(this);
  this.handlers[EventInfo.CARET_INFO] = this.moveInputCaret.bind(this);
  this.handlers[EventInfo.KEY_PRESS] = this.pressKey.bind(this);

  // Sizing
  this.handlers[EventInfo.DOC_SIZE] = this.resizeDoc.bind(this);
  this.handlers[EventInfo.FRAME_SIZE] = this.resizeFrame.bind(this);

  // Scrolling
  this.handlers[EventInfo.FRAME_SCROLL] = this.scrollFrame.bind(this);
  this.handlers[EventInfo.SCROLL_EL] = this.scrollElement.bind(this);
}

/**
 * Get an element by id
 *
 * @param {*} id
 */
FrameWorker.prototype.getElement = function(id) {
  return this.domreplay.get(id);
};

/**
 * Do the work associated with an event.
 * @param evt {Object} The event object
 */
FrameWorker.prototype.dispatch = function(evt) {
  var handler = this.handlers[evt.e];
  if (!handler) {
    console.error("Unhandled event type:", evt);
    return Promise.resolve();
  }
  return handler(evt) || Promise.resolve();
};

/**
 * Load the initial DOM
 *
 * @param {*} initialDOM
 */
FrameWorker.prototype.load = function(initialDOM, scrollPos) {
  this.scrollPos = scrollPos;

  if (!initialDOM) {
    // no dom means the page wasn't recorded due to blacklisting
    return this.showPageNotRecorded();
  }

  this.domreplay.import(initialDOM);

  return this.fixScrollPosAfter(this.domreplay.waitForLoad());
};

/**
 * Display page not recorded.
 */
FrameWorker.prototype.showPageNotRecorded = function() {
  var body = document.createElement("body");
  body.innerHTML = "<div>Page Not Recorded</div>";
  body.style.width = "100%";
  body.style.height = "100vh";
  body.style.display = "flex";
  body.style.justifyContent = "center";
  body.style.alignItems = "center";
  body.style.backgroundColor = "#fff";
  body.style.color = "#555";
  body.style.overflow = "hidden";
  body.style.fontSize = "24px";
  body.style.margin = "0";
  this.window.document.documentElement.appendChild(body);
  return Promise.resolve();
};

/**
 * Set the frame's scroll position
 * @param {*} pos
 */
FrameWorker.prototype.setScrollPos = function(pos) {
  if (!pos) {
    pos = this.scrollPos;
  }
  var scr = utils.getScroll(this.window);
  if (scr.x !== pos.x || scr.y !== pos.y) {
    utils.setScroll(this.window, pos.x, pos.y);
    this.scrollPos = fs.ext({}, pos);
  }
};

/**
 * Reset the frame scroll position after a promise resolves
 * @param {*} promise
 */
FrameWorker.prototype.fixScrollPosAfter = function(promise) {
  return promise.then(
    function() {
      this.setScrollPos();
    }.bind(this)
  );
};

/**
 * Add a node to the dom
 *
 * @param {*} evt
 */
FrameWorker.prototype.addNode = function(evt) {
  if (!evt.d.tree) {
    console.error("Attempt to add null node:", evt);
    return;
  }
  try {
    this.domreplay.insert(evt.d.idx, evt.d.tree);
  } catch (e) {
    // handles issues with infinite cycles in inserted nodes
    console.error(e);
  }

  return this.fixScrollPosAfter(this.domreplay.waitForLoad());
};

/**
 * Move a node from one place to another
 *
 * @param {*} evt
 */
FrameWorker.prototype.moveNode = function(evt) {
  this.domreplay.move(evt.d.id, evt.d.p, evt.d.idx);

  return this.fixScrollPosAfter(this.domreplay.waitForLoad());
};

/**
 * Remove a node from the dom
 *
 * @param {*} evt
 */
FrameWorker.prototype.removeNode = function(evt) {
  this.domreplay.remove(evt.d.id);

  return this.fixScrollPosAfter(this.domreplay.waitForLoad());
};

/**
 * Update char data (like the value of text nodes)
 *
 * @param {*} evt
 */
FrameWorker.prototype.updateCharData = function(evt) {
  this.domreplay.updateCharData(evt.d.id, evt.d.v);

  return this.fixScrollPosAfter(this.domreplay.waitForLoad());
};

/**
 * Modify a node's attribute
 *
 * @param {*} evt
 */
FrameWorker.prototype.modifyAttr = function(evt) {
  this.domreplay.modifyAttr(evt.d.id, evt.d.attr, evt.d.val);

  return this.fixScrollPosAfter(this.domreplay.waitForLoad());
};

/**
 * Scroll the frame
 *
 * @param {*} evt
 */
FrameWorker.prototype.scrollFrame = function(evt) {
  this.setScrollPos(evt.p);
};

/**
 * Scroll an element
 *
 * @param {*} evt
 */
FrameWorker.prototype.scrollElement = function(evt) {
  var el = this.domreplay.get(evt.d.id);
  if (!el) {
    console.error("scrollElement on unknown element", evt.d.id);
    return;
  }
  el.scrollLeft = evt.d.x;
  el.scrollTop = evt.d.y;
};

/**
 * Change size of the frame
 *
 * @param {*} evt
 */
FrameWorker.prototype.resizeFrame = function(evt) {
  if (this.iframeEl) {
    this.iframeEl.width = evt.d.w;
    this.iframeEl.height = evt.d.h;
  }
};

/**
 * Change size of the document/page
 *
 * @param {*} evt
 */
FrameWorker.prototype.resizeDoc = function(evt) {
  // ignore
};

/**
 * Handle deserializing inputs
 *
 * @param {*} evt
 */
FrameWorker.prototype.deserializeInput = function(evt) {
  var el = this.domreplay.get(evt.d.id);
  if (!el) {
    console.error("deserializeInput on unknown element", evt.d.id);
    return;
  }
  this.keyboard.deserializeInput(el, evt.d);
};

/**
 * Handle focusing or bluring inputs
 *
 * @param {*} evt
 */
FrameWorker.prototype.focusBlurInput = function(evt) {
  var el = this.domreplay.get(evt.d.id);
  if (!el) {
    console.error("focusBlurInput on unknown element", evt.d.id);
    return;
  }
  this.keyboard.focusBlurInput(el, evt.d);
};

/**
 * Handle caret movement in text controls
 *
 * @param {*} evt
 */
FrameWorker.prototype.moveInputCaret = function(evt) {
  var el = this.domreplay.get(evt.d.id);
  if (!el) {
    console.error("moveInputCaret on unknown element", evt.d.id);
    return;
  }
  this.keyboard.moveInputCaret(el, evt.d);
};

/**
 * Handle keyboard presses
 *
 * @param {*} evt
 */
FrameWorker.prototype.pressKey = function(evt) {
  var el = this.domreplay.get(evt.d.id);
  if (!el) {
    console.error("pressKey on unknown element", evt.d.id);
    return;
  }
  this.keyboard.pressKey(el, evt.d);
};
