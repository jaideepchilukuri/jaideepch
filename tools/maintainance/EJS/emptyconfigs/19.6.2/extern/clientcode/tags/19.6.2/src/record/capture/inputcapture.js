/**
 * Form serialization and input capture
 *
 * Serializes inputs to the event stream and monitors the changes to them.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Capture.InputCapture");

fs.require("rec.Top");

(function () {

  /**
   * The input capture list
   */
  var _inputCaptureList = [];

  /**
   * @class Serializes and captures input and changes to an input field
   * @param recorder {Recorder} The Recorder instance for this window. This is needed so we can pass events up the event stream.
   * @param ipt {HTMLElement} The input element to monitor.
   * @constructor
   */
  var InputCapture = function (recorder, ipt) {

    // Check if the tracker flag is present and drop out if it is
    if (ipt._fsrTracker) {
      return;
    }

    // Mark the input as tracked! this is to prevent double-binding
    ipt._fsrTracker = this;

    // Add it to the global list
    _inputCaptureList.push(this);

    // The input being tracked
    this.input = ipt;

    // The recorder
    this.recorder = recorder;

    // Keep a record in this constructor of the input type
    var inputType = "";
    if (ipt.getAttribute("type")) {
      inputType = ipt.getAttribute("type");
    } else {
      inputType = "text";
    }

    // Text input?
    if (this._isTextInput()) {
      // Track the value over time
      this.lastValue = ipt.getAttribute("value") || "";
    }

    // Serialize this input, but only if the value is not empty
    // Or if this is a select list.
    if (((!this._isTextInput() || ipt.value) && (inputType != "checkbox" || ipt.checked)) || (ipt.type && ipt.type == "select-one")) {
      this.serialize(true);
    }

    // Bind to the scroll event
    utils.Bind(ipt, "record:scroll", fs.proxy(function () {
      // Don't do anything if recorder doesn't exist
      if (!this.input) {
        return;
      }

      // Log the scroll event
      this.recorder.getLogger().log(this.recorder, Logger.EVENT_TYPES.SCROLL_EL, {
        "t": inputType,
        "x": this.recorder.getLogger().logXPath(this.recorder, XPath.getMapping(this.input)),
        "ps": { 'x': this.input.scrollLeft, 'y': this.input.scrollTop }
      });
    }, this));

    // Bind to focus event
    utils.Bind(ipt, "record:focus", fs.proxy(function () {
      // Don't do anything if recorder doesn't exist
      if (!this.input) {
        return;
      }

      // If its a text field, update the caret information
      if (this._isTextInput()) {
        // Do a quick update of the caret position
        this._updateCaret();

        // Set up a timer to monitor the caret for text selections
        this._caretMonitor = setInterval(fs.proxy(function () {
          // Don't do anything if recorder doesn't exist
          if (!this.input) {
            return;
          }

          // Do a quick update of the caret position
          this._updateCaret();
        }, this), 350);
      }

      // Log that we focused
      this.recorder.getLogger().log(this.recorder, Logger.EVENT_TYPES.FOCUS_BLUR, {
        "t": inputType,
        "st": 1,
        "x": this.recorder.getLogger().logXPath(this.recorder, XPath.getMapping(this.input))
      });
    }, this));

    // Bind to blur event
    utils.Bind(ipt, "record:blur", fs.proxy(function (e) {
      // Don't do anything if recorder doesn't exist
      if (!this.input) {
        return;
      }

      // If its a text field, stop updating the caret info
      if (this._isTextInput()) {
        clearInterval(this._caretMonitor);
      }

      // Log that we blurred
      this.recorder.getLogger().log(this.recorder, Logger.EVENT_TYPES.FOCUS_BLUR, {
        "t": inputType,
        "st": 0,
        "x": this.recorder.getLogger().logXPath(this.recorder, XPath.getMapping(this.input))
      });
    }, this));

    // Bind to the click event on checkboxes and radio buttons
    if (inputType == "checkbox" || inputType == "radio") {
      var cbCallback = fs.proxy(function () {
        // Don't do anything if recorder doesn't exist
        if (!this.input) {
          return;
        }

        // If the checked value has changed, then log it
        if (this._lastCheckedState != this.input.checked) {
          // Make a record of what this was at this point
          this._lastCheckedState = this.input.checked;

          this.recorder.getLogger().log(this.recorder, Logger.EVENT_TYPES.VALUE_CHANGED, {
            "t": inputType,
            "b": this.input.checked,
            "x": this.recorder.getLogger().logXPath(this.recorder, XPath.getMapping(this.input))
          });
        }

      }, this);
      utils.Bind(ipt, "record:click", cbCallback);
      utils.Bind(recorder.win, "record:click", cbCallback);
    }

    // Bind to change event - select boxes
    // This would also bind to checkbox change events, setting the checkboxes back to false, so we now check for that
    if (inputType != "checkbox" && inputType != "radio") {
      utils.Bind(ipt, "record:change", fs.proxy(function () {
        // Don't do anything if recorder doesn't exist
        if (!this.input) {
          return;
        }

        // If the contents have changed, re-serialize
        if (this._lastSelectListContents != this.input.innerHTML) {
          this.serialize();
        }

        this.lastValue = this.input.value;

        var sopts = this.input.selectedOptions,
          selectedTxt = '';

        if (sopts && sopts.length > 0 && !this._isSecret()) {
          selectedTxt = sopts[0].innerText;
          /* pragma:DEBUG_START */
          console.warn("record: logging that the user chose '", selectedTxt, "'");
          /* pragma:DEBUG_END */
        }

        // Log the new selected index
        this.recorder.getLogger().log(this.recorder, Logger.EVENT_TYPES.VALUE_CHANGED, {
          "t": inputType,
          "si": this.input.selectedIndex,
          "x": this.recorder.getLogger().logXPath(this.recorder, XPath.getMapping(this.input)),
          "v": selectedTxt
        });

      }, this));
    }

    // Bind to key press event
    if (this._isTextInput()) {
      // Save the last value
      this.lastValue = this.input.value;

      // Do the event binding
      utils.Bind(ipt, "record:keydown", function (ctx) {
        return function (e) {
          // Don't do anything if recorder doesn't exist
          if (!ctx.input) {
            return;
          }

          if (Capture._browser.isIE) {
            e = { "keyCode": e.keyCode, "charCode": e.charCode };
          }

          setTimeout(function (ctx, e) {
            return function () {
              // Don't do anything if recorder doesn't exist
              if (!ctx.input) {
                return;
              }
              // Update the caret information
              ctx._updateCaret();

              var keyCode = 0;
              if (typeof (e.keyCode) == 'number') {
                keyCode = e.keyCode;
              } else if (typeof (e.which) == 'number') {
                keyCode = e.which;
              } else if (typeof (e.charCode) == 'number') {
                keyCode = e.charCode;
              }

              // See if we need to do a complete serialization or if a piecemeal update is sufficient.
              if (Math.abs(ctx.lastValue.length - ctx.input.value.length) > 1 || ctx.lastCaretInfo.e - ctx.lastCaretInfo.s > 1) {
                // Do a full serialization
                ctx.serialize();
              } else {
                // Do a piecemeal update instead

                // Map the charCode
                if (keyCode === 0 && e.charCode == 32) {
                  keyCode = e.charCode;
                }

                // Get a quick reference to the xpath
                var xpath = ctx.recorder.getLogger().logXPath(ctx.recorder, XPath.getMapping(ctx.input));

                // Check now if this is a special key
                if (keyCode <= 46 || (keyCode >= 91 && keyCode < 96) || (keyCode >= 112 && keyCode <= 145)) {
                  ctx.recorder.getLogger().log(ctx.recorder, Logger.EVENT_TYPES.KEY_PRESS, {
                    "t": inputType,
                    "xp": xpath,
                    "sk": keyCode,
                    "ps": { "x": ctx.input.scrollTop, "y": ctx.input.scrollLeft }
                  });
                } else {
                  ctx.recorder.getLogger().log(ctx.recorder, Logger.EVENT_TYPES.KEY_PRESS, {
                    "t": inputType,
                    "xp": xpath,
                    "v": ctx._filterTextIfApplicable(ctx.input.value.substr(ctx.lastCaretInfo.c - 1, 1)),
                    "ps": { "x": ctx.input.scrollTop, "y": ctx.input.scrollLeft }
                  });
                }
              }
              // Save the current value for comparison later
              ctx.lastValue = ctx.input.value;
            };
          }(ctx, e), 1);
        };
      }(this));
    }

    // Free up things
    recorder = null;
    ipt = null;
  };

  /**
   * Has the state of this element changed?
   */
  InputCapture.prototype.hasChanged = function () {
    // Is the checked state or value of this input different than before?
    if (this._lastCheckedState != this.input.checked) {
      return true;
    } else if (this.lastValue != this.input.value) {
      return true;
    }

    return false;
  };

  /**
   * Filter text IF APPLICABLE. If no filtering is required, none will take place
   * @param str {String} The input string to filter.
   * @private
   */
  InputCapture.prototype._filterTextIfApplicable = function (str) {
    if (str && this._isSecret()) {
      return str.replace(/[^ \n\r\t]/g, "*");
    }
    return str;
  };

  /**
   * Is this a masked text input?
   * @private
   */
  InputCapture.prototype._isSecret = function () {
    // Its only NOT secret if it specifically has the fsrVisible class on it
    var a = this.input.getAttribute("class") || this.input.getAttribute("className");
    if ((a && a.indexOf('fsrVisible') > -1) || "reset,submit,button".indexOf(this.input.getAttribute("type")) > -1) {
      return false;
    }
    return true;

  };

  /**
   * Is this a text input?
   * @private
   */
  InputCapture.prototype._isTextInput = function () {
    var itr = "text",
      tgNm = fs.toLowerCase(this.input.tagName),
      typAr = ["text", "password", "textarea", "number", "email", "url", "search", "color", "tel", ""];
    if (this.input.getAttribute("type")) {
      itr = this.input.getAttribute("type");
    }
    return (tgNm == "textarea" || utils.inArray(itr, typAr)) && tgNm !== "select";
  };

  /**
   * Serialize the input and put it into the event stream.
   * @param isFirstLoad {Bool} Is this part of the startup sequence for this instance of InputCapture?
   */
  InputCapture.prototype.serialize = function (isFirstLoad) {
    // Get the tag name & type
    var inputTag = fs.toLowerCase(this.input.tagName),
      inputType = this.input.getAttribute("type");

    // If nothing, then it might be a textarea or a select
    if (!inputType) {
      inputType = fs.toLowerCase(this.input.tagName);
      if (inputType == "input") {
        inputType = "text";
      }
    }

    // Don't track 'hidden' input types or 'button' input types
    if (inputType != "hidden") {
      // First determine if we can skip all this because it hasn't changed from the initial state
      if (isFirstLoad) {
        if ((inputType == "radio" || inputType == "checkbox") && !this.input.checked) {
          // Make a record of what this was at this point
          this._lastCheckedState = false;
          return;
        } else if ((inputType == "text" || inputType == "password" || inputTag == "textarea") && this.input.value === "")
          return;
      }
      // Get a quick reference to the log function
      var logger = this.recorder.getLogger();

      // Get a quick reference to the input serialize event type
      var logEventType = Logger.EVENT_TYPES.INPUT_SERIALIZE;

      // Get a quick reference to the xpath mapping
      var xMap = logger.logXPath(this.recorder, XPath.getMapping(this.input));

      //inputTag is only relevant for select and textarea, set inputType to that for the sake of this switch
      inputType = ("select,textarea".indexOf(inputTag) > -1) ? inputTag : inputType;

      switch (inputType) {
        case "textarea":
          logger.log(this.recorder, logEventType, {
            "t": inputType,
            "x": xMap,
            "v": this._filterTextIfApplicable(this.input.value) || "",
            "wt": Dom.getStyle(this.input, this.recorder.win, "width"),
            "ht": Dom.getStyle(this.input, this.recorder.win, "height")
          });
          break;
        case "radio":
        case "checkbox":
          if (this.input.checked || !isFirstLoad) {
            //checked value isn't necessarily passed via innerHTML, and the default value for the input will be false.
            //this is my understanding for checkboxes. This may be different for radio buttons.
            logger.log(this.recorder, logEventType, { "t": inputType, "x": xMap, "b": this.input.checked });
            // Make a record of what this was at this point
            this._lastCheckedState = this.input.checked;
          }
          break;
        case "select":
          // We want the OPTION list so create a place for those
          var selectVals = [];

          // Iterate over them and add them to our object holder
          for (var i = 0; i < this.input.options.length; i++) {
            selectVals[selectVals.length] = {
              "v": this._filterTextIfApplicable(this.input.options[i].value),
              "t": this._filterTextIfApplicable(this.input.options[i].text)
            };
          }

          if (!this.input.multiple && this._isSecret() && selectVals.length > 1) {
            selectVals.length = 1;
          }

          // Log these plus the selected index
          logger.log(this.recorder, logEventType, {
            "t": inputType,
            "x": xMap,
            "sz": { "w": this.input.offsetWidth, "h": this.input.offsetHeight },
            "o": selectVals,
            "si": this.input.options.selectedIndex
          });

          // Keep a copy of the last inner contents
          this._lastSelectListContents = this.input.innerHTML;
          break;
        //text, password, submit, button, tel, and others
        default:
          logger.log(this.recorder, logEventType, {
            "t": inputType,
            "x": xMap,
            "v": this._filterTextIfApplicable(this.input.value) || ""
          });
          break;
      }
    }
  };

  /**
   * Update the caret informaiton for this input
   * @private
   */
  InputCapture.prototype._updateCaret = function () {
    var caretInfo = this._getCaretInfo(this.input),
      loggr = !!this.recorder ? this.recorder.getLogger() : null;

    // If there was no last record, make one
    if (!!loggr && (!this.lastCaretInfo || (this.lastCaretInfo.s != caretInfo.s || this.lastCaretInfo.e != caretInfo.e || this.lastCaretInfo.c != caretInfo.c)))
      setTimeout(function (lg, obj) {
        return function () {
          if (lg && lg.recorder) {
            lg.recorder.getLogger().log(lg.recorder, Logger.EVENT_TYPES.CARET_INFO, obj);
          }
        };
      }(this, {
        "x": loggr.logXPath(this.recorder, XPath.getMapping(this.input)),
        "ci": caretInfo
      }), 20);

    // Make a record of the caret info so we don't unnecessarily update it
    this.lastCaretInfo = caretInfo;
  };

  /**
   * This function will return the caret position in a text field. This function is brought over from old replay and
   * it seems to be working quite well, even if it lacks documentation.
   * @param {HtmlElement} oTextarea The text area
   * @private
   */
  InputCapture.prototype._getCaretInfo = function (oTextarea) {
    var result = {
      's': 0,
      'e': 0,
      'c': 0
    };
    if (oTextarea) {
      var tv = oTextarea.value,
        docObj = oTextarea.ownerDocument;

      if (Capture._browser.isIE && docObj.selection) {
        if (fs.toLowerCase(oTextarea.tagName) == "textarea" && !!docObj.selection) {
          if (tv.charCodeAt(tv.length - 1) < 14)
            tv = tv.replace(/34/g, '') + String.fromCharCode(28);

          var oRng = docObj.selection.createRange(),
            oRng2 = oRng.duplicate();
          oRng2.moveToElementText(oTextarea);
          oRng2.setEndPoint('StartToEnd', oRng);
          result.e = tv.length - oRng2.text.length;
          oRng2.setEndPoint('StartToStart', oRng);
          result.s = tv.length - oRng2.text.length;
          result.c = result.e;
          if (tv.substr(tv.length - 1) == String.fromCharCode(28)) {
            tv = tv.substr(0, tv.length - 1);
          }

          var startcOffset = (tv.substr(0, result.s).split('\n').length) - 1,
            caretcOffset = (tv.substr(0, result.c).split('\n').length) - 1,
            endcOffset = (tv.substr(0, result.e).split('\n').length) - 1;
          result.c -= caretcOffset;
          result.s -= startcOffset;
          result.e -= endcOffset;
        }
        else if (!!docObj.selection) {
          var range = docObj.selection.createRange(),
            r2 = range.duplicate();
          result.s = 0 - r2.moveStart('character', -100000);
          result.e = result.s + range.text.length;
          result.c = result.e;
        }
      }
      else {
        try {
          result.s = oTextarea.selectionStart;
          result.e = oTextarea.selectionEnd;
          result.c = result.e;
        } catch (e) {
        }
      }

      if (!result.s && result.s < 0) {
        result = {
          's': 0,
          'e': 0,
          'c': 0
        };
      }
    }
    return result;
  };

  /**
   * Free up memory
   */
  InputCapture.prototype.dispose = function () {
    // Detach the fsr tracker reference
    this.input._fsrTracker = null;

    // free up other stuff
    this.recorder = null;
    this.lastValue = null;
    this.input = null;
    this.lastCaretInfo = null;
    this._lastSelectListContents = null;
    clearTimeout(this._caretMonitor);
  };

})();