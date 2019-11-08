/**
 * Bottom file for feedback
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import {
  API,
  globalConfig,
  domReady,
  fsCmd,
  getParam,
  getQueryString,
  isFunction,
  isProduction,
  makeURI,
  supportsDomStorage,
  getProductConfig,
} from "../fs/index";
import {
  Browser,
  pageNavEvent,
  INT,
  initBehavioralData,
  Journey,
  getHashParm,
  registerProduct,
  getRootDomain,
  CPPS,
  getGeneralStorage,
  APPID,
} from "../utils/utils";
import { setFeedbackStartup, completeAPI } from "./api";
import { Criteria } from "./criteria";
import { applyFeedbackCustomerHacks } from "./customerhacks";
import { setupDefaultFeedbackConfigs } from "./defaultconfigs";
import { GlobalLoader } from "./globalloader";
import { PopupHandler } from "./popuphandler";
import { Preview } from "./preview";
import { PreviewBadge } from "./previewbadge";
import { _recordStg, Replay } from "./replay";
import { Singletons } from "./top";
import { checkTopicAllowed } from "./topictester";
import { ButtonBadge, getFeedbackBadgeType } from "./ui/badge";

// Tell the world about us
registerProduct("feedback");

setupDefaultFeedbackConfigs();

// Keeps track of the valid instances
const validInstances = [];

// Holds the current location info
let currentLocation = window.location;

// Runs the setup sequence for feedback
function feedbackSetupSequence() {
  /* pragma:DEBUG_START */
  console.warn("fb: setting up");
  /* pragma:DEBUG_END */

  const config = getProductConfig("feedback");
  const isPreview = !!getHashParm("previewmode");
  const isPreviewBadge = !!getParam("previewbadgemode");
  const configInstances = config.instances;
  const reqTemplates = [];
  let cxrecord = false;
  let prevBadge;

  // Keep a permanent copy of the current location
  currentLocation = JSON.parse(JSON.stringify(window.location));

  if (configInstances || isPreview || isPreviewBadge) {
    // Set up a new browser detector
    const browser = new Browser();

    /* pragma:DEBUG_START */
    console.log("fb: waiting for browser to be ready..");
    /* pragma:DEBUG_END */

    // Make sure we know which browser this is and what kind of device it is.
    browser.ready.subscribe(
      () => {
        /* pragma:DEBUG_START */
        console.log("fb: browser is ready");
        /* pragma:DEBUG_END */

        // Set up the storage
        const stg = getGeneralStorage(browser);

        // Wait for storage to be ready
        stg.ready.subscribe(
          () => {
            /* pragma:DEBUG_START */
            console.log("fb: storage is ready");
            /* pragma:DEBUG_END */

            // Check if we are in preview mode
            if (isPreview) {
              /* pragma:DEBUG_START */
              console.warn("fb: detected preview mode");
              /* pragma:DEBUG_END */

              // Set up a new previewer for survey
              const prev = new Preview(browser);
              prev.show();

              // Don't continue
              return;
            }

            // Set up a criteria checker
            const crit = new Criteria(browser, config);
            const cpps = new CPPS(stg);
            const adobeRsid = globalConfig.adobeRsid;

            initBehavioralData(
              globalConfig.customerId || getRootDomain() || "feedback_customerId",
              stg,
              browser,
              cpps
            );

            // Set CPPs: code, environment, fingerprint
            cpps.set("code", globalConfig.codeVer);
            cpps.set("tz", -new Date().getTimezoneOffset());
            cpps.set("env", isProduction ? "prd" : "stg");

            // Do integrations automatically
            if (INT.GA.has()) {
              INT.GA.uid(gid => {
                if (gid) {
                  cpps.set("GA_UID", gid);
                }
              });
            }

            const setCppFn = id => {
              cpps.set(id.name, id.value);
            };
            // Check for one of VID/AID/FID and MCID
            INT.OM.uid(adobeRsid, setCppFn);
            INT.OM.mcid(adobeRsid, setCppFn);

            INT.OM.beacon(omBeacon => {
              /* pragma:DEBUG_START */
              console.log("fb: setting omniture beacon", omBeacon);
              /* pragma:DEBUG_END */
              cpps.set("OMTR_BEACON", omBeacon);
            });

            // Check if we are in preview badge mode
            if (isPreviewBadge) {
              /* pragma:DEBUG_START */
              console.warn("fb: detected preview badge mode");
              /* pragma:DEBUG_END */
              // Collect the bunch of data needed..
              const cfg = JSON.parse(getParam("cfg"));
              const mode = getQueryString("previewbadgemode") || "desktop";
              if (cfg.mid) {
                cfg.previewMode = mode;
                prevBadge = new PreviewBadge(cfg, browser, cpps); // Set up a new previewer for badge
                prevBadge.renderBadge();
              } else {
                /* pragma:DEBUG_START */
                console.warn("fb: no mid provided, nothing to preview..");
                /* pragma:DEBUG_END */
              }

              // Don't continue
              return;
            }

            Singletons.CPPS = cpps;
            Singletons.browser = browser;
            Singletons.stg = stg;

            // Only continue if we are on a supported platform
            if (crit.platformOK()) {
              /* pragma:DEBUG_START */
              console.warn("fb: platform is ok");
              /* pragma:DEBUG_END */

              // Expose the API
              completeAPI();

              // Do page reset when there's an html5 navigation event
              Singletons.pageResetFn = () => {
                const gbl = window;
                const nowloc = gbl.location;
                let pageNavThrottler;
                const hashfix = hsh => {
                  hsh = hsh || "";
                  const bits = hsh.split("#");
                  if (bits.length > 2) {
                    return bits[0] + bits[1];
                  }
                  return hsh.replace(/#/gi, "");
                };
                const oldhash = hashfix(currentLocation.hash);
                const newhash = hashfix(nowloc.hash);

                /* pragma:DEBUG_START */
                console.warn("feedback: detected navigation event");
                /* pragma:DEBUG_END */

                if (oldhash != newhash || currentLocation.pathname != nowloc.pathname) {
                  window.fsReady(() => {
                    clearTimeout(pageNavThrottler);
                    pageNavThrottler = setTimeout(() => {
                      /* pragma:DEBUG_START */
                      console.warn("feedback: moving from ", oldhash, "to", newhash);
                      /* pragma:DEBUG_END */
                      const rf = API.retrieveFromAPI("resetFeedback");
                      if (isFunction(rf)) {
                        rf();
                      }
                    }, 1000);
                  });
                }
              };
              pageNavEvent.subscribe(Singletons.pageResetFn, false, false);

              /* pragma:DEBUG_START */
              console.log("fb: Looking at config instances: ", configInstances);
              /* pragma:DEBUG_END */

              for (let i = 0; i < configInstances.length; i++) {
                const inst = configInstances[i];
                let didpass = false;

                // Survey Level whitelist/blacklist check
                if (checkTopicAllowed(inst)) {
                  /* pragma:DEBUG_START */
                  console.log("fb: passed Survey-Level whitelist/blacklist check", inst.mid);
                  /* pragma:DEBUG_END */

                  if (inst.topics && inst.topics.length) {
                    // This is not a replay project and do we pass any of the topic tests?
                    for (let p = 0; p < inst.topics.length; p++) {
                      // Topic Level whitelist/blacklist check
                      if (checkTopicAllowed(inst.topics[p])) {
                        didpass = true;
                        break;
                      }
                    }
                  }
                  /* pragma:DEBUG_START */
                  if (!didpass) {
                    console.log(
                      "fb: failed Topics-Level whitelist/blacklist check",
                      inst.mid,
                      inst.topics
                    );
                  }
                  /* pragma:DEBUG_END */
                } else {
                  /* pragma:DEBUG_START */
                  console.log("fb: failed Survey-Level whitelist/blacklist check", inst.mid, inst);
                  /* pragma:DEBUG_END */
                }

                /**
                 * Is cxReplay turned on?
                 * This all depends on the presence of the Record product itself
                 * Replay flag set to true for feedback projects with replay
                 * Disabled flag is set to false for pure replay projects.
                 */
                if (
                  globalConfig.products.record === true &&
                  inst.replay === true &&
                  inst.disabled === false
                ) {
                  cxrecord = true;
                  if (stg.get("fbr") != "y") {
                    // Add a flag in storage for: feedback record is being used
                    stg.set("fbr", "y");
                  }
                }

                // Note: we added window.top check for iFrames.
                if (
                  (didpass || (inst.topics && inst.topics.length === 0)) &&
                  !inst.disabled &&
                  window == window.top
                ) {
                  let flag = false;
                  if (!inst.template) {
                    inst.template = "default";
                  }
                  for (let k = 0; k < reqTemplates.length; k++) {
                    if (reqTemplates[k] === inst.template) {
                      flag = true;
                    }
                  }
                  if (!flag) {
                    reqTemplates.push(inst.template);
                  }

                  // Journey that corresponds to an instance
                  inst.jrny = new Journey({
                    customerId: globalConfig.customerId || getRootDomain() || "feedback_customerId",
                    appId: APPID.FEEDBACK,
                    stg,
                    browser,
                    throttleDuration: 1000,
                    useSessionId: true,
                    usePopupId: false,
                  });

                  validInstances.push(inst);
                } else {
                  /* pragma:DEBUG_START */
                  if (!didpass) {
                    console.warn("fb: failed topic tester:", inst.mid, inst);
                  }
                  if (inst.disabled) {
                    console.warn(
                      "fb: feedback instance was disabled. doing nothing",
                      inst.mid,
                      inst
                    );
                  }
                  /* pragma:DEBUG_END */
                }
              }

              /* Call the loader with valid instances if it applies */
              if (validInstances.length > 0) {
                const tmps = reqTemplates.length > 0 ? reqTemplates : ["default"];
                const gl = new GlobalLoader(browser, cpps, tmps);
                let hfont;

                gl.loadSuccess.subscribe(
                  tmp => {
                    /* pragma:DEBUG_START */
                    console.warn("fb: valid instances: ", validInstances.length);
                    /* pragma:DEBUG_END */
                    for (let i = 0; i < validInstances.length; i++) {
                      const inst = validInstances[i];
                      const fbtype = getFeedbackBadgeType(inst, browser);
                      // Type Check
                      if (fbtype === "badge") {
                        // CC-2884 - Force the font file to load in IE
                        if (i == 0 && browser.isIE) {
                          hfont = document.createElement("div");
                          hfont.className = "acs-feedback__forcefont";
                          document.body.appendChild(hfont);
                        }
                        const template = tmp[inst.template];
                        inst.badge = new ButtonBadge(
                          inst,
                          browser,
                          cpps,
                          template.typeTemplate,
                          template.emTemplate,
                          true
                        );
                        inst.badge.setBtnTemplate();
                        inst.badge.surveyTriggered.subscribe(
                          onBadgeSurveyTriggered(inst, template),
                          false,
                          false
                        );
                      }
                    }

                    function onBadgeSurveyTriggered(insto, templo) {
                      return () => {
                        if (insto.replay === true) {
                          if (cxrecord) {
                            Replay.startTransmitting(browser, cpps, insto);
                          } else {
                            /* pragma:DEBUG_START */
                            console.log(
                              "fb: Record product is not turned on in global config, not transmitting"
                            );
                            /* pragma:DEBUG_END */
                          }
                        } else {
                          /* pragma:DEBUG_START */
                          console.log("fb: replay is not turned on in fb config, not transmitting");
                          /* pragma:DEBUG_END */
                        }

                        insto.jrny.initPopupId();

                        PopupHandler.initialize(
                          insto,
                          browser,
                          cpps,
                          templo.emTemplate,
                          templo.svContentsTemplate,
                          templo.epTemplate
                        );
                      };
                    }

                    /**
                     * When a survey is submitted, this event will fire.
                     * We can react to it and do things like remove the badge
                     */
                    PopupHandler.SurveySubmitted.subscribe(cfg => {
                      let k;
                      let l;
                      // If a particular instance is to be removed, only remove that.
                      if (cfg && cfg.mid) {
                        if (cxrecord) {
                          // Tell replay to start processing
                          Replay.startProcessing(browser, cpps, cfg);
                        }

                        for (k = 0; k < validInstances.length; k++) {
                          if (validInstances[k].badge && validInstances[k].mid === cfg.mid) {
                            validInstances[k].badge.remove();
                          }
                        }
                      } else {
                        // If not remove all the valid instances.
                        for (l = 0; l < validInstances.length; l++) {
                          if (validInstances[l].badge) {
                            validInstances[l].badge.remove();
                          }
                        }
                      }
                    });
                  },
                  true,
                  true
                ); // Load Success
              }

              if (cxrecord) {
                // Do cxRecord setup
                Replay.setup(browser, cpps, validInstances[0], ctrl => {
                  for (let h = 0; h < validInstances.length; h++) {
                    // Keep a copy of storage
                    validInstances[h].stg = _recordStg;

                    // Keep the instance of the recorder
                    validInstances[h].record = ctrl;
                  }
                });
              }
            } else {
              /* pragma:DEBUG_START */
              console.warn("fb: platform not ok - exiting");
              /* pragma:DEBUG_END */
              return;
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
}

function startup() {
  if (!applyFeedbackCustomerHacks()) {
    // bail if we need to
    return;
  }

  // Handle the feedback report UI
  if (
    fsCmd("feedbackreport") ||
    (supportsDomStorage && sessionStorage.getItem("fsFeedbackLoaded") == "true")
  ) {
    if (supportsDomStorage) {
      sessionStorage.setItem("fsFeedbackLoaded", "true");
    }
    window._fsRequire([makeURI("$fs.feedbackreport.js")], () => {});
    return;
  }

  setFeedbackStartup(feedbackSetupSequence, validInstances);

  // Wait for DOMReady
  domReady(feedbackSetupSequence);
}

export { startup };
