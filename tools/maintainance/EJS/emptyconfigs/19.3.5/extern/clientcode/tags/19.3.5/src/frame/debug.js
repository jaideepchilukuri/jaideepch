/**
 * Debug stuff for frame
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("frame.Debug");

(function () {

  /* pragma:DEBUG_START */
  var _console = console,
    _history = [];

  window.console = window.fconsole = {
    log: function () {
      _history.push({type: 'log', args: arguments});
      if (_console) {
        try {
          _console.log.apply(_console, arguments);
        } catch(e) {}
      }
    },
    warn: function () {
      _history.push({type: 'warn', args: arguments});
      if (_console) {
        try {
          _console.warn.apply(_console, arguments);
        } catch(e) {}
      }
    },
    error: function () {
      _history.push({type: 'error', args: arguments});
      if (_console) {
        try {
          _console.error.apply(_console, arguments);
        } catch(e) {}
      }
    },
    history: function () {
      for (var i = 0; i < _history.length; i++) {
        var hst = _history[i];
        if (hst.type == 'log') {
          _console.log.apply(_console, hst.args);
        } else if (hst.type == 'warn') {
          _console.warn.apply(_console, hst.args);
        } else if (hst.type == 'error') {
          _console.error.apply(_console, hst.args);
        }
      }
    }
  };
  console.warn("tracker: setting debug interface");
  /* pragma:DEBUG_END */

})();