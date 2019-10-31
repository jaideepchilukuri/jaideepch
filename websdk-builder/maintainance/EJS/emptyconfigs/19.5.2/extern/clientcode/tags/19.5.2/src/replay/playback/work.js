/**
 * SessionReplay Playback Work Module
 *
 * Does the work of an event
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

fs.provide("rp.Replay.Playback.Work");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");
fs.require("rp.Replay.Fragments");
fs.require("rp.Replay.Playback.EventInfo");
fs.require("rp.Replay.Playback.Mouse");
fs.require("rp.Replay.Playback.Dom");
fs.require("rp.Replay.Playback.Animation");
fs.require("rp.Replay.Playback.Typing");
fs.require("rp.Replay.Playback.CSS");

(function () {

  /**
   * The work namespace
   */
  Replay.Playback.Work = {
    /**
     * Keeps track of input sizes
     */
    _inputSizes: {},
    /**
     * Keeps track of scroll positions
     */
    _scrollPos: {},
    /**
     * Keeps track of the body scroll position
     */
    lastBodyScrollPos: { x: 0, y: 0 }
  };

  /**
   * Keeps track of div scroll positions
   */
  Replay.Playback.Work.KeepTrackOfScrollPos = function (node) {
    var nodeXpath = XPath.getMapping(node),
      nodeInfo = {};

    if (Replay.Playback.Work._scrollPos[nodeXpath]) {
      nodeInfo = Replay.Playback.Work._scrollPos[nodeXpath];
    } else {
      Replay.Playback.Work._scrollPos[nodeXpath] = nodeInfo;
    }

    nodeInfo.scrTop = node.scrollTop;
    nodeInfo.scrLeft = node.scrollLeft;
  };

  /**
   * Re-applies old scroll Positions
   */
  Replay.Playback.Work.ApplyOldScrollPos = function (node) {
    if (!node) {
      node = document;
    }
    // selected node list should be only those that we are applying scroll positions too: div
    var nodes = node.querySelectorAll("div");
    for (var i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      if (Replay.Playback.Work._scrollPos[nodeXpath]) {
        nodes[i].scrollTop = Replay.Playback.Work._scrollPos[nodeXpath].scrTop;
        nodes[i].scrollLeft = Replay.Playback.Work._scrollPos[nodeXpath].scrLeft;
      }
    }
  };

  /**
   * Keeps track of input sizes
   */
  Replay.Playback.Work.KeepTrackOfInputSize = function (node) {
    var nodeXpath = XPath.getMapping(node),
      nodeInfo = {};

    if (Replay.Playback.Work._inputSizes[nodeXpath]) {
      nodeInfo = Replay.Playback.Work._inputSizes[nodeXpath];
    } else {
      Replay.Playback.Work._inputSizes[nodeXpath] = nodeInfo;
    }

    nodeInfo.width = node.offsetWidth;
    nodeInfo.height = node.offsetHeight;
  };

  /**
   * Re-applies old input sizes
   */
  Replay.Playback.Work.ApplyOldInputSizes = function (node) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("select");
    for (var i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      if (Replay.Playback.Work._inputSizes[nodeXpath]) {
        nodes[i].style.width = Replay.Playback.Work._inputSizes[nodeXpath].width + "px";
      }
    }
  };

  /**
   * Restores input values
   */
  Replay.Playback.Work.ApplyOldInputValues = function (node, old_input_values) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("input"),
      i;
    for (i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      if (old_input_values[nodeXpath])
        nodes[i].value = old_input_values[nodeXpath];
      old_input_values[nodeXpath] = null;
    }
    i = 0;
    for (var key in old_input_values) {
      if (old_input_values[key] !== null) {
        if (i < nodes.length) {
          nodes[i].value = old_input_values[key];
        }
      }
      i++;
    }
  };

  /**
   * Save old input sizes
   */
  Replay.Playback.Work.SaveOldInputValues = function (node) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("input"),
      old_input_values = {};
    for (var i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      old_input_values[nodeXpath] = nodes[i].value;
    }
    return old_input_values;
  };

  /**
   * Apply the old values to the new DOM content
   * @param node  The new DOM content
   * @param old_textarea_values  array of key value pairs{key:xpath, value: textarea.value}
   * @constructor
   */
  Replay.Playback.Work.ApplyOldTextareaValues = function (node, old_textarea_values) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("textarea"),
      i;
    for (i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      if (old_textarea_values[nodeXpath])
        nodes[i].value = old_textarea_values[nodeXpath];
      old_textarea_values[nodeXpath] = null;
    }

    i = 0;
    for (var key in old_textarea_values) {
      if (old_textarea_values[key] !== null) {
        if (i < nodes.length)
          nodes[i].value = old_textarea_values[key];
      }
      i++;
    }
  };

  /**
   * Creates a backup of the textarea values by storing into an array using node xpath for indexing
   * @param node
   * @return {key:nodeXpath, value: nodeValue
   * @constructor
   */
  Replay.Playback.Work.SaveOldTextareaValues = function (node) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("textarea"),
      old_textarea_values = {};
    for (var i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      old_textarea_values[nodeXpath] = nodes[i].value;
    }
    return old_textarea_values;
  };

  /**
   * Restores Select values
   */
  Replay.Playback.Work.ApplyOldSelectValues = function (node, old_select_values, old_index_values) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("select"),
      i;
    for (i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      if (old_select_values[nodeXpath]) {
        while (old_select_values[nodeXpath].length > 0) {
          nodes[i].appendChild(old_select_values[nodeXpath][0]);
        }
        nodes[i].selectedIndex = old_index_values[nodeXpath];
        old_select_values[nodeXpath] = null;
      }
    }

    i = 0;
    for (var key in old_select_values) {
      if (old_select_values[key] !== null) {
        if (i < nodes.length) {
          while (old_select_values[key].length > 0) {
            nodes[i].appendChild(old_select_values[key][0]);
          }
          nodes[i].selectedIndex = old_index_values[key];
        }
      }
      i++;
    }
  };

  /**
   * Save old Select options
   */
  Replay.Playback.Work.SaveOldSelectValues = function (node) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("select"),
      old_select_values = {};
    for (var i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      old_select_values[nodeXpath] = nodes[i].childNodes;
    }
    return old_select_values;
  };

  /**
   * Save old Selected index in Selects
   */
  Replay.Playback.Work.SaveOldSelectIndex = function (node) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("select"),
      old_selected_index = {};
    for (var i = 0; i < nodes.length; i++) {
      var nodeXpath = XPath.getMapping(nodes[i]);
      old_selected_index[nodeXpath] = nodes[i].selectedIndex;
    }
    return old_selected_index;
  };

  /**
   * Get the call stack size
   * @returns {number}
   */
  Replay.Playback.Work.getCallStackSize = function () {
    var count = 0,
      fn = arguments.callee;
    while ((fn = fn.caller)) {
      count++;
    }
    return count;
  };

  /**
   * save the src values from iframes within a node context
   * @param node
   * @return {Object}
   * @constructor
   */
  Replay.Playback.Work.SaveIFrameSrcValues = function (node) {
    if (!node) {
      node = document;
    }
    // Get all iFrames within this node
    var nodes = node.querySelectorAll("iframe"),
      old_src_values = [];

    // Iterate through the iFrames
    for (var i = 0; i < nodes.length; i++) {

      old_src_values.push({
        path: XPath.getMapping(nodes[i]).join('/'),
        nd: nodes[i]
      });
    }
    return old_src_values;
  };

  /**
   * Update the iFrame src values using previously saved xpaths/src combinations from a node context
   * @param node
   * @param oldSrcValues
   * @constructor
   */
  Replay.Playback.Work.ApplyOldIFrameSrcValues = function (node, oldSrcValues, isSubNode) {
    if (!node) {
      node = document;
    }
    var nodes = node.querySelectorAll("iframe");
    for (var i = 0; i < nodes.length; i++) {
      var pth = XPath.getMapping(nodes[i]).join('/');
      for (var k = 0; k < oldSrcValues.length; k++) {
        if (oldSrcValues[k].path == pth) {
          nodes[i].parentNode.insertBefore(oldSrcValues[k].nd, nodes[i]);
          nodes[i].parentNode.removeChild(nodes[i]);
          oldSrcValues.nd = null;
        }
      }
    }
  };

  /**
   * @class Does event work
   * @constructor
   */
  Replay.Playback.Work.Worker = function (shouldDoTypingEvents, shouldDoParentFrameChanges, shouldRemapHoverStyles, playbackSpeedMultiplier) {
    /**
     * Save the speed multiplier
     */
    this.playbackSpeedMultiplier = playbackSpeedMultiplier;

    /**
     * Should we remap hover styles after dom changes?
     */
    this.shouldRemapHoverStyles = shouldRemapHoverStyles;

    /**
     * Should we do the typing events?
     */
    this.shouldDoTypingEvents = shouldDoTypingEvents;

    /**
     * Should we do top frame scrolling?
     */
    this.shouldDoParentFrameChanges = shouldDoParentFrameChanges;

    /**
     * Load the background image
     */
    this.canvasBackgroundImage = new Image();
    this.canvasImageReady = false;
    this.canvasBackgroundImage.onload = fs.proxy(function () {
      this.canvasImageReady = true;
      this.applyCanvasBackground(document.body);
    }, this);
    this.canvasBackgroundImage.src = '/special_assets/framebg.png';

    /**
     * Pause event
     */
    this.Pause = new utils.FSEvent();

    /**
     * Resume event
     */
    this.Resume = new utils.FSEvent();

    /**
     * Scroll event
     */
    this.Scroll = new utils.FSEvent();

    /**
     * Hide Mouse event
     */
    this.HideMouse = new utils.FSEvent();

    /**
     * Show Mouse event
     */
    this.ShowMouse = new utils.FSEvent();

    /**
     * Remove Mouse event
     */
    this.RemoveMouse = new utils.FSEvent();

    /**
     * Add Mouse event
     */
    this.AddMouse = new utils.FSEvent();

    /**
     * Set Mouse Click at X,Y
     */
    this.SetMouseClick = new utils.FSEvent();

    /**
     * Fires before the dom was updated
     */
    this.BeforeDomUpdated = new utils.FSEvent();

    /**
     * The dom was updated
     */
    this.DomUpdated = new utils.FSEvent();

    /**
     * An input was serialized
     */
    this.InputSerialized = new utils.FSEvent();

    /**
     * The frame size was set
     */
    this.FrameSized = new utils.FSEvent();

    /**
     * The orientation change was set
     */
    this.OrientationChanged = new utils.FSEvent();

    /**
     * The browser display is probably dirty
     */
    this.ProbablyIsDirty = new utils.FSEvent();

    /**
     * The rough time index
     * @type {number}
     * @private
     */
    this._approxTimeIndex = 0;

  };

  /**
   * Apply all the initial scroll positions
   * @param evts
   */
  Replay.Playback.Work.Worker.prototype.applyInitialScrollPositions = function (evts) {
    var earr = evts.events,
      evt,
      atm = this._approxTimeIndex;
    for (var i = 0; i < earr.length; i++) {
      evt = earr[i];
      if (!evt.contextFullXpath || evt.contextFullXpath === "") {
        if (evt.position && (evt.eventType == Replay.Playback.EventInfo.FRAME_SCROLL || evt.eventType == Replay.Playback.EventInfo.ZOOM || evt.eventType == Replay.Playback.EventInfo.ORIENTATION_CHANGE)) {
          this.runEvent(evt);
          break;
        }
      }
    }
    this._approxTimeIndex = atm;
  };

  /**
   * Return the event type as a string
   */
  Replay.Playback.Work.Worker.prototype.getEventTypeString = function (evt) {
    for (var item in Replay.Playback.EventInfo) {
      if (evt.eventType == Replay.Playback.EventInfo[item]) {
        return item.toString();
      }
    }
  };

  /**
   * Pre-populate all the iFrames
   * @param cb
   */
  Replay.Playback.Work.Worker.prototype.prepopulateIframes = function (startIndex, dataStream, cb) {
    var tallyTime = 0,
      lookIndex = startIndex,
      getNode = Replay.Playback.Dom.retrieveDomNodeByXPath,
      foundOne = false;

    while (tallyTime < 20000 && lookIndex < dataStream.length) {
      var evt = dataStream[lookIndex];
      // Handle each event type. Not all of these will have any behaviors though.
      if (evt.eventType == Replay.Playback.EventInfo.DOM_SERIALIZE) {
        // Dom Serialize *********************************************************************
        if (evt.isTopContext() === false) {
          node = getNode(evt.contextFullXpath);
          if (node && node.src.indexOf('iframenotrecorded') > -1 && evt.domFragment) {
            var newURL = "/replay/proxy?guid=" + fs.enc(evt.domFragment.guid);
            node.src = Replay.Playback.Dom.getAbsoluteFromFragmentURL(newURL);
            foundOne = true;
          }
        }
      }
      tallyTime = evt.eventTime;
      lookIndex++;
    }

    if (cb) {
      if (foundOne) {
        // Wait for it to load a bit
        setTimeout(cb, 1500);
      } else {
        cb();
      }
    }
  };

  /**
   * Make sure all canvas nodex underneath nd have their backgrounds set
   * @param nd
   */
  Replay.Playback.Work.Worker.prototype.applyCanvasBackground = function (nd) {
    if (this.canvasImageReady) {
      var els = nd.querySelectorAll("canvas"),
        cv;
      for (var i = 0; i < els.length; i++) {
        cv = els[i];
        var hasbg = cv.getAttribute("__hasbg");
        if (!hasbg) {
          var context = cv.getContext("2d"),
            ptrn = context.createPattern(this.canvasBackgroundImage, 'repeat'); // Create a pattern with this image, and set it to "repeat".
          context.fillStyle = ptrn;
          context.fillRect(0, 0, cv.width, cv.height);
          cv.setAttribute("__hasbg", "true");
        }
      }
    }
  };

  /**
   * Do the work associated with an event.
   * @param evt {Object} The event object
   * @param cb {Function} Callback
   */
  Replay.Playback.Work.Worker.prototype.runEvent = function (evt, cb) {
    var i,
      node,
      new_node,
      frameContext,
      input_nodes,
      target_node,
      htmlContent,
      inputtype,
      diffCollection;

    // Make sure callback exists
    cb = cb || function () { };

    // Make a note of the approximate time index
    this._approxTimeIndex = evt.eventTime;

    // Only do anything if there are any more events
    if (evt) {
      // Added for 15.x+
      if (evt.contextFullXpath == "html,head") {
        evt.contextFullXpath = "";
      }

      // Get a quick reference to the getnode function;
      var getNode = Replay.Playback.Dom.retrieveDomNodeByXPath;

      // Handle each event type. Not all of these will have any behaviors though.
      if (evt.eventType == Replay.Playback.EventInfo.DOM_SERIALIZE) {
        // Dom Serialize *********************************************************************
        if (evt.isTopContext() === false) {

          node = getNode(evt.contextFullXpath);
          utils.Bind(node, "load", fs.proxy(function () {
            // Remap styles for this document
            Replay.Playback.CSS.initInDOM(utils.getFrameWindow(node).document);

            var sp = Replay.Playback.Work.lastBodyScrollPos;
            utils.setScroll(window, sp.x, sp.y);

            // Signal the dom was updated
            this.DomUpdated.fire(Replay.Playback.Dom.getFrameWindow(node).document);

            // Resume playback
            Replay.player.player.resume();

            // Fire is dirty
            this.ProbablyIsDirty.fire();

            // Call the callback
            cb();
          }, this));

          if (evt.domFragment) {
            var newURL = "/replay/proxy?guid=" + evt.domFragment.guid;

            if (node && (!node.src || node.src.toString().indexOf(newURL) == -1)) {
              node.src = Replay.Playback.Dom.getAbsoluteFromFragmentURL(newURL);
              this.Pause.fire();
            }
          }
        }
      } else if (evt.eventType == Replay.Playback.EventInfo.FRAME_SIZE) {
        // Set frame size ****************************************************************************

        if (evt.isTopContext() === true) {
          if (this.shouldDoParentFrameChanges) {
            Replay.Playback.Dom.setFrameSize(evt.size.width, evt.size.height);
          }

          // Signal that this happened
          this.FrameSized.fire(parseInt(evt.size.width), parseInt(evt.size.height));

        } else {
          node = getNode(evt.contextFullXpath);

          if (node) {
            node.style.width = evt.size.width + "px";
            node.style.height = evt.size.height + "px";

            // Fire is dirty
            this.ProbablyIsDirty.fire();
          }
        }

        // Call the callback
        cb();

      } else if (evt.eventType == Replay.Playback.EventInfo.ORIENTATION_CHANGE) {
        this.OrientationChanged.fire(parseInt(evt.mobileClientSize.width), parseInt(evt.mobileClientSize.height), parseInt(evt.mobileInnerSize.width), parseInt(evt.mobileInnerSize.height), parseInt(evt.isLandscape));

        // Call the callback
        cb();
      }

      // Else was removed on purpose
      if (evt.position && (evt.eventType == Replay.Playback.EventInfo.FRAME_SCROLL || evt.eventType == Replay.Playback.EventInfo.ZOOM || evt.eventType == Replay.Playback.EventInfo.ORIENTATION_CHANGE)) {
        // Frame or window scroll *********************************************************************

        // Start by assuming we are scrolling the main window
        frameContext = window;
        if (evt.contextFullXpath !== "" && evt.isTopContext() === false) {
          frameContext = Replay.Playback.Dom.getFrameWindow(getNode(evt.contextFullXpath));
        } else {
          Replay.Playback.Work.lastBodyScrollPos = evt.position;
        }

        // Clear any frame scroll restore timer
        clearTimeout(window.scrollRestore);

        if (frameContext) {
          // Get the scroll position
          var currentScroll = utils.getScroll(frameContext);

          // Fire the scroll event
          this.Scroll.fire(frameContext, currentScroll, evt.position.x, evt.position.y);

          if ((this.shouldDoParentFrameChanges && evt.isTopContext()) || !evt.isTopContext()) {
            // Only do anything if there is a difference
            if (currentScroll.x != evt.position.x || currentScroll.y != evt.position.y) {
              // Set the scroll directly using the DOM
              utils.setScroll(frameContext, evt.position.x, evt.position.y);
            }
          }

          // Fire is dirty
          this.ProbablyIsDirty.fire();
        }
      } else if (evt.eventType == Replay.Playback.EventInfo.MOUSE_MOVE) {
        // Mouse position *********************************************************************

      } else if (evt.eventType == Replay.Playback.EventInfo.WINDOW_MOUSEOUT_MOUSEENTER) {
        // Window hover state *********************************************************************
        if (evt.basicState.iState == 1) {
          // Mouse OVER page
          this.ShowMouse.fire();
        } else {
          // Mouse OUT page
          this.HideMouse.fire();
        }
      } else if (evt.eventType == Replay.Playback.EventInfo.INPUT_SERIALIZE) {
        // Form input serialize *********************************************************************
        frameContext = window.document;
        if (evt.contextFullXpath !== "" && evt.isTopContext() === false) {
          frameContext = Replay.Playback.Dom.getFrameWindow(getNode(evt.contextFullXpath)).document;
        }
        node = getNode(evt.xpathIndex, frameContext);
        if (node)
          if (node.options && evt.options) {

            // Null out the current options list
            node.options.length = 0;

            for (var h = 0; h < evt.options.length; h++) {
              var opt = window.document.createElement("option");
              opt.text = evt.options[h].t;
              opt.value = evt.options[h].v;
              node.options.add(opt);
            }

            // Apply the size information
            if (evt.size) {
              if (evt.size.width > 0) {
                node.style.width = evt.size.width + "px";
                node.style.height = evt.size.height + "px";
                Replay.Playback.Work.KeepTrackOfInputSize(node);
              }
            }

            // Apply the selected index (if it's a select box)
            if (fs.isDefined(node.selectedIndex) && evt.iVal) {
              node.selectedIndex = evt.iVal;
            }

          } else {
            inputtype = node.getAttribute("type");

            // In IE input/button.outerHTML doesn't return the type attribute if the value is the default value, "text" for input, "submit" for button. This will set the type for use in CSS.
            // http://issuetracking.foreseeresults.com/jira/browse/SRIMP-1172, tom 5/17/2012
            if (!inputtype && node.type && node.outerHTML.indexOf("type") < 0) {
              node.setAttribute("type", node.type);
            }
            if (inputtype && (inputtype == "checkbox" || inputtype == "radio")) {
              node.checked = evt.basicState.bState;
            } else {
              if (this.shouldDoTypingEvents) {
                if (!fs.isDefined(evt.strData) || evt.strData == "null") {
                  evt.strData = "";
                }

                if (!!node.getAttribute("class") && node.getAttribute("class").indexOf("fsrHidden") > 0 && node.tagName == 'INPUT') {
                  evt.strData = evt.strData.replace(/[\W\w]/g, '*');
                }

                node.value = evt.strData;
              }
            }
          }

        // Apply the size
        if (node && fs.isDefined(evt.widthStyle)) {
          node.style.width = evt.widthStyle;
          node.style.height = evt.heightStyle;
        }

        // Signal that we serialized a node
        if (node) {
          this.InputSerialized.fire(node, evt);
        }

        // Fire is dirty
        this.ProbablyIsDirty.fire();

      } else if (evt.eventType == Replay.Playback.EventInfo.FOCUS_BLUR && this.shouldDoTypingEvents) {
        // Input focus or blur *********************************************************************

        // Fire is dirty
        this.ProbablyIsDirty.fire();

      } else if (evt.eventType == Replay.Playback.EventInfo.KEY_PRESS && this.shouldDoTypingEvents) {
        // Key press *********************************************************************

        Replay.Playback.Typing.handleTypingEvent(evt);

        // Try to get the node
        node = getNode(evt.xpathInfo, frameContext);

        // Signal is dirty
        this.ProbablyIsDirty.fire(node);

      } else if (evt.eventType == Replay.Playback.EventInfo.CARET_INFO && this.shouldDoTypingEvents) {
        // Cursor position *********************************************************************

        Replay.Playback.Typing.handleCaretEvent(evt);

        // Try to get the node
        node = getNode(evt.xpathInfo, frameContext);

        // Fire is dirty
        this.ProbablyIsDirty.fire(node);

      } else if (evt.eventType == Replay.Playback.EventInfo.VALUE_CHANGED) {
        // Select box value changed *********************************************************************

        node = getNode(evt.xpathIndex);
        if (node) {
          node.selectedIndex = evt.iVal;
        }

        // updates checkbox values if they exist
        if (node && node.checked !== null) {
          node.checked = evt.basicState.bState;
        }

        // Fire is dirty
        this.ProbablyIsDirty.fire();
      } else if (evt.eventType == Replay.Playback.EventInfo.DOM_MUTATION_NODE_MODIFIED) {
        // The contents of a DOM node was changed *********************************************************************

        // First remove the mouse
        this.RemoveMouse.fire();

        // Back up the scroll position
        var sp = Replay.Playback.Work.lastBodyScrollPos;
        utils.setScroll(window, sp.x, sp.y);
        clearTimeout(window.scrollRestore);

        frameContext = window.document;
        if (evt.contextFullXpath !== "" && evt.isTopContext() === false) {
          frameContext = Replay.Playback.Dom.getFrameWindow(getNode(evt.contextFullXpath)).document;
        }

        // Don't do anything if we're trying to modify the HTML tag
        if (evt.xpathIndex != "html") {
          // Get the node reference from the xpath and context
          node = getNode(evt.xpathIndex, frameContext);

          // Only do something if we have a node
          if (node) {
            // Signal dom about to be updated
            this.BeforeDomUpdated.fire(node);

            //save the src values of any iFrames within the node
            var old_src_values = Replay.Playback.Work.SaveIFrameSrcValues(node);
            var old_input_values = Replay.Playback.Work.SaveOldInputValues(node);
            var old_select_values = Replay.Playback.Work.SaveOldSelectValues(node);
            var old_index_values = Replay.Playback.Work.SaveOldSelectIndex(node);
            var old_textarea_values = Replay.Playback.Work.SaveOldTextareaValues(node);

            if (evt.domFragment && !evt.domFragment.html && !evt.domFragment.guid) {
              evt.domFragment.html = " ";
            }

            if (evt.domFragment) {
              htmlContent = (evt.domFragment.html || Replay.Fragments.domFragments[evt.domFragment.guid].fragment);
            } else {
              diffCollection = evt.headDiffCollection.coll;
            }

            // Remember the scroll position
            var scrollPosition = { x: node.scrollLeft, y: node.scrollTop };

            // Remember which input elements were checked/selected
            input_nodes = node.querySelectorAll("input");
            var checked_node_index = {},
              selected_node_index = {};

            for (i = 0; i < input_nodes.length; i++) {
              if (input_nodes[i].checked) {
                checked_node_index[i] = true;
              }
            }

            for (i = 0; i < input_nodes.length; i++) {
              if (input_nodes[i].checked) {
                selected_node_index[i] = true;
              }
            }

            // Do it as long as its not non-block element like IMG
            if (node.tagName != "IMG" && node.tagName != "INPUT" && node.tagName != "BODY" && node.tagName != "HEAD") {
              node.innerHTML = htmlContent;

              // Restore iFrame src values within the node
              Replay.Playback.Work.ApplyOldIFrameSrcValues(node, old_src_values);
              Replay.Playback.Work.ApplyOldInputValues(node, old_input_values);
              Replay.Playback.Work.ApplyOldTextareaValues(node, old_textarea_values);
              Replay.Playback.Work.ApplyOldSelectValues(node, old_select_values, old_index_values);

              // Now restore input sizes on that node
              Replay.Playback.Work.ApplyOldInputSizes(node);

              // Now restore scroll positions on that node and sub nodes.
              Replay.Playback.Work.ApplyOldScrollPos(node);
            }

            // If we're replacing the innerHTML of the body Awesomium would throw exceptions.  We need to use actual
            // DOM methods here.
            if (node.tagName == "BODY") {

              // Pause the playback
              this.Pause.fire();

              var fragment = document.createDocumentFragment();
              var hidden = document.createElement("div");
              hidden.innerHTML = htmlContent;

              for (i = 0; i < hidden.childNodes.length; i++) {
                fragment.appendChild(hidden.childNodes[i].cloneNode(true));
              }

              Replay.Playback.Dom.clearInnerHTML(node);

              node.appendChild(fragment);

              // restore iFrame src values on the node element, done after node.append so that the contextXpaths are the same
              Replay.Playback.Work.ApplyOldIFrameSrcValues(node, old_src_values);
              Replay.Playback.Work.ApplyOldInputValues(node, old_input_values);
              Replay.Playback.Work.ApplyOldTextareaValues(node, old_textarea_values);
              Replay.Playback.Work.ApplyOldSelectValues(node, old_select_values, old_index_values);

              // Now restore input sizes on that node
              Replay.Playback.Work.ApplyOldInputSizes(node);

              // Now restore scroll positions on all nodes, because we have either updated the body or the head.
              Replay.Playback.Work.ApplyOldScrollPos(document);

              var wait = 100;

              // if this is a head update let's pause for a little longer to let the stylesheets load in
              if (node.tagName == "HEAD") {
                wait = 5000;
              }

              setTimeout(fs.proxy(function () {
                // First remove the mouse
                this.RemoveMouse.fire();

                // Add the mouse back
                this.AddMouse.fire();

                // Pause the playback
                this.Resume.fire();

                // Signal the dom was updated
                this.DomUpdated.fire(node);

                // Fire is dirty
                this.ProbablyIsDirty.fire();

                // Call the callback
                cb();
              }, this), wait);

              if (this.shouldRemapHoverStyles) {
                // Remap hover styles
                Replay.Playback.CSS.remapAllHoverStyles(frameContext);
                Replay.Playback.CSS.attachHoverElements(frameContext);
              }

              // Re-apply the checks and selects
              input_nodes = node.querySelectorAll("input");

              for (i = 0; i < input_nodes.length; i++) {
                if (checked_node_index[i]) {
                  input_nodes[i].checked = true;
                } else if (selected_node_index[i]) {
                  input_nodes[i].selected = true;
                }
              }

              // Protect the scroll position
              if (scrollPosition.x !== 0 || scrollPosition.y !== 0) {
                setTimeout(function (nd, sp) {
                  return function () {
                    nd.scrollTop = sp.y;
                    nd.scrollLeft = sp.x;
                  };
                }(node, scrollPosition), wait);
              }

              return;
            } else if (diffCollection && node.tagName == "HEAD") {
              var diff,
                head_node = document.getElementsByTagName("head")[0];
              for (i = 0; i < diffCollection.length; i++) {
                diff = diffCollection[i];
                if (diff.op_type == "INSERT_BEFORE" || diff.op_type == "INSERT" || diff.op_type == "APPEND_CHILD") {
                  // Create the new node
                  if (fs.toLowerCase(diff.tagName) == "#text") {
                    new_node = document.createTextNode(decodeURIComponent(diff.innerHtml));
                  } else if (fs.toLowerCase(diff.tagName) == "#comment") {
                    new_node = document.createComment("Actual comment not needed.");
                  } else {
                    try {
                      new_node = document.createElement(diff.tagName);
                    } catch (e) {
                      continue;
                    }

                    // Set the attributes for the new node
                    if (diff.attributes) {
                      for (var j = 0; j < diff.attributes.length; j++) {
                        try {
                          if (fs.isDefined(diff.attributes[j].Value)) {
                            diff.attributes[j].value = diff.attributes[j].Value;
                          }
                          new_node.setAttribute(diff.attributes[j].Key, diff.attributes[j].value);
                        } catch (e) {
                        }
                      }
                    }

                    // Set the innerHtml of the new node
                    if (diff.innerHtml) {
                      new_node.innerHTML = diff.innerHtml;
                    }
                  }

                  // Get a reference to the HTML Node that the new node is being inserted before (doesn't apply to 'append_child')
                  if (diff.op_type != "APPEND_CHILD") {
                    target_node = getNode(diff.target_xpath);
                    if (target_node && diff.op_type == "INSERT") {
                      target_node = target_node.nextSibling;
                    }
                  }

                  // Inserts the new node before the target node (or appends it)
                  if (target_node) {
                    head_node.insertBefore(new_node, target_node);
                  } else {
                    head_node.appendChild(new_node);
                  }
                }
                else if (diff.op_type == "DELETE") {
                  target_node = getNode(diff.target_xpath);
                  if (target_node) {
                    head_node.removeChild(target_node);
                  }
                }
              }

            } else if ((fs.toLowerCase(htmlContent).indexOf("<link") > -1 && this.shouldRemapHoverStyles)) {
              Replay.Playback.CSS.remapAllHoverStyles(frameContext);
              Replay.Playback.CSS.attachHoverElements(frameContext);
            }

            // Re-apply the checks and selects
            input_nodes = node.querySelectorAll("input");

            for (i = 0; i < input_nodes.length; i++) {
              if (checked_node_index[i]) {
                input_nodes[i].checked = true;
              } else if (selected_node_index[i]) {
                input_nodes[i].selected = true;
              }
            }

            // Add the mouse back
            this.AddMouse.fire();

            // Do any canvas tags
            this.applyCanvasBackground(node);

            // Signal the dom was updated
            this.DomUpdated.fire(node);

            // Fire is dirty
            this.ProbablyIsDirty.fire();

          } else {
            // Cancel scroll restore
            clearTimeout(window.scrollRestore);
          }
        }

      } else if (evt.eventType == Replay.Playback.EventInfo.DOM_MUTATION_NODE_ATTR_MODIFIED) {
        // A DOM node's attribute was changed *********************************************************************
        frameContext = window.document;

        if (evt.contextFullXpath !== "" && evt.isTopContext() === false) {
          frameContext = Replay.Playback.Dom.getFrameWindow(getNode(evt.contextFullXpath)).document;
        }

        node = getNode(evt.xpathIndex, frameContext);

        // Only do something if we have a node
        if (node) {
          // Fix blank attributes
          if (evt.attrName == "style" && !evt.strData) {
            evt.strData = "";
          }

          // This fixes opacity issues for sessions recorded in IE but played in FF/Webkit
          if (evt.attrName == "style" && fs.toLowerCase(evt.strData).indexOf("alpha") > -1) {
            var strv = evt.strData,
              opac = 0;
            strv = strv.substr(strv.indexOf("opacity"));
            strv = strv.substr(strv.indexOf("="));
            strv = strv.substr(0, strv.indexOf(")"));
            strv = strv.replace("=", "").replace(")", "");
            opac = parseFloat(strv);
            evt.strData += "; opacity:" + (opac / 100) + ";";
          }

          if (!(fs.toLowerCase(evt.attrName) == "src" && fs.toLowerCase(node.tagName) == "iframe") && fs.toLowerCase(evt.attrName) != "classname") {
            // Additional check to stop img src changes if the img is being blocked.
            if ((evt.attrName != "style" || !browser.isIE) && !(evt.attrName == "src" && fs.toLowerCase(node.tagName) == "img" && node.className !== null && node.className.indexOf("fsrHidden") > -1)) {
              if (typeof evt.strData == "undefined") {
                evt.strData = "";
              }
              // only set the attribute if we aren't setting the SRC element of a script tag.
              if (!(node.tagName == "script" && fs.toLowerCase(evt.attrName) == "src")) {
                node.setAttribute(evt.attrName, evt.strData);
              }
            } else if (evt.attrName == "style") {
              node.style.cssText = evt.strData;
            }
          } else if (fs.toLowerCase(evt.attrName) == "classname") {
            node.className = evt.strData;
          }

          if (evt.attrName == "disabled") {
            node.disabled = evt.strData;
          }

          // Fire is dirty
          this.ProbablyIsDirty.fire();

        }

      } else if (evt.eventType == Replay.Playback.EventInfo.JAVASCRIPT_ERROR) {
        // A JS Error was registered *********************************************************************

      } else if (evt.eventType == Replay.Playback.EventInfo.MOUSE_CLICK) {
        // Mouse click *********************************************************************
        if (evt.xpathIndex) {
          frameContext = window.document;

          if (evt.contextFullXpath !== "" && evt.isTopContext() === false) {
            frameContext = Replay.Playback.Dom.getFrameWindow(getNode(evt.contextFullXpath)).document;
          }

          node = getNode(evt.xpathIndex, frameContext);

        }
        this.SetMouseClick.fire(evt.position.x, evt.position.y);

        // Fire is dirty
        this.ProbablyIsDirty.fire();

      } else if (evt.eventType == Replay.Playback.EventInfo.MOUSE_DOWN) {
        // Mouse down *********************************************************************

      } else if (evt.eventType == Replay.Playback.EventInfo.MOUSE_UP) {
        // Mouse up *********************************************************************

      } else if (evt.eventType == Replay.Playback.EventInfo.PAGE_MARKER) {
        // Page began *********************************************************************

      } else if (evt.eventType == Replay.Playback.EventInfo.DOC_SIZE) {
        // Doc size changed *********************************************************************

        // Fire is dirty
        this.ProbablyIsDirty.fire();

      } else if (evt.eventType == Replay.Playback.EventInfo.SCROLL_EL) {
        // Element scroll *********************************************************************

        frameContext = window.document;

        if (evt.contextFullXpath !== "" && evt.isTopContext() === false) {
          frameContext = Replay.Playback.Dom.getFrameWindow(getNode(evt.contextFullXpath)).document;
        }

        // Do a scrolling animation
        node = getNode(evt.xpathIndex, frameContext);

        // Only do something if we have a node
        if (node) {
          node.scrollLeft = evt.position.x;
          node.scrollTop = evt.position.y;
          //save the node scroll position
          Replay.Playback.Work.KeepTrackOfScrollPos(node);
        }

        // Fire is dirty
        this.ProbablyIsDirty.fire();
      }// On the event of a CSS_SERIALIZE and the boolean state "bState" is true - meaning yes we want to record dynamic CSS - we inject a style tag into the head of the page with the appropriate CSS style string.
      else if (evt.eventType == Replay.Playback.EventInfo.CSS_SERIALIZE && evt.basicState.bState === true) {
        var doc = window.document,
          cssStr = evt.strData || "",
          styleNode = doc.createElement("style");

        // Append the child first so that the page does not do a double render when attached to the DOM.
        styleNode.appendChild(doc.createTextNode(cssStr));
        doc.getElementsByTagName("head")[0].appendChild(styleNode);
      }
    }
  };

})();