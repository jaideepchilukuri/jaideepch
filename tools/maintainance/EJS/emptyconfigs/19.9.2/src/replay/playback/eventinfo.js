/**
 * Event Information
 *
 * This namespace holds all things related to playback
 *
 * (c) Copyright 2011 Foresee, Inc.
 */

/**
 * Describes events
 */
const EventInfo = {
  /**
   * An unknown event type
   */
  UNKNOWN: 0,

  /**
   * A DOM was processed and inserted into the event stream
   */
  DOM_SERIALIZE: 1,

  /**
   * A window size was stored
   */
  FRAME_SIZE: 3,

  /**
   * A window was scrolled
   */
  FRAME_SCROLL: 4,

  /**
   * The mouse moved
   */
  MOUSE_MOVE: 5,

  /**
   * The user moused out or into a window
   */
  WINDOW_MOUSEOUT_MOUSEENTER: 6,

  /**
   * An input element was serialized
   */
  INPUT_SERIALIZE: 7,

  /**
   * An input received or lost focus
   */
  FOCUS_BLUR: 8,

  /**
   * A key was typed into a text input
   */
  KEY_PRESS: 9,

  /**
   * The cursor position and selection was changed in a text box
   */
  CARET_INFO: 10,

  /**
   * A select box value changed
   */
  VALUE_CHANGED: 11,

  /**
   * A DOM node's attribute was changed
   */
  ATTR_MODIFIED: 13,

  /**
   * A JavaScript error occurred
   */
  JAVASCRIPT_ERROR: 14,

  /**
   * A mouse click occurred
   */
  MOUSE_CLICK: 15,

  /**
   * A mouse down occurred
   */
  MOUSE_DOWN: 16,

  /**
   * A mouse up event occurred
   */
  MOUSE_UP: 17,

  /**
   * A new page was encountered
   */
  PAGE_MARKER: 18,

  /**
   * The document size was measured
   */
  DOC_SIZE: 19,

  /**
   * An element was scrolled
   */
  SCROLL_EL: 20,

  /**
   * Page was not recorded on purpose
   */
  NOT_RECORDED: 22,

  /**
   * A stylesheet was serialized and inserted into the event stream
   */
  CSS_SERIALIZE: 23,

  /**
   * Orientation change
   */
  ORIENTATION: 24,

  /**
   * Web page zoom changed
   */
  ZOOM: 25,

  /**
   * Touch event
   */
  TOUCH: 26,

  /**
   * Skip some time during preplay
   */
  SKIPTIME: 27,

  /**
   * Missed binding some inputs
   */
  INCOMPLETE_INPUT_CAPTURE: 28,

  /**
   * Actual Orientation change (full orientation)
   */
  ORIENTATION_CHANGE: 29,

  /**
   * Custom events passed in by the customer
   */
  CUSTOM: 30,

  /**
   * A user-generated email
   */
  CUSTOM_ERROR: 31,

  /**
   * The page has been made visible or hidden
   */
  PAGE_VISIBLE: 32,

  /**
   * A heartbeat
   */
  HEARTBEAT: 33,

  /**
   * A node was added to the document
   */
  NODE_ADDED: 34,

  /**
   * A node is removed
   */
  NODE_REMOVED: 35,

  /**
   * A textarea is resized
   */
  INPUT_RESIZE: 36,

  /**
   * Character data was altered
   */
  CHAR_DATA: 37,

  /**
   * A list of DOM modifications
   */
  DOM_MODIFICATIONS: 38,

  /**
   * A node was moved
   */
  NODE_MOVED: 39,

  /**
   * @constant Number A server-error has occurred
   */
  PAGE_ERROR: 40,

  /**
   * @constant Number Missing asset error
   */
  ASSET_ERROR: 41,
};

export { EventInfo };
