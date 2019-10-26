/**
 * Debug stuff for tracker window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Debug");

(function () {
  /* pragma:DEBUG_START */
  var _console = console,
    _history = [];

  window._fhistory = _history;
  window.console = window.fconsole = {
    log: function () {
      _history.push({type: 'log', args: arguments});
      if (_console) {
        _console.log.apply(_console, arguments);
      }
    },
    warn: function () {
      _history.push({type: 'warn', args: arguments});
      if (_console) {
        _console.warn.apply(_console, arguments);
      }
    },
    error: function () {
      _history.push({type: 'error', args: arguments});
      if (_console) {
        _console.error.apply(_console, arguments);
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