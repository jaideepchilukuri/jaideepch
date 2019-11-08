/**
 * Entry point for trigger code
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import {
  globalConfig,
  domReady,
  fsCmd,
  getParam,
  isDefined,
  isObject,
  isProduction,
  isString,
  makeURI,
  startTS,
  getProductConfig,
} from "../fs/index";
import {
  Browser,
  pageNavEvent,
  getSize,
  getScreenResolution,
  initBehavioralData,
  Journey,
  retrieveNestedVariable,
  registerProduct,
  now as currentTime,
  startTime,
  testAgainstSearch,
  getRootDomain,
  getBrainStorage,
  CPPS,
  getGeneralStorage,
  APPID,
  Cookie,
} from "../utils/utils";
import { getInviteSetupInstance, startMobileHB, InviteSetup } from "./invitesetup";
import { Criteria } from "./misc/criteria";
import { LinksHandler } from "./misc/links";
import { CompleteAPI, setTriggerStartup } from "./misc/publicapi";
import { SetupRecording } from "./misc/record";
import { Tracker } from "./misc/tracker";
import { Singletons, _W } from "./top";
import { TriggerSetup } from "./triggersetup";

// Keep a permanent copy of the current location; CC-3287 copying only certain values
let currentLocation = {
  hash: _W.location.hash,
  href: _W.location.href,
  pathname: _W.location.pathname,
};

// Quick reference the events collection
const isWindowIframe = window != _W.top;

function startup() {
  const config = getProductConfig("trigger");

  if (!config || !config.config || !config.surveydefs || !config.config.browser_cutoff) {
    throw new Error(
      "Looks like the trigger config is missing or broken. " +
        "Please push a trigger config to fix this error."
    );
  }

  if (config.surveydefs.length && typeof config.surveydefs[0] === "string") {
    throw new Error(
      "Looks like an old trigger config from pre-19.9.0. " +
        "Please re-push the trigger settings with 19.9.0+ to fix this error."
    );
  }

  // Tell the world about us
  registerProduct("foresee", config);

  // Fire the loaded event emitter
  Singletons.loadedEmitter.fire();

  if (
    (config.config.workInIframes === "dontRunOtherIframes" || !config.config.workInIframes) &&
    isWindowIframe
  ) {
    /* pragma:DEBUG_START */
    console.warn("trigger: not the top frame. ending trigger.");
    /* pragma:DEBUG_END */
    return;
  }

  if (_W.__fsrtracker || _W.location.toString().indexOf("survey.foreseeresults.com") > -1) {
    /* pragma:DEBUG_START */
    console.warn("trigger: this is the tracker window or survey. ending trigger.");
    /* pragma:DEBUG_END */
    return;
  }

  // Handle FSR Admin and OPTOUT pages
  if (fsCmd("fstest")) {
    // Loads the fsradmin page, load trigger project to be able to register the product.
    _W._fsRequire([makeURI("$fs.svadmin.js")], () => {});
    return;
  } else if (fsCmd("fsoptout")) {
    // Loads the opt-out interface
    _W._fsRequire([makeURI("$fs.optout.js")], () => {});
    return;
  }

  // When the DOM is ready, fire up the Trigger
  domReady(completeTriggerStartup);

  // let api know how to restart trigger
  setTriggerStartup(completeTriggerStartup);

  // Used to prevent too many page nav events from happening one after another
  let pageNavThrottler;

  if (!config.config.ignoreNavigationEvents) {
    // Do page reset when there's an html5 navigation event
    pageNavEvent.subscribe(
      () => {
        const gbl = _W;
        const nowloc = gbl.location;
        const pr = gbl[config.config.publicApiName || "FSR"];
        const hashfix = hsh => {
          const bits = hsh.split("#");
          if (bits.length > 2) {
            return bits[0] + bits[1];
          }
          return hsh.replace(/#/gi, "");
        };
        const oldhash = hashfix(currentLocation.hash);
        const newhash = hashfix(nowloc.hash);

        if (currentTime() - startTime < (config.config.pageLoadUrlChangeBlackout || 0)) {
          /* pragma:DEBUG_START */
          console.warn("trigger: ignoring page nav within pageLoadUrlChangeBlackout");
          /* pragma:DEBUG_END */
          return;
        }

        /* pragma:DEBUG_START */
        console.warn("trigger: detected navigation event");
        /* pragma:DEBUG_END */

        if ((pr && oldhash != newhash) || currentLocation.pathname != nowloc.pathname) {
          /* pragma:DEBUG_START */
          console.warn("trigger: moving from ", currentLocation.pathname, "to", nowloc.pathname);
          /* pragma:DEBUG_END */
          _W.fsReady(() => {
            clearTimeout(pageNavThrottler);
            pageNavThrottler = setTimeout(() => {
              // Keep a permanent copy of the current location; CC-3287 copying only certain values
              currentLocation = {
                hash: _W.location.hash,
                href: _W.location.href,
                pathname: _W.location.pathname,
              };

              // Call reset
              pr.pageReset();
            }, 1000);
          });
        }
      },
      false,
      false
    );
  }
}

