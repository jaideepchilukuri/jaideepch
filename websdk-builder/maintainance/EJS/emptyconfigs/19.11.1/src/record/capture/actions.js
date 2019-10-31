/**
 * Event action types
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Holds all the event types for use in logging
 */
const EVENT_TYPES = {
  /**
   * @constant Number A DOM was processed and inserted into the event stream
   * @memberOf EVENT_TYPES
   */
  DOM_SERIALIZE: 0,

  /**
   * @constant Number A window size was stored
   * @memberOf EVENT_TYPES
   */
  FRAME_SIZE: 2,

  /**
   * @constant Number A window was scrolled
   * @memberOf EVENT_TYPES
   */
  FRAME_SCROLL: 3,

  /**
   * @constant Number The mouse moved
   * @memberOf EVENT_TYPES
   */
  MOUSE_MOVE: 4,

  /**
   * @constant Number The user moused out or into a window
   * @memberOf EVENT_TYPES
   */
  WINDOW_MOUSEOUT_MOUSEENTER: 5,

  /**
   * @constant Number An input element was serialized
   * @memberOf EVENT_TYPES
   */
  INPUT_SERIALIZE: 6,

  /**
   * @constant Number An input received or lost focus
   * @memberOf EVENT_TYPES
   */
  FOCUS_BLUR: 7,

  /**
   * @constant Number A key was typed into a text input
   * @memberOf EVENT_TYPES
   */
  KEY_PRESS: 8,

  /**
   * @constant Number The cursor position and selection was changed in a text box
   * @memberOf EVENT_TYPES
   */
  CARET_INFO: 9,

  /**
   * @constant Number A DOM node's attribute was changed
   * @memberOf EVENT_TYPES
   */
  ATTR_MODIFIED: 12,

  /**
   * @constant Number A JavaScript error occurred
   * @memberOf EVENT_TYPES
   */
  JAVASCRIPT_ERROR: 13,

  /**
   * @constant Number A mouse click occurred
   * @memberOf EVENT_TYPES
   */
  MOUSE_CLICK: 14,

  /**
   * @constant Number A mouse down occurred
   * @memberOf EVENT_TYPES
   */
  MOUSE_DOWN: 15,

  /**
   * @constant Number A mouse up event occurred
   * @memberOf EVENT_TYPES
   */
  MOUSE_UP: 16,

  /**
   * @constant Number A new page was encountered
   * @memberOf EVENT_TYPES
   */
  PAGE_MARKER: 17,

  /**
   * @constant Number The document size was measured
   * @memberOf EVENT_TYPES
   */
  DOC_SIZE: 18,

  /**
   * @constant Number An element was scrolled
   * @memberOf EVENT_TYPES
   */
  SCROLL_EL: 19,

  /**
   * @constant Number A page was not recorded
   * @memberOf EVENT_TYPES
   */
  NOT_RECORDED: 20,

  /**
   * @constant Number Serialize stylesheet contents
   * @memberOf EVENT_TYPES
   */
  CSS_SERIALIZE: 21,

  /**
   * @constant Number The exact orientation of the device
   * @memberOf EVENT_TYPES
   */
  ORIENTATION: 22,

  /**
   * @constant Number The device zooming
   * @memberOf EVENT_TYPES
   */
  ZOOM: 23,

  /**
   * @constant Number A touch was detected or ended
   * @memberOf EVENT_TYPES
   */
  TOUCH: 24,

  /**
   * @constant Number An Orientation Change was detected
   * @memberOf EVENT_TYPES
   */
  ORIENTATION_CHANGE: 26,

  /**
   * @constant Number A custom behavior event was trigger by a client
   * @memberOf EVENT_TYPES
   */
  CUSTOM_BEHAVIOR: 27,

  /**
   * @constant Number A custom error event was trigger by a client
   * @memberOf EVENT_TYPES
   */
  CUSTOM_ERROR: 28,

  /**
   * @constant Number A no-op event that serves as a signpost. Should be skipped during replay.
   * @memberOf EVENT_TYPES
   */
  HEARTBEAT: 29,

  /**
   * @constant Number A node has been inserted
   * @memberOf EVENT_TYPES
   */
  NODE_ADDED: 30,

  /**
   * @constant Number A node has been removed
   * @memberOf EVENT_TYPES
   */
  NODE_REMOVED: 31,

  /**
   * @constant Number The page visibilty has changes
   * @memberOf EVENT_TYPES
   */
  PAGE_VISIBLE: 32,

  /**
   * @constant Number A textarea has resized
   * @memberOf EVENT_TYPES
   */
  INPUT_RESIZE: 33,

  /**
   * @constant Number Character data has changed (for text nodes)
   * @memberOf EVENT_TYPES
   */
  CHAR_DATA: 34,

  /**
   * A bunch of DOM mutations in an array
   */
  MOD_LIST: 37,

  /**
   * @constant Number Node has been moved
   * @memberOf EVENT_TYPES
   */
  NODE_MOVED: 38,

  /**
   * @constant Number A server-error has occurred
   */
  PAGE_ERROR: 40,

  /**
   * @constant Number Missing asset error
   */
  ASSET_ERROR: 41,

  /**
   * @constant Number The masking on an element has changed (for the worker only)
   * @memberOf EVENT_TYPES
   */
  MASKING_CHANGE: 42,
};

export { EVENT_TYPES };
