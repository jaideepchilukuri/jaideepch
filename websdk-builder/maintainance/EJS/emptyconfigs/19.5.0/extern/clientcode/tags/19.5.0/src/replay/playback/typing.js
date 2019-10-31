/**
 * Keyboard typing module.
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

fs.provide("rp.Replay.Playback.Typing");

fs.require("rp.Replay.Playback");
fs.require("rp.Top");
fs.require("rp.Replay.Playback.Dom");

(function () {

  /**
   * Handles the typing namespace
   */
  Replay.Playback.Typing = {
    /**
     * Keeps track of cursor positions.
     * A set of key value pairs for xpaths
     */
    _caretRecords: {}
  };

  /**
   * Handles the caret information
   * @param evt The entire event object
   */
  Replay.Playback.Typing.handleCaretEvent = function (evt) {
    // Note this in the permanent record
    Replay.Playback.Typing._caretRecords[evt.xpathIndex] = evt.caretInfo;

    // Set the caret
    Replay.Playback.Typing.setCaret(Replay.Playback.Dom.retrieveDomNodeByXPath(evt.xpathIndex), evt.caretInfo);
  };

  /**
   * Set the caret
   * @param fObj The dom node
   * @parem evt The caret info object
   */
  Replay.Playback.Typing.setCaret = function (fObj, caret) {

    if (fObj) {
      var docObj = fObj.ownerDocument;
      fObj.focus();

      if (browser.isIE) {
        if (fObj.tagName.toLowerCase() == "textarea") {
          var oSel = docObj.selection.createRange().duplicate();
          oSel.moveToElementText(fObj);
          oSel.moveEnd('character', -(fObj.value.length - caret.sEnd));
          oSel.moveStart('character', caret.sStart);
          oSel.select();
        } else {
          fObj.focus();
          var range = fObj.createTextRange();
          range.collapse(true);
          range.moveEnd('character', caret.sEnd);
          range.moveStart('character', caret.sStart);
          range.select();
        }

      } else {
        try {
          if (fObj.setSelectionRange && caret && caret.sStart && caret.sEnd) {
            fObj.setSelectionRange(caret.sStart, caret.sEnd);
          }
        } catch (e) {
        }
      }
    }
  };

  /**
   * Restore the caret information if it has been lost
   */
  Replay.Playback.Typing.restoreCaret = function (xpath) {
    // Grab the caret from the permanent record
    var caret = Replay.Playback.Typing._caretRecords[xpath];

    // Set the caret
    Replay.Playback.Typing.setCaret(Replay.Playback.Dom.retrieveDomNodeByXPath(xpath), caret);
  };

  /**
   * Handles a typing event
   * @param evt The entire event object
   */
  Replay.Playback.Typing.handleTypingEvent = function (evt) {
    // Grab the caret from the permanent record
    var caret = Replay.Playback.Typing._caretRecords[evt.xpathInfo];

    // Get the node
    var node = Replay.Playback.Dom.retrieveDomNodeByXPath(evt.xpathInfo);

    if (node && fs.isDefined(node.value)) {
      // Get the current value
      var newValue = node.value;

      // Fix an edge case with space bars
      if (evt.basicState.iState == 32)
        evt.strData = " ";

      // Fix an edge case with carriage returns
      if (evt.basicState.iState == 13)
        evt.strData = "\n";

      // Only do this block if there is string data
      if (!fs.isDefined(evt.strData)) {
        // A special key was pressed
        if (evt.basicState.iState == 8) {
          // backspace
          if (caret.sEnd == caret.sStart) {
            // just delete one char
            newValue = newValue.substr(0, caret.sStart - 1) + newValue.substr(caret.sEnd);
          }
        } else if (evt.basicState.iState == 46) {
          // backspace
          if (caret.sEnd == caret.sStart) {
            // just delete one char
            newValue = newValue.substr(0, caret.sStart) + newValue.substr(caret.sEnd + 1);
          }
        }
      } else {

        if (caret) {
          // Determine the new value
          newValue = newValue.substr(0, caret.sStart) + evt.strData + newValue.substr(caret.sEnd);
        }
      }

      //number type inputs need numerical values and can't use multiple 0's
      if (node.type && node.type == "number") {
        newValue = newValue.replace("*", "1");
      }

      //check to see if fsrHidden exists, if so mask the input
      if (!!node.getAttribute("class") && node.getAttribute("class").indexOf("fsrHidden") > 0 && node.tagName.toLowerCase() == 'input') {
        newValue = newValue.replace(/[\W\w]/g, '*');
      }

      //Apply the new value
      node.value = newValue;

      // Set the scroll position now
      node.scrollTop = evt.position.y;
      node.scrollLeft = evt.position.x;

      // Now set the scroll position on a quick timer
      setTimeout(function (x, y, obj) {
        return function () {
          obj.scrollTop = x;
          obj.scrollLeft = y;
        };
      }(evt.position.x, evt.position.y, node), 1);

      // Reinforce the caret
      if (caret) {
        Replay.Playback.Typing.setCaret(node, caret);
      }
    }
  };

})();