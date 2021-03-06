/**
 * Custom Pass Parameters Library
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Singletons } from "./top";
import { globalConfig, ext, isDefined, hasProp } from "../fs/index";
import { Survey } from "./misc/survey";
import { Tracker } from "./misc/tracker";
import { getInviteSetupInstance } from "./invitesetup";
import { popup } from "./misc/popup";
import {
  Unbind,
  FSEvent,
  INT,
  retrieveNestedVariable,
  getRootDomain,
  getBrainStorage,
  Cookie,
} from "../utils/utils";

/**
 * The triggering library
 * @param stg (GlobalStorage)
 * @param cfg (Config)
 * @param browser (Browser)
 * @param crit (Criteria)
 * @param cpps (CPPS)
 * @constructor
 */
class Trigger {
  constructor(stg, cfg, browser, crit, cpps, jrny) {
    this.stg = stg;
    this.cfg = cfg;
    this.browser = browser;
    this.crit = crit;
    this.cpps = cpps;
    this.jrny = jrny;
    let cppsToSet;
    let cppKey;
    const adobeRsid = globalConfig.adobeRsid;

    // First see if we are brand new
    if (!stg.get("pv")) {
      // Set the search terms
      cppsToSet = {
        browser: `${browser.browser.name} ${browser.browser.version}`,
        os: browser.os.name,
        referrer: document.referrer.toString(),
        site: getRootDomain(),
        sitekey: globalConfig.siteKey || "",
      };

      for (cppKey in cppsToSet) {
        if (hasProp(cppsToSet, cppKey)) {
          cpps.set(cppKey, cppsToSet[cppKey]);
        }
      }

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
    }

    this.heartbeatExpired = new FSEvent();
  }

  /**
   * Does this user pass the remaining criteria?
   */
  doesPassCriteria() {
    const crit = this.crit;
    const cfg = this.cfg;
    const state = Singletons.state;
    const dpmc = "DIDNOTPASSCRITERIA";
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
  }

  /**
   * Launch the tracker window
   */
  popTracker(invite) {
    /* pragma:DEBUG_START */
    console.warn("trigger: popping tracker");
    /* pragma:DEBUG_END */
    const ctx = this;

    // Set the invite accepted flag. We do this in case the tracker was popped another way
    this.stg.set("i", "x");
    Singletons.state.inviteSituation = "ACCEPTED";

    this.didPopTrackerAlready = this.stg.get("tp") == "y";
    Singletons.state.didInvite = true;

    if (!this.didPopTrackerAlready) {
      this.stg.set("tp", "y");
      /**
       * This function finishes all the tracker setup
       */
      const finishTrackerSetup = () => {
        ctx.tracker = new Tracker(
          invite.template,
          ctx.surveydef,
          this.cfg,
          getBrainStorage(ctx.browser, ctx.stg.uid),
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
        const wref = popup(
          "about:blank",
          "fsTracker",
          {
            width: 700,
            height: 400,
          },
          this.browser,
          true,
          this.cfg.config.centerTrackerPopup
        );
        // Start setting up the invite
        getInviteSetupInstance(
          this,
          ctx.browser,
          ctx.stg,
          ctx.cpps,
          false,
          ctx.jrny,
          "Traditional",
          function() {
            /* pragma:DEBUG_START */
            console.log("trigger: finished after-the-fact invitation setup");
            /* pragma:DEBUG_END */
            ctx.tracker = new Tracker(
              this.invite.template,
              ctx.surveydef,
              this.cfg,
              getBrainStorage(ctx.browser, ctx.stg.uid),
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
              console.warn(
                "trigger: not activating cxReplay because ",
                !ctx.surveydef.cxRecord ? "cxRecord flag turned off" : "no recorder present"
              );
              /* pragma:DEBUG_END */
            }
          }
        );
      }
    } else {
      /* pragma:DEBUG_START */
      console.warn("trigger: did not pop tracker because it was already popped");
      /* pragma:DEBUG_END */
    }
  }

  /**
   * Check if we are OK to display the invitation (just by checking invite exclude)
   */
  canDisplayInvitation() {
    return this.crit._match(this.cfg.config, this.browser, "inviteExclude");
  }

  /**
   * Launch the survey in a new window
   */
  popSurvey(serverStatus) {
    // Set the invite accepted flag. We do this incase the tracker was popped another way
    this.stg.set("i", "x");
    Singletons.state.inviteSituation = "ACCEPTED";

    this.didPopTrackerAlready = this.stg.get("tp") == "y";
    Singletons.state.didInvite = true;

    if (!this.didPopTrackerAlready) {
      /* pragma:DEBUG_START */
      console.warn("trigger: popping survey");
      /* pragma:DEBUG_END */
      this.stg.set("tp", "y");
      const sv = new Survey(this.cfg, this.cpps, this.surveydef, null, serverStatus);
      const svurl = sv.getUrl();
      popup(
        svurl,
        "acsSurvey",
        {
          width: 700,
          height: 400,
        },
        this.browser,
        false,
        this.cfg.config.centerTrackerPopup
      );
    } else if (this.stg && this.stg.get("page_hb")) {
      // If a "tracker" window is opened, set/move it to the survey.
      // Note: Only tracker windows use the page heartbeat atm.

      /* pragma:DEBUG_START */
      console.warn("trigger: we already have a tracker");
      /* pragma:DEBUG_END */

      getBrainStorage(this.browser, this.stg.uid).set(
        "trackercmd",
        {
          method: "survey",
        },
        60000,
        true
      );
    } else {
      /* pragma:DEBUG_START */
      console.warn("trigger: we already have a survey");
      /* pragma:DEBUG_END */
    }
  }

  /**
   * Initialize the trigger
   */
  init() {
    // Identify the survey def that applies to this path
    const defs = this.cfg.surveydefs;
    let i;
    let _prev;
    let def;
    let olddef = this.stg.get("def");

    // First, loop over all the definitions and copy missing attributes from earlier ones to later ones.
    for (i = 0; i < defs.length; i++) {
      def = defs[i];
      if (_prev) {
        def = ext(_prev, def);
        if (!defs[i].site && _prev.site) {
          delete def.site;
        }
        if (!defs[i].section && _prev.section) {
          delete def.section;
        }
        defs[i] = def;
      }
      _prev = ext({}, def);
    }

    // See if the old def is no longer valid
    if (isDefined(olddef) && parseInt(olddef, 10) > defs.length - 1) {
      /* pragma:DEBUG_START */
      console.warn(
        "trigger: the def index found in storage is invalid w the current available definitions",
        olddef,
        defs
      );
      /* pragma:DEBUG_END */
      olddef = undefined;
    }

    /* pragma:DEBUG_START */
    console.warn("trigger: beginning init with config:", this.cfg);
    console.warn(
      `trigger: reviewing surveydefs (${this.cfg.surveydefs.length}):`,
      this.cfg.surveydefs
    );
    /* pragma:DEBUG_END */

    // First let's examine the storage to see if we'd previously selected a definition
    if (
      !isDefined(olddef) ||
      defs[parseInt(olddef, 10)].selectMode == "default" ||
      defs[parseInt(olddef, 10)].selectMode == "pin"
    ) {
      // Loop over the defs and choose one, hopefully
      for (
        i = 0;
        i <
        (isDefined(olddef) && defs[parseInt(olddef, 10)].selectMode != "default"
          ? parseInt(olddef, 10) + 1
          : defs.length);
        i++
      ) {
        def = defs[i];

        // if pin is selected OR survey def is matched
        if (
          (isDefined(olddef) &&
            olddef == i &&
            defs[parseInt(olddef, 10)].selectMode != "default") ||
          this.crit._match(def, this.browser)
        ) {
          // only overwrite the survey def if the user has already been invited
          if (this.stg.get("i") === "x") {
            this.stg.set("def", i, this.cfg.config.surveyDefResetTimeout || 24 * 60 * 60 * 1000);
          }

          /* pragma:DEBUG_START */
          console.warn(`trigger: found matching surveydef (${i}):`, def);
          /* pragma:DEBUG_END */

          def.index = i;
          this.cfg.active_surveydef = def;
          this.surveydef = def;

          // Set up the locale for this surveydef
          this.locale = this._initLocale();
          this.cpps.set("locale", this.locale);

          // For active surveys we need to add section if it exists
          if (def.section) {
            this.cpps.set("section", def.section);
          }

          // Keep track of which definition we are using
          this.inviteIndex = i;

          // Spit out the definition
          return def;
        }
      }
    } else if (isDefined(olddef) || defs[parseInt(olddef, 10)].selectMode == "lock") {
      // We are locked to an old definition
      def = defs[parseInt(olddef, 10)];
      /* pragma:DEBUG_START */
      console.warn(`trigger: we are locked to def #${parseInt(olddef, 10) + 1}: `, def);
      /* pragma:DEBUG_END */

      this.cfg.active_surveydef = def;
      this.surveydef = def;

      // Set up the locale for this surveydef
      this.locale = this._initLocale();
      this.cpps.set("locale", this.locale);

      // For active surveys we need to add section if it exists
      if (def.section) {
        this.cpps.set("section", def.section);
      }

      // Spit out the definition
      return def;
    }

    if (isDefined(olddef) && this.isTrackerAlive()) {
      def = defs[parseInt(olddef, 10)];

      // init a Tracker object to start the heartbeats
      this.tracker = new Tracker(
        null,
        def,
        this.cfg,
        getBrainStorage(this.browser, this.stg.uid),
        this.cpps,
        null,
        this.browser
      );

      return def;
    }

    return false;
  }

  /**
   * Set up the true conversion feature
   */
  _initLocale() {
    const def = this.surveydef;
    const lc = def.language;
    let val;
    if (isDefined(lc.src) && isDefined(lc.locales)) {
      switch (lc.src) {
        case "variable":
          if (isDefined(lc.name)) {
            val = retrieveNestedVariable(window, lc.name);
          }
          break;
        case "cookie":
          if (isDefined(lc.name)) {
            const ck = new Cookie({});
            val = ck.get(lc.name);
          }
          break;
        case "url":
          {
            const ll = lc.locales;
            if (isDefined(ll)) {
              for (let j = 0, len = ll.length; j < len; j++) {
                if (
                  isDefined(ll[j].locale) &&
                  isDefined(ll[j].match) &&
                  location.href.match(ll[j].match)
                ) {
                  //return the locale within this inner list of locales, and avoid the for loop further down
                  this.locale = ll[j].locale;
                  if (ll[j].criteria) {
                    ext(this.surveydef.criteria, ll[j].criteria);
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
          }
          break;
        default:
          throw new Error(`Unknown locale src: ${lc.src}`);
      }
      if (val) {
        for (let i = 0; i < lc.locales.length; i++) {
          if (lc.locales[i].match == val) {
            lc.locale = lc.locales[i].locale;
            if (lc.locales[i].criteria) {
              ext(this.surveydef.criteria, lc.locales[i].criteria);
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
  }

  isTrackerAlive() {
    return isDefined(this.stg.get("tracker_hb"));
  }

  /**
   * Cancel and stop the tracker
   */
  cancelTracker() {
    /* pragma:DEBUG_START */
    console.warn("trigger: cancelTracker()");
    /* pragma:DEBUG_END */

    getBrainStorage(this.browser, this.stg.uid).set(
      "trackercmd",
      {
        method: "close",
      },
      60000,
      true
    );

    /* pragma:DEBUG_START */
    console.warn("trigger: setting invite situation to 'abandon'.");
    /* pragma:DEBUG_END */

    // Set invite situation to 'abandon' to stop trigger from running on subsequent pages
    this.stg.set("i", "a");
    Singletons.state.inviteSituation = "ABANDONED";

    if (isDefined(this.tracker)) {
      clearInterval(this.tracker._heartbeat);
    }
  }

  /**
   * Log any state changes, like page views
   */
  logState() {
    // Boost page views
    this.pageViewCount = (this.stg.get("pv") || 0) + 1;
    this.stg.set(
      "pv",
      this.pageViewCount,
      this.cfg.config.pageViewsResetTimeout || 24 * 60 * 60 * 1000
    );
  }

  /**
   * Log any state changes, like page views
   */
  logDefState() {
    // Boost surveydef-specific page views
    if (this.surveydef) {
      let lfName = this.surveydef.name;
      lfName += this.surveydef.section || "";
      lfName += this.surveydef.site || "";

      this.defPageViewCount = (this.stg.get(`${lfName}pv`) || 0) + 1;
      this.stg.set(
        `${lfName}pv`,
        this.defPageViewCount,
        this.cfg.config.pageViewsResetTimeout || 24 * 60 * 60 * 1000
      );
    }
  }

  /**
   * Evaluate the loyalty factor and sampling rate
   * @param {String} critBlock criteria/mouseoff, which surveydef loyalty to check
   */
  evalLoyaltySampling(critBlock) {
    const def = this.surveydef;
    const criteria = def[critBlock] || def.criteria;
    const product = critBlock === "mouseoff" ? "mouseoff" : "trigger";
    const pool = this.stg.get("pl");
    const sp =
      !isDefined(pool) || pool == 1 ? criteria.sp.reg || 0 : criteria.sp.outreplaypool || 0;
    const rnum = Math.random() * 100;

    if (this.defPageViewCount >= criteria.lf && rnum <= sp) {
      /* pragma:DEBUG_START */
      console.warn(
        `${product}: DID meet the random sampling dice throw, max `,
        sp,
        "was",
        rnum,
        "defPageViewCount",
        this.defPageViewCount,
        "vs loyalty factor",
        criteria.lf
      );
      /* pragma:DEBUG_END */
      return true;
    }

    /* pragma:DEBUG_START */
    console.warn(
      `${product}: did NOT meet minimum sampling dice throw, max `,
      sp,
      "was",
      rnum,
      criteria.sp,
      "pool = ",
      pool,
      "page views: ",
      this.defPageViewCount,
      "min: ",
      criteria.lf,
      criteria
    );
    /* pragma:DEBUG_END */
    return false;
  }

  /**
   * Do a complete teardown of this trigger instance. This includes disposing of any dependencies
   */
  dispose() {
    if (!this.disposed) {
      /* pragma:DEBUG_START */
      console.warn("trigger: disposing");
      /* pragma:DEBUG_END */
      // Do emergency commit of storage
      this.stg.save(true);

      this.disposed = true;
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
      Unbind("trigger:*");
    }
  }
}

export { Trigger };
