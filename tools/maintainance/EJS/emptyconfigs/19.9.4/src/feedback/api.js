/**
 * Exposes an API
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { PopupHandler } from "./popuphandler";
import { Replay } from "./replay";
import { Singletons } from "./top";
import { checkTopicAllowed } from "./topictester";
import { API, makeURI, nextTick, getProductConfig } from "../fs/index";
import {
  Browser,
  loadCSS,
  Unbind,
  FSEvent,
  _preventUnloadFor,
  pageNavEvent,
  Async,
  JSONP,
  CPPS,
  getGeneralStorage,
} from "../utils/utils";

// Signals when API methods can be called
const __apiReady = new FSEvent();
let __pageResetThrottle;
let rebindTimer;
let _feedbackStartup;
let _validInstances;

// TODO: import shared api code from trigger and delete copy-pasta

/**
 * Set up the CPPS namespace
 * @type {{set: FSR.CPPS.set}}
 */
API.expose("CPPS", {
  /**
   * Set a CPP
   */
  set() {
    __apiReady.subscribe(
      (rgs => () => {
        Singletons.CPPS.set.apply(Singletons.CPPS, rgs);
      })(arguments),
      true,
      true
    );
  },

  get(key, cb) {
    cb = cb || console.log || (() => {});
    __apiReady.subscribe(
      (rgs => () => {
        cb(Singletons.CPPS.get.apply(Singletons.CPPS, rgs[0]));
      })([arguments]),
      true,
      true
    );
  },

  all(cb) {
    cb = cb || console.table || console.log || (() => {});
    __apiReady.subscribe(
      (() => () => {
        cb(Singletons.CPPS.all.apply(Singletons.CPPS));
      })([arguments]),
      true,
      true
    );
  },
});

/**
 * Clear the state
 */
API.expose("clearStateFeedback", () => {
  __apiReady.subscribe(
    () => {
      Singletons.stg.reset();
      if (Singletons.rec && Singletons.rec.recorder) {
        Singletons.rec.recorder.clearState();
      }
    },
    true,
    true
  );
});

