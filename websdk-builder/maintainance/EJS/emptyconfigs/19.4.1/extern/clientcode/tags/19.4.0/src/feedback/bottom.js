/**
 * Bottom file for feedback
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Bottom");

fs.require("fs.Top");
fs.require("fs.Misc.SimpleTween");
fs.require("fs.ui.Badge");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.Criteria");
fs.require("fs.ui.Badge");
fs.require("fs.Preview");
fs.require("fs.PopUpHandler");
fs.require("fs.PreviewBadge");
fs.require("fs.API");
fs.require("fs.GlobalLoader");

(function () {

  // Tell the world about us
  utils.registerProduct('feedback');

  // Begin by extending the config with some default params
  config = fs.ext({
    /**
     * List of unsupported browsers and platforms supported
     * Note: IE 8 means we support 8 and above
     */
    browser_cutoff: {
      IE: 10,
      IEMobile: 10,
      Safari: 5.2,
      Firefox: 25,
      Chrome: 30,
      Opera: 1000
    },

    /**
     * List of unsupported platforms
     * Note: Android 4 means we support 4 and above
     */
    platform_cutoff: {
      Android: 4.4,
      Winphone: 7.4,
      iPod: 9,
      iPhone: 9,
      iPad: 9
    },

    /**
     * Specify the default storage technique
     */
    config: {
      persistence: (!!utils.products.foresee) ? utils.products.foresee.config.persistence : utils.storageTypes.CK
    }
  }, config);

  // Keeps track of the valid instances
  var validInstances = [];

  // Holds the current location info
  var currentLocation = window.location;

  // Runs the setup sequence for feedback
  var FeedbackSetupSequence = function () {
    /* pragma:DEBUG_START */
    console.warn("fb: setting up");
    /* pragma:DEBUG_END */

    var isPreview = !!utils.getHashParm('previewmode'),
      isPreviewBadge = !!utils.getHashParm('previewbadgemode'),
      configInstances = config.instances,
      reqTemplates = [],
      cxreplay = false,
      prevBadge,
      TemplateReady = new utils.FSEvent();

    // Keep a permanent copy of the current location
    currentLocation = JSON.parse(JSON.stringify(window.location));

    if (configInstances || isPreview || isPreviewBadge) {
      // Set up a new browser detector
      var browser = new utils.Browser();

      /* pragma:DEBUG_START */
      console.log("fb: waiting for browser to be ready..");
      /* pragma:DEBUG_END */

      // Make sure we know which browser this is and what kind of device it is.
      browser.ready.subscribe(function () {
        /* pragma:DEBUG_START */
        console.log("fb: browser is ready");
        /* pragma:DEBUG_END */

        // Set up the storage
        var stg = utils.getGlobalStore(browser);

        // Wait for storage to be ready
        stg.ready.subscribe(fs.proxy(function () {
          /* pragma:DEBUG_START */
          console.log("fb: storage is ready");
          /* pragma:DEBUG_END */

          // Check if we are in preview mode
          if (isPreview) {
            /* pragma:DEBUG_START */
            console.warn("fb: detected preview mode");
            /* pragma:DEBUG_END */

            // Set up a new previewer for survey
            var prev = new Preview(browser);
            prev.show();

            // Don't continue
            return;
          }

          // Set up a criteria checker
          var crit = new Criteria(browser, config),
            cpps = new utils.CPPS(stg);

          // Set CPPs: code, environment, fingerprint
          cpps.set('code', fs.config.codeVer);
          cpps.set('env', fs.isProduction ? 'prd' : 'stg');
          cpps.set('fp', browser.fp);

          // Do integrations automatically
          if (utils.INT.GA.has()) {
            utils.INT.GA.uid(function (gid) {
              if (gid) {
                cpps.set('GA_ID', gid);
              }
            });
          }
          if (utils.INT.OM.has()) {
            utils.INT.OM.uid(function (amcid) {
              if (amcid) {
                cpps.set('OMTR_VID', amcid);
              }
            });
          }
          var omBeacon = utils.INT.OM.beacon();
          if (omBeacon) {
            /* pragma:DEBUG_START */
            console.log("fb: setting omniture beacon", omBeacon);
            /* pragma:DEBUG_END */
            cpps.set('OMTR_BEACON', omBeacon);
          }

          // Check if we are in preview badge mode
          if (isPreviewBadge) {
            /* pragma:DEBUG_START */
            console.warn("fb: detected preview badge mode");
            /* pragma:DEBUG_END */
            // Collect the bunch of data needed..
            var cfg = JSON.parse(decodeURIComponent(fs.getParam("cfg")));

            if (!!cfg.mid) {
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

          // Only continue if we are on a supported platform
          if (crit.platformOK()) {
            /* pragma:DEBUG_START */
            console.warn("fb: platform is ok");
            /* pragma:DEBUG_END */
            var customerId = utils.getRootDomain();

            // Expose the API
            API.completeAPI(cpps, browser);

            // Do page reset when there's an html5 navigation event
            Singletons.pageResetFn = function () {
              var gbl = window,
                nowloc = gbl.location,
                pageNavThrottler,
                hashfix = function (hsh) {
                  var bits = hsh.split('#');
                  if (bits.length > 2) {
                    return bits[0] + bits[1];
                  }
                  return hsh.replace(/#/gi, '');
                },
                oldhash = hashfix(currentLocation.hash),
                newhash = hashfix(nowloc.hash);

              /* pragma:DEBUG_START */
              console.warn('feedback: detected navigation event');
              /* pragma:DEBUG_END */

              if (oldhash != newhash || currentLocation.pathname != nowloc.pathname) {
                fsReady(function () {
                  clearTimeout(pageNavThrottler);
                  pageNavThrottler = setTimeout(function () {
                    /* pragma:DEBUG_START */
                    console.warn('feedback: moving from ', oldhash, 'to', newhash);
                    /* pragma:DEBUG_END */
                    var rf = fs.API.retrieveFromAPI('resetFeedback');
                    if (fs.isFunction(rf)) {
                      rf();
                    }
                  }, 1000);
                });
              }
            };
            utils.pageNavEvent.subscribe(Singletons.pageResetFn, false, false);

            /* pragma:DEBUG_START */
            console.log("fb: Looking at config instances: ", configInstances);
            /* pragma:DEBUG_END */

            for (var i = 0; i < configInstances.length; i++) {
              var inst = configInstances[i],
                didpass = false;
              
              // Survey Level whitelist/blacklist check
              if (survey.TopicTester(inst)) {
                /* pragma:DEBUG_START */
                console.warn("fb: passed Survey-Level whitelist/blacklist check");
                /* pragma:DEBUG_END */
                
                if (inst.topics && inst.topics.length) {
                  // This is not a replay project and do we pass any of the topic tests?
                  for (var p = 0; p < inst.topics.length; p++) {
                    // Topic Level whitelist/blacklist check
                    if (survey.TopicTester(inst.topics[p])) {
                      didpass = true;
                      break;
                    }
                  }
                }
              } else {
                /* pragma:DEBUG_START */
                console.warn("fb: failed Survey-Level whitelist/blacklist check");
                /* pragma:DEBUG_END */
              }

              /**
               * Is cxReplay turned on?
               * Replay flag set to true for feedback projects with replay
               * Disabled flag is set to false for pure replay projects.
               */
              if (inst.replay === true && inst.disabled === false) {
                cxreplay = true;
                if (stg.get('fbr') != 'y') {
                  // Add a flag in storage for: feedback record is being used
                  stg.set('fbr', 'y');
                }
              }

              // Note: we added window.top check for iFrames.
              if ((didpass || (inst.topics && inst.topics.length === 0)) && !inst.disabled && (window == window.top)) {
                var flag = false;
                if (!inst.template) {
                  inst.template = 'default';
                }
                for (var k = 0; k < reqTemplates.length; k++) {
                  if (reqTemplates[k] === inst.template) {
                    flag = true;
                  }
                }
                if (!flag) {
                  reqTemplates.push(inst.template);
                }

                // Journey that corresponds to an instance
                inst.jrny = new utils.Journey(customerId, inst.mid, stg.uid, browser);

                validInstances.push(inst);
              } else {
                /* pragma:DEBUG_START */
                if (!didpass) {
                  console.warn("fb: did not pass topic tester");
                }
                if (!!inst.disabled) {
                  console.warn("fb: feedback instance was disabled. doing nothing");
                }
                /* pragma:DEBUG_END */
              }
            }

            /* Call the loader with valid instances if it applies */
            if (validInstances.length > 0) {
              var tmps = reqTemplates.length > 0 ? reqTemplates : ['default'],
                gl = new GlobalLoader(browser, cpps, tmps),
                hfont;

              gl.loadSuccess.subscribe(fs.proxy(function (tmp) {
                /* pragma:DEBUG_START */
                console.warn("fb: valid instances: ", validInstances.length);
                /* pragma:DEBUG_END */
                /* jshint ignore:start */
                for (var i = 0; i < validInstances.length; i++) {
                  // Type Check
                  if (validInstances[i].fbtype === 'badge') {
                    // CC-2884 - Force the font file to load in IE
                    if (i == 0 && browser.isIE) {
                      hfont = document.createElement("div");
                      hfont.className = "acs-feedback__forcefont";
                      document.body.appendChild(hfont);
                    }
                    var template = tmp[validInstances[i].template];
                    validInstances[i].badge = new ButtonBadge(validInstances[i], browser, cpps, template.typeTemplate, template.emTemplate, true);
                    validInstances[i].badge.setBtnTemplate();
                    validInstances[i].badge.surveyTriggered.subscribe(
                      function (insto) {
                        return function () {
                          if (insto.replay === true) {
                            Replay.startTransmitting(browser, cpps, insto);
                          } else {
                            /* pragma:DEBUG_START */
                            console.warn("fb: replay was not turned on, not transmitting");
                            /* pragma:DEBUG_END */
                          }
                          PopupHandler.initialize(insto, browser, cpps, template.emTemplate, template.svContentsTemplate, template.epTemplate);
                        };
                      }(validInstances[i]),
                      false, false);
                  }
                }
                /* jshint ignore:end */

                /**
                 * When a survey is submitted, this event will fire.
                 * We can react to it and do things like remove the badge
                 */
                PopupHandler.SurveySubmitted.subscribe(function (cfg) {
                  var k, l;
                  // If a particular instance is to be removed, only remove that.
                  if (cfg && cfg.mid) {
                    // Tell replay to start processing
                    Replay.startProcessing(browser, cpps, cfg);

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
              }, this), true, true); // Load Success
            }

            if (cxreplay && Replay) {
              // Do cxRecord setup
              Replay.setup(browser, cpps, validInstances[0], function (ctrl) {
                for (var h = 0; h < validInstances.length; h++) {
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
        }, this), true, true);
      }, true, true);
    }
  };

  // Wait for DOMReady
  fs.domReady(FeedbackSetupSequence);

})();