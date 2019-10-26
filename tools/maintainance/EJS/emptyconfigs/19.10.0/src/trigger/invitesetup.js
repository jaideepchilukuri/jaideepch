/**
 * Setup code for an invite
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Singletons, LOGGING, _W } from "./top";
import {
  ext,
  isDefined,
  isProduction,
  isSelfHosted,
  makeURI,
  startTS,
  getProductConfig,
} from "../fs/index";
import { MobileHeartbeat } from "./misc/mobileheartbeat";
import { FSEvent, now as currentTime } from "../utils/utils";

// Get the InviteSetup Instance
const getInviteSetupInstance = (
  trig,
  browser,
  stg,
  cpps,
  displayoverride,
  jrny,
  triggerMethod,
  readycallback
) => {
  if (!Singletons.inviteSetup) {
    Singletons.inviteSetup = new InviteSetup(
      trig,
      browser,
      stg,
      cpps,
      displayoverride,
      jrny,
      triggerMethod,
      readycallback
    );
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
class InviteSetup {
  constructor(trig, browser, stg, cpps, displayoverride, jrny, triggerMethod, readycallback) {
    // Keep track of these args as member properties
    this.trig = trig;
    this.browser = browser;
    this.stg = stg;
    this.cpps = cpps;
    this.displayoverride = displayoverride;
    this.jrny = jrny;
    this.resourcesready = new FSEvent();
    this.triggerMethod = triggerMethod;

    const config = getProductConfig("trigger");

    if (
      isDefined(this.trig.surveydef.inviteExclude) &&
      isDefined(this.trig.crit) &&
      this.trig.crit.runAllTests(this.trig.surveydef.inviteExclude, this.browser, false, true)
    ) {
      /* pragma:DEBUG_START */
      console.warn("trigger: invite exclude by definition is hit");
      /* pragma:DEBUG_END */
      return false;
    }
    const ctx = this;

    _W.fsReady(() => {
      let piaLeft;

      /* pragma:DEBUG_START */
      console.log("trigger: requesting invite");
      /* pragma:DEBUG_END */

      // Remove any existing invites
      if (trig.invite) {
        trig.invite.dispose();
      }

      // This checks to see if a user is on mobile and wants to limit the page invites to a certain amount.
      if (browser.isMobile && trig.cfg.config.pagesInviteAvailable) {
        piaLeft = stg.get("pia");
        if (piaLeft === null) {
          stg.set("pia", trig.cfg.config.pagesInviteAvailable - 1);
        } else if (piaLeft > 0) {
          stg.set("pia", --piaLeft);
        } else if (piaLeft === 0) {
          return;
        }
      }

      const display = InviteSetup.getFittingDisplay(
        trig.surveydef,
        displayoverride,
        cpps.get("locale"),
        browser
      );

      // Make a note of the display name (a/b test)
      stg.set("dn", display.displayname);

      if (display.inviteType === "SHORTSURVEY") {
        // use the presenter module instead
        _W._fsRequire([makeURI("$fs.shortsurvey.js")], Presenter => {
          ctx.invite = trig.invite = new Presenter(config, trig.surveydef, display, cpps, stg);

          if (readycallback) {
            readycallback.call(ctx);
          } else {
            /* pragma:DEBUG_START */
            console.warn("trigger: no invitation ready callback provided");
            /* pragma:DEBUG_END */
          }
        });
        return;
      }

      // We're ready, go grab the invite
      _W._fsRequire([makeURI("$fs.invite.js")], Invite => {
        /* pragma:DEBUG_START */
        console.log("trigger: invite module loaded.");
        /* pragma:DEBUG_END */

        // Set up a new invite
        ctx.invite = trig.invite = new Invite(
          config,
          trig.surveydef,
          browser,
          display,
          cpps,
          Singletons
        );

        if (readycallback) {
          readycallback.call(ctx);
        } else {
          /* pragma:DEBUG_START */
          console.warn("trigger: no invitation ready callback provided");
          /* pragma:DEBUG_END */
        }
      });
    });
  }

  /**
   * Show the invite and do all the bindings
   */
  initialize() {
    const config = getProductConfig("trigger");
    const trig = this.trig;
    const stg = this.stg;
    const cpps = this.cpps;
    const invite = this.invite;
    const jrny = this.jrny;

    // Make sure intialize only happens once
    if (this.didInitialize) {
      return;
    }
    this.didInitialize = true;

    // At this point some new informations are available because a survey definition has been selected.
    // So the default properties for events can be enhanced.
    jrny.addEventsDefault("properties", {
      fs_defName: [trig.surveydef.name],
      fs_section: [trig.surveydef.section],
      fs_displayName: [invite.display.displayname],
      fs_displayTemplate: [invite.display.template],
      fs_pvInvited: [trig.pageViewCount],
      fs_language: [invite.locale],
      fs_samplePercentage: [trig.surveydef.criteria.sp.reg],
      fs_loyaltyFactor: [trig.surveydef.criteria.lf],
      fs_environment: [isProduction ? "production" : "staging"],
      fs_deployType: [isSelfHosted ? "on-prem" : "cloud"],
      fs_inviteType: ["intercept"],
      fs_triggerMethod: [this.triggerMethod],
    });

    // For tracking trigger method via CPPs
    cpps.set("TriggerMethod", this.triggerMethod);

    cpps.set("dn", invite.display.displayname);
    cpps.set("dt", invite.display.template);

    // Start loading the template and all that
    invite.loadResources(this.resourcesready);

    // Handle when the invite is declined
    invite.declined.subscribe(decline_type => {
      /* pragma:DEBUG_START */
      console.warn("trigger: user declined the invitation");
      /* pragma:DEBUG_END */

      // if there is a repeat days for the survey def, use it
      const rDays =
        isDefined(config.active_surveydef) && isDefined(config.active_surveydef.repeatDays)
          ? config.active_surveydef.repeatDays
          : config.config.repeatDays;

      // Set the invite not accepted flag
      stg.set("i", "d");
      stg.setMaxKeyExpiration(rDays.decline * 24 * 60 * 60 * 1000);

      // logging invite declined
      jrny.addEventObj({
        name: LOGGING.INVITE_DECLINED,
        properties: {
          action: [decline_type],
        },
      });

      // Fire the invite declines event
      Singletons.inviteDeclinedEmitter.fire(trig.surveydef, stg, config, cpps);

      // Stop transmitting and shut down the recorder if we are recording, but not if feedback recorder is present
      if (trig.surveydef.cxRecord && Singletons.rec && stg.get("fbr") != "y") {
        Singletons.rec.cancelRecord();
        trig.recordController = Singletons.rec = null;
      }
      Singletons.state.inviteSituation = "DECLINED";
    });

    // Handle when the invite is abandoned
    invite.abandoned.subscribe(() => {
      /* pragma:DEBUG_START */
      console.warn(
        `trigger: user abandoned the invitation. going to now wait ${Math.round(
          config.config.reinviteDelayAfterInviteAbandon / 1000
        )} seconds before possibly reinviting`
      );
      /* pragma:DEBUG_END */

      // Log that the user abandoned the invite
      jrny.addEventString(LOGGING.INVITE_ABANDONED);

      // Set the invite abandoned flag
      stg.set("i", "a");
      Singletons.state.inviteSituation = "ABANDONED";

      // Fire the public API event
      Singletons.inviteAbandonedEmitter.fire(trig.surveydef, stg, config, cpps);

      // Set the next time we can invite the user - in one hour
      stg.set("rw", currentTime() + config.config.reinviteDelayAfterInviteAbandon);
    });

    // Handle when the invite is accepted
    invite.accepted.subscribe((invitetype, userinfo) => {
      /* pragma:DEBUG_START */
      console.warn("trigger: user accepted the invitation");
      /* pragma:DEBUG_END */

      // if there is a repeat days for the survey def, use it
      const rDays =
        isDefined(config.active_surveydef) && isDefined(config.active_surveydef.repeatDays)
          ? config.active_surveydef.repeatDays
          : config.config.repeatDays;
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
        console.warn(
          "trigger: not activating cxReplay because ",
          !trig.surveydef.cxRecord ? "cxRecord flag turned off" : "no recorder present"
        );
        /* pragma:DEBUG_END */
      }

      jrny.initPopupId();

      // Log that the user accepted the invite
      jrny.addEventString(LOGGING.INVITE_ACCEPTED);

      // Set the invite accepted flag
      stg.set("i", "x");
      Singletons.state.inviteSituation = "ACCEPTED";

      // Set the invite accepted timestamp
      stg.set("ixw", currentTime());

      /* pragma:DEBUG_START */
      console.log("trigger: survey is of type", invitetype);
      /* pragma:DEBUG_END */

      // Switch on the invite type
      switch (invitetype) {
        case "TRACKER":
          // We'll need to launch the tracker
          trig.popTracker(invite);
          break;
        case "INSESSION":
          // Launch the survey directly
          trig.popSurvey();
          break;
        case "SMS":
        case "EMAIL":
        case "SMSEMAIL":
          // Initialize and begin the mobile heartbeat
          startMobileHB(trig, userinfo, invitetype);
          trig.stg.set("mhbi", {
            ui: userinfo,
            it: invitetype,
          });
          break;
        case "SHORTSURVEY":
          break;
        default:
          throw new Error(`Unknown inviteType: ${invitetype}`);
      }
    });
  }

  /**
   * Present the invite (separate from asset retrieval)
   */
  present() {
    const config = getProductConfig("trigger");
    const invite = this.invite;
    const stg = this.stg;
    const jrny = this.jrny;
    const trig = this.trig;
    const cpps = this.cpps;

    // Ensure that the invite only shows once
    if (!Singletons.state.didInvite) {
      Singletons.state.didInvite = true;
    } else {
      return;
    }

    this.resourcesready.subscribe(
      () => {
        let inviteDelay = config.config.inviteDelay;

        // If defined on the invite's display, override the product config
        if (invite.display.inviteDelay != null) {
          inviteDelay = invite.display.inviteDelay;
        }

        // Implement a trigger delay. Take into account all the accumulated time it took to get to this point.
        let idelay = Math.max(0, inviteDelay - (currentTime() - startTS));

        // SET THE DELAY TO 0 if SHORTSURVEY is presented
        if (invite.display.inviteType === "SHORTSURVEY") {
          idelay = stg.i === "p" ? 0 : idelay;
        }

        /* pragma:DEBUG_START */
        console.log(`trigger: delaying invite for ${idelay} ms`);
        /* pragma:DEBUG_END */

        setTimeout(() => {
          // Show the invite
          this.invite.present(this.browser);

          // Only fire events if we haven't presented the invite yet.
          if (stg.get("i") !== "p") {
            // Log that we showed the invite
            jrny.addEvent(LOGGING.INVITE_SHOWN);
          }

          stg.set("i", "p");
          Singletons.state.inviteSituation = "PRESENTED";
          // Signal the global event
          Singletons.inviteShownEmitter.fire(trig.surveydef, stg, config, cpps);
        }, idelay);
      },
      true,
      true
    );
  }
}

