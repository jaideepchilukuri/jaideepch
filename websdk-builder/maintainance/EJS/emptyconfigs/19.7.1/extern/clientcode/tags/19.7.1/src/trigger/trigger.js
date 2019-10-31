/**
 * Custom Pass Parameters Library
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Trigger");

fs.require("trig.Top");
fs.require("trig.Misc.Criteria");
fs.require("trig.Misc.Services");
fs.require("trig.Misc.PopUp");
fs.require("trig.Misc.Tracker");
fs.require("trig.Misc.Survey");

(function (trigger) {
  /**
   * The triggering library
   * @param stg (GlobalStorage)
   * @param cfg (Config)
   * @param browser (Browser)
   * @param crit (Criteria)
   * @param cpps (CPPS)
   * @constructor
   */
  var Trigger = function (stg, cfg, browser, crit, cpps, jrny) {
    this.stg = stg;
    this.cfg = cfg;
    this.browser = browser;
    this.crit = crit;
    this.cpps = cpps;
    this.jrny = jrny;
    var cppsToSet, cppKey,
      adobeRsid = fs.config.adobeRsid;

    // First see if we are brand new
    if (!stg.get('pv')) {
      // Set the search terms
      cppsToSet = {
        'browser': browser.browser.name + ' ' + browser.browser.version,
        'os': browser.os.name,
        'referrer': document.referrer.toString(),
        'site': utils.getRootDomain(),
        'sitekey': cfg.config.site_key || ''
      };

      for (cppKey in cppsToSet) {
        if (cppsToSet.hasOwnProperty(cppKey)) {
          cpps.set(cppKey, cppsToSet[cppKey]);
        }
      }

      // Do integrations automatically
      if (utils.INT.GA.has()) {
        setTimeout(function () {
          utils.INT.GA.uid(function (gid) {
            if (gid) {
              cpps.set('GA_UID', gid);
            }
          });
        }.bind(this), 2000);
      }

      var setCppFn = function (id) {
        cpps.set(id.name, id.value);
      };
      // Check for one of VID/AID/FID and MCID
      utils.INT.OM.uid(adobeRsid, setCppFn);
      utils.INT.OM.mcid(adobeRsid, setCppFn);

      utils.INT.OM.beacon(function (omBeacon) {
        /* pragma:DEBUG_START */
        console.log("fb: setting omniture beacon", omBeacon);
        /* pragma:DEBUG_END */
        cpps.set('OMTR_BEACON', omBeacon);
      });
    }

    this.heartbeatExpired = new utils.FSEvent();
    var surveyDisplayed = false;
  };

  /**
   * Does this user pass the remaining criteria?
   */
  Trigger.prototype.doesPassCriteria = function () {
    var crit = this.crit,
      cfg = this.cfg,
      state = Singletons.state,
      dpmc = "DIDNOTPASSCRITERIA";
    if (crit.platformCheck(this.browser, cfg)) {
      if (crit.browserCheck(this.browser, cfg)) {
        if (crit.checkDeviceBlacklist(this.browser, cfg)) {
          if (crit.featureCheck(this.browser, cfg)) {
            return true;
          } else {
            state.inviteStatus = dpmc;
            state.reason = "BROWSER";
            /* pragma:DEBUG_START */
            console.error("trigger: failed browser feature check.");
            /* pragma:DEBUG_END */
          }
        } else {
          state.inviteStatus = dpmc;
          state.reason = "DEVICE";
          /* pragma:DEBUG_START */
          console.error("trigger: failed device blacklist check.");
          /* pragma:DEBUG_END */
        }
      } else {
        state.inviteStatus = dpmc;
        state.reason = "BROWSER";
        /* pragma:DEBUG_START */
        console.error("trigger: failed browser check.");
        /* pragma:DEBUG_END */
      }
    } else {
      state.inviteStatus = dpmc;
      state.reason = "PLATFORM";
      /* pragma:DEBUG_START */
      console.error("trigger: failed platform check.");
      /* pragma:DEBUG_END */
    }
    return false;
  };

  /**
   * Launch the tracker window
   */
  Trigger.prototype.popTracker = function (invite) {
    /* pragma:DEBUG_START */
    console.warn("trigger: popping tracker");
    /* pragma:DEBUG_END */
    var ctx = this;

    // Set the invite accepted flag. We do this in case the tracker was popped another way
    this.stg.set('i', 'x');
    Singletons.state.inviteSituation = 'ACCEPTED';

    this.didPopTrackerAlready = (this.stg.get('tp') == 'y');
    Singletons.state.didInvite = true;

    if (!this.didPopTrackerAlready) {
      this.stg.set('tp', 'y');
      /**
       * This function finishes all the tracker setup
       */
      var finishTrackerSetup = function () {
        ctx.tracker = new Tracker(
          invite.template,
          ctx.surveydef,
          config,
          utils.getBrainStorage(ctx.browser, ctx.stg.uid),
          ctx.cpps,
          invite.display,
          ctx.browser
        );
        ctx.tracker.show(ctx.browser);
        // NOTE: We do NOT log that the tracker was shown with a services call because the tracker itself does that.
      };

      if (invite) {
        /* pragma:DEBUG_START */
        console.log("trigger: finishing tracker setup");
        /* pragma:DEBUG_END */
        finishTrackerSetup();
      } else {
        /* pragma:DEBUG_START */
        console.warn("trigger: no invite reference - popping blank tracker");
        /* pragma:DEBUG_END */
        var wref = popup("about:blank", 'fsTracker', {
          width: 700,
          height: 400
        }, this.browser, true, this.cfg.config.centerTrackerPopup);
        // Start setting up the invite
        var ist = getInviteSetupInstance(this, ctx.browser, ctx.stg, ctx.cpps, false, ctx.jrny, 'Traditional', function () {
          /* pragma:DEBUG_START */
          console.log("trigger: finished after-the-fact invitation setup");
          /* pragma:DEBUG_END */
          ctx.tracker = new Tracker(
            this.invite.template,
            ctx.surveydef,
            config,
            utils.getBrainStorage(ctx.browser, ctx.stg.uid),
            ctx.cpps,
            this.invite.display,
            ctx.browser
          );
          ctx.tracker.applyExisting(ctx.browser, wref);

          // Begin transmitting if we are recording
          if (ctx.surveydef.cxRecord && Singletons.rec && Singletons.rec.recorder) {
            // Actually begin the transmissions
            Singletons.rec.beginTransmitting();
          } else {
            /* pragma:DEBUG_START */
            console.warn("trigger: not activating cxReplay because ", !!!ctx.surveydef.cxRecord ? "cxRecord flag turned off" : "no recorder present");
            /* pragma:DEBUG_END */
          }
        });
      }
    } else {
      /* pragma:DEBUG_START */
      console.warn("trigger: did not pop tracker because it was already popped");
      /* pragma:DEBUG_END */
    }
  };

  /**
   * Check if we are OK to display the invitation (just by checking invite exclude)
   */
  Trigger.prototype.canDisplayInvitation = function () {
    return this.crit._match(this.cfg.config, this.browser, "inviteExclude");
  };

  /**
   * Launch the survey in a new window
   */
  Trigger.prototype.popSurvey = function (serverStatus) {
    // Set the invite accepted flag. We do this incase the tracker was popped another way
    this.stg.set('i', 'x');
    Singletons.state.inviteSituation = 'ACCEPTED';

    this.didPopTrackerAlready = (this.stg.get('tp') == 'y');
    Singletons.state.didInvite = true;

    if (!this.didPopTrackerAlready) {
      /* pragma:DEBUG_START */
      console.warn("trigger: popping survey");
      /* pragma:DEBUG_END */
      this.stg.set('tp', 'y');
      var sv = new Survey(config, this.cpps, this.surveydef, null, serverStatus),
        svurl = sv.getUrl(),
        surveyWin = popup(svurl, 'acsSurvey', {
          width: 700,
          height: 400
        }, this.browser, false, this.cfg.config.centerTrackerPopup);
    } else {
      // If a "tracker" window is opened, set/move it to the survey.
      // Note: Only tracker windows use the page heartbeat atm.
      if (this.stg && this.stg.get('page_hb')) {
        /* pragma:DEBUG_START */
        console.warn("trigger: we already have a tracker");
        /* pragma:DEBUG_END */

        utils.getBrainStorage(this.browser, this.stg.uid)
          .set('trackercmd', {
            method: "survey"
          }, 60000, true);
      } else {
        /* pragma:DEBUG_START */
        console.warn("trigger: we already have a survey");
        /* pragma:DEBUG_END */
      }
    }
  };

  /**
   * Initialize the trigger
   */
  Trigger.prototype.init = function () {
    // Identify the survey def that applies to this path
    var defs = this.cfg.surveydefs,
      i,
      _prev,
      def,
      olddef = this.stg.get('def');

    // First, loop over all the definitions and copy missing attributes from earlier ones to later ones.
    for (i = 0; i < defs.length; i++) {
      def = defs[i];
      if (_prev) {
        def = fs.ext(_prev, def);
        if (!defs[i].site && _prev.site) {
          delete def.site;
        }
        if (!defs[i].section && _prev.section) {
          delete def.section;
        }
        defs[i] = def;
      }
      _prev = fs.ext({}, def);
    }

    // See if the old def is no longer valid
    if (fs.isDefined(olddef) && parseInt(olddef) > defs.length - 1) {
      /* pragma:DEBUG_START */
      console.warn("trigger: the def index found in storage is invalid w the current available definitions", olddef, defs);
      /* pragma:DEBUG_END */
      olddef = undefined;
    }

    /* pragma:DEBUG_START */
    console.warn("trigger: beginning init with config:", this.cfg);
    console.warn("trigger: reviewing surveydefs (" + this.cfg.surveydefs.length + "):", this.cfg.surveydefs);
    /* pragma:DEBUG_END */

    // First let's examine the storage to see if we'd previously selected a definition
    if (!fs.isDefined(olddef) || defs[parseInt(olddef)].selectMode == 'default' || defs[parseInt(olddef)].selectMode == 'pin') {
      // Loop over the defs and choose one, hopefully
      for (i = 0; i < ((fs.isDefined(olddef) && defs[parseInt(olddef)].selectMode != 'default') ? (parseInt(olddef) + 1) : defs.length); i++) {
        def = defs[i];

        // if pin is selected OR survey def is matched
        if ((fs.isDefined(olddef) && olddef == i && defs[parseInt(olddef)].selectMode != 'default') || this.crit._match(def, this.browser)) {

          // only overwrite the survey def if the user has already been invited
          if (this.stg.get('i') === 'x') {
            this.stg.set('def', i, this.cfg.config.surveyDefResetTimeout || 24 * 60 * 60 * 1000);
          }

          /* pragma:DEBUG_START */
          console.warn("trigger: found matching surveydef (" + (i) + "):", def);
          /* pragma:DEBUG_END */

          def.index = i;
          this.cfg.active_surveydef = def;
          this.surveydef = def;

          // Now let's check to see if we need to load the true conversion plugin
          this._setupTrueConversionIfRequired();

          // Set up the locale for this surveydef
          this.locale = this._initLocale();
          this.cpps.set('locale', this.locale);

          // For active surveys we need to add section if it exists
          if (def.section) {
            this.cpps.set('section', def.section);
          }

          // Keep track of which definition we are using
          this.inviteIndex = i;

          // Spit out the definition
          return def;
        }
      }
    } else if (fs.isDefined(olddef) || defs[parseInt(olddef)].selectMode == 'lock') {
      // We are locked to an old definition
      def = defs[parseInt(olddef)];
      /* pragma:DEBUG_START */
      console.warn("trigger: we are locked to def #" + (parseInt(olddef) + 1) + ": ", def);
      /* pragma:DEBUG_END */

      this.cfg.active_surveydef = def;
      this.surveydef = def;

      // Now let's check to see if we need to load the true conversion plugin
      this._setupTrueConversionIfRequired();

      // Set up the locale for this surveydef
      this.locale = this._initLocale();
      this.cpps.set('locale', this.locale);

      // For active surveys we need to add section if it exists
      if (def.section) {
        this.cpps.set('section', def.section);
      }

      // Spit out the definition
      return def;
    }

    if (fs.isDefined(olddef) && this.isTrackerAlive()) {
      def = defs[parseInt(olddef)];

      // init a Tracker object to start the heartbeats
      this.tracker = new Tracker(
        null,
        def,
        this.cfg,
        utils.getBrainStorage(this.browser, this.stg.uid),
        this.cpps,
        null,
        this.browser
      );

      return def;
    }

    return false;
  };

  /**
   * Set up the true conversion feature
   */
  Trigger.prototype._initLocale = function () {
    var def = this.surveydef,
      lc = def.language,
      val;
    if (fs.isDefined(lc.src) && fs.isDefined(lc.locales)) {
      switch (lc.src) {
        case "variable":
          if (fs.isDefined(lc.name)) {
            val = utils.retrieveNestedVariable(window, lc.name);
          }
          break;
        case "cookie":
          if (fs.isDefined(lc.name)) {
            var ck = new utils.Cookie({});
            val = ck.get(lc.name);
          }
          break;
        case "url":
          var ll = lc.locales;
          if (fs.isDefined(ll)) {
            for (var j = 0, len = ll.length; j < len; j++) {
              if (fs.isDefined(ll[j].locale) && fs.isDefined(ll[j].match) && location.href.match(ll[j].match)) {
                //return the locale within this inner list of locales, and avoid the for loop further down
                this.locale = ll[j].locale;
                if (ll[j].criteria) {
                  fs.ext(this.surveydef.criteria, ll[j].criteria);
                }
                // We need to update the actual locale in the def, without this conditional we only update cpps
                if (this.locale !== def.language.locale) {
                  def.language.locale = this.locale;
                }
                /* pragma:DEBUG_START */
                console.warn("trigger: locale is now", ll[j].locale);
                /* pragma:DEBUG_END */
                return ll[j].locale;
              }
            }
          }
          break;
      }
      if (val) {
        for (var i = 0; i < lc.locales.length; i++) {
          if (lc.locales[i].match == val) {
            lc.locale = lc.locales[i].locale;
            if (lc.locales[i].criteria) {
              fs.ext(this.surveydef.criteria, lc.locales[i].criteria);
            }
            /* pragma:DEBUG_START */
            console.warn("trigger: locale is now", lc.locale);
            /* pragma:DEBUG_END */
            return lc.locale;
          }
        }
      }
    }
    /* pragma:DEBUG_START */
    console.warn("trigger: locale is now", lc.locale || "en");
    /* pragma:DEBUG_END */
    return lc.locale || "en";
  };

  Trigger.prototype.isTrackerAlive = function () {
    return fs.isDefined(this.stg.get('tracker_hb'));
  };

  /**
   * Cancel and stop the tracker
   */
  Trigger.prototype.cancelTracker = function () {
    /* pragma:DEBUG_START */
    console.warn("trigger: cancelTracker()");
    /* pragma:DEBUG_END */

    utils.getBrainStorage(this.browser, this.stg.uid)
      .set('trackercmd', {
        method: "close"
      }, 60000, true);

    /* pragma:DEBUG_START */
    console.warn("trigger: setting invite situation to 'abandon'.");
    /* pragma:DEBUG_END */

    // Set invite situation to 'abandon' to stop trigger from running on subsequent pages
    this.stg.set('i', 'a');
    Singletons.state.inviteSituation = 'ABANDONED';

    if (fs.isDefined(this.tracker)) {
      clearInterval(this.tracker._heartbeat);
    }
  };

  /**
   * Set up the true conversion feature
   */
  Trigger.prototype._setupTrueConversionIfRequired = function () {
    var def = this.surveydef,
      cfg = this.cfg.config;

    // Are we even using true conversion?
    if (cfg.trueconversion && cfg.trueconversion.enabled) {
      /* pragma:DEBUG_START */
      console.warn("trigger: this surveydef requires true conversion. retrieving plugin..", cfg.trueconversion);
      /* pragma:DEBUG_END */

      // We're ready, go grab the true conversion plugin
      require([fs.makeURI("$fs.trueconversion.js")], function (TrueConversion) {

        /* pragma:DEBUG_START */
        console.warn("trigger: true conversion loaded. setting it up...");
        /* pragma:DEBUG_END */

        // Instantiate it
        this.trueconversion = new TrueConversion(this);
      }.bind(this));
    }
  };

  /**
   * Log any state changes, like page views
   */
  Trigger.prototype.logState = function () {
    // Boost page views
    this.pageViewCount = (this.stg.get('pv') || 0) + 1;
    this.stg.set('pv', this.pageViewCount, config.config.pageViewsResetTimeout || 24 * 60 * 60 * 1000);
  };

  /**
   * Log any state changes, like page views
   */
  Trigger.prototype.logDefState = function () {
    // Boost surveydef-specific page views
    if (this.surveydef) {
      var lfName = this.surveydef.name;
      lfName += (this.surveydef.section || "");
      lfName += (this.surveydef.site || "");

      this.defPageViewCount = (this.stg.get(lfName + 'pv') || 0) + 1;
      this.stg.set(lfName + 'pv', this.defPageViewCount, config.config.pageViewsResetTimeout || 24 * 60 * 60 * 1000);
    }
  };

  /**
   * Evaluate the loyalty factor and sampling rate
   * @param {String} critBlock criteria/mouseoff, which surveydef loyalty to check
   */
  Trigger.prototype.evalLoyaltySampling = function (critBlock) {
    var def = this.surveydef;
    var criteria = def[critBlock] || def.criteria;
    var product = critBlock === 'mouseoff' ? 'mouseoff' : 'trigger';
    var pool = this.stg.get('pl');
    var sp = (!fs.isDefined(pool) || pool == 1) ? (criteria.sp.reg || 0) : (criteria.sp.outreplaypool || 0);
    var rnum = (Math.random() * 100);

    if (this.defPageViewCount >= criteria.lf && rnum <= sp) {
      /* pragma:DEBUG_START */
      console.warn(product + ": DID meet the random sampling dice throw, max ", sp, "was", rnum, "defPageViewCount", this.defPageViewCount, "vs loyalty factor", criteria.lf);
      /* pragma:DEBUG_END */
      return true;
    }

    /* pragma:DEBUG_START */
    console.warn(product + ": did NOT meet minimum sampling dice throw, max ", sp, "was", rnum, criteria.sp, "pool = ", pool, "page views: ", this.defPageViewCount, "min: ", criteria.lf, criteria);
    /* pragma:DEBUG_END */
    return false;
  };

  /**
   * Do a complete teardown of this trigger instance. This includes disposing of any dependencies
   */
  Trigger.prototype.dispose = function () {
    if (!this.disposed) {
      /* pragma:DEBUG_START */
      console.warn("trigger: disposing");
      /* pragma:DEBUG_END */
      // Do emergency commit of storage
      this.stg.save(true);

      this.disposed = true;
      // Kill TC
      if (this.trueconversion) {
        this.trueconversion.dispose();
      }
      // Kill Invite if it's present
      if (this.invite) {
        this.invite.dispose();
      }
      // Kill InviteSetup if it's present
      delete Singletons.inviteSetup;

      // Kill MouseOff listening if it's present
      if (this.mouseoff) {
        this.mouseoff.dispose();
      }
      // Kill record if it's running
      if (Singletons.rec) {
        Singletons.RecordController.disposeInstance();
        Singletons.RecordController = null;
        Singletons.rec = null;
      }
      // Unbind events
      utils.Unbind("trigger:*");
    }
  };

})(trigger);
