/**
 * Event Information
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

fs.provide("rp.Replay.Playback.EventInfo");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");

(function () {

  /**
   * Describes events
   */
  Replay.Playback.EventInfo = {
    /// <summary>
    /// An unknown event type
    /// </summary>
    UNKNOWN: 0,

    /// <summary>
    /// A DOM was processed and inserted into the event stream
    /// </summary>
    DOM_SERIALIZE: 1,

    /// <summary>
    /// XPATH String was cached and assigned a number
    /// </summary>
    XPATH_CACHE: 2,

    /// <summary>
    /// A window size was stored
    /// </summary>
    FRAME_SIZE: 3,

    /// <summary>
    /// A window was scrolled
    /// </summary>
    FRAME_SCROLL: 4,

    /// <summary>
    /// The mouse moved
    /// </summary>
    MOUSE_MOVE: 5,

    /// <summary>
    /// The user moused out or into a window
    /// </summary>
    WINDOW_MOUSEOUT_MOUSEENTER: 6,

    /// <summary>
    /// An input element was serialized
    /// </summary>
    INPUT_SERIALIZE: 7,

    /// <summary>
    /// An input received or lost focus
    /// </summary>
    FOCUS_BLUR: 8,

    /// <summary>
    /// A key was typed into a text input
    /// </summary>
    KEY_PRESS: 9,

    /// <summary>
    /// The cursor position and selection was changed in a text box
    /// </summary>
    CARET_INFO: 10,

    /// <summary>
    /// A select box value changed
    /// </summary>
    VALUE_CHANGED: 11,

    /// <summary>
    /// The contents of a DOM node was changed
    /// </summary>
    DOM_MUTATION_NODE_MODIFIED: 12,

    /// <summary>
    /// A DOM node's attribute was changed
    /// </summary>
    DOM_MUTATION_NODE_ATTR_MODIFIED: 13,

    /// <summary>
    /// A JavaScript error occurred
    /// </summary>
    JAVASCRIPT_ERROR: 14,

    /// <summary>
    /// A mouse click occurred
    /// </summary>
    MOUSE_CLICK: 15,

    /// <summary>
    /// A mouse down occurred
    /// </summary>
    MOUSE_DOWN: 16,

    /// <summary>
    /// A mouse up event occurred
    /// </summary>
    MOUSE_UP: 17,

    /// <summary>
    /// A new page was encountered
    /// </summary>
    PAGE_MARKER: 18,

    /// <summary>
    /// The document size was measured
    /// </summary>
    DOC_SIZE: 19,

    /// <summary>
    /// An element was scrolled
    /// </summary>
    SCROLL_EL: 20,

    /// <summary>
    /// Add or remove nodes to something
    /// </summary>
    ADD_REMOVE_NODES: 21,

    /// <summary>
    /// Page wasnt recorded
    /// </summary>
    NOT_RECORDED: 22,

    /// <summary>
    /// CSS document was serialized
    /// </summary>
    CSS_SERIALIZE: 23,

    /// <summary>
    /// Orientation changed
    /// </summary>
    ORIENTATION: 24,

    /// <summary>
    /// Zoom
    /// </summary>
    ZOOM: 25,

    /// <summary>
    /// Touch event
    /// </summary>
    TOUCH: 26,

    /// <summary>
    /// Skip ahead
    /// </summary>
    SKIPTIME: 27,

    /// <summary>
    /// Skip ahead
    /// </summary>
    INCOMPLETE_INPUT_CAPTURE: 28,

    /// <summary>
    /// Actual Orientation change (full orientation)
    /// </summary>
    ORIENTATION_CHANGE: 29
  };

  /**
   * The cache of xpath id's and their strings
   */
  Replay.Playback.EventInfo.xpathCache = {};

  /**
   * Pull out and cache the xpaths int he event stream
   * @param eventData The event stream
   */
  Replay.Playback.EventInfo.cacheXPaths = function (eventData) {
    var i;
    // First cache them all
    for (i = 0; i < eventData.length; i++) {
      if (eventData[i].eventType == Replay.Playback.EventInfo.XPATH_CACHE) {
        Replay.Playback.EventInfo.xpathCache["_" + eventData[i].xpathIndex.xp.toString()] = fs.isDefined(eventData[i].xpathInfo) ? eventData[i].xpathInfo : "";
      }
    }

    // Now go back and layer on the strings for each one so its readily available
    for (i = 0; i < eventData.length; i++) {
      // Set the index
      eventData[i].eventIndex = i;

      if (eventData[i].xpathIndex) {
        eventData[i].xpathIndexBackup = eventData[i].xpathIndex.xp;
        if (eventData[i].xpathIndex.xp == -1) {
          eventData[i].xpathIndex = "html,head";
        } else if (eventData[i].xpathIndex.xp == -2) {
          eventData[i].xpathIndex = "html,body";
        } else {
          eventData[i].xpathIndex = Replay.Playback.EventInfo.xpathCache["_" + eventData[i].xpathIndex.xp.toString()];
        }
      }
      if (eventData[i].xpathInfo) {
        if (eventData[i].xpathInfo == -1) {
          eventData[i].xpathInfo = "html,head";
        } else if (eventData[i].xpathInfo == -2) {
          eventData[i].xpathInfo = "html,body";
        } else {
          eventData[i].xpathInfo = Replay.Playback.EventInfo.xpathCache["_" + eventData[i].xpathInfo.toString()];
        }
      }
      if (fs.isDefined(eventData[i].contextXpath)) {
        if (eventData[i].contextXpath == -1) {
          eventData[i].contextFullXpath = "html,head";
        } else if (eventData[i].contextXpath == -2) {
          eventData[i].contextFullXpath = "html,body";
        } else {
          // TODO when using compressed code the first xpathCache event is sometimes lost, results in a DOM Serialization event without a contextXpath value in the xpathCache. Temporary solution is  adding || "";
          eventData[i].contextFullXpath = Replay.Playback.EventInfo.xpathCache["_" + eventData[i].contextXpath.toString()] || "";
        }
      }
    }
  };

  /**
   * Add useful utility functions to the event stream
   * @param eventData The event stream
   */
  Replay.Playback.EventInfo.addUtilityFunctions = function (eventData) {
    // A utility function that tells us if we're in the top context or not
    var isTopContext = function () {
      if ((this.contextXpath + '') == "0") {
        return true;
      }
      return false;
    };

    // First cache them all
    for (var i = 0; i < eventData.length; i++) {
      eventData[i].isTopContext = isTopContext;
    }
  };

})();