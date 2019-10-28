/**
 * Mouse Graphics and Animation.
 * This is mainly for Web Playback
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author Alexei White: alexei.white $
 *
 * @modified 8/29/2011: 2011-05-06 08:50:51 -0700 (Fri, 06 May 2011) $

 * Created: Feb. 16, 2011
 */

fs.provide("rp.Replay.Playback.Mouse");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");
fs.require("rp.Replay.Playback.EventInfo");
fs.require("rp.Replay.Playback.CSS");
fs.require("rp.Replay.Playback.Animation");

(function () {

  /**
   * Basic constructor for the mouse animator
   */
  Replay.Playback.Mouse = function (eventstream) {
    // Set the event data
    this.events = eventstream;

    // Set up a start time
    this.startTime = this.pauseTime = utils.now();

    // Set the mouse data
    this.mouseImageData = {
      hit: {
        x: 6,
        y: 6
      },
      width: 30,
      height: 42,
      id: "fsrMouseImageIcon",
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAVCAYAAACZm7S3AAABEElEQVQ4y5WUwQqCQBRFRREiSaIoalGbIsqCNkEUbWrRtlWb6Bv6HnHjx/gRfo7dB3dqUlPnwWGei3vnvmFGy7IsGzjA5SrfjUtEXobC6oOWiUEbjDKW9CYGHTATYRAExgYSdUWRsYGI10psalAQmxiUipsa/BU3MagU1xnUiqsMSk9bF+SLGqcgFkGaph+DMAyzJEmkf4ILWIIer/VXrEV7iSgX9wo2jO3pO6+0SA9wV2ZiEMexrDsw5ltw1cyfu431DI7gAG5RFOlnsGVcu/CqOMscTMAU7PXdaT5QcX/eM119mvk0umrjSOyhOihVZX8S6ftykODEURagm9+5rGxehD7HmLBv/JNQCVrEzQvfdPLvxU7tkfoAAAAASUVORK5CYIIK"
    };

    // Set the mouse click image data
    this.clickImageData = {
      hit: {
        x: 20,
        y: 20
      },
      width: 40,
      height: 40,
      id: "fsrMouseClickImageIcon",
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOnAAADpwBB5RT3QAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOS8wOC8xMSDti4sAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAABN0lEQVQ4ja2UwXGEMAxFP54tZCtIGT4vYxWQXLhvBSwV7J3LpoA/A1dcRYYK6IQc1jDGkcmSiS7CknmSbMmFc24m2QOovfcjFLHWPkTkneSn9/5D8b8BaETkYkj2InIB0ASHJudEqzCSvQFQvwjVMt/AANQmlHkYqsG896MBgKPQHAwAzLJJgZYRY0p0qcEA4BRH9t6P1tqa5BeALnLdSU6RrSMJAF3aGcUwDLnK0LYtqqrafMc2TUzWA6wALUBOinmeH9j21wTgHpeyQFNYuJxr/H/hnJvTKCRvItLspvLcV4vI7VCG8dmlWaoZ/velnFJDiFri2SLjYrPWrrZ4T9o2RoE14Vzixr4G2zWsy7D+MVErUBmnuLHPie5yY2oysOzbCOzPvjkK+w1q/gLbg5oXYVOis9BvJScavDrJJHIAAAAASUVORK5CYII="
    };

    // Set the starting coordinate
    this.setXY(0, 0);

    // Set the initial paused state
    this.paused = true;

    // Set the hidden status
    this.hide();
  };

  /**
   * Begin playback of the mouse
   */
  Replay.Playback.Mouse.prototype.animate = function () {
    // Check if we have a start time
    if (!fs.isDefined(this.startTime) || isNaN(this.startTime)) {
      this.startTime = utils.now();
    }

    // Render the mouse image
    this.addMouse();

    // Begin the animation interval
    if (fs.isDefined(this.animationInterval)) {
      clearInterval(this.animationInterval);
    }

    this.animationInterval = setInterval(function (ctx) {
      return function () {
        ctx.playFrame();
      };
    }(this), 30);

    // set the current paused state
    this.paused = false;

    // Help us out with a minimum event index to speed lookups up
    this.minimumEventIndex = 0;
  };

  /**
   * Help speed up lookups by setting a minimum event index
   * @param index
   */
  Replay.Playback.Mouse.prototype.setMinimumEventIndex = function (index) {
    this.minimumEventIndex = index;
  };

  /**
   * Get the next mouse event starting at a particular index
   * @param index
   */
  Replay.Playback.Mouse.prototype.getNextMouseEvent = function (index, minTime) {
    var qref = this.events,
      i;
    for (i = 0; i < qref.length; i++) {
      if (qref[i].eventType == Replay.Playback.EventInfo.MOUSE_MOVE && qref[i].spline && (!minTime || (qref[i].eventTime <= minTime && qref[i].eventTime + qref[i].spline.timeTillNext >= minTime))) {
        qref[i].eventIndex = i;
        return qref[i];
      }
    }
  };

  /**
   * Set the minimum event index
   */
  Replay.Playback.Mouse.prototype.setMinimumEventTime = function (idx) {
    // Get the current time
    var currentTime = utils.now() - this.startTime;

    if (currentTime < idx) {
      this.startTime -= (idx - currentTime);
      this.currentMouseEvent = null;
    }
  };

  /**
   * Animate a frame of mouse movement
   */
  Replay.Playback.Mouse.prototype.playFrame = function () {
    // Get the current time
    var currentTime = utils.now() - this.startTime;

    // Make sure we have a current mouse event
    if (!this.currentMouseEvent) {
      this.currentMouseEvent = this.getNextMouseEvent(this.minimumEventIndex, currentTime);
      if (this.currentMouseEvent) {
        this.unhide();
      }
    }
    // Only animate if we are between two mouse events
    if (this.currentMouseEvent) {
      // Do some shuffling if necessary
      if (currentTime >= this.currentMouseEvent.eventTime + this.currentMouseEvent.spline.timeTillNext) {
        this.currentMouseEvent = this.getNextMouseEvent(this.currentMouseEvent.eventIndex + 1, currentTime);
        if (this.hidden) {
          this.unhide();
        }
      }
      if (this.currentMouseEvent) {
        var q = this.currentMouseEvent.spline;
        if (q) {
          if (isNaN(q.ctp1.x)) {
            q.ctp1 = q.ctp2;
          }
          var timeProg = (currentTime - this.currentMouseEvent.eventTime) / this.currentMouseEvent.spline.timeTillNext;
          var bz = Replay.Playback.Mouse.Bezier.getBezier(timeProg, q.start, q.ctp1, q.ctp2, q.end);
          this.setXY(bz.x, bz.y);
        }
      }
    }

  };

  /**
   * Hide the mouse
   */
  Replay.Playback.Mouse.prototype.hide = function () {
    // Set the flag
    this.hidden = true;

    // Apply the change
    this.applyHiddenStatus();
  };

  /**
   * Show the mouse if hidden
   */
  Replay.Playback.Mouse.prototype.unhide = function () {
    // Set the flag
    this.hidden = false;

    // Apply the change
    this.applyHiddenStatus();
  };

  /**
   * Apply the hidden status
   * @private
   */
  Replay.Playback.Mouse.prototype.applyHiddenStatus = function () {
    // Set the CSS
    if (this.ui) {
      if (this.hidden) {
        this.ui.style.visibility = "hidden";
      } else {
        this.ui.style.visibility = "visible";
      }
    }

  };

  /**
   * Pause playback
   */
  Replay.Playback.Mouse.prototype.pause = function () {
    // Set the start time
    this.pauseTime = utils.now();

    // set the flag
    this.paused = true;

    // Clear the animation interval
    if (fs.isDefined(this.animationInterval)) {
      clearInterval(this.animationInterval);
    }
  };

  /**
   * Resume playback
   */
  Replay.Playback.Mouse.prototype.resume = function () {
    // Do some timeline adjustment
    var currentTime = utils.now();
    this.startTime += currentTime - this.pauseTime;

    // Unset the flag
    this.paused = false;

    // Begin the animation interval
    if (fs.isDefined(this.animationInterval)) {
      clearInterval(this.animationInterval);
    }

    this.animationInterval = setInterval(function (ctx) {
      return function () {
        ctx.playFrame();
      };
    }(this), 30);
  };

  /**
   * Draw functions for debugging
   */
  Replay.Playback.Mouse.Draw = {
    drawSpline: function (spline) {
      var d = Replay.Playback.Mouse.Draw;
      d.drawLine(spline.start.x, spline.start.y, spline.end.x, spline.end.y, "#ff0000");
      d.drawLine(spline.start.x, spline.start.y, spline.ctp1.x, spline.ctp1.y, "#00ff00");
      d.drawLine(spline.end.x, spline.end.y, spline.ctp2.x, spline.ctp2.y, "#007777");
      d.drawLabel(spline.ctp1.x, spline.ctp1.y, "ctp1", "#00ff00");
      d.drawLabel(spline.ctp2.x, spline.ctp2.y, "ctp2", "#00dddd");
      d.drawPixel(spline.start.x, spline.start.y, 15, "#0000ff");
      d.drawPixel(spline.end.x, spline.end.y, 15, "#0000ff");
    },
    drawLabel: function (x, y, txt, color) {
      var px = document.createElement("div");
      px.style.position = "absolute";
      px.style.top = (y) + "px";
      px.style.left = (x) + "px";
      px.innerHTML = txt;

      if (!color)
        color = "#ff0000";
      px.style.backgroundColor = color;
      document.body.appendChild(px);
    },

    /**
     * Draw a pixel
     * @param x
     * @param y
     * @param sz
     * @param color
     */
    drawPixel: function (x, y, sz, color) {
      var px = document.createElement("div");
      px.style.position = "absolute";
      px.style.top = (y - (sz / 2)) + "px";
      px.style.left = (x - (sz / 2)) + "px";
      px.style.width = sz + "px";
      px.style.height = sz + "px";
      if (!color)
        color = "#ff0000";
      px.style.backgroundColor = color;
      px.style.overflow = "hidden";

      document.body.appendChild(px);
    },

    /**
     * Draw a line
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @param color
     */
    drawLine: function (x1, y1, x2, y2, color) {
      var d = Replay.Playback.Mouse.Draw,
        tx,
        ty,
        nx,
        ny;

      var slope = (y2 - y1) / (x2 - x1);
      if (Math.abs(slope) > 0.5) {
        if (y2 < y1) {
          tx = x2;
          ty = y2;
          x2 = x1;
          y2 = y1;
          x1 = tx;
          y1 = ty;
        }
        for (var y = y1; y <= y2; y++) {
          nx = ((y - y1) * (1 / slope)) + x1;
          ny = y;
          d.drawPixel(nx, ny, 1, color);
        }
      } else {
        if (x2 < x1) {
          tx = x2;
          ty = y2;
          x2 = x1;
          y2 = y1;
          x1 = tx;
          y1 = ty;
        }
        for (var x = x1; x <= x2; x++) {
          nx = x;
          ny = ((x - x1) * slope) + y1;
          d.drawPixel(nx, ny, 1, color);
        }
      }
    }
  };

  /**
   * A collection of static math functions for iterating bezier curves
   * @static
   * @private
   */
  Replay.Playback.Mouse.Bezier = {
    // These are the bezier base functions
    B4: function (t) {
      return t * t * t;
    },
    B3: function (t) {
      return 3 * t * t * (1 - t);
    },
    B2: function (t) {
      return 3 * t * (1 - t) * (1 - t);
    },
    B1: function (t) {
      return (1 - t) * (1 - t) * (1 - t);
    },

    /**
     * Calculates the point for some time t for a cubic bezier curve.
     * @param {Number} t t bound between 0,1
     * @param {Object} C1 The initial point.
     * @param {Object} C2 The first control point.
     * @param {Object} C3 The second control point.
     * @param {Object} C4 The terminal point for this curve.
     */
    getBezier: function (t, C1, C2, C3, C4) {
      var pos = {"x": 0, "y": 0};
      pos.x = C1.x * this.B1(t) + C2.x * this.B2(t) + C3.x * this.B3(t) + C4.x * this.B4(t);
      pos.y = C1.y * this.B1(t) + C2.y * this.B2(t) + C3.y * this.B3(t) + C4.y * this.B4(t);
      return pos;
    }
  };

  /**
   * Set the mouse coordinates.
   */
  Replay.Playback.Mouse.prototype.setXY = function (x, y) {
    if (!x) {
      x = 0;
    }
    if (!y) {
      y = 0;
    }

    this.x = x;
    this.y = y;

    if (!this.ui) {
      this.addMouse();
    }
    if (this.ui) {
      this.ui.style.top = (this.y - this.mouseImageData.hit.y) + "px";
      this.ui.style.left = (this.x - this.mouseImageData.hit.x) + "px";

      // If we're not hidden, get the hover element
      if (!this.hidden) {
        this.ui.style.display = "none";
        var scrollPos = utils.getScroll(window);
        var hoverEl = window.document.elementFromPoint(x - scrollPos.x, y - scrollPos.y);
        Replay.Playback.CSS.setHoverNode(hoverEl);
        this.ui.style.display = "block";
      }
    }
  };

  /**
   * Add the mouse image to the DOM.
   */
  Replay.Playback.Mouse.prototype.addMouse = function () {

    if (!this.ui) {
      this.ui = document.createElement("img");
      this.ui.style.position = "absolute";
      this.ui.style.width = this.mouseImageData.width + "px";
      this.ui.style.height = this.mouseImageData.height + "px";
      this.ui.style.top = "1px";
      this.ui.style.left = "1px";
      this.ui.style.zIndex = 2147483647;
      this.ui.setAttribute("id", this.mouseImageData.id);
      this.ui.setAttribute("src", this.mouseImageData.data);

      window.document.body.appendChild(this.ui);

      // Apply the hidden status
      this.applyHiddenStatus();

      // Put the cursor in the right position
      this.setXY(this.x, this.y);
    }
  };

  /**
   * Show a click animation at the provided coordinates.
   */
  Replay.Playback.Mouse.prototype.setClick = function (x, y) {
    var clickObj = window.document.createElement("img");
    clickObj.style.position = "absolute";
    clickObj.style.width = this.clickImageData.width + "px";
    clickObj.style.height = this.clickImageData.height + "px";
    clickObj.style.top = (y - this.clickImageData.hit.y) + "px";
    clickObj.style.left = (x - this.clickImageData.hit.x) + "px";
    clickObj.style.zIndex = "999999900";
    clickObj.setAttribute("id", this.clickImageData.id);
    clickObj.setAttribute("src", this.clickImageData.data);
    window.document.body.appendChild(clickObj);

    // Fade it out
    var fadeAnim = new Replay.Playback.Animation.Animator({
      singleton: clickObj,
      duration: Math.round(600 * this.playbackSpeedMultiplier),
      finished: function (el) {
        return function () {
          try {
            el.parentNode.removeChild(el);
          } catch (e) {
          }
        };
      }(clickObj),
      frameCallback: function (el) {
        return function (val) {
          val = 1 - val;
          el.style.opacity = val;
          el.style.filter = 'alpha(opacity=' + Math.round(val * 100) + ')';
        };
      }(clickObj)
    });

    fadeAnim.go();
  };

  /**
   * Remove the mouse from the DOM.
   */
  Replay.Playback.Mouse.prototype.removeMouse = function () {
    // Remove it from the dom
    if (this.ui) {
      try {
        this.ui.parentNode.removeChild(this.ui);
      } catch(e) {
        // Nada
      }
      this.ui = null;
    }
  };

})();