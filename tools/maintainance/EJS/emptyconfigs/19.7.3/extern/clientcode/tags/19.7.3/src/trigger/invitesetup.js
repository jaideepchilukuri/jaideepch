/**
 * Setup code for an invite
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.InviteSetup");

fs.require("trig.Top");

(function () {

  // Get the InviteSetup Instance
  var getInviteSetupInstance = function (trig, browser, stg, cpps, displayoverride, jrny, triggerMethod, readycallback) {
    if (!Singletons.inviteSetup) {
      Singletons.inviteSetup = new InviteSetup(trig, browser, stg, cpps, displayoverride, jrny, triggerMethod, readycallback);
    } else {
      // Ensure the callback is called if inviteSetup already exists
      readycallback.call(Singletons.inviteSetup);
    }
    return Singletons.inviteSetup;
  };

  /**
   * Do the invitation setup and display
   * @param trig
   * @param browser
   * @param stg
   * @param cpps
   * @param events
   * @param displayoverride
   * @constructor
   */
  var InviteSetup = function (trig, browser, stg, cpps, displayoverride, jrny, triggerMethod, readycallback) {
    // Keep track of these args as member properties
    this.trig = trig;
    this.browser = browser;
    this.stg = stg;
    this.cpps = cpps;
    this.displayoverride = displayoverride;
    this.jrny = jrny;
    this.resourcesready = new utils.FSEvent();
    this.triggerMethod = triggerMethod;

    if (fs.isDefined(this.trig.surveydef.inviteExclude) && fs.isDefined(this.trig.crit) && this.trig.crit.runAllTests(this.trig.surveydef.inviteExclude, this.browser, false, true)) {
      /* pragma:DEBUG_START */
      console.warn("trigger: invite exclude by definition is hit");
      /* pragma:DEBUG_END */
      return false;
    }
    var ctx = this;

    fsReady(function () {
      var piaLeft;

      /* pragma:DEBUG_START */
      console.log("trigger: requesting invite");
      /* pragma:DEBUG_END */

      // Remove any existing invites
      if (trig.invite) {
        trig.invite.dispose();
      }

      // This checks to see if a user is on mobile and wants to limit the page invites to a certain amount.
      if (browser.isMobile && trig.cfg.config.pagesInviteAvailable) {
        piaLeft = stg.get('pia');
        if (piaLeft === null) {
          stg.set('pia', trig.cfg.config.pagesInviteAvailable - 1);
        } else if (piaLeft > 0) {
          stg.set('pia', --piaLeft);
        } else if (piaLeft === 0) {
          return;
        }
      }

      // We're ready, go grab the invite
      require([fs.makeURI("$fs.invite.js")], function (Invite) {
        /* pragma:DEBUG_START */
        console.log("trigger: invite module loaded.");
        /* pragma:DEBUG_END */

        // Set up a new invite
        var invite = ctx.invite = trig.invite = new Invite(config, trig.surveydef, browser, displayoverride, cpps, Singletons);

        // Make a note of the display name (a/b test)
        stg.set('dn', invite.display.displayname);

        if (readycallback) {
          readycallback.call(ctx);
        } else {
          /* pragma:DEBUG_START */
          console.warn("trigger: no invitation ready callback provided");
          /* pragma:DEBUG_END */
        }
      }.bind(this));
    });
  };

  /**
   * This will be used down below to init and start the mobile heartbeat
   */
  var startMobileHB = function (trigger, userinfo, invitetype) {
    /* pragma:DEBUG_START */
    console.log("trigger: initializing and starting the mobile heartbeat");
    /* pragma:DEBUG_END */

    var mh = new MobileHeartbeat(invitetype, config, trigger.surveydef, trigger.cpps, trigger.stg.get('rid'), trigger.locale);

    // Only init if we are on the first page -- if storage hasn't been set yet
    if (trigger.stg.get('mhbi')) {
      mh.beginHeartbeat();
    } else {
      mh.init(userinfo, function () {
        mh.beginHeartbeat();
      });
    }
  };

  /**
   * Show the invite and do all the bindings
   */
  InviteSetup.prototype.initialize = function () {
    var trig = this.trig,
      stg = this.stg,
      cpps = this.cpps,
      displayoverride = this.displayoverride,
      invite = this.invite,
      jrny = this.jrny;

    // Make sure intialize only happens once
    if (this.didInitialize) {
      return;
    }
    this.didInitialize = true;

    // At this point some new informations are available because a survey definition has been selected.
    // So the default properties for events can be enhanced.
    jrny.addEventsDefault("properties", {
      'fs_defName': [trig.surveydef.name],
      'fs_section': [trig.surveydef.section],
      'fs_displayName': [invite.display.displayname],
      'fs_displayTemplate': [invite.display.template],
      'fs_pvInvited': [trig.pageViewCount],
      'fs_language': [invite.locale],
      'fs_samplePercentage': [trig.surveydef.criteria.sp.reg],
      'fs_loyaltyFactor': [trig.surveydef.criteria.lf],
      'fs_environment': [fs.isProduction ? 'production' : 'staging'],
      'fs_deployType': [fs.isSelfHosted ? 'on-prem' : 'cloud'],
      'fs_inviteType': ['intercept'],
      'fs_triggerMethod': [this.triggerMethod]
    });

    // For tracking trigger method via CPPs
    cpps.set('TriggerMethod', this.triggerMethod);

    cpps.set('dn', invite.display.displayname);
    cpps.set('dt', invite.display.template);

    // Start loading the template and all that
    invite.loadResources(this.resourcesready);

    // Handle when the invite is declined
    invite.declined.subscribe(function (decline_type) {
      /* pragma:DEBUG_START */
      console.warn("trigger: user declined the invitation");
      /* pragma:DEBUG_END */

      // if there is a repeat days for the survey def, use it
      var rDays = (fs.isDefined(config.active_surveydef) && fs.isDefined(config.active_surveydef.repeatDays)) ? config.active_surveydef.repeatDays : config.config.repeatDays;

      // Set the invite not accepted flag
      stg.set('i', 'd');
      stg.setMaxKeyExpiration(rDays.decline * 24 * 60 * 60 * 1000);

      // logging invite declined
      jrny.addEventObj({
        "name": LOGGING.INVITE_DECLINED,
        "properties": {
          "action": [decline_type]
        }
      });

      // Fire the invite declines event
      Singletons.inviteDeclinedEmitter.fire(trig.surveydef, stg, config, cpps);

      // Stop transmitting and shut down the recorder if we are recording, but not if feedback recorder is present
      if (trig.surveydef.cxRecord && Singletons.rec && stg.get('fbr') != 'y') {
        Singletons.rec.cancelRecord();
        trig.recordController = Singletons.rec = null;
      }
      Singletons.state.inviteSituation = 'DECLINED';
    });

    // Handle when the invite is abandoned
    invite.abandoned.subscribe(function () {
      /* pragma:DEBUG_START */
      console.warn("trigger: user abandoned the invitation. going to now wait " + Math.round(config.config.reinviteDelayAfterInviteAbandon / 1000) + " seconds before possibly reinviting");
      /* pragma:DEBUG_END */

      // Log that the user abandoned the invite
      jrny.addEventString(LOGGING.INVITE_ABANDONED);

      // Set the invite abandoned flag
      stg.set('i', 'a');
      Singletons.state.inviteSituation = 'ABANDONED';

      // Fire the public API event
      Singletons.inviteAbandonedEmitter.fire(trig.surveydef, stg, config, cpps);

      // Set the next time we can invite the user - in one hour
      stg.set('rw', utils.now() + (config.config.reinviteDelayAfterInviteAbandon));
    });

    // Handle when the invite is accepted
    invite.accepted.subscribe(function (invitetype, userinfo) {
      /* pragma:DEBUG_START */
      console.warn("trigger: user accepted the invitation");
      /* pragma:DEBUG_END */

      // if there is a repeat days for the survey def, use it
      var rDays = (fs.isDefined(config.active_surveydef) && fs.isDefined(config.active_surveydef.repeatDays)) ? config.active_surveydef.repeatDays : config.config.repeatDays;
      stg.setMaxKeyExpiration(rDays.accept * 24 * 60 * 60 * 1000);

      // Fire inviteAcceptedEmitter
      Singletons.inviteAcceptedEmitter.fire(trig.surveydef, stg, config, cpps);

      // Begin transmitting if we are recording
      if (trig.surveydef.cxRecord && Singletons.rec && Singletons.rec.recorder) {
        /* pragma:DEBUG_START */
        console.log("trigger: activating cxReplay transmit");
        /* pragma:DEBUG_END */

        // Actually begin the transmissions
        Singletons.rec.beginTransmitting();
      } else {
        /* pragma:DEBUG_START */
        console.warn("trigger: not activating cxReplay because ", !!!trig.surveydef.cxRecord ? "cxRecord flag turned off" : "no recorder present");
        /* pragma:DEBUG_END */
      }

      jrny.initPopupId();

      // Log that the user accepted the invite
      jrny.addEventString(LOGGING.INVITE_ACCEPTED);

      // Set the invite accepted flag
      stg.set('i', 'x');
      Singletons.state.inviteSituation = 'ACCEPTED';

      // Set the invite accepted timestamp
      stg.set('ixw', utils.now());

      /* pragma:DEBUG_START */
      console.log("trigger: survey is of type", invitetype);
      /* pragma:DEBUG_END */

      // Switch on the invite type
      switch (invitetype) {
        case 'TRACKER':
          // We'll need to launch the tracker
          trig.popTracker(invite);
          break;
        case 'INSESSION':
          // Launch the survey directly
          trig.popSurvey();
          break;
        case 'SMS':
        case 'EMAIL':
        case 'SMSEMAIL':
          // Initialize and begin the mobile heartbeat
          startMobileHB(trig, userinfo, invitetype);
          trig.stg.set('mhbi', { ui: userinfo, it: invitetype });
          break;
      }
    });
  };

  /**
   * Present the invite (separate from asset retrieval)
   */
  InviteSetup.prototype.present = function () {
    var invite = this.invite;
    var stg = this.stg;
    var jrny = this.jrny;
    var trig = this.trig;
    var cpps = this.cpps;

    // Ensure that the invite only shows once
    if (!Singletons.state.didInvite) {
      Singletons.state.didInvite = true;
    } else {
      return;
    }

    this.resourcesready.subscribe(function () {
      /* pragma:DEBUG_START */
      console.log("trigger: got the invite template and css");
      console.log("trigger: delaying for ", Math.max(0, config.config.triggerDelay - (utils.now() - fs.startTS)), " ms");
      /* pragma:DEBUG_END */

      // Implement a trigger delay. Take into account all the accumulated time it took to get to this point.
      setTimeout(function () {
        /* pragma:DEBUG_START */
        console.warn("trigger: presenting invitation");
        /* pragma:DEBUG_END */

        // Show the invite
        this.invite.present();

        // Only fire events if we haven't presented the invite yet.
        if (stg.get('i') !== "p") {

          // Log that we showed the invite
          jrny.addEvent(LOGGING.INVITE_SHOWN);
        }

        stg.set('i', 'p');
        Singletons.state.inviteSituation = 'PRESENTED';
        // Signal the global event
        Singletons.inviteShownEmitter.fire(trig.surveydef, stg, config, cpps);
      }.bind(this), Math.max(0, config.config.inviteDelay - (utils.now() - fs.startTS)));
    }.bind(this), true, true);
  };
})();
