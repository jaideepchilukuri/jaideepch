/**
 * Entry point for Tracker window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext, getParam, isDefined, winReady } from "../fs/index";
import { Tracker } from "./tracker";
import { Browser, now as currentTime, getBrainStorage } from "../utils/utils";

// Main entry point
function startup() {
  winReady(onWinReady);
}

function onWinReady() {
  // The close timer
  const killTimer = setTimeout(() => {
    window.close();
  }, 13000);

  /* pragma:DEBUG_START */
  console.log("tracker: window load - stopping kill timer due to debug mode");
  clearTimeout(killTimer);
  /* pragma:DEBUG_END */

  // Set up the browser
  const browser = new Browser();

  // Holds the CPP's that may come from the main window
  let cppInfo;

  // Holds the eventual tracker instance
  let trackerInst;

  // Heartbeat interval times
  const HB_I = 5000;

  // Bind to browser ready
  browser.ready.subscribe(
    () => {
      /* pragma:DEBUG_START */
      console.log("tracker: browser detected", browser);
      /* pragma:DEBUG_END */

      // This is the server-based way: COOKIELESS or MICROCOOKIE
      const stg = getBrainStorage(browser, getParam("uid"));

      // React if the brain is not reactive
      const len_timeoutLoading = 30000;
      const timeoutLoading = window.setTimeout(onStgTimedout, len_timeoutLoading);

      // React if the brain is having troubles
      stg._readyState.subscribe(onStgReadyState, false, true);

      // Wait for storage to be ready
      stg.ready.subscribe(
        () => {
          /* pragma:DEBUG_START */
          console.log("tracker: storage is ready");
          /* pragma:DEBUG_END */

          stg._readyState.unsubscribe(onStgReadyState);
          window.clearTimeout(timeoutLoading);

          // Set a fast interval on startup to receive the trackerinfo ASAP
          let hbInterval = window.setInterval(() => {
            const trackerinfo = stg.get("trackerinfo");
            if (trackerinfo) {
              // This makes sure that the following set&commit does not
              // override a more recent page_hb already in the brain
              delete stg._data.keys.page_hb;
              // Sets the heartbeat, effectively also synchronizing the data.
              stg.set("tracker_hb", currentTime(), trackerinfo.hb_i * 2, true);
            } else {
              // This should never happen. But in case it does (...),
              // let's trigger a sync
              stg._sync();
              /* pragma:DEBUG_START */
              console.error("Missing trackerinfo in stg", stg._data.keys);
              /* pragma:DEBUG_END */
            }
          }, 1000);

          // Instantiate the Tracker if all the data is already available
          // (it returns null if deos not have all the necessary params)
          trackerInst = createTrackerInstance(browser, stg, stg.get("trackerinfo"));

          // Start checking to see when we get the information for the tracker window
          stg.watchForChanges(
            ["trackerinfo", "trackercmd", "ckcpps"],
            (key, olddata, tcfg) => {
              // What type of key is this?
              if (key == "trackercmd") {
                switch (tcfg.method) {
                  case "close":
                    window.close();
                    break;
                  case "survey":
                    if (trackerInst && trackerInst.goToSurvey) {
                      trackerInst.goToSurvey();
                    }
                    break;
                  default:
                    break;
                }
              } else if (key == "ckcpps" && trackerInst) {
                ext(trackerInst.cpps._extras, tcfg);
                /* pragma:DEBUG_START */
                console.warn("tracker: syncing CPPs. new set:", trackerInst.cpps._extras);
                /* pragma:DEBUG_END */
              } else if (key == "trackerinfo") {
                /* pragma:DEBUG_START */
                console.warn("tracker: detected tracker info from main page: ", tcfg);
                /* pragma:DEBUG_END */

                if (!isDefined(trackerInst)) {
                  // Initialize the Tracker
                  // todo: It should already be created but it may happen with some weird
                  // real-life timings? Should it be removed?
                  trackerInst = createTrackerInstance(browser, stg, tcfg);
                } else {
                  // Render the Tracker with updated active definition
                  const oldDef = trackerInst.data.cfg.active_surveydef;
                  const newDef = tcfg.cfg.active_surveydef;

                  // Is there a new definition? Maybe the main window navigated to a non-matching page?
                  if (!isDefined(newDef)) return;

                  // Is this a different definition?
                  if (
                    oldDef.name !== newDef.name ||
                    oldDef.site !== newDef.site ||
                    oldDef.section !== newDef.section ||
                    (oldDef.language && oldDef.language.locale != newDef.language.locale)
                  ) {
                    if (trackerInst.data.template !== tcfg.template) {
                      /* pragma:DEBUG_START */
                      console.error(
                        "tracker: Updating to a different template is not a supported, due to high risks of incompatibilities between the template's configurations.",
                        trackerInst.data.template,
                        tcfg.template
                      );
                      /* pragma:DEBUG_END */
                      return;
                    }
                    trackerInst.update(browser, stg, tcfg);
                    trackerInst.renderTemplate();
                  }
                }
              }

              return;
            },
            false,
            true
          );

          function createTrackerInstance(browser, storage, trackerInfo) {
            if (!browser || !storage || !trackerInfo) {
              /* pragma:DEBUG_START */
              console.warn(
                "tracker.createTrackerInstance:",
                browser ? "" : "no browser",
                storage ? "" : "no storage",
                trackerInfo ? "" : "no trackerInfo"
              );
              /* pragma:DEBUG_END */
              return;
            }
            const tracker = new Tracker(browser, storage, trackerInfo);

            tracker.ready.subscribe(
              () => {
                /* pragma:DEBUG_START */
                console.log("tracker: is ready to draw itself");
                /* pragma:DEBUG_END */

                // Remove the kill timer
                clearTimeout(killTimer);

                // Set any CPPS
                if (cppInfo) {
                  tracker.setCPPS(cppInfo);
                }

                // Do the rendering of the template
                tracker.renderTemplate();
              },
              true,
              true
            );

            // Tone down the interval to 5s after tracker info received
            clearInterval(hbInterval);
            hbInterval = window.setInterval(() => {
              // This makes sure that the following set&commit does not
              // override a more recent page_hb already in the brain
              delete stg._data.keys.page_hb;
              // Sets the heartbeat, effectively also synchronizing the data.
              stg.set("tracker_hb", currentTime(), trackerInfo.hb_i * 2, true);
            }, HB_I);

            return tracker;
          }
        },
        true,
        true
      );
    },
    true,
    true
  );
}

function onStgTimedout() {
  /* pragma:DEBUG_START */
  console.error("tracker: storage did not get ready quickly enough. Closing...");
  /* pragma:DEBUG_END */
  window.close();
}

function onStgReadyState(stg) {
  if (stg._serverFails > 0) {
    /* pragma:DEBUG_START */
    console.error("tracker: Brain server is failing. Closing...");
    /* pragma:DEBUG_END */
    window.close();
  }
}

export { startup };
