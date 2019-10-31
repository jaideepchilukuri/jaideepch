/**
 * Keyboard, typing, selection and input control handling
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Ryan Sanche (ryan.sanche@foresee.com)
 * @author $Author: ryan.sanche $
 */

/**
 * Keyboard handling and input controls
 */
class Keyboard {
  /**
   * Populate the value of an input control.
   *
   * @param {InputElement} el
   * @param {*} data
   */
  deserializeInput(el, data) {
    const type = data.t.toUpperCase() || "TEXT";
    if (
      data.n === "TEXTAREA" ||
      (data.n === "INPUT" && type !== "SELECT" && type !== "CHECKBOX" && type !== "RADIO")
    ) {
      this.deserializeTextBox(el, data);
    } else if (data.n === "SELECT") {
      if (data.m) {
        this.deserializeSelectMultiple(el, data);
      } else {
        this.deserializeSelectSingle(el, data);
      }
    } else if (data.n === "INPUT" && (type === "CHECKBOX" || type === "RADIO")) {
      this.deserializeCheckbox(el, data);
    } else {
      console.error("unimplemented input deserialize:", el, data);
    }
  }

  /**
   * Populate the value of a text control.
   *
   * @param {InputElement} el
   * @param {*} data
   */
  deserializeTextBox(el, data) {
    el.value = data.v;
    if (data.cs && (data.cs !== 0 || data.ce !== 0)) {
      this.moveInputCaret(el, { s: data.cs, e: data.ce });
    }
  }

  /**
   * Populate the value of a single-value select control.
   *
   * @param {InputElement} el
   * @param {*} data
   */
  deserializeSelectSingle(el, data) {
    el.selectedIndex = data.s;
  }

  /**
   * Populate the value of a multiple-select control.
   *
   * @param {InputElement} el
   * @param {*} data
   */
  deserializeSelectMultiple(el, data) {
    for (let i = 0; i < el.length; i++) {
      const opt = el.item(i);
      opt.selected = data.so.indexOf(i) > -1;
    }
  }

  /**
   * Populate the value of a checkbox or radio control.
   *
   * @param {InputElement} el
   * @param {*} data
   */
  deserializeCheckbox(el, data) {
    el.checked = data.ch;
  }

  /**
   * Focus or blur an input control
   *
   * @param {InputElement} el
   * @param {*} data
   */
  focusBlurInput(el, data) {
    if (data.v) {
      if (el.focus) {
        el.focus();
      }
    } else if (el.blur) {
      el.blur();
    }
  }

  /**
   * Move the input caret and/or selection around
   *
   * @param {InputElement} el
   * @param {*} data
   */
  moveInputCaret(el, data) {
    if (data.t !== "COLOR" && el.setSelectionRange) {
      el.setSelectionRange(data.s, data.e);
    }
  }

  /**
   * Replay typing into a text control
   *
   * @param {InputElement} el
   * @param {*} data
   */
  pressKey(el, data) {
    const val = el.value || "";
    const start = data.s;
    // end is relative to the end of the string
    const end = val.length - (data.e || 0);

    el.value = val.substr(0, start) + (data.v || "") + val.substr(end);
  }
}

export { Keyboard };
