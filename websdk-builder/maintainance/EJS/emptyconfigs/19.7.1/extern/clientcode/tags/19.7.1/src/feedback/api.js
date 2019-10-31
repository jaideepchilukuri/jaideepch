/**
 * Exposes an API
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.API");

fs.require("fs.Top");
fs.require("fs.TopicTester");

(function () {
  // Signals when API methods can be called
  var __apiReady = new utils.FSEvent(),
    __pageResetThrottle,
    rebindTimer;

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
      cb = cb || console.log || function () { };
      __apiReady.subscribe(function (rgs) {
        return function () {
          cb(Singletons.CPPS.get.apply(Singletons.CPPS, rgs[0]));
        };
      }([arguments]), true, true);
    },

    all: function (cb) {
      cb = cb || console.table || console.log || function () { };
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
  fs.API.expose('clearStateFeedback', function () {
    __apiReady.subscribe(function () {
      Singletons.stg.reset();
      if (Singletons.rec && Singletons.rec.recorder) {
        Singletons.rec.recorder.clearState();
      }
    }, true, true);
  });

  // Launch feedback
  var _launchFB = function (mid) {
    var cfgIns = false,
      didpass = false,
      configInstances = config.instances,
      whichinstance;

    /* pragma:DEBUG_START */
    console.warn("fb: launchFeedback");
    /* pragma:DEBUG_END */

    // Prevent any page resets
    clearTimeout(__pageResetThrottle);
    clearTimeout(rebindTimer);
    utils._preventUnloadFor(500);

    // Go through all he config instances and find the one with a matching mid
    for (var i = 0; i < configInstances.length; i++) {
      if (configInstances[i].mid == mid) {
        whichinstance = i;
        cfgIns = configInstances[i];
        break;
      }
    }

    if (cfgIns && cfgIns.disabled) {
      return "This feedback has been disabled.";
    }

    // Check to see if we have any topics
    if (cfgIns.topics && cfgIns.topics.length) {
      for (var p = 0; p < cfgIns.topics.length; p++) {
        if (TopicTester(cfgIns.topics[p])) {
          didpass = true;
          break;
        }
      }
    }
    // If not found let the user know
    if (!cfgIns) {
      return "Error: MID provided is not valid";
    } else if (!didpass && cfgIns.topics.length !== 0) {
      return "Error: Either this measure is disabled or there are no active topics";
    } else if ((didpass || cfgIns.topics.length === 0) && !cfgIns.disabled) {

      if (!cfgIns.surveytype && typeof cfgIns.popup !== 'undefined') {
        cfgIns.surveytype = (!!cfgIns.popup) ? 'popup' : 'modal';
      }

      // If found start the process to show the survey
      if (!cfgIns.template) {
        cfgIns.template = 'default';
      }
      var th = {};
      var ajaxReq = function (template, type, prom, cb) {
        var url = fs.makeURI("$templates/feedback/" + (template || 'default') + '/' + type + '.html'),
          jp = new utils.JSONP({
            success: function (res) {
              cb(res);
              if (prom) {
                prom.resolve();
              }
            }.bind(this),
            failure: function (res) {
              /* pragma:DEBUG_START */
              console.warn("fbs: Failed to fetch " + url);
              /* pragma:DEBUG_END */
              if (prom) {
                prom.error();
              }
            }.bind(this)
          });

        jp.get(url, 'templates_feedback_' + (template || 'default') + '_');
      };

      var asyncQ = new utils.Async(true, function () {
        /* pragma: DEBUG_START */
        console.warn('api: Fetched the templates ');
        /* pragma: DEBUG_END */

        if (typeof Singletons.browser === 'undefined') {
          Singletons.browser = new utils.Browser();
        }
        if (typeof Singletons.CPPS === 'undefined') {
          Singletons.CPPS = new utils.CPPS(utils.getGeneralStorage(Singletons.browser));
        }
        var pu = PopupHandler.initialize(cfgIns, Singletons.browser, Singletons.CPPS, th.emTemplate, th.svContentsTemplate, th.epTemplate);
      }.bind(this), function () {
        /* pragma: DEBUG_START */
        console.warn('api: Failed fetching the templates ');
        /* pragma: DEBUG_END */
      }.bind(this));

      asyncQ.enqueue(function (prom) {
        utils.loadCSS(fs.makeURI("$templates/feedback/" + (this.template || 'default') + '/main.css'),
          function CSSSuccess() {
            // Focus element is attached to this event
            Singletons.onModalCssRetrieved.fire();
            if (prom) {
              prom.resolve();
            }
          }, function CSSFail() {
            /* pragma:DEBUG_START */
            console.warn("fb: css failed to load");
            /* pragma:DEBUG_END */

            if (prom) {
              prom.error();
            }
          }
        );
      });
      asyncQ.enqueue(function (prom) {
        ajaxReq(cfgIns.template, 'epilogue', prom, function (tmp) {
          th.epTemplate = tmp;
        });
      });
      asyncQ.enqueue(function (prom) {
        ajaxReq(cfgIns.template, 'surveycontents', prom, function (tmp) {
          th.svContentsTemplate = tmp;
        });
      });
      asyncQ.enqueue(function (prom) {
        ajaxReq(cfgIns.template, 'serviceunavailable', prom, function (tmp) {
          th.emTemplate = tmp;
        });
      });
    }
  };

  fs.API.expose('launchFeedback', _launchFB);
  fs.API.expose('launchACSFeedback', _launchFB);

  // Feedback reset
  fs.API.expose('resetFeedback', function () {
    /* pragma:DEBUG_START */
    console.warn("fb: pageReset");
    /* pragma:DEBUG_END */
    clearTimeout(rebindTimer);
    if (__pageResetThrottle) {
      clearTimeout(__pageResetThrottle);
      __pageResetThrottle = null;
    }
    __pageResetThrottle = setTimeout(function () {
      __pageResetThrottle = null;
      while (validInstances.length > 0) {
        var vinst = validInstances.pop();
        if (vinst.badge) {
          vinst.badge.dispose();
        }
      }
      utils.Unbind("feedback:*");
      utils.Unbind("feedbackModal:*");
      utils.pageNavEvent.unsubscribe(Singletons.pageResetFn);

      Replay.dispose();
      PopupHandler.disposePopups();
      rebindTimer = fs.nextTick(function () {
        FeedbackSetupSequence();
      });
    }, 200);
  });

  /**
   * FSEvent fired when a feedback survey is shown and contains the data
   * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
   */
  fs.API.expose('onFeedbackSubmitted', Singletons.onFeedbackSubmitted);
  fs.API.expose('onFeedbackShown', Singletons.onFeedbackShown);
  fs.API.expose('onFeedbackClosed', Singletons.onFeedbackClosed);

  /**
   * A static class that exposes an API
   * @type {{exposePublicAPI: Function}}
   */
  var API = {
    /**
     * Expose a public API
     * @param CPPS
     */
    completeAPI: function (cpps, browser, stg) {
      Singletons.CPPS = cpps;
      Singletons.browser = browser;
      Singletons.stg = stg;

      // Signal readiness
      __apiReady.fire();
    }
  };

})();