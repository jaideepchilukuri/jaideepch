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

fs.provide("rec.Capture.InputCapture");

fs.require("rec.Top");

(function () {

  // The list of text box types
  var __textTypes = "EMAIL,PASSWORD,TEXT,COLOR,DATE,DATETIME-LOCAL,MONTH,NUMBER,RANGE,SEARCH,TEL,TIME,URL,WEEK";

  /**
   * Captures activity inside inputs
   */
  var InputCapture = function (masker, worker, recorder, tree) {
    fs.ext(this, {
      rec: recorder,
      masker: masker,
      worker: worker,
      tree: tree,
      _inputsTracked: [],
      _inputValues: [],
      _inputCaretInfo: []
    }, false);
  };

  /**
   * Track any inputs we aren't already aware of
   * @param {Nodelist} nodes
   */
  InputCapture.prototype.scanForInputs = function (nodes) {
    var i,
      ipts,
      elsToDealWith,
      known = this._inputsTracked,
      filterFn = function (el) {
        return known.indexOf(el) == -1;
      };

    // Iterate all the nodes provided and look for new inputs
    for (i = 0; i < nodes.length; i++) {
      ipts = nodes[i].querySelectorAll("input, textarea, select");
      // Then find the ones we dont already know about. NodeList doesnt have the stuff normal arrays have,
      // so we have to do it this way.
      elsToDealWith = Array.prototype.filter.call(ipts, filterFn);

      // Set up binding
      elsToDealWith.forEach(this._watchInput.bind(this));
    }
  };

  /**
   * Update the known value of an input
   * @param {InputNode} ipt
   * @param {String} val
   * @returns {Boolean} Is it different?
   */
  InputCapture.prototype._updateKnownValue = function (ipt, val) {
    var ipts = this._inputValues;
    var oldVal = (function arrayFind(arr, value) {
      var len = arr.length;
      var i = 0;
      while (i < len) {
        if (arr[i].ipt === value) { return arr[i]; }
        i++;
      }
      return null;
    })(ipts || [], ipt);

    if (!oldVal) {
      ipts.push({
        ipt: ipt,
        v: val
      });
      return true;
    } else {
      if (oldVal.v != val) {
        oldVal.v = val;
        return true;
      }
    }
    return false;
  };

  /**
   * Get the previous value of an input
   * @param {*} ipt
   */
  InputCapture.prototype._getPreviousValue = function (ipt) {
    var ipts = this._inputValues;
    var oldVal = (function arrayFind(arr, value) {
      var len = arr.length;
      var i = 0;
      while (i < len) {
        if (arr[i].ipt === value) { return arr[i]; }
        i++;
      }
      return null;
    })(ipts || [], ipt);

    return (oldVal && oldVal.v) || '';
  };

  /**
   * Watch an input
   * @param {HtmlElement} node
   */
  InputCapture.prototype._watchInput = function (node) {
    var iptType = (node.getAttribute("type") || '').toUpperCase(),
      tName = node.tagName;

    // Add to the list that we are tracking
    this._inputsTracked.push(node);

    // Event binding
    if (tName == "TEXTAREA" || (tName == "INPUT" && __textTypes.indexOf(iptType) > -1)) {
      // Text input
      this.rec.bind(node, "focus", function (e) {
        var targ = e.target || e.srcElement;
        this.worker.queueAction(EVENT_TYPES.FOCUS_BLUR, {
          "ctx": this.rec.getPath(),
          "id": this.tree.get(targ).id,
          "v": true
        });
        this._serializeInput(targ);
        this._logCaretInfo(targ, true);
      }.bind(this));
      this.rec.bind(node, "blur", function (e) {
        var targ = e.target || e.srcElement;
        this.worker.queueAction(EVENT_TYPES.FOCUS_BLUR, {
          "ctx": this.rec.getPath(),
          "id": this.tree.get(targ).id,
          "v": false
        });
        this._serializeInput(targ);
      }.bind(this));
      this.rec.bind(node, "select", function (e) {
        var targ = e.target || e.srcElement;
        this._logCaretInfo(targ);
      }.bind(this));
      this.rec.bind(node, "input", function (e) {
        var targ = e.target || e.srcElement,
          tval = targ.value || "",
          pval = this._getPreviousValue(targ) || "";
        // Store the previous version and the new version
        // We will diff this after in the worker
        this.worker.queueAction(EVENT_TYPES.KEY_PRESS, {
          "ctx": this.rec.getPath(),
          "id": this.tree.get(targ).id,
          "v0": pval,
          "v1": tval
        });
        this._updateKnownValue(targ, tval);
        this._logElScroll(targ);
      }.bind(this));
      this.rec.bind(node, "keyup", function (e) {
        var targ = e.target || e.srcElement,
          keyCode = utils.getKeyCode(e);
        if ([16, 91, 18, 27, 17, 93, 18, 20].indexOf(keyCode) == -1) {
          this._logCaretInfo(targ);
        }
      }.bind(this));

      this._listenToJavascriptCausedChanges(node);
    } else if (tName == "SELECT") {
      // Select dropdown
      this.rec.bind(node, "change", function (e) {
        var targ = e.target || e.srcElement;
        this._serializeInput(targ);
      }.bind(this));
      this.rec.bind(node, "blur", function (e) {
        var targ = e.target || e.srcElement;
        this._serializeInput(targ);
      }.bind(this));
    } else if (tName == "INPUT" && ("CHECKBOX,RADIO".indexOf(iptType) > -1)) {
      // Checkbox or radio
      this.rec.bind(node, "change", function (e) {
        var targ = e.target || e.srcElement;
        this._serializeInput(targ);
      }.bind(this));
    }
  };

  /**
   * Save all the relevant input data for an input to the event stream
   * @param {*} node
   */
  InputCapture.prototype._serializeInput = function (node) {
    var iptType = (node.getAttribute("type") || 'TEXT').toUpperCase(),
      tName = node.tagName,
      dval,
      cInfo,
      iobj;

    if (tName === "TEXTAREA" || (tName == "INPUT" && ("CHECKBOX,RADIO".indexOf(iptType) == -1))) {
      dval = node.value || "";
      if (this._updateKnownValue(node, dval)) {
        cInfo = this._getCaretInfo(node);
        iobj = {
          "ctx": this.rec.getPath(),
          "id": this.tree.get(node).id,
          "v": dval,
          "t": iptType,
          "n": tName
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
      var isMultiSelect = (node.getAttribute("multiple") !== null);
      if (isMultiSelect) {
        dval = Array.prototype.map.call(node.selectedOptions, function (so) {
          var oi = Array.prototype.indexOf.call(node.options, so);
          return oi;
        });
      }
      if (this._updateKnownValue(node, typeof dval == 'number' ? dval : dval.join(','))) {
        var sobj = {
          "ctx": this.rec.getPath(),
          "id": this.tree.get(node).id,
          "t": iptType,
          "n": tName,
          "m": isMultiSelect
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
      if (this._updateKnownValue(node, dval)) {
        this.worker.queueAction(EVENT_TYPES.INPUT_SERIALIZE, {
          "ctx": this.rec.getPath(),
          "id": this.tree.get(node).id,
          "ch": dval,
          "t": iptType,
          "n": tName
        });
      }
    }
  };

  /**
     * This function will return the caret position in a text field. This function is brought over from old replay and
     * it seems to be working quite well, even if it lacks documentation.
     * @param {HtmlElement} oTextarea The text area
     * @private
     */
  var safeCaretTypes = "text|search|password|tel|url".split('|');
  InputCapture.prototype._getCaretInfo = function (oTextarea) {
    if (
      oTextarea.tagName.toLowerCase() === 'input' &&
      safeCaretTypes.indexOf(oTextarea.type.toLowerCase()) < 0
    ) {
      // Not safe to check selectionStart on these types
      // On safari, any attempt to touch selectionStart results in TypeError
      return null;
    }
    if (oTextarea && oTextarea.selectionStart != null) {
      return {
        "s": oTextarea.selectionStart,
        "e": oTextarea.selectionEnd
      };
    }
  };

  /**
   * Log the caret information
   * @param {HtmlElement} node
   * @param {Boolean} force - Should we force a caret event, even if it hasn't changed?
   */
  InputCapture.prototype._logCaretInfo = function (node, force) {
    // Get info on where the caret is and log it
    var caretInfo = this._getCaretInfo(node),
      cIl = this._inputCaretInfo.find(function (ci) { return ci.ipt === node; });

    if (!caretInfo) {
      return;
    }

    if (!!force || !cIl || (cIl.s !== caretInfo.s || cIl.e !== caretInfo.e)) {
      if (!cIl) {
        cIl = { ipt: node };
        this._inputCaretInfo.push(cIl);
      }
      this.worker.queueAction(EVENT_TYPES.CARET_INFO, {
        "ctx": this.rec.getPath(),
        "id": this.tree.get(node).id,
        "s": caretInfo.s,
        "e": caretInfo.e
      });
      cIl.s = caretInfo.s;
      cIl.e = caretInfo.e;

      this._logElScroll(node);
    }
  };

  /**
   * Log the input scroll position if it's changed
   * @param {HtmlElement} node
   */
  InputCapture.prototype._logElScroll = function (node) {
    var cIl = this._inputCaretInfo.find(function (ci) { return ci.ipt === node; });

    if (!cIl) {
      cIl = { ipt: node };
      this._inputCaretInfo.push(cIl);
    }
    var sx = Math.round(node.scrollLeft);
    var sy = Math.round(node.scrollTop);

    if (cIl.sx === sx && cIl.sy === sy) {
      // nothing to do, it's the same
      return;
    }

    cIl.sx = sx;
    cIl.sy = sy;

    this.worker.queueAction(EVENT_TYPES.SCROLL_EL, {
      "ctx": this.rec.getPath(),
      "id": this.tree.get(node).id,
      "x": cIl.sx,
      "y": cIl.sy
    });
  };

  /**
   * Stop watching an input
   * @param {HtmlElement} node
   */
  InputCapture.prototype._stopWatchingInput = function (node) {
    // Event unbinding
    utils.Unbind(node);

    // TODO: monkey patch is a dangerous solution, need to find another

    // Remove from list
    this._inputsTracked.splice(this._inputsTracked.indexOf(node), 1);
    this._inputValues.splice(this._inputValues.find(function (el) { return el.ipt === node; }), 1);
    this._inputCaretInfo.splice(this._inputCaretInfo.find(function (el) { return el.ipt === node; }), 1);
  };

  /**
   * This method listens to changes done by javascript to the value property
   * of the input element. As far as I know the browser does not emit
   * any kind of event that can be listened to in order to do this. This
   * is probably super brittle, so I try to hedge it with as much
   * auto-detection as I can.
   * @private
   */
  InputCapture.prototype._listenToJavascriptCausedChanges = function (node) {
    // TODO: monkey patch is a dangerous solution, need to find another
  };

  /**
   * Stop tracking any inputs that are in the node provided
   * @param {HtmlElement} node
   */
  InputCapture.prototype.untrackInputs = function (node) {
    var j,
      known = this._inputsTracked;
    for (j = 0; j < known.length; j++) {
      if (node.nodeType === 1 && utils.DOMContains(node, known[j])) {
        this._stopWatchingInput(known[j]);
      }
    }
  };

  /**
   * Free up references and unbind stuff
   */
  InputCapture.prototype.dispose = function () {
    this._inputsTracked.forEach(function (ipt) {
      this._stopWatchingInput(ipt);
    }.bind(this));
    delete this.masker;
    delete this._inputsTracked;
  };

})();