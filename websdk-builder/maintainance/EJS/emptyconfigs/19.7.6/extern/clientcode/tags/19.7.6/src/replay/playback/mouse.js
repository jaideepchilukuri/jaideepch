/**
 * Mouse Graphics and Animation.
 * This is mainly for Web Playback
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

fs.provide("rp.Replay.Playback.Mouse");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.EventInfo");
fs.require("rp.Replay.Playback.Animation");

(function () {

  // Curation of click animation
  var CLICK_DURATION = 600;

  // info about the mouse image
  var mouseImageData = {
    hit: {
      x: 4,
      y: 2
    },
    width: 40,
    height: 40,
    id: "fsrMouseImageIcon",
    // Nic Weber made these for us, so copyright Foresee :-)
    upImg: "data:image/png;base64,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",
    downImg: "data:image/png;base64,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"
  };

  // info about the click image
  var clickImageData = {
    hit: {
      x: 25,
      y: 25
    },
    width: 50,
    height: 50,
    id: "fsrMouseClickImageIcon",
    // Nic Weber made these for us, so copyright Foresee :-)
    data: "data:image/png;base64,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"
  };

  // info about the touch image
  var touchImageData = {
    hit: {
      x: 25,
      y: 25
    },
    width: 50,
    height: 50,
    id: "fsrMouseTouchIcon",
    // Nic Weber made these for us, so copyright Foresee :-)
    data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAABKRJREFUaAXtWklrFEEU/qoTjUsEl2jwIO6aiyI5eBBBFAXPCkEIbiCC4I+YPyGCCC4QFMGcBYPLxYNeRBGicYkniTuouMUu33udTlVneqZfzWQmE/HB0NXdr159X1XX8t4b4L+0Vg+YaYNz7Vobfu9ajd/YQDaXA2YZDObTdW7Shv0Fi++A/UD37zAHzzHn7mv09f2ZDgz1ESndbseans1A1ANrNhLIeWGgzA8YOwLEwxgdforS7vGw+k67NiLWGlx+uwWx3UM9vtiZq6dkPyMyt3BkxWMYY0MthRMZGFuH8Wgf4nhlaGMq/Sh6g/b4Jvq7X6r0J5T0REqlCGtO7aXvfEdIAzXrGtzD6NkhlEqxxoaOyIVX82A6D8LGNA+aKCYagf16HcfX/ihqtZjIwOslGJ/fT/Ohq8hYQ95H5j3avw+gf/Wnavajai/BIzGTJBgcdyBjYCxVpK3iO54TS3b2wdpVFXWa9cJiAUxHN7YtfII7d3JXtMojIhO7yXOiWsfw/GRMFSSfyMWx9U1bnSoAy33MKyYv/znSXvZMNrv3tMyqVr2y6oiiRfRd99BGyTv9UvotSpTMF3r2ke5HaOMbpn2I7msQ3sOsPTd10yxftS6NbUWMA8FNmKiTGthNYLcR2PyRnjRqqJfsQwJzmzrs6+RjbSHCII52P/LVsw3y2UmOHb6KomyiTUTiNGn2FpNge0K0V+pw3VBhjIzVkywROQAGnp2M2U6ADpHNDs+uttghddlGkBBGweoqZYnwKTZEZCSwn6qUf6J6O4YWlv0IHpksVkeE/Qk5iisRJHOC51I9JNLGiIw9QGQ60weFV8bKmCfEEWGnKMSfkIld0+eUtj31yp8ZLRZaId9HMCf6HhHx7HRWeImV1UmnrteiFU9sK2sk3qgoOyLinioNyD5RtMQqbWXUyKbYzjysdkMudSIeEfKx1cKbXaMkxLbD7IhIoEALjnfsRkmAbQ+zIzIZ7dAATI8dGt1QnRDbaYSGwh+hzbSqvkeE4k5q4QNgoyTEtsPsiEjwTAuOT7GNkgDbHmZHJIkAKtFxUK1REmJbopYCxCNCYUytsD8BPopPt5BNsa22O4nZEeFYrFbEKSJ/YtqFbIY4XB5mjwgFlEGxWK2wUwT81Kor9H6Ko6VQTFQIKwfBJ8QR4ai4BJTTVwVX9uyMGSSt3KhGQe2pr63YCvEWGasXyXdExDRFxUPExs/oEH+DqtRDhkiQDbYVJFmsWSIc2gdFxUPE2vvUm1epSi2fGX9OV+n4fj+kScEoWF2tcqdolgYfyokk4aCTNacNGh0O4rTDka6ycFAmEiEDxUmWi2NDVD7sBi6glCyfD2j46ecLT6OJqRTXMaU4d5KTCMrOkbTdY90vaALeS29b5sqYKiSA8okwck6ycH6iVYSxMKYKUj5HfEUO5UcLT0ho33/e7DLnSOJv56slfCqPCIPlTBEnWdjQTEma6CnIWlUfkRT8LEi9VR+RlAj3xuiZK01dACQZSm0WjEQKUTciqTZfOXdior017zO+rbwy7xM2HgKvnAESToSN/xN/GPB7adb/hcMnk5Zn+E81KYz/11bpgb9S4bOsoPgKAwAAAABJRU5ErkJggg=="
  };

  /**
   * Basic constructor for the mouse animator
   */
  function Mouse(viewport, animWin, iframe) {
    // make sure mouse is updated when things resize
    viewport.onUpdate.subscribe(this.onViewportUpdate.bind(this), false, true);

    // the iframe whose coordinate space to transform into
    this.iframe = iframe;

    // the window to put the mouse in
    this.win = animWin;

    // the document to manipulate the DOM of
    this.doc = animWin.document;

    // Set the initial paused state
    this.paused = false;

    // Set the visibility status
    this.visible = false;

    // Keep track of previously hover marked element
    this.previousHoverEl = null;

    this.previousDEBounds = null;

    // scales for transforming coordinates
    this.viewScale = 1;
    this.frameScale = 1;

    // Locations of touches on the screen
    this.touchPts = [];

    this.clickEls = [];
    this.touchEls = [];
    this.hoveredEls = [];
    this.setupMouseEl();

    // Set the starting coordinate
    this.setPos(0, 0);
  }

  /**
   * Remove everything from the dom.
   */
  Mouse.prototype.dispose = function () {
    function rem(el) {
      el.parentNode.removeChild(el);
    }

    rem(this.el);
    this.clickEls.forEach(rem);
    this.touchEls.forEach(rem);

    this.previousHoverEl = null;
  };

  /**
   * Apply the visibility status
   */
  Mouse.prototype.setVisible = function (visible) {
    if (typeof visible !== "undefined") {
      this.visible = visible;
    }

    var word = this.visible ? "visible" : "hidden";

    if (this.el.style.visibility !== word) {
      this.el.style.visibility = word;

      if (this.visible) {
        // mouse doesn't actually move around when not visible so
        // move it now that it's visible
        this.updateMousePos();
      }
    }
  };

  /**
   * Transform a position from the page's coords inside the playback
   * iframe into the coord space of the main window's document.
   */
  Mouse.prototype.transformCoord = function (coord) {
    var x = coord.x, y = coord.y;

    var viewBounds = this.iframe.getBoundingClientRect();
    var pageBounds;

    // In some cases the documentElement is undefined (on page loads) so
    // in that case use a cached copy of the bounds
    if (this.iframe.contentDocument.documentElement) {
      pageBounds = this.iframe.contentDocument.documentElement.getBoundingClientRect();
    } else {
      pageBounds = this.previousDEBounds;
    }
    this.previousDEBounds = pageBounds;

    // make coord relative to the top left of the viewport
    x += pageBounds.left / this.viewScale;
    y += pageBounds.top / this.viewScale;

    // apply view scale
    x *= this.viewScale;
    y *= this.viewScale;

    // bump it over by the width of the playback frame border
    x += UICSS.playbackFrameBorder;
    y += UICSS.playbackFrameBorder;

    var iw = viewBounds.width;
    var ih = viewBounds.height;

    // frame scale is applied around the center of the frame so
    // make it relative to this center
    x -= (iw / this.frameScale) / 2;
    y -= (ih / this.frameScale) / 2;

    // apply the scaling of the playback frame
    x *= this.frameScale;
    y *= this.frameScale;

    // make position relative to top left again
    x += iw / 2;
    y += ih / 2;

    // offset into iframe
    x += viewBounds.left;
    y += viewBounds.top;

    // correct for body translation sometimes done to size the iframe properly
    x -= this.bodyXOffset;

    return { x: x, y: y };
  };

  /**
   * Set the mouse coordinates with an optional spline to animate.
   *
   * @param {Number} x
   * @param {Number} y
   * @param {Object} spline optional
   */
  Mouse.prototype.setPos = function (x, y, spline) {
    this.pos = { x: x, y: y };

    this.updateMousePos();
    this.handleHovering();

    if (spline && spline.distance > 0) {
      this.animate(spline);
    }
  };

  /**
   * Update the mouse cursor position
   */
  Mouse.prototype.updateMousePos = function () {
    if (!this.visible) {
      // slight optimization, don't change anything if it can't be seen
      return;
    }

    var pt = this.transformCoord(this.pos);

    // Perform the mouse movements on the GPU by using transform
    this.el.style.transform = "translate(" +
      (pt.x - mouseImageData.hit.x) + "px," +
      (pt.y - mouseImageData.hit.y) + "px)";
  };

  /**
   * Show a click animation at the provided coordinates.
   *
   * @param pos
   */
  Mouse.prototype.click = function (pos) {
    var pt = this.transformCoord(pos);
    // TODO: Move most of this into ui-css.js
    var el = this.doc.createElement("img");
    el.style.position = "absolute";
    el.style.width = clickImageData.width + "px";
    el.style.height = clickImageData.height + "px";
    el.style.top = "0px";
    el.style.left = "0px";
    el.style.zIndex = "999999900";
    el.style.transform = "translate(" +
      (pt.x - clickImageData.hit.x) + "px," +
      (pt.y - clickImageData.hit.y) + "px)";
    el.setAttribute("id", clickImageData.id);
    el.setAttribute("src", clickImageData.data);
    this.clickEls.push(el);
    this.doc.body.appendChild(el);

    // TODO: instead of having an Animator class maybe replace with
    // the requestAnimationFrame pattern like this.animate?
    // Fade it out
    var fadeAnim = new Animator({
      singleton: el,
      duration: CLICK_DURATION,
      finished: function () {
        // remove from list of clickEls
        this.clickEls.splice(this.clickEls.indexOf(el), 1);

        // page transitions can make el.parentNode null
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }.bind(this),
      frameCallback: function (val) {
        val = 1 - val;
        el.style.opacity = val;
        el.style.filter = 'alpha(opacity=' + Math.round(val * 100) + ')';
        var pt = this.transformCoord(pos);
        el.style.transform = "translate(" +
          (pt.x - clickImageData.hit.x) + "px," +
          (pt.y - clickImageData.hit.y) + "px)";
      }.bind(this)
    });

    fadeAnim.go();
  };

  /**
   * Signal the mouse button is down.
   */
  Mouse.prototype.mouseDown = function () {
    this.el.setAttribute('src', mouseImageData.downImg);
  };

  /**
   * Signal the mouse button is up.
   */
  Mouse.prototype.mouseUp = function () {
    this.el.setAttribute('src', mouseImageData.upImg);
  };

  /**
   * Called on viewport updates.
   */
  Mouse.prototype.onViewportUpdate = function (params) {
    this.bodyXOffset = params.bodyXOffset;
    this.viewScale = params.viewScale;
    this.frameScale = params.frameScale;

    if (this.touchPts.length) {
      this.touchUpdate(this.touchPts);
    }

    this.updateMousePos();

    // clicks should update their position as they animate
  };

  /**
   * Update the the position of touch points on the page.
   * @param {*} pts
   */
  Mouse.prototype.touchUpdate = function (pts) {
    this.updateTouchPts(pts);

    for (var i = 0; i < this.touchEls.length; i++) {
      var pt = this.transformCoord(this.touchPts[i]);
      this.touchEls[i].style.transform = "translate(" +
        (pt.x - touchImageData.hit.x) + "px," +
        (pt.y - touchImageData.hit.y) + "px)";
    }
  };

  /**
   * End the display of touch points on the page.
   */
  Mouse.prototype.touchEnd = function () {
    // TODO: sometimes only a few and not all touch points end

    // leave a fading out mark
    for (var i = 0; i < this.touchPts.length; i++) {
      this.click(this.touchPts[i]);
    }

    this.updateTouchPts([]);
  };

  /**
   * Update the number of touch points on the DOM.
   *
   * @private
   * @param {*} pts
   */
  Mouse.prototype.updateTouchPts = function (pts) {
    this.touchPts = pts;
    while (this.touchEls.length < pts.length) {
      this.setupTouchEl();
    }
    while (this.touchEls.length > pts.length) {
      this.touchEls[0].parentNode.removeChild(this.touchEls[0]);
      this.touchEls.shift();
    }
  };

  /**
   * Handle changing the element to trigger hover styles on mouse over.
   *
   * @private
   */
  Mouse.prototype.handleHovering = function () {
    var hoverEl;

    // If we're not hidden, get the hover element
    if (this.visible) {
      this.el.style.display = "none";

      var scrollPos = utils.getScroll(this.iframe.contentWindow);
      var vx = this.pos.x - scrollPos.x, vy = this.pos.y - scrollPos.y;
      hoverEl = this.iframe.contentDocument.elementFromPoint(vx, vy);

      // try this for getting the element in the iframe
      // NOTE: this won't work for iframes nested in iframes... not fixing it
      if (hoverEl && hoverEl.tagName === "IFRAME") {
        try {
          var innerSP = utils.getScroll(hoverEl.contentWindow);
          var rect = hoverEl.getBoundingClientRect();
          // TODO: remove border size from rect
          var cx = vx - Math.round(rect.x), cy = vy - Math.round(rect.y);
          hoverEl = hoverEl.contentDocument.elementFromPoint(cx, cy);
        } catch (e) {
          hoverEl = null;
        }
      }

      if (hoverEl) {
        if (this.previousHoverEl !== hoverEl) {
          this.removeHoverState();
          this.previousHoverEl = hoverEl;
          this.applyHoverState(hoverEl);
        }
      } else {
        if (this.previousHoverEl) {
          this.removeHoverState();
          this.previousHoverEl = null;
        }
      }

      this.el.style.display = "block";
    }
  };

  /**
   * Apply hover state all the way up the dom to the body element
   * @private
   */
  Mouse.prototype.applyHoverState = function (hoverEl) {
    hoverEl.setAttribute("fsrhover", "true");
    this.hoveredEls.push(hoverEl);
    if (hoverEl.parentElement && hoverEl.tagName !== "BODY") {
      this.applyHoverState(hoverEl.parentElement);
    }
  };

  /**
   * Remove all hover states from elements previously having it applied.
   * @private
   */
  Mouse.prototype.removeHoverState = function () {
    this.hoveredEls.forEach(function (el) {
      el.removeAttribute("fsrhover");
    }.bind(this));
    this.hoveredEls = [];
  };

  /**
   * Animate mouse movement spline to smooth out movements
   * @private
   */
  Mouse.prototype.animate = function (spline, startTime) {
    this.win.requestAnimationFrame(function (time) {
      startTime = startTime || time;
      var splineTime = time - startTime;
      if (splineTime >= spline.timeTillNext) {
        this.setPos(spline.end.x, spline.end.y);
        return;
      }
      this.playFrame(spline, splineTime);
      this.animate(spline, startTime);
    }.bind(this));
  };

  /**
   * Animate a frame of mouse movement
   * @private
   */
  Mouse.prototype.playFrame = function (spline, time) {
    // TODO: is this still necessary? I would think NaN is a bug in
    // the server we shouldn't be avoiding
    if (isNaN(spline.ctp1.x)) {
      spline.ctp1 = spline.ctp2;
    }
    var t = time / spline.timeTillNext;
    var bz = interpolateBezier(t, spline.start, spline.ctp1, spline.ctp2, spline.end);
    this.setPos(Math.round(bz.x), Math.round(bz.y));
  };

  /**
   * Create the mouse el
   * @private
   */
  Mouse.prototype.setupMouseEl = function () {
    // TODO: Move most of this into ui-css.js
    this.el = this.doc.createElement("img");
    this.el.style.position = "absolute";
    this.el.style.width = mouseImageData.width + "px";
    this.el.style.height = mouseImageData.height + "px";
    this.el.style.top = "0px";
    this.el.style.left = "0px";
    this.el.style.zIndex = 900;
    this.el.setAttribute("id", mouseImageData.id);
    this.el.setAttribute("src", mouseImageData.upImg);
    this.setVisible();
    this.doc.body.appendChild(this.el);
  };

  /**
   * Create a touch el
   * @private
   */
  Mouse.prototype.setupTouchEl = function () {
    // TODO: Move most of this into ui-css.js
    var el = this.doc.createElement("img");
    el.style.position = "absolute";
    el.style.width = touchImageData.width + "px";
    el.style.height = touchImageData.height + "px";
    el.style.top = "0px";
    el.style.left = "0px";
    el.style.zIndex = "999999900";
    el.style.transform = "translate(-100px,-100px)";
    el.setAttribute("src", touchImageData.data);
    this.touchEls.push(el);
    this.doc.body.appendChild(el);
  };

  // These are the bezier base functions
  function B4(t) {
    return t * t * t;
  }
  function B3(t) {
    return 3 * t * t * (1 - t);
  }
  function B2(t) {
    return 3 * t * (1 - t) * (1 - t);
  }
  function B1(t) {
    return (1 - t) * (1 - t) * (1 - t);
  }

  /**
   * Calculates the point for some time t for a cubic bezier curve.
   *
   * @private
   * @param {Number} t t bound between 0,1
   * @param {Object} C1 The initial point.
   * @param {Object} C2 The first control point.
   * @param {Object} C3 The second control point.
   * @param {Object} C4 The terminal point for this curve.
   */
  function interpolateBezier(t, C1, C2, C3, C4) {
    var pos = { "x": 0, "y": 0 };
    pos.x = C1.x * B1(t) + C2.x * B2(t) + C3.x * B3(t) + C4.x * B4(t);
    pos.y = C1.y * B1(t) + C2.y * B2(t) + C3.y * B3(t) + C4.y * B4(t);
    return pos;
  }

})();