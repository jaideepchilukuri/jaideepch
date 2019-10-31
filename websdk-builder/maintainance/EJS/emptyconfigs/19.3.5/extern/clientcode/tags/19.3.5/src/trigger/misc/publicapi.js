/**
 * Set up the public API
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.PublicAPI");

fs.require("trig.Top");
fs.require("trig.InviteSetup");

(function (trigger) {

  // Signals whan the API can actually do something
  var __apiReady = new utils.FSEvent(),
    _resetThrottle;

  /**
   * Set up the CPPS namespace
   * @type {{set: FSR.CPPS.set}}
   */
  fs.API.expose('CPPS', {
    /**
     * Set a CPP
     */
    set: function () {
      __apiReady.subscribe(function (rgs) {
        return function () {
          Singletons.CPPS.set.apply(Singletons.CPPS, rgs);
        };
      }(arguments), true, true);
    },
    get: function (key, cb) {
      cb = cb || function () {
      };
      __apiReady.subscribe(function (rgs) {
        return function () {
          cb(Singletons.CPPS.get.apply(Singletons.CPPS, rgs[0]));
        };
      }([arguments]), true, true);
    },
    all: function (cb) {
      cb = cb || function () {
      };
      __apiReady.subscribe(function (rgs) {
        return function () {
          cb(Singletons.CPPS.all.apply(Singletons.CPPS));
        };
      }([arguments]), true, true);
    }
  });

  /**
   * Clear the state
   */
  fs.API.expose('clearState', function () {
    __apiReady.subscribe(function () {
      Singletons.stg.reset();
      if (Singletons.rec && Singletons.rec.recorder) {
        Singletons.rec.recorder.clearState();
      }
    }, true, true);
  });

  /**
   * Get the state
   */
  fs.API.expose('getState', function (cb) {
    __apiReady.subscribe(function () {
      cb(Singletons.state);
    }, true, true);
  });

  /**
   * Get the config
   */
  fs.API.expose('getConfig', function () {
    return config;
  });

  /**
   * Get the formatted config
   */
  fs.API.expose('getConfigFormatted', function () {
    if (console && console.info) {
      console.info("************************** Trigger Configuration **************************");
      console.info("Config: ", config.config);
      if (config.surveydefs && config.surveydefs.length) {
        console.info("************************** Surveydefs Configuration **************************");
        for (var i = 0; i < config.surveydefs.length; i++) {
          console.info("************************** Surveydef " + (i + 1) + " **************************");
          console.info("Config: ", config.surveydefs[i]);
        }
      }
    }
  });

  /**
   * Show the OPT-out UI
   */
  fs.API.expose('optOut', function () {
    var wloc = _W.location.toString();
    _W.location = wloc.indexOf('#') ? wloc.substr(0, wloc.indexOf('#') - 1) + '#fscommand=fsoptout' : (wloc + '#fscommand=fsoptout');
    _W.location.reload();
  });

  /**
   * Show the admin/test window
   */
  fs.API.expose('test', function () {
    var wloc = _W.location.toString();
    _W.location = wloc.indexOf('#') ? wloc.substr(0, wloc.indexOf('#') - 1) + '#fscommand=fstest' : (wloc + '#fscommand=fstest');
    _W.location.reload();
  });

  /**
   * Do a complete teardown and restart of everything
   */
  var ___pReset = function () {
    __apiReady.subscribe(function () {
      if (_resetThrottle) {
        clearTimeout(_resetThrottle);
        _resetThrottle = null;
      }
      _resetThrottle = setTimeout(function () {
        _resetThrottle = null;
        if (!Singletons._triggerResetLock) {
          /* pragma:DEBUG_START */
          console.warn('trigger: resetting all processes');
          /* pragma:DEBUG_END */
          Singletons._triggerResetLock = true;
          var trig = Singletons.trig;
          if (trig) {
            trig.dispose();
            Singletons.trig = null;
          }
          // Resets the page start time
          fs.startTS = utils.now();

          fs.nextTick(function () {
            TriggerStartupSequence();
          });
        }
      }, 250);
    }, true, true);
  };

  fs.API.expose('run', ___pReset);
  fs.API.expose('pageReset', ___pReset);

  /**
   * Show the invite
   * @param displayoverride
   */
  fs.API.expose('showInvite', function (displayoverride) {
    __apiReady.subscribe(function () {
      /* pragma:DEBUG_START */
      console.warn("trigger: forcing invite to display", !!displayoverride ? displayoverride : 'no display override specified');
      /* pragma:DEBUG_END */

      // Set up trigger
      var trig = Singletons.trig || TriggerSetup(Singletons.stg, config, Singletons.browser, Singletons.crit, Singletons.CPPS);

      // Make sure it passes initialization
      if (trig.init()) {
        // Is there a valid survey def?
        if (trig.surveydef) {
          // Start setting up the invite
          var ist = new InviteSetup(trig, Singletons.browser, Singletons.stg, Singletons.CPPS, displayoverride, Singletons.jrny, function () {
            this.initialize();
          });

        } else {
          /* pragma:DEBUG_START */
          console.warn("trigger: no valid survey def");
          /* pragma:DEBUG_END */
        }
      }
    }, true, true);
  });

  /**
   * FSEvent fired after trigger code has been loaded.
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onLoaded', Singletons.loadedEmitter);

  /**
   * FSEvent fired after trigger code has been initialized.
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onInitialized', Singletons.initializedEmitter);

  /**
   * FSEvent fired after invite has been shown.
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onInviteShown', Singletons.inviteShownEmitter);

  /**
   * FSEvent fired after invite has been accepted.
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onInviteAccepted', Singletons.inviteAcceptedEmitter);

  /**
   * FSEvent fired after invite has been declined.
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onInviteDeclined', Singletons.inviteDeclinedEmitter);

  /**
   * FSEvent fired after tracker window opens.
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onTrackerShown', Singletons.trackerShownEmitter);

  /**
   * FSEvent fired when a custom invite should display
   * @type {*}
   */
  fs.API.expose('customInvitationRequested', Singletons.customInvitationRequested);

  /**
   * Expose an event class
   * @type {{}}
   */
  fs.API.expose('Journey', {
    /**
     * Adds an event to events array
     * Handles objects and strings
     * @param param
     */
    addEvent: function () {
      __apiReady.subscribe(function (rgs) {
        return function () {
          Singletons.jrny.addEvent.apply(Singletons.jrny, rgs);
        };
      }(arguments), true, true);
    },

    /**
     * Adds an event object
     * This can be for public use, this function has format validation
     * @param evt
     */
    addEventObj: function () {
      __apiReady.subscribe(function (rgs) {
        return function () {
          Singletons.jrny.addEventObj.apply(Singletons.jrny, rgs);
        };
      }(arguments), true, true);
    },

    /**
     * A simpler add event function
     * This has no validation
     * @param name
     * @private
     */
    addEventString: function () {
      __apiReady.subscribe(function (rgs) {
        return function () {
          Singletons.jrny.addEventString.apply(Singletons.jrny, rgs);
        };
      }(arguments), true, true);
    }
  });

  /**
   * Expose the raw storage
   */
  fs.API.expose('Storage', {
    get: function (key, cb) {
      cb = cb || function () {
      };
      __apiReady.subscribe(function (rgs) {
        return function () {
          cb(Singletons.stg.get.apply(Singletons.stg, rgs[0]));
        };
      }([arguments]), true, true);
    },
    all: function (cb) {
      cb = cb || function () {
      };
      __apiReady.subscribe(function (rgs) {
        return function () {
          cb(Singletons.stg.all.apply(Singletons.stg));
        };
      }([arguments]), true, true);
    }
  });

  /**
   * Expose the public API
   * @param context
   * @constructor
   */
  var CompleteAPI = function (stg, crit, cpps, jrny, browser) {
    /**
     * Extend singletons
     */
    fs.ext(Singletons, {
      CPPS: cpps,
      crit: crit,
      stg: stg,
      jrny: jrny,
      browser: browser
    }, false);

    /**
     * Fire the API ready event
     */
    __apiReady.fire();
  };

})(trigger);
