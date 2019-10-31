/**
 * Debug stuff for tracker window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/* pragma:DEBUG_START */
var _console = console,
  _history = [];

window._fhistory = _history;

window.console = window.fconsole = {
  log: function() {
    _history.push({ type: "log", args: arguments });
    if (_console) {
      _console.log.apply(_console, arguments);
    }
  },
  warn: function() {
    _history.push({ type: "warn", args: arguments });
    if (_console) {
      _console.warn.apply(_console, arguments);
    }
  },
  error: function() {
    _history.push({ type: "error", args: arguments });
    if (_console) {
      _console.error.apply(_console, arguments);
    }
  },
  history: function() {
    console.group("window.history()");
    _history.forEach(function(item) {
      console[item.type].apply(window, item.args);
    });
    console.groupEnd("window.history()");
  },
};
console.warn("tracker: setting debug interface");
/* pragma:DEBUG_END */