/**
 * Holds the startup sequence for trigger code
 * @constructor
 */
function completeTriggerStartup() {
  const config = getProductConfig("trigger");
  Singletons._triggerResetLock = true;

  /* pragma:DEBUG_START */
  console.log("trigger: startup sequence has begun");
  /* pragma:DEBUG_END */

  // Bomb out if we are in a tracker window
  if (currentLocation.href.indexOf("fs.tracker.html") > -1) {
    /* pragma:DEBUG_START */
    console.warn("trigger: possible tracker window. stopping..");
    /* pragma:DEBUG_END */

    // Set the resetLock to false as we will not present invite
    Singletons._triggerResetLock = false;
    return;
  }

  // Set up the browser
  const browser = new Browser();

  // Bind to browser ready
  browser.ready.subscribe(
    () => {
      // Set up a global storage instance and criteria checker
      const stg = getGeneralStorage(browser);

      const cpps = new CPPS(stg, config.config.cppsResetTimeout);
      let linker;

      // Set the current URL as a CPP
      cpps.set(
        "url",
        // strip any cpp off of the URL to spare redundant data
        _W.location.toString().replace(/(\?|&)(cpp\[[^&#]+\]+)=([^&#]*)/g, "")
      );
      cpps.set("env", isProduction ? "prd" : "stg");

      const crit = new Criteria(stg, config, cpps);

      // Wait for storage to be ready
      stg.ready.subscribe(
        () => {
          /* pragma:DEBUG_START */
          console.log("trigger: storage ready");
          /* pragma:DEBUG_END */
          stg.upgradeOldStorage(() => {
            /* pragma:DEBUG_START */
            console.log("trigger: setting up journey");
            /* pragma:DEBUG_END */

            // save this so we can adjust the hb_i of the tracker
            Singletons.pageLoadTime = currentTime() - startTS;

            initBehavioralData(
              globalConfig.customerId || getRootDomain() || "trigger_customerId",
              stg,
              browser,
              cpps
            );

            // Set up the journey class
            const jrny = (Singletons._journey = new Journey({
              customerId: globalConfig.customerId || getRootDomain() || "trigger_customerId",
              appId: APPID.TRIGGER,
              stg,
              browser,
              useSessionId: true,
              usePopupId: false,
            }));

            jrny.addEventsDefault("properties", {
              fs_site: [getRootDomain()],
              fs_repeatDaysAccept: [config.config.repeatDays.accept],
              fs_repeatDaysDecline: [config.config.repeatDays.decline],
              fs_reinviteDelayAfterInviteAbandon: [config.config.reinviteDelayAfterInviteAbandon],
            });

            // Expose the API. Note: This has to happen AFTER the storage is ready.
            CompleteAPI(stg, crit, cpps, jrny, browser);

            // Get the invite status
            let invitesituation = stg.get("i");

            // Run the rest of the setup on the trigger delay
            setTimeout(() => {
              // set some default CPPs
              cpps.set("code", globalConfig.codeVer);
              cpps.set("tz", -new Date().getTimezoneOffset());
              cpps.set("product_type", "web sdk");

              // Set the device/window size CPPs
              const deviceSize = getScreenResolution();
              cpps.set("device_width", deviceSize.w);
              cpps.set("device_height", deviceSize.h);
              cpps.set("dpr", window.devicePixelRatio || 1);
              if (browser.isMobile) {
                // on mobile because of pinch-zoom the window size is
                // complicated. So we use device size instead.
                cpps.set("window_width", deviceSize.w);
                cpps.set("window_height", deviceSize.h);
              } else {
                const winSize = getSize(window);
                cpps.set("window_width", winSize.w);
                cpps.set("window_height", winSize.h);
              }

              // Set the user-defined CPPS's
              if (config.config.cpps) {
                const cpl = config.config.cpps;
                let cpx;
                let value;
                for (const cp in cpl) {
                  const cplrl = cpl[cp];
                  if (isObject(cplrl)) {
                    switch (cplrl.source) {
                      case "param":
                        {
                          let pmv = getParam(cplrl.val) || cplrl.init || null;

                          if (isDefined(cplrl.mode) && cplrl.mode == "append") {
                            //if we are in append mode
                            const delimiter = cplrl.delimiter || ",";
                            const cg = cpps.get(cp);
                            const currentCPPs = cg ? cg.split(delimiter) : [];
                            let joinedCPPs;
                            pmv = pmv || "";

                            // Check to see if the current param is the same as last stored param, skip if so
                            if (currentCPPs[currentCPPs.length - 1] !== pmv) {
                              currentCPPs.push(pmv);
                              joinedCPPs = currentCPPs.join(delimiter);
                              cpps.set(cp, joinedCPPs);
                            }
                          } else if (isDefined(pmv) && pmv !== null) {
                            //if we are not in append mode
                            //if the value is not null
                            cpps.set(cp, pmv);
                          } else if (!cpps.get(cp)) {
                            cpps.set(cp, "");
                          }

                          /* pragma:DEBUG_START */
                          console.log(
                            "trigger: setting user-defined CPP from parameter for site: ",
                            cp,
                            cplrl,
                            pmv
                          );
                          /* pragma:DEBUG_END */
                        }
                        break;
                      case "variable":
                        if (isDefined(cplrl.name)) {
                          // Get the exists object and just check if it is on the window
                          cpx = cplrl.exists;

                          // Will return either the variable value (string) or undefined if it doesn't find it
                          const variableCPP = retrieveNestedVariable(_W, cplrl.name);

                          // If we're using 'exists' setting, override the default behavior
                          if (isDefined(cpx)) {
                            // Check if the cpp is not already in its final (success) value
                            if (cpps.get(cp) !== cpx.success) {
                              cpps.set(cp, variableCPP ? cpx.success : cpx.init);
                            }
                          } else if (variableCPP) {
                            // Set the CPP to ctx
                            /* pragma:DEBUG_START */
                            console.log(
                              "trigger: setting user-defined CPP from variable for site: ",
                              cp,
                              cplrl,
                              variableCPP
                            );
                            /* pragma:DEBUG_END */
                            cpps.set(cp, variableCPP);
                          } else if (!cpps.get(cp)) {
                            cpps.set(cp, cplrl.init || "");
                          }
                        }
                        break;
                      case "cookie":
                        {
                          const ckie = new Cookie({
                            path: "/",
                            secure: false,
                            encode: true,
                          });
                          const ckvl = ckie.get(cplrl.val);
                          const ckdefined = isDefined(ckvl);
                          cpx = cplrl.exists;

                          // If we're using 'exists' setting, override the default behavior
                          if (isDefined(cpx)) {
                            // Check if the cpp is not already in its final (success) value
                            if (cpps.get(cp) !== cpx.success) {
                              cpps.set(cp, ckdefined ? cpx.success : cpx.init);
                            }
                          } else if (isDefined(ckvl) && ckvl !== null) {
                            /* pragma:DEBUG_START */
                            console.log(
                              "trigger: setting user-defined CPP from cookie for site: ",
                              cp,
                              cplrl,
                              ckvl
                            );
                            /* pragma:DEBUG_END */
                            cpps.set(cp, ckvl);
                          } else if (!cpps.get(cp)) {
                            cpps.set(cp, cplrl.init || "");
                          }
                        }
                        break;
                      case "url":
                        for (let i = 0, len = cplrl.patterns.length; i < len; i++) {
                          const mtch = cplrl.patterns[i].regex || cplrl.patterns[i].match;
                          value = cplrl.patterns[i].value;
                          if (isString(location.href) && testAgainstSearch(mtch, location.href)) {
                            /* pragma:DEBUG_START */
                            console.log(
                              "trigger: setting user-defined CPP from url for site: ",
                              cp,
                              cplrl,
                              value
                            );
                            /* pragma:DEBUG_END */
                            cpps.set(cp, value);
                          } else if (!cpps.get(cp)) {
                            cpps.set(cp, cplrl.init || "");
                          }
                        }

                        break;
                      default:
                        throw new Error(`Unknown CPP source: ${cplrl.source}`);
                    }
                  } else {
                    /* pragma:DEBUG_START */
                    console.warn("trigger: setting user-defined CPP for site: ", cp, cplrl);
                    /* pragma:DEBUG_END */
                    cpps.set(cp, cplrl);
                  }
                }
              }

              // Read the override cookie and apply it if necessary
              let ckovr;
              if (stg.get("ovr")) {
                ckovr = JSON.parse(stg.get("ovr"));
              }
              if (ckovr) {
                /* pragma:DEBUG_START */
                console.warn("trigger: there is an override cookie. applying it", ckovr);
                /* pragma:DEBUG_END */

                for (let df = 0; df < config.surveydefs.length; df++) {
                  const dfn = config.surveydefs[df].name;
                  if (ckovr.sp[dfn]) {
                    config.surveydefs[df].criteria.sp = ckovr.sp[dfn];
                  }
                  if (ckovr.lf[dfn]) {
                    config.surveydefs[df].criteria.lf = ckovr.lf[dfn];
                  }
                }

                // Should we be overriding the pool?
                if (ckovr.pooloverride === true) {
                  crit.pooloverride = true;
                }
              }

              Singletons.state.codeVer = globalConfig.codeVer;
              Singletons.state.siteKey = globalConfig.siteKey;
              Singletons.state.didInvite = "xda".indexOf(invitesituation) > -1;
              Singletons.state.inviteSituation = {
                x: "ACCEPTED",
                d: "DECLINED",
                a: "ABANDONED",
                p: "PRESENTED",
                f: "BRAINFAILED",
              }[invitesituation];

              // The invitesituation variable tells us whether we've been invited before and what happened
              // the possible values are 'x' (accepted), 'd' (declined), 'a' (abandoned), 'p' (presented), 'f' (brainfailed)

              // Now, if the user abandoned previously, make sure we are past our wait threshold
              if (invitesituation == "a") {
                /* pragma:DEBUG_START */
                console.warn("trigger: user previously abandoned");
                /* pragma:DEBUG_END */
                const abandonretry = parseInt(stg.get("rw"), 10);

                // Check to see if we're past our retry threshold
                if (abandonretry < currentTime()) {
                  stg.erase("i");
                  stg.erase("rw");
                  invitesituation = Singletons.state.didInvite = null;
                  /* pragma:DEBUG_START */
                  console.warn(
                    "trigger: we are passed the abandoned threshold, allowing them to be re-invited"
                  );
                  /* pragma:DEBUG_END */
                } else {
                  /* pragma:DEBUG_START */
                  console.warn(
                    `trigger: we still have ${Math.round(
                      (abandonretry - currentTime()) / 1000
                    )} seconds to wait before possibly reinviting them`
                  );
                  /* pragma:DEBUG_END */
                }
              }

              // If the brain server previously failed, make sure we are past our wait threshold
              if (invitesituation == "f") {
                /* pragma:DEBUG_START */
                console.warn("trigger: brain server previously failed");
                /* pragma:DEBUG_END */
                const brainretry = parseInt(stg.get("fw"), 10);

                // Check to see if we're past our retry threshold
                if (brainretry < currentTime()) {
                  stg.erase("f");
                  stg.erase("fw");
                  invitesituation = Singletons.state.didInvite = null;
                  /* pragma:DEBUG_START */
                  console.warn(
                    'trigger: we are passed the "brainserver fail retry" threshold, allowing them to be re-invited'
                  );
                  /* pragma:DEBUG_END */
                } else {
                  /* pragma:DEBUG_START */
                  console.warn(
                    `trigger: we still have ${Math.round(
                      (brainretry - currentTime()) / 1000
                    )} seconds to wait before possibly reinviting them`
                  );
                  /* pragma:DEBUG_END */
                }
              }

              if (config.config.workInIframes === "runRecordOnly" && isWindowIframe) {
                let isSurveyDef = false;
                // Now we check to see if any of our survey defs support replay.
                // If so, move ahead with the SetupRecording
                for (let n = 0; n < config.surveydefs.length; n++) {
                  const category = config.surveydefs[n].cxRecord;
                  if (category) {
                    isSurveyDef = true;
                    break;
                  }
                }
                SetupRecording(browser, isSurveyDef, stg, true, cpps);

                // Set the resetLock to false as we will not present invite
                Singletons._triggerResetLock = false;
                return;
              }

              // Check to see that we didn't previously abandon, decline, or accept the invite
              // x == accepted, d == declined, a == abandoned, f == brainfail
              if (invitesituation != "d" && invitesituation != "a" && invitesituation != "f") {
                /**
                 * Check if we are in the cxReplay pool.
                 */
                crit.calcReplayPoolStatus(isinpool => {
                  // Now we need to handle pooling
                  if (!isinpool) {
                    /* pragma:DEBUG_START */
                    console.warn("trigger: we are out of the pool");
                    /* pragma:DEBUG_END */
                  } else {
                    Singletons.state.isinpool = isinpool;
                  }

                  // Check if the user has opted out
                  crit.optoutCheck(
                    () => {
                      /**
                       * Check the global exclude
                       */
                      if (
                        crit._match(config.config, browser, "globalExclude") &&
                        stg.get("gx") != "y"
                      ) {
                        // If cookieDomain rules are present but none matches
                        if (
                          stg.selectCookieDomain(
                            globalConfig.cookieDomain,
                            window.location.toString()
                          ) === null
                        ) {
                          // Set the resetLock to false as we will not present invite
                          Singletons._triggerResetLock = false;
                        } else {
                          // Set up trigger
                          const trig = (Singletons.trig = TriggerSetup(
                            stg,
                            config,
                            browser,
                            crit,
                            cpps,
                            jrny
                          ));

                          // Log the state
                          trig.logState();

                          // Set a CPP of the page views
                          /* pragma:DEBUG_START */
                          console.log(`trigger: page views now ${trig.pageViewCount}`);
                          /* pragma:DEBUG_END */

                          // Set the page view count as a CPP
                          cpps.set(
                            "pv",
                            trig.pageViewCount,
                            config.config.pageViewsResetTimeout || 24 * 60 * 60 * 1000
                          );

                          // Proceed with initialization ***************************
                          if (trig.init()) {
                            // Fire the initializedEventEmitter
                            Singletons.initializedEmitter.fire();

                            // Evaluate the remaining criteria
                            if (trig.isTrackerAlive() || trig.doesPassCriteria()) {
                              // Is there a valid survey def?
                              if (trig.surveydef) {
                                // Log the surveydef state
                                trig.logDefState();

                                /* pragma:DEBUG_START */
                                console.log(
                                  `trigger: page view count for this survey def: ${
                                    trig.defPageViewCount
                                  }`
                                );
                                /* pragma:DEBUG_END */

                                // Set up recording if necessary
                                SetupRecording(
                                  browser,
                                  trig.surveydef.cxRecord,
                                  stg,
                                  isinpool,
                                  cpps
                                );

                                // Only go any further if the user has not accepted the invite
                                if (invitesituation != "x") {
                                  // Set a Session-Start-Time timestamp so that we can check total site time later
                                  if (
                                    !browser.isMobile &&
                                    !browser.isTablet &&
                                    trig.surveydef.mouseoff &&
                                    trig.surveydef.mouseoff.mode !== "off" &&
                                    stg.get("pv") == 1
                                  ) {
                                    stg.set("sst", currentTime());
                                  }

                                  // Check if we are allowed to display the invite
                                  if (trig.canDisplayInvitation()) {
                                    // Test the LF and sampling rate
                                    if (trig.evalLoyaltySampling("criteria")) {
                                      // Keep track of which definition we are using
                                      stg.set(
                                        "def",
                                        trig.surveydef.uid,
                                        trig.cfg.config.surveyDefResetTimeout || 24 * 60 * 60 * 1000
                                      );

                                      getInviteSetupInstance(
                                        trig,
                                        browser,
                                        stg,
                                        cpps,
                                        false,
                                        jrny,
                                        "Traditional",
                                        function() {
                                          // Initialize and present the invitation
                                          this.initialize();
                                          this.present();
                                        }
                                      );
                                    } else if (
                                      stg.get("sst") &&
                                      trig.evalLoyaltySampling("mouseoff")
                                    ) {
                                      // Check that our first page had MouseOff enabled, check MouseOff loyalty

                                      // Keep track of which definition we are using
                                      stg.set(
                                        "def",
                                        trig.surveydef.uid,
                                        trig.cfg.config.surveyDefResetTimeout || 24 * 60 * 60 * 1000
                                      );

                                      _W._fsRequire([makeURI("$fs.mouseoff.js")], MouseOff => {
                                        // Set the resetLock to false as we will not present invite
                                        Singletons._triggerResetLock = false;

                                        const mo = (trig.mouseoff = new MouseOff(
                                          trig,
                                          trig.surveydef,
                                          browser,
                                          stg,
                                          jrny
                                        ));

                                        // Pass the reference to InviteSetup so we can fire the resourcesready event later
                                        mo.initialize();
                                        mo.startListening(
                                          function() {
                                            this.inviteSetup = getInviteSetupInstance(
                                              trig,
                                              browser,
                                              stg,
                                              cpps,
                                              false,
                                              jrny,
                                              "MouseOff",
                                              function() {
                                                // Initialize the invitation
                                                this.initialize();
                                              }
                                            );
                                          },
                                          function() {
                                            // Present the invite when the MouseOff conditions are met
                                            this.inviteSetup.present();
                                          }
                                        );
                                      });
                                    } else {
                                      /* pragma:DEBUG_START */
                                      console.warn(
                                        "trigger: did not pass loyalty factor or sampling dice-throw"
                                      );
                                      /* pragma:DEBUG_END */

                                      // Set the resetLock to false as we will not present invite
                                      Singletons._triggerResetLock = false;
                                    }
                                  } else {
                                    // Set the resetLock to false as we will not present invite
                                    Singletons._triggerResetLock = false;
                                  }
                                } else {
                                  /* pragma:DEBUG_START */
                                  console.warn(
                                    `trigger: user has already been invited and accepted. Time left before storage expiration: ${Math.round(
                                      stg.getMaxKeyExpiration() / 1000
                                    )}s. Resuming tracking`
                                  );
                                  /* pragma:DEBUG_END */

                                  // If we started hb on previous page, start it here again
                                  const mbhi = trig.stg.get("mhbi");
                                  if (mbhi) {
                                    // If mobile, start mobile heartbeat (image transport)
                                    startMobileHB(trig, mbhi.ui, mbhi.it);
                                  } else if (trig.isTrackerAlive()) {
                                    // If not mobile and Tracker, update the tracker

                                    /* pragma:DEBUG_START */
                                    console.log(
                                      "trigger: sending the survey def information to the tracker"
                                    );
                                    /* pragma:DEBUG_END */

                                    // Setup an invite so we can get surveydef data to send to Tracker (won't present invite)
                                    const defDisplay = InviteSetup.getFittingDisplay(
                                      trig.surveydef
                                    );

                                    trig.tracker = new Tracker(
                                      defDisplay.template,
                                      trig.surveydef,
                                      config,
                                      getBrainStorage(browser, stg.uid),
                                      cpps,
                                      defDisplay,
                                      browser
                                    );
                                  } else {
                                    /* pragma:DEBUG_START */
                                    console.log(
                                      "trigger: the tracker has been closed or converted (no mo tracker_hb)"
                                    );
                                    /* pragma:DEBUG_END */
                                  }

                                  // Set the resetLock to false as we will not present invite
                                  Singletons._triggerResetLock = false;
                                }

                                // Run link bindings
                                if (trig.surveydef.links) {
                                  /* pragma:DEBUG_START */
                                  console.warn(
                                    "trigger: setting up linker for the surveydef",
                                    trig.surveydef.links
                                  );
                                  /* pragma:DEBUG_END */
                                  linker = new LinksHandler(trig.surveydef.links);
                                  linker.performBindings(trig);
                                }
                              } else {
                                /* pragma:DEBUG_START */
                                console.warn("trigger: no valid survey def");
                                /* pragma:DEBUG_END */

                                // Set the resetLock to false as we will not present invite
                                Singletons._triggerResetLock = false;
                              }
                            } else {
                              /* pragma:DEBUG_START */
                              console.warn("trigger: did not pass remaining criteria");
                              /* pragma:DEBUG_END */

                              // Set the resetLock to false as we will not present invite
                              Singletons._triggerResetLock = false;
                            }
                          } else {
                            /* pragma:DEBUG_START */
                            console.warn("trigger: did not pass initialization");
                            /* pragma:DEBUG_END */

                            // Set the resetLock to false as we will not present invite
                            Singletons._triggerResetLock = false;
                          }
                        }
                      } else {
                        /* pragma:DEBUG_START */
                        if (stg.get("gx") == "y") {
                          console.warn(
                            "trigger: was previously globally excluded",
                            config.config.exclude
                          );
                        } else {
                          console.warn(
                            "trigger: did not pass global exclude",
                            config.config.exclude
                          );
                        }
                        /* pragma:DEBUG_END */

                        // Set a variable that we failed the global exclude
                        stg.set("gx", "y");

                        // Set the resetLock to false as we will not present invite
                        Singletons._triggerResetLock = false;
                      }
                    },
                    () => {
                      /* pragma:DEBUG_START */
                      console.warn("trigger: opt out cookie found");
                      /* pragma:DEBUG_END */

                      // Set the resetLock to false as we will not present invite
                      Singletons._triggerResetLock = false;
                    }
                  );
                });
              } else {
                /* pragma:DEBUG_START */
                console.warn(
                  `trigger: ${
                    invitesituation == "x"
                      ? "user has already been invited and accepted. resuming tracking"
                      : invitesituation == "d"
                      ? "user has already been invited and declined. not doing anything"
                      : invitesituation == "a"
                      ? "user previously was invited and abandoned it. not doing anything"
                      : invitesituation == "f"
                      ? "brain server previously failed it. not doing anything"
                      : `got unexpected invite situation: ${invitesituation}`
                  }`
                );
                /* pragma:DEBUG_END */
                if (invitesituation == "a") {
                  const recing = stg.get("rc") == "true" || stg.get("rc") === true;
                  // Set up recording if necessary
                  SetupRecording(browser, recing, stg, recing, cpps);
                }
                // Set the resetLock to false as we will not present invite
                Singletons._triggerResetLock = false;
              }
            }, Math.max(0, config.config.triggerDelay - (currentTime() - startTS)));
          });
        },
        true,
        true
      );
    },
    true,
    true
  );
}

export { startup };
