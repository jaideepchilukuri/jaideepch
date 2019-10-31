/**
 * Entry point for trigger code
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Startup");

fs.require("trig.Top");
fs.require("trig.Trigger");
fs.require("trig.Misc.Services");
fs.require("trig.Misc.MobileHeartbeat");
fs.require("trig.Misc.Tracker");
fs.require("trig.Misc.Links");
fs.require("trig.Misc.Survey");
fs.require("trig.InviteSetup");
fs.require("trig.TriggerSetup");
fs.require("trig.Misc.Record");
fs.require("trig.Misc.PublicAPI");

(function (trigger) {

  // Tell the world about us
  utils.registerProduct('foresee', config);

  // Quick reference the events collection
  var isWindowIframe = window != _W.top;

  // Fire the loaded event emitter
  Singletons.loadedEmitter.fire();

  if ((config.config.workInIframes === 'dontRunOtherIframes' || !config.config.workInIframes) && isWindowIframe) {
    /* pragma:DEBUG_START */
    console.warn("trigger: not the top frame. ending trigger.");
    /* pragma:DEBUG_END */
    return;
  }

  if (_W.__fsrtracker || _W.location.toString().indexOf('survey.foreseeresults.com') > -1) {
    /* pragma:DEBUG_START */
    console.warn("trigger: this is the tracker window or survey. ending trigger.");
    /* pragma:DEBUG_END */
    return;
  }

  // Keep a permanent copy of the current location; CC-3287 copying only certain values
  var currentLocation = {
    hash: _W.location.hash,
    href: _W.location.href,
    pathname: _W.location.pathname
  };

  /**
   * Holds the startup sequence for trigger code
   * @constructor
   */
  var TriggerStartupSequence = function () {
    Singletons._triggerResetLock = true;

    /* pragma:DEBUG_START */
    console.log("trigger: startup sequence has begun");
    /* pragma:DEBUG_END */

    // Bomb out if we are in a tracker window
    if (currentLocation.href.indexOf('fs.tracker.html') > -1) {
      /* pragma:DEBUG_START */
      console.warn("trigger: possible tracker window. stopping..");
      /* pragma:DEBUG_END */

      // Set the resetLock to false as we will not present invite
      Singletons._triggerResetLock = false;
      return;
    }

    // Set up the browser
    var browser = new utils.Browser();

    // Bind to browser ready
    browser.ready.subscribe(function () {
      /* pragma:DEBUG_START */
      console.warn("trigger: browser detected", browser);
      /* pragma:DEBUG_END */

      // Set up a global storage instance and criteria checker
      var stg = utils.getGlobalStore(browser),
        crit = new Criteria(stg, config),
        cpps = new utils.CPPS(stg, config.config.cppsResetTimeout),
        tracker,
        linker;

      // Set the blacklist
      cpps.addToBlacklist(config.config.disable_default_cpps || config.config.disable_cpps || []);

      // Wait for storage to be ready
      stg.ready.subscribe(fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.log("trigger: storage ready");
        /* pragma:DEBUG_END */
        stg.upgradeOldStorage(function () {
          /* pragma:DEBUG_START */
          console.log("trigger: setting up journey");
          /* pragma:DEBUG_END */
          // Set up the journey class
          var jrny = Singletons._journey = new utils.Journey(config.config.id, config.config.site_id, stg.uid, browser);

          // Expose the API. Note: This has to happen AFTER the storage is ready.
          CompleteAPI(stg, crit, cpps, jrny, browser);

          // Get the invite status
          var invitesituation = stg.get('i');

          // Run the rest of the setup on the trigger delay
          setTimeout(fs.proxy(function () {
            // Set the current URL as a CPP
            cpps.set('url', _W.location.toString());
            cpps.set('code', fs.config.codeVer);

            // Set the user-defined CPPS's
            if (config.config.cpps) {
              var cpl = config.config.cpps,
                cpx,
                value;
              for (var cp in cpl) {
                var cplrl = cpl[cp];
                if (fs.isObject(cplrl)) {
                  switch (cplrl.source) {
                    case "param":
                      var pmv = fs.getParam(cplrl.val) || cplrl.init || null;

                      if (fs.isDefined(cplrl.mode) && cplrl.mode == "append") {
                        //if we are in append mode
                        var delimiter = cplrl.delimiter || ',',
                          cg = cpps.get(cp),
                          currentCPPs = cg ? cg.split(delimiter) : [];
                        pmv = pmv || '';

                        //check to see if the current param is the same as last stored param, skip if so
                        if (currentCPPs[currentCPPs.length - 1] !== pmv) {
                          currentCPPs.push(pmv);
                          currentCPPs.join(delimiter);
                          cpps.set(cp, currentCPPs);
                        }
                      } else {
                        //if we are not in append mode
                        //if the value is not null
                        if (fs.isDefined(pmv) && pmv !== null) {
                          cpps.set(cp, pmv);
                        } else if (!cpps.get(cp)) {
                          cpps.set(cp, '');
                        }
                      }
                      /* pragma:DEBUG_START */
                      console.log("trigger: setting user-defined CPP from parameter for site: ", cp, cplrl, pmv);
                      /* pragma:DEBUG_END */
                      break;
                    case "variable":
                      if (fs.isDefined(cplrl.name)) {
                        var ctx = _W,
                          valbits = cplrl.name.split('.'),
                          k = 0,
                          varDefined;
                        cpx = cplrl.exists;

                        while (k < valbits.length && ctx) {
                          ctx = ctx[valbits[k++]];
                        }
                        varDefined = k == valbits.length && fs.isDefined(ctx);

                        // If we're using 'exists' setting, override the default behavior
                        if (fs.isDefined(cpx)) {
                          // Check if the cpp is not already in its final (success) value
                          if (cpps.get(cp) !== cpx.success) {
                            cpps.set(cp, varDefined ? cpx.success : cpx.init);
                          }
                        } else if (varDefined) {
                          // Set the CPP to ctx
                          /* pragma:DEBUG_START */
                          console.log("trigger: setting user-defined CPP from variable for site: ", cp, cplrl, ctx);
                          /* pragma:DEBUG_END */
                          cpps.set(cp, ctx);
                        } else if (!cpps.get(cp)) {
                          cpps.set(cp, cplrl.init || '');
                        }
                      }
                      break;
                    case "cookie":
                      var ckvl = ckie.get(cplrl.val),
                        ckdefined = fs.isDefined(ckvl);
                      cpx = cplrl.exists;

                      // If we're using 'exists' setting, override the default behavior
                      if (fs.isDefined(cpx)) {
                        // Check if the cpp is not already in its final (success) value
                        if (cpps.get(cp) !== cpx.success) {
                          cpps.set(cp, ckdefined ? cpx.success : cpx.init);
                        }
                      } else if (fs.isDefined(ckvl) && ckvl !== null) {
                        /* pragma:DEBUG_START */
                        console.log("trigger: setting user-defined CPP from cookie for site: ", cp, cplrl, ckvl);
                        /* pragma:DEBUG_END */
                        cpps.set(cp, ckvl);
                      } else if (!cpps.get(cp)) {
                        cpps.set(cp, cplrl.init || '');
                      }
                      break;
                    case "url":
                      for (var i = 0, len = cplrl.patterns.length; i < len; i++) {
                        var mtch = cplrl.patterns[i].regex || cplrl.patterns[i].match;
                        value = cplrl.patterns[i].value;
                        if (fs.isString(location.href) && utils.testAgainstSearch(mtch, location.href)) {
                          /* pragma:DEBUG_START */
                          console.log("trigger: setting user-defined CPP from url for site: ", cp, cplrl, value);
                          /* pragma:DEBUG_END */
                          cpps.set(cp, value);
                        }
                        else if (!cpps.get(cp)) {
                          cpps.set(cp, cplrl.init || '');
                        }
                      }
                      break;
                    case "function":
                      if (fs.isFunction(cplrl.value)) {
                        try {
                          value = cplrl.value.call(_W);
                          /* pragma:DEBUG_START */
                          console.log("trigger: setting user-defined CPP from url for site: ", cp, value);
                          /* pragma:DEBUG_END */
                          cpps.set(cp, value);
                        } catch (e) {
                          /* pragma:DEBUG_START */
                          console.error("trigger: could not execute CPP function", e);
                          /* pragma:DEBUG_END */
                        }
                      }
                      break;
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
            var ckovr;
            if (stg.get('ovr')) {
              ckovr = JSON.parse(stg.get('ovr'));
            }
            if (ckovr) {
              /* pragma:DEBUG_START */
              console.warn("trigger: there is an override cookie. applying it", ckovr);
              /* pragma:DEBUG_END */

              for (var df = 0; df < config.surveydefs.length; df++) {
                var dfn = config.surveydefs[df].name;
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

            Singletons.state.codeVer = fs.config.codeVer;
            Singletons.state.siteKey = config.config.site_id;
            Singletons.state.didInvite = 'xda'.indexOf(invitesituation) > -1;
            Singletons.state.inviteSituation = {
              "x": "ACCEPTED",
              "d": "DECLINED",
              "a": "ABANDONED",
              'p': "PRESENTED"
            }[invitesituation];

            // The invitesituation variable tells us whether we've been invited before and what happened
            // the possible values are 'x' (accepted), 'd' (declined), 'a' (abandoned), 'p' (presented)

            // Now, if the user abandoned previously, make sure we are past our wait threshold
            if (invitesituation == 'a') {
              /* pragma:DEBUG_START */
              console.warn("trigger: user previously abandoned");
              /* pragma:DEBUG_END */
              var abandonretry = parseInt(stg.get('rw'));

              // Check to see if we're past our retry threshold
              if (abandonretry < utils.now()) {
                stg.erase('i');
                stg.erase('rw');
                invitesituation = null;
                /* pragma:DEBUG_START */
                console.warn("trigger: we are passed the abandoned threshold, allowing them to be re-invited");
                /* pragma:DEBUG_END */
              } else {
                /* pragma:DEBUG_START */
                console.warn("trigger: we still have " + Math.round((abandonretry - utils.now()) / 1000) + " seconds to wait before possibly reinviting them");
                /* pragma:DEBUG_END */
              }
            }

            if (config.config.workInIframes === 'runRecordOnly' && isWindowIframe) {
              var isSurveyDef = false;
              // Now we check to see if any of our survey defs support replay.
              // If so, move ahead with the SetupRecording
              for (var n = 0; n < config.surveydefs.length; n++) {
                var category = config.surveydefs[n].cxRecord;
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
            // x == accepted, d == declined, a == abandoned
            if (invitesituation != 'd' && invitesituation != 'a') {
              /**
               * Check if we are in the cxReplay pool.
               */
              crit.calcReplayPoolStatus(function (isinpool) {
                // Now we need to handle pooling
                if (!isinpool) {
                  /* pragma:DEBUG_START */
                  console.warn("trigger: we are out of the pool");
                  /* pragma:DEBUG_END */
                } else {
                  Singletons.state.isinpool = isinpool;
                }

                // Check if the user has opted out
                if (crit.optoutCheck(fs.proxy(function () {
                  /**
                   * Check the global exclude
                   */
                  if (crit._match(config.config, browser, 'globalExclude') && stg.get('gx') != 'y') {
                    // Set up trigger
                    var trig = Singletons.trig = TriggerSetup(stg, config, browser, crit, cpps, jrny);

                    // Log the state
                    trig.logState();

                    // Set a CPP of the page views
                    /* pragma:DEBUG_START */
                    console.log("trigger: page views now " + trig.pageViewCount);
                    /* pragma:DEBUG_END */

                    // Set the page view count as a CPP
                    cpps.set('pv', trig.pageViewCount, config.config.pageViewsResetTimeout || 24 * 60 * 60 * 1000);

                    // Proceed with initialization ***************************
                    if (trig.init()) {
                      // Fire the initializedEventEmitter
                      Singletons.initializedEmitter.fire();

                      // Evaluate the remaining criteria
                      if (trig.doesPassCriteria()) {
                        // Is there a valid survey def?
                        if (trig.surveydef) {

                          // Log the surveydef state
                          trig.logDefState();

                          /* pragma:DEBUG_START */
                          console.log("trigger: page view count for this survey def: " + trig.defPageViewCount);
                          /* pragma:DEBUG_END */

                          // Set up recording if necessary
                          SetupRecording(browser, trig.surveydef.cxRecord, stg, isinpool, cpps);

                          // Only go any further if the user has not accepted the invite
                          if (invitesituation != 'x') {
                            // Test the LF and sampling rate
                            if (trig.evalLoyaltySampling()) {
                              // Check if we are allowed to display the invite
                              if (trig.canDisplayInvitation()) {
                                // Keep track of which definition we are using
                                stg.set('def', trig.inviteIndex);

                                // Run the invite setup and display
                                var ist = new InviteSetup(trig, browser, stg, cpps, false, jrny, function () {

                                  // Initialize the invitation
                                  this.initialize();
                                });

                              } else {
                                /* pragma:DEBUG_START */
                                console.warn("trigger: on invite exclude list. not displaying invite");
                                /* pragma:DEBUG_END */

                                // Set the resetLock to false as we will not present invite
                                Singletons._triggerResetLock = false;
                              }

                            } else {
                              /* pragma:DEBUG_START */
                              console.warn("trigger: did not pass loyalty factor or sampling dice-throw");
                              /* pragma:DEBUG_END */

                              // Set the resetLock to false as we will not present invite
                              Singletons._triggerResetLock = false;
                            }
                          } else {
                            /* pragma:DEBUG_START */
                            console.warn("trigger: user has already been invited and accepted. Time left before storage expiration: " + Math.round(stg.getMaxKeyExpiration() / 1000) + "s. Resuming tracking");
                            /* pragma:DEBUG_END */

                            // If we started hb on previous page, start it here again
                            var mbhi = trig.stg.get('mhbi');
                            if (mbhi) {
                              // If mobile, start mobile heartbeat (image transport)
                              startMobileHB(trig, mbhi.ui, mbhi.it);
                            } else {
                              // If not mobile, set up the tracker
                              trig.tracker = new Tracker(null, trig.surveydef, config, stg, cpps, null, browser);
                            }

                            // Send updated surveydef information
                            if (trig.surveydef) {
                              /* pragma:DEBUG_START */
                              console.log("trigger: sending the survey def information to the tracker");
                              /* pragma:DEBUG_END */
                              stg.set('defupdate', {
                                "name": trig.surveydef.name
                              }, 20000, true, utils.persistDataType.TRACKER);
                            }

                            // Set the resetLock to false as we will not present invite
                            Singletons._triggerResetLock = false;
                          }

                          // Run link bindings
                          if (trig.surveydef.links) {
                            /* pragma:DEBUG_START */
                            console.warn("trigger: setting up linker for the surveydef", trig.surveydef.links);
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
                  } else {
                    /* pragma:DEBUG_START */
                    if (stg.get('gx') == 'y') {
                      console.warn("trigger: was previously globally excluded", config.config.exclude);
                    } else {
                      console.warn("trigger: did not pass global exclude", config.config.exclude);
                    }
                    /* pragma:DEBUG_END */

                    // Set a variable that we failed the global exclude
                    stg.set('gx', 'y');

                    // Set the resetLock to false as we will not present invite
                    Singletons._triggerResetLock = false;
                  }
                }, this), function () {
                  /* pragma:DEBUG_START */
                  console.warn("trigger: opt out cookie found");
                  /* pragma:DEBUG_END */

                  // Set the resetLock to false as we will not present invite
                  Singletons._triggerResetLock = false;
                }));
              });
            } else {
              /* pragma:DEBUG_START */
              console.warn('trigger: ' + (invitesituation == 'x' ? 'user has already been invited and accepted. resuming tracking' : (invitesituation == 'd' ? 'user has already been invited and declined. not doing anything' : (invitesituation == 'a' ? 'user previously was invited and abandoned it. not doing anything' : 'got unexpected invite situation: ' + invitesituation))));
              /* pragma:DEBUG_END */
              if (invitesituation == 'a') {
                var recing = (stg.get('rc') == 'true' || stg.get('rc') === true);
                // Set up recording if necessary
                SetupRecording(browser, recing, stg, recing, cpps);
              }
              // Set the resetLock to false as we will not present invite
              Singletons._triggerResetLock = false;
            }
          }, this), Math.max(0, config.config.triggerDelay - (utils.now() - fs.startTS)));
        });
      }, this), true, true);

    }, true, true);
  };

  // When the DOM is ready, fire up the Trigger
  fs.domReady(TriggerStartupSequence);

  // Used to prevent too many page nav events from happening one after another
  var pageNavThrottler;

  if (!config.config.ignoreNavigationEvents) {
    // Do page reset when there's an html5 navigation event
    utils.pageNavEvent.subscribe(function () {
      var gbl = _W,
        nowloc = gbl.location,
        pr = gbl[config.config.publicApiName || "FSR"],
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
      console.warn('trigger: detected navigation event');
      /* pragma:DEBUG_END */

      if (pr && oldhash != newhash || currentLocation.pathname != nowloc.pathname) {
        fsReady(function () {
          clearTimeout(pageNavThrottler);
          pageNavThrottler = setTimeout(function () {
            /* pragma:DEBUG_START */
            console.warn('trigger: moving from ', oldhash, 'to', newhash);
            /* pragma:DEBUG_END */

            // Keep a permanent copy of the current location; CC-3287 copying only certain values
            currentLocation = {
              hash: _W.location.hash,
              href: _W.location.href,
              pathname: _W.location.pathname
            };

            // Call reset
            pr.pageReset();
          }, 1000);
        });
      }
    }, false, false);
  }

})(trigger);