// Launch feedback
const _launchFB = mid => {
  let cfgIns = false;
  let didpass = false;
  const configInstances = getProductConfig("feedback").instances;

  /* pragma:DEBUG_START */
  console.warn("fb: launchFeedback");
  /* pragma:DEBUG_END */

  // Prevent any page resets
  clearTimeout(__pageResetThrottle);
  clearTimeout(rebindTimer);
  _preventUnloadFor(500);

  // Go through all he config instances and find the one with a matching mid
  for (let i = 0; i < configInstances.length; i++) {
    if (configInstances[i].mid == mid) {
      cfgIns = configInstances[i];
      break;
    }
  }

  if (cfgIns && cfgIns.disabled) {
    return "This feedback has been disabled.";
  }

  // Check to see if we have any topics
  if (cfgIns.topics && cfgIns.topics.length) {
    for (let p = 0; p < cfgIns.topics.length; p++) {
      if (checkTopicAllowed(cfgIns.topics[p])) {
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
    if (!cfgIns.surveytype && typeof cfgIns.popup !== "undefined") {
      cfgIns.surveytype = cfgIns.popup ? "popup" : "modal";
    }

    // If found start the process to show the survey
    if (!cfgIns.template) {
      cfgIns.template = "default";
    }

    // For a popup survey, all data needed will be requested by
    // the popped window, so we're ready to forward
    if (PopupHandler.computeSurveyType(cfgIns.surveytype) == "popup") {
      PopupHandler.initialize(cfgIns, Singletons.browser, Singletons.CPPS);
      return;
    }

    // Preload all templates and assets needed before presenting the survey
    const th = {};

    const ajaxReq = (template, type, prom, cb) => {
      const url = makeURI(`$templates/feedback/${template || "default"}/${type}.html`);

      const jp = new JSONP({
        success(res) {
          if (prom) {
            prom.resolve();
          }
          return cb(res);
        },
        failure() {
          /* pragma:DEBUG_START */
          console.warn(`fbs: Failed to fetch ${url}`);
          /* pragma:DEBUG_END */
          if (prom) {
            prom.error();
          }
        },
      });

      jp.get(url, `templates_feedback_${template || "default"}_`);
    };

    const asyncQ = new Async(
      true,
      () => {
        /* pragma: DEBUG_START */
        console.warn("api: Fetched the templates ");
        /* pragma: DEBUG_END */

        if (typeof Singletons.browser === "undefined") {
          Singletons.browser = new Browser();
        }
        if (typeof Singletons.CPPS === "undefined") {
          Singletons.CPPS = new CPPS(getGeneralStorage(Singletons.browser));
        }
        PopupHandler.initialize(
          cfgIns,
          Singletons.browser,
          Singletons.CPPS,
          th.emTemplate,
          th.svContentsTemplate,
          th.epTemplate
        );
      },
      () => {
        /* pragma: DEBUG_START */
        console.warn("api: Failed fetching the templates ");
        /* pragma: DEBUG_END */
      }
    );

    asyncQ.enqueue(function(prom) {
      loadCSS(
        makeURI(`$templates/feedback/${this.template || "default"}/main.css`),
        function CSSSuccess() {
          // Focus element is attached to this event
          Singletons.onModalCssRetrieved.fire();
          if (prom) {
            prom.resolve();
          }
        },
        function CSSFail() {
          /* pragma:DEBUG_START */
          console.warn("fb: css failed to load");
          /* pragma:DEBUG_END */

          if (prom) {
            prom.error();
          }
        }
      );
    });
    asyncQ.enqueue(prom => {
      ajaxReq(cfgIns.template, "epilogue", prom, tmp => {
        th.epTemplate = tmp;
      });
    });
    asyncQ.enqueue(prom => {
      ajaxReq(cfgIns.template, "surveycontents", prom, tmp => {
        th.svContentsTemplate = tmp;
      });
    });
    asyncQ.enqueue(prom => {
      ajaxReq(cfgIns.template, "serviceunavailable", prom, tmp => {
        th.emTemplate = tmp;
      });
    });
  }
};

API.expose("launchFeedback", _launchFB);
API.expose("launchACSFeedback", _launchFB);

// Feedback reset
API.expose("resetFeedback", () => {
  /* pragma:DEBUG_START */
  console.warn("fb: pageReset");
  /* pragma:DEBUG_END */
  clearTimeout(rebindTimer);
  if (__pageResetThrottle) {
    clearTimeout(__pageResetThrottle);
    __pageResetThrottle = null;
  }
  __pageResetThrottle = setTimeout(() => {
    __pageResetThrottle = null;
    while (_validInstances.length > 0) {
      const vinst = _validInstances.pop();
      if (vinst.badge) {
        vinst.badge.dispose();
      }
    }
    Unbind("feedback:*");
    Unbind("feedbackModal:*");
    pageNavEvent.unsubscribe(Singletons.pageResetFn);

    Replay.dispose();
    PopupHandler.disposePopups();
    rebindTimer = nextTick(() => {
      _feedbackStartup();
    });
  }, 200);
});

/**
 * FSEvent fired when a feedback survey is shown and contains the data
 * @see http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/api-event-hooks/
 */
API.expose("onFeedbackSubmitted", Singletons.onFeedbackSubmitted);
API.expose("onFeedbackShown", Singletons.onFeedbackShown);
API.expose("onFeedbackClosed", Singletons.onFeedbackClosed);

// invert dependency
function setFeedbackStartup(startup, instances) {
  _feedbackStartup = startup;
  _validInstances = instances;
}

/**
 * Expose a public API
 */
function completeAPI() {
  // Signal readiness
  __apiReady.fire();
}

export { setFeedbackStartup, completeAPI };
