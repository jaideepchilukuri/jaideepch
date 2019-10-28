/**
 * DOM Input Capture
 *
 * Capturing typing, form inputs, etc
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext } from "../../fs/index";
import { EVENT_TYPES } from "./actions";
import { DOMContains, Unbind, getKeyCode } from "../../utils/utils";

// The list of text box types
const __textTypes =
  "EMAIL,PASSWORD,TEXT,COLOR,DATE,DATETIME-LOCAL,MONTH,NUMBER,RANGE,SEARCH,TEL,TIME,URL,WEEK";

const SCAN_INTERVAL = 100;

/**
 * Captures activity inside inputs
 */
class InputCapture {
  constructor(masker, worker, recorder, tree) {
    ext(
      this,
      {
        rec: recorder,
        masker,
        worker,
        tree,
        _inputs: new Map(),
        _scanValueInterval: setInterval(this._scanInputValues.bind(this), SCAN_INTERVAL),
      },
      false
    );
  }

  /**
   * Track any inputs we aren't already aware of
   * @param {Nodelist} nodes
   */
  scanForInputs(nodes) {
    const filterFn = el => !this._inputs.has(el);

    // Iterate all the nodes provided and look for new inputs
    for (let i = 0; i < nodes.length; i++) {
      const ipts = nodes[i].querySelectorAll("input, textarea, select");
      // Then find the ones we dont already know about. NodeList doesnt have the stuff normal arrays have,
      // so we have to do it this way.
      const elsToDealWith = Array.prototype.filter.call(ipts, filterFn);

      // Set up binding
      elsToDealWith.forEach(this._watchInput.bind(this));
    }
  }

  /**
   * Update the known value of an input
   * @param {InputNode} ipt
   * @param {String} val
   * @returns {Boolean} Is it different?
   */
  _updateKnownValue(ipt, val) {
    const input = this._inputs.get(ipt);
    const oldVal = input.oldVal;

    if (oldVal !== val) {
      input.oldVal = val;
      return true;
    }
    return false;
  }

  /**
   * Get the previous value of an input
   * @param {*} ipt
   */
  _getPreviousValue(ipt) {
    const input = this._inputs.get(ipt);
    return (input && input.oldVal) || "";
  }

  /**
   * Watch an input
   * @param {HtmlElement} node
   */
  _watchInput(node) {
    const iptType = (node.getAttribute("type") || "").toUpperCase();
    const tName = node.tagName;

    this._inputs.set(node, {});

    // Do a dry run to populate previous value for input
    this._serializeInput(node, true);

    // Event binding
    if (tName == "TEXTAREA" || (tName == "INPUT" && __textTypes.indexOf(iptType) > -1)) {
      // Text input
      this.rec.bind(node, "focus", e => {
        const targ = e.target || e.srcElement;
        if (!this._inputs.has(targ)) return;
        this.worker.queueAction(EVENT_TYPES.FOCUS_BLUR, {
          ctx: this.rec.getPath(),
          id: this.tree.get(targ).id,
          v: true,
        });
        this._serializeInput(targ);
        this._logCaretInfo(targ, true);
      });
      this.rec.bind(node, "blur", e => {
        const targ = e.target || e.srcElement;
        if (!this._inputs.has(targ)) return;
        this.worker.queueAction(EVENT_TYPES.FOCUS_BLUR, {
          ctx: this.rec.getPath(),
          id: this.tree.get(targ).id,
          v: false,
        });
        this._serializeInput(targ);
      });
      this.rec.bind(node, "select", e => {
        const targ = e.target || e.srcElement;
        this._logCaretInfo(targ);
      });
      this.rec.bind(node, "input", e => {
        const targ = e.target || e.srcElement;
        if (!this._inputs.has(targ)) return;

        const tval = targ.value || "";
        const pval = this._getPreviousValue(targ) || "";

        // Store the previous version and the new version
        // We will diff this after in the worker
        this.worker.queueAction(EVENT_TYPES.KEY_PRESS, {
          ctx: this.rec.getPath(),
          id: this.tree.get(targ).id,
          v0: pval,
          v1: tval,
        });
        this._updateKnownValue(targ, tval);
        this._logElScroll(targ);
      });
      this.rec.bind(node, "keyup", e => {
        const targ = e.target || e.srcElement;
        const keyCode = getKeyCode(e);
        if ([16, 91, 18, 27, 17, 93, 18, 20].indexOf(keyCode) == -1) {
          this._logCaretInfo(targ);
        }
      });
    } else if (tName == "SELECT") {
      // Select dropdown
      this.rec.bind(node, "change", e => {
        const targ = e.target || e.srcElement;
        this._serializeInput(targ);
      });
      this.rec.bind(node, "blur", e => {
        const targ = e.target || e.srcElement;
        this._serializeInput(targ);
      });
    } else if (tName == "INPUT" && "CHECKBOX,RADIO".indexOf(iptType) > -1) {
      // Checkbox or radio
      this.rec.bind(node, "change", e => {
        const targ = e.target || e.srcElement;
        this._serializeInput(targ);
      });
    }
  }

