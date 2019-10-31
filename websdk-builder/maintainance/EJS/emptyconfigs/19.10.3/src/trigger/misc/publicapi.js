/**
 * Set up the public API
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Singletons, _W } from "../top";
import {
  API,
  globalConfig,
  ext,
  nextTick,
  resetStartTS,
  supportsDomStorage,
  getProductConfig,
} from "../../fs/index";
import { getInviteSetupInstance } from "../invitesetup";
import { TriggerSetup } from "../triggersetup";
import { FSEvent, Cookie } from "../../utils/utils";
import { decompress } from "../../compress/compress";

// Signals whan the API can actually do something
const __apiReady = new FSEvent();
let _resetThrottle;
let _triggerStartup;

// TODO: share some of this code with feedback

/**
 * Set up the CPPS namespace
 * @type {{set: FSR.CPPS.set}}
 */
API.expose("CPPS", {
  /**
   * Set a CPP
   */
  set(key, value) {
    __apiReady.subscribe(
      () => {
        Singletons.CPPS.set(key, value);
      },
      true,
      true
    );
  },
  get(key, cb) {
    cb = cb || console.log;
    __apiReady.subscribe(
      () => {
        cb(Singletons.CPPS.get(key));
      },
      true,
      true
    );
  },
  all(cb) {
    cb = cb || console.table || console.log;
    __apiReady.subscribe(
      () => {
        cb(Singletons.CPPS.all());
      },
      true,
      true
    );
  },
});

/**
 * Clear the state
 */
API.expose("clearState", () => {
  __apiReady.subscribe(
    () => {
      if (Singletons.tracker && Singletons.tracker._heartbeat) {
        clearInterval(Singletons.tracker._heartbeat);
      }

      Singletons.stg.reset();

      // This is used by "feedback's gateway config" to abort loading feedback
      // in case a survey has already been submitted.
      if (supportsDomStorage) {
        sessionStorage.removeItem("acsFeedbackSubmitted");
      }

      if (Singletons.rec && Singletons.rec.recorder) {
        Singletons.rec.recorder.clearState();
      }
    },
    true,
    true
  );
});

/**
 * Dispose Trigger
 */
API.expose("dispose", () => {
  __apiReady.subscribe(
    () => {
      if (Singletons.trig) {
        Singletons.trig.dispose();
      }
    },
    true,
    true
  );
});

/**
 * Get the state
 */
API.expose("getState", cb => {
  cb = cb || console.log;
  __apiReady.subscribe(
    () => {
      cb(Singletons.state);
    },
    true,
    true
  );
});

/**
 * Get the config
 */
API.expose("getConfig", () => ext({}, getProductConfig("trigger"), { global: globalConfig }));

/**
 * Get the formatted config
 */
API.expose("getConfigFormatted", () => {
  const config = getProductConfig("trigger");
  if (console && console.info) {
    console.info("************************** Trigger Configuration **************************");
    console.info("Config: ", config.config);
    if (config.surveydefs && config.surveydefs.length) {
      console.info(
        "************************** Surveydefs Configuration **************************"
      );
      for (let i = 0; i < config.surveydefs.length; i++) {
        console.info(`************************** Surveydef ${i + 1} **************************`);
        console.info("Config: ", config.surveydefs[i]);
      }
    }
  }
});

/**
 * Show the OPT-out UI
 */
API.expose("optOut", () => {
  const wloc = _W.location.toString();
  _W.location =
    wloc.indexOf("#") > -1 ? `${wloc}&fscommand=fsoptout` : `${wloc}#fscommand=fsoptout`;
  _W.location.reload();
});

/**
 * Show the admin/test window
 */
API.expose("test", () => {
  const wloc = _W.location.toString();
  _W.location = wloc.indexOf("#") > -1 ? `${wloc}&fscommand=fstest` : `${wloc}#fscommand=fstest`;
  _W.location.reload();
});

/**
 * Do a complete teardown and restart of everything
 */
const ___pReset = () => {
  __apiReady.subscribe(
    () => {
      if (_resetThrottle) {
        clearTimeout(_resetThrottle);
        _resetThrottle = null;
      }
      _resetThrottle = setTimeout(() => {
        _resetThrottle = null;
        if (!Singletons._triggerResetLock) {
          /* pragma:DEBUG_START */
          console.warn("trigger: resetting all processes");
          /* pragma:DEBUG_END */
          Singletons._triggerResetLock = true;
          const trig = Singletons.trig;
          if (trig) {
            trig.dispose();
            Singletons.trig = null;
          }
          // Resets the page start time
          resetStartTS();

          nextTick(_triggerStartup);
        }
      }, 250);
    },
    true,
    true
  );
};

API.expose("run", ___pReset);
API.expose("pageReset", ___pReset);

/**
 * Show the invite
 * @param displayoverride
 */
