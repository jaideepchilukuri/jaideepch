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
      if (Singletons.tracker && Singletons.tracker._heartbeat) {
        clearInterval(Singletons.tracker._heartbeat);
      }

      Singletons.stg.reset();

      // This is used by "feedback's gateway config" to abort loading feedback
      // in case a survey has already been submitted.
      if (fs.supportsDomStorage) {
        sessionStorage.removeItem('acsFeedbackSubmitted');
      }

      if (Singletons.rec && Singletons.rec.recorder) {
        Singletons.rec.recorder.clearState();
      }
    }, true, true);
  });

  /**
   * Dispose Trigger
   */
  fs.API.expose('dispose', function () {
    __apiReady.subscribe(function () {
      if (Singletons.trig) {
        Singletons.trig.dispose();
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
    return fs.ext({}, config, { global: fs.config });
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
      if (document.getElementById("acsMainInvite")) {
        /* pragma:DEBUG_START */
        console.warn("trigger: ignoring showInvite when invite already open!");
        /* pragma:DEBUG_END */

        return;
      }

      /* pragma:DEBUG_START */
      console.warn("trigger: forcing invite to display", !!displayoverride ? displayoverride : 'no display override specified');
      /* pragma:DEBUG_END */

      // Set up trigger
      var trig = Singletons.trig || TriggerSetup(Singletons.stg, config, Singletons.browser, Singletons.crit, Singletons.CPPS);

      // Make sure it passes initialization
      if (trig.init() && trig.doesPassCriteria()) {
        // Is there a valid survey def?
        if (trig.surveydef) {
          // make sure the invite will actually pop if a prior attempt failed
          Singletons.state.didInvite = false;

          // Start setting up the invite
          var ist = getInviteSetupInstance(trig, Singletons.browser, Singletons.stg, Singletons.CPPS, displayoverride, Singletons.jrny, 'Traditional', function () {
            this.initialize();
            this.present();
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
   * @see https://developer.foresee.com/docs/api-event-hooks
   */
  fs.API.expose('onLoaded', Singletons.loadedEmitter);

  /**
   * FSEvent fired after trigger code has been initialized.
   * @see https://developer.foresee.com/docs/api-event-hooks
   */
  fs.API.expose('onInitialized', Singletons.initializedEmitter);

  /**
   * FSEvent fired after invite has been shown.
   * @see https://developer.foresee.com/docs/api-event-hooks
   */
  fs.API.expose('onInviteShown', Singletons.inviteShownEmitter);

  /**
   * FSEvent fired after invite has been accepted.
   * @see https://developer.foresee.com/docs/api-event-hooks
   */
  fs.API.expose('onInviteAccepted', Singletons.inviteAcceptedEmitter);

  /**
   * FSEvent fired after invite has been abandoned.
   * @see https://developer.foresee.com/docs/api-event-hooks
   */
  fs.API.expose('onInviteAbandoned', Singletons.inviteAbandonedEmitter);

  /**
   * FSEvent fired after invite has been declined.
   * @see https://developer.foresee.com/docs/api-event-hooks
   */
  fs.API.expose('onInviteDeclined', Singletons.inviteDeclinedEmitter);

  /**
   * FSEvent fired after tracker window opens.
   * @see https://developer.foresee.com/docs/api-event-hooks
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

    // Debug API functions
    /* pragma:DEBUG_START */
    set: function () {
      __apiReady.subscribe(function (rgs) {
        return function () {
          Singletons.stg.set.apply(Singletons.stg, rgs);
        };
      }(arguments), true, true);
    },
    erase: function () {
      __apiReady.subscribe(function (rgs) {
        return function () {
          Singletons.stg.erase.apply(Singletons.stg, rgs);
        };
      }(arguments), true, true);
    },
    /* pragma:DEBUG_END */

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
          var vals = Singletons.stg.all();
          cb(vals);
        };
      }([arguments]), true, true);
    }
  });

  /**
   * Exposes the cookie utils
   */
  fs.API.expose('Cookie', {
    /**
     * Read a cookie, also decode the cookie if it is the _4c_ cookie
     * @param cookieName
     * @param callback
     */
    get: function (cookieName, cb) {
      cb = cb || console.log || function () { };
      __apiReady.subscribe(function (rgs) {
        return function () {
          try {
            if (rgs[0] === '_4c_') {
              cb(JSON.parse(compress.decompress(decodeURIComponent(ckie.get(rgs[0])))));
            } else {
              cb(ckie.get(rgs[0]));
            }
          } catch (e) {
            console.error("trigger: couldn't read cookie", rgs[0]);
          }
        };
      }(arguments), true, true);
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