  /**
   * Save all the relevant input data for an input to the event stream
   * @param {*} node
   */
  _serializeInput(node, dryRun) {
    const iptType = (node.getAttribute("type") || "TEXT").toUpperCase();
    const tName = node.tagName;
    let dval;
    let cInfo;
    let iobj;

    if (!this._inputs.has(node) || !this.tree.get(node)) return;

    if (tName === "TEXTAREA" || (tName == "INPUT" && "CHECKBOX,RADIO".indexOf(iptType) == -1)) {
      dval = node.value || "";
      if (this._updateKnownValue(node, dval) && !dryRun) {
        cInfo = this._getCaretInfo(node);
        iobj = {
          ctx: this.rec.getPath(),
          id: this.tree.get(node).id,
          v: dval,
          t: iptType,
          n: tName,
        };
        if (cInfo) {
          iobj.cs = cInfo.s;
          iobj.ce = cInfo.e;
        }
        this.worker.queueAction(EVENT_TYPES.INPUT_SERIALIZE, iobj);
      }
    } else if (tName === "SELECT") {
      // Select boxes
      dval = node.selectedIndex;
      const isMultiSelect = node.getAttribute("multiple") !== null;
      if (isMultiSelect && node.selectedOptions) {
        dval = Array.prototype.map.call(node.selectedOptions, so => {
          const oi = Array.prototype.indexOf.call(node.options, so);
          return oi;
        });

        // can't dry run multi-selects
        dryRun = false;
      }
      if (
        this._updateKnownValue(node, typeof dval == "number" ? dval : dval.join(",")) &&
        !dryRun
      ) {
        const sobj = {
          ctx: this.rec.getPath(),
          id: this.tree.get(node).id,
          t: iptType,
          n: tName,
          m: isMultiSelect,
        };
        if (isMultiSelect) {
          sobj.so = dval;
        } else {
          sobj.s = dval;
        }
        this.worker.queueAction(EVENT_TYPES.INPUT_SERIALIZE, sobj);
      }
    } else if (tName === "INPUT") {
      // Checkbox or Radio
      dval = node.checked;
      if (this._updateKnownValue(node, dval) && !dryRun) {
        this.worker.queueAction(EVENT_TYPES.INPUT_SERIALIZE, {
          ctx: this.rec.getPath(),
          id: this.tree.get(node).id,
          ch: dval,
          t: iptType,
          n: tName,
        });
      }
    }
  }

  _getCaretInfo(oTextarea) {
    if (
      oTextarea.tagName.toLowerCase() === "input" &&
      safeCaretTypes.indexOf(oTextarea.type.toLowerCase()) < 0
    ) {
      // Not safe to check selectionStart on these types
      // On safari, any attempt to touch selectionStart results in TypeError
      return null;
    }
    if (oTextarea && oTextarea.selectionStart != null) {
      return {
        s: oTextarea.selectionStart,
        e: oTextarea.selectionEnd,
      };
    }
  }

  /**
   * Log the caret information
   * @param {HtmlElement} node
   * @param {Boolean} force - Should we force a caret event, even if it hasn't changed?
   */
  _logCaretInfo(node, force) {
    // Get info on where the caret is and log it
    const caretInfo = this._getCaretInfo(node);
    const input = this._inputs.get(node);

    if (!caretInfo || !input) {
      return;
    }

    const cIl = (input.caret = input.caret || {});

    if (!!force || (cIl.s !== caretInfo.s || cIl.e !== caretInfo.e)) {
      this.worker.queueAction(EVENT_TYPES.CARET_INFO, {
        ctx: this.rec.getPath(),
        id: this.tree.get(node).id,
        s: caretInfo.s,
        e: caretInfo.e,
      });
      cIl.s = caretInfo.s;
      cIl.e = caretInfo.e;

      this._logElScroll(node);
    }
  }

  /**
   * Log the input scroll position if it's changed
   * @param {HtmlElement} node
   */
  _logElScroll(node) {
    const input = this._inputs.get(node);
    if (!input) return;

    const cIl = (input.caret = input.caret || {});

    const sx = Math.round(node.scrollLeft);
    const sy = Math.round(node.scrollTop);

    if (cIl.sx === sx && cIl.sy === sy) {
      // nothing to do, it's the same
      return;
    }

    cIl.sx = sx;
    cIl.sy = sy;

    this.worker.queueAction(EVENT_TYPES.SCROLL_EL, {
      ctx: this.rec.getPath(),
      id: this.tree.get(node).id,
      x: cIl.sx,
      y: cIl.sy,
    });
  }

  /**
   * Stop watching an input
   * @param {HtmlElement} node
   */
  _stopWatchingInput(node) {
    // Event unbinding
    Unbind(node);

    this._inputs.delete(node);
  }

  /**
   * This method listens to changes done by javascript to the value property
   * of the input element. As far as I know the browser does not emit
   * any kind of event that can be listened to in order to do this. So we
   * call this on an interval to ask each input element if it changed.
   * @private
   */
  _scanInputValues() {
    this._inputs.forEach((v, node) => {
      // will only emit events if the input has actually changed
      this._serializeInput(node);
    });
  }

  /**
   * Stop tracking any inputs that are in the node provided
   * @param {HtmlElement} node
   */
  untrackInputs(node) {
    this._inputs.forEach((v, known) => {
      if (node.nodeType === 1 && DOMContains(node, known)) {
        this._stopWatchingInput(known);
      }
    });
  }

  /**
   * Free up references and unbind stuff
   */
  dispose() {
    this._inputs.forEach((v, node) => {
      this._stopWatchingInput(node);
    });
  }
}

/**
 * This function will return the caret position in a text field. This function is brought over from old replay and
 * it seems to be working quite well, even if it lacks documentation.
 * @param {HtmlElement} oTextarea The text area
 * @private
 */
const safeCaretTypes = "text|search|password|tel|url".split("|");

export { InputCapture };