API.expose("showInvite", displayoverride => {
  __apiReady.subscribe(
    () => {
      if (document.getElementById("fsrInvite") || document.getElementById("acsMainInvite")) {
        /* pragma:DEBUG_START */
        console.warn("trigger: ignoring showInvite when invite already open!");
        /* pragma:DEBUG_END */

        return;
      }

      /* pragma:DEBUG_START */
      console.warn(
        "trigger: forcing invite to display",
        displayoverride || "no display override specified"
      );
      /* pragma:DEBUG_END */

      // Set up trigger
      const trig =
        Singletons.trig ||
        TriggerSetup(
          Singletons.stg,
          getProductConfig("trigger"),
          Singletons.browser,
          Singletons.crit,
          Singletons.CPPS
        );

      // Make sure it passes initialization
      if (trig.init() && trig.doesPassCriteria()) {
        // Is there a valid survey def?
        if (trig.surveydef) {
          // make sure the invite will actually pop if a prior attempt failed
          Singletons.state.didInvite = false;

          // Start setting up the invite
          getInviteSetupInstance(
            trig,
            Singletons.browser,
            Singletons.stg,
            Singletons.CPPS,
            displayoverride,
            Singletons.jrny,
            "Traditional",
            function() {
              this.initialize();
              this.present();
            }
          );
        } else {
          /* pragma:DEBUG_START */
          console.warn("trigger: no valid survey def");
          /* pragma:DEBUG_END */
        }
      }
    },
    true,
    true
  );
});

/**
 * FSEvent fired after trigger code has been loaded.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onLoaded", Singletons.loadedEmitter);

/**
 * FSEvent fired after trigger code has been initialized.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onInitialized", Singletons.initializedEmitter);

/**
 * FSEvent fired after invite has been shown.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onInviteShown", Singletons.inviteShownEmitter);

/**
 * FSEvent fired after invite has been accepted.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onInviteAccepted", Singletons.inviteAcceptedEmitter);

/**
 * FSEvent fired after invite has been abandoned.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onInviteAbandoned", Singletons.inviteAbandonedEmitter);

/**
 * FSEvent fired after invite has been declined.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onInviteDeclined", Singletons.inviteDeclinedEmitter);

/**
 * FSEvent fired after tracker window opens.
 * @see https://developer.foresee.com/docs/api-event-hooks
 */
API.expose("onTrackerShown", Singletons.trackerShownEmitter);

/**
 * FSEvent fired when a custom invite should display
 * @type {*}
 */
API.expose("customInvitationRequested", Singletons.customInvitationRequested);

/**
 * Expose an event class
 * @type {{}}
 */
API.expose("Journey", {
  /**
   * Adds an event to events array
   * Handles objects and strings
   * @param param
   */
  addEvent(event) {
    __apiReady.subscribe(
      () => {
        Singletons.jrny.addEvent(event);
      },
      true,
      true
    );
  },

  /**
   * Adds an event object
   * This can be for public use, this function has format validation
   * @param evt
   */
  addEventObj(event) {
    __apiReady.subscribe(
      () => {
        Singletons.jrny.addEventObj(event);
      },
      true,
      true
    );
  },

  /**
   * A simpler add event function
   * This has no validation
   * @param name
   * @private
   */
  addEventString(name) {
    __apiReady.subscribe(
      () => {
        Singletons.jrny.addEventString(name);
      },
      true,
      true
    );
  },
});

/**
 * Expose the raw storage
 */
API.expose("Storage", {
  // Debug API functions
  /* pragma:DEBUG_START */
  set(key, value, expiration, emergency, callback) {
    __apiReady.subscribe(
      () => {
        Singletons.stg.set(key, value, expiration, emergency, callback);
      },
      true,
      true
    );
  },
  erase(key) {
    __apiReady.subscribe(
      () => {
        Singletons.stg.erase(key);
      },
      true,
      true
    );
  },
  /* pragma:DEBUG_END */

  get(key, cb) {
    cb = cb || console.log;
    __apiReady.subscribe(
      () => {
        cb(Singletons.stg.get(key));
      },
      true,
      true
    );
  },
  all(cb) {
    cb = cb || console.table || console.log;
    __apiReady.subscribe(
      () => {
        const all = Singletons.stg.all();
        const vals = {};
        // filter values to only output the not deleted values.
        for (const key in all) {
          if (all[key].d !== 1) {
            vals[key] = all[key];
          }
        }

        cb(vals);
      },
      true,
      true
    );
  },
});

/**
 * The cookie interface
 * @type {utils.Cookie}
 */
const ckie = new Cookie({
  path: "/",
  secure: false,
  encode: true,
});

/**
 * Exposes the cookie utils
 */
API.expose("Cookie", {
  /**
   * Read a cookie, also decode the cookie if it is the _4c_ cookie
   * @param cookieName
   * @param callback
   */
  get(cookieName, cb) {
    cb = cb || console.log || (() => {});
    __apiReady.subscribe(
      () => {
        try {
          if (cookieName === "_4c_") {
            return cb(JSON.parse(decompress(decodeURIComponent(ckie.get(cookieName)))));
          }

          return cb(ckie.get(cookieName));
        } catch (e) {
          console.error("trigger: couldn't read cookie", cookieName);
        }
      },
      true,
      true
    );
  },
});

/**
 * Expose the public API
 * @param context
 * @constructor
 */
const CompleteAPI = (stg, crit, cpps, jrny, browser) => {
  /**
   * Extend singletons
   */
  ext(
    Singletons,
    {
      CPPS: cpps,
      crit,
      stg,
      jrny,
      browser,
    },
    false
  );

  /**
   * Fire the API ready event
   */
  __apiReady.fire();
};

function setTriggerStartup(startup) {
  _triggerStartup = startup;
}

export { __apiReady, CompleteAPI, setTriggerStartup };