/**
 * This will be used down below to init and start the mobile heartbeat
 */
const startMobileHB = (trigger, userinfo, invitetype) => {
  /* pragma:DEBUG_START */
  console.log("trigger: initializing and starting the mobile heartbeat");
  /* pragma:DEBUG_END */

  const mh = new MobileHeartbeat(
    invitetype,
    getProductConfig("trigger"),
    trigger.surveydef,
    trigger.cpps,
    trigger.stg.get("rid"),
    trigger.locale
  );

  // Only init if we are on the first page -- if storage hasn't been set yet
  if (trigger.stg.get("mhbi")) {
    mh.beginHeartbeat();
  } else {
    mh.init(userinfo, () => {
      mh.beginHeartbeat();
    });
  }
};

/**
 * Get the best fitting display for a given survey definition
 * @param {Object} surveyDef
 * @param {Object} [displayoverride]
 * @param {String} [locale]
 * @param {Object} [browser]
 */
InviteSetup.getFittingDisplay = (surveyDef, displayoverride, locale, browser) => {
  locale = locale || Singletons.CPPS.get("locale") || "en";
  browser = browser || Singletons.browser;
  // currentDisplayType tells us if the display is desktop or mobile
  let currentDef = {};
  let oldinvite = {};
  let currentDisplayType;
  let displayLocale;
  let display;
  let i;

  if (browser.isMobile && surveyDef.display.mobile) {
    currentDisplayType = surveyDef.display.mobile;
  } else {
    currentDisplayType = surveyDef.display.desktop;
  }

  // Normalize the invite defs
  if (currentDisplayType) {
    for (i = 0; i < currentDisplayType.length; i++) {
      oldinvite = currentDef.dialog || {};
      currentDef = ext({}, currentDef);
      currentDef = ext(currentDef, currentDisplayType[i]);
      if (currentDisplayType[i].dialog && currentDef.dialog) {
        currentDef.dialog = ext(ext({}, oldinvite), currentDisplayType[i].dialog);
      }

      currentDisplayType[i] = currentDef;
    }
  }

  // Figure out which thing we're going to display
  if (displayoverride) {
    for (i = 0; i < currentDisplayType.length; i++) {
      if (currentDisplayType[i].displayname == displayoverride) {
        display = currentDisplayType[i];
        break;
      }
    }
  } else {
    display =
      currentDisplayType[Math.round(Math.random() * 999999999999) % currentDisplayType.length];
  }

  // Now apply the locales
  if (display.dialog.locales && display.dialog.locales[locale]) {
    displayLocale = display.dialog.locales[locale];

    /* pragma:DEBUG_START */
    console.warn("invite: applying locale to invite definition: ", displayLocale);
    /* pragma:DEBUG_END */

    display.dialog = ext(display.dialog, displayLocale);

    if (displayLocale.localeImages) {
      display = ext(display, displayLocale.localeImages);
    }
  }

  // Make sure there are some minimums
  return ext(
    {
      inviteLogo: "",
      trackerLogo: "",
      siteLogoAlt: "",
    },
    display
  );
};

export { getInviteSetupInstance, startMobileHB, InviteSetup };
