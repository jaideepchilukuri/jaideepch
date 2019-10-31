/**
 * The tracker class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { CPPS } from "./misc/cpps";
import {
  assetLocation,
  ext,
  getParam,
  isDefined,
  isSelfHosted,
  makeAssetURI,
  makeURI,
  toLowerCase,
  globalConfig as globalGlobalConfig,
} from "../fs/index";
import { Survey } from "../trigger/misc/survey";
import { Qualifier } from "./qualifier/qualifier";
import { Reminder } from "./reminder/reminder";
import { LOGGING } from "./top";
import {
  loadCSS,
  addClass,
  removeClass,
  Bind,
  FSEvent,
  getSize,
  Async,
  Journey,
  getRootDomain,
  TemplateFetcher,
  APPID,
} from "../utils/utils";

/**
 * Constructor for a new tracker instance
 * @param browser {Browser}
 * @param stg {FSStorage}
 * @param trackerdata {Object} The definition for the tracker
 * @constructor
 */
class Tracker {
  constructor(browser, stg, trackerdata) {
    /* pragma:DEBUG_START */
    console.warn("tracker: constructor setup");
    /* pragma:DEBUG_END */

    const cfg = trackerdata.cfg.config;
    const globalConfig = trackerdata.cfg.globalConfig;

    // make sure other parts of the system have the global
    // config settings from the main window.
    for (const key in globalConfig) {
      globalGlobalConfig[key] = globalConfig[key];
    }

    this.br = browser;
    this.stg = stg;
    this.data = trackerdata;
    this._stage = 1;

    this.jrny = new Journey({
      customerId: globalConfig.customerId || getRootDomain() || "tracker_customerId",
      appId: APPID.TRIGGER,
      stg,
      browser,
      throttleDuration: 50,
      useSessionId: false,
      usePopupId: true,
    });
    this.jrny.config = globalConfig;

    const surveydef = this.data.cfg.active_surveydef;

    this.jrny.addEventsDefault("properties", {
      fs_site: [getRootDomain()],
      fs_repeatDaysAccept: [cfg.repeatDays.accept],
      fs_repeatDaysDecline: [cfg.repeatDays.decline],
      fs_reinviteDelayAfterInviteAbandon: [cfg.reinviteDelayAfterInviteAbandon],
      fs_defName: [surveydef.name],
      fs_section: [surveydef.section],
      fs_displayName: [this.data.display.displayname],
      fs_displayTemplate: [this.data.display.template],
      fs_language: [surveydef.locale],
      fs_samplePercentage: [surveydef.criteria.sp.reg],
      fs_loyaltyFactor: [surveydef.criteria.lf],
    });

    // Set up the cpps interface
    this.cpps = new CPPS(this.stg);
    this.cpps.config = globalConfig;
    ext(this.cpps._extras, trackerdata.cpps);

    // Get the template
    this._loadResources(() => {
      /* pragma:DEBUG_START */
      console.warn("tracker: got resources");
      /* pragma:DEBUG_END */

      // Get rid of any activity indicator
      document.documentElement.style.backgroundImage = "none";

      // Signal ready
      this.ready.fire();

      if (!this.br.isIE) {
        // Watch for changes to heartbeat
        stg.onCommit.subscribe(() => {
          const pagehb = stg.get("page_hb");

          if (!pagehb) {
            // Stop listening
            stg.onCommit.unsubscribeAll();

            /* pragma:DEBUG_START */
            console.warn("tracker: page heartbeat expired", stg._data);
            /* pragma:DEBUG_END */

            // Convert the survey
            this.launchSurveyOrQualifier();
            if (!this.data.display.removeSurveyAlerts) {
              // Bring it forward
              setTimeout(() => {
                const agt = toLowerCase(navigator.userAgent);
                if (
                  agt.indexOf("msie") == -1 &&
                  agt.indexOf("edge") == -1 &&
                  agt.indexOf("firefox") == -1 &&
                  this.data.display.dialog
                ) {
                  // eslint-disable-next-line no-alert
                  alert(this.data.display.dialog.surveyavailable);
                }
              }, 200);
            }
          }
        });
      }
    });

    // The ready event
    this.ready = new FSEvent();
  }

  /**
   * Updates Tracker with new browser and storage values
   * @param browser
   * @param stg
   * @param trackerdata
   */
  update(browser, stg, trackerdata) {
    this.br = browser;
    this.stg = stg;
    this.data = trackerdata;
  }

  /**
   * Setting some cpps
   * @param cppsobj
   */
  setCPPS(cppsobj) {
    if (cppsobj) {
      this.jrny.addEventsDefault("properties", {
        fs_pvInvited: [cppsobj.pv],
      });

      for (const cpp in cppsobj) {
        /* pragma:DEBUG_START */
        console.log("tracker: setting CPP", cpp, cppsobj[cpp]);
        /* pragma:DEBUG_END */
        this.cpps.set(cpp, cppsobj[cpp]);
      }
    }
  }

  /**
   * Retrieve the template and stylesheet
   * @param cb (Function) callback on complete
   */
  _loadResources(cb) {
    /* pragma:DEBUG_START */
    console.log("tracker: loading resources", this.data);
    /* pragma:DEBUG_END */

    // Catch doomsday scenario
    if (!this.data || !this.data.template || typeof this.data.template != "string") {
      return;
    }

    let templateName = this.data.template;
    const isCustom = templateName.indexOf("@") > -1;
    let cssfilename = makeURI(`templates/trigger/${templateName}/main.css`);
    let templatefilename = makeURI(`templates/trigger/${templateName}/tracker.html`);
    let qualifierfilename = makeURI(`templates/trigger/${templateName}/qualifier.html`);
    let reminderfilename = makeURI(`templates/trigger/${templateName}/reminder.html`);
    const rootURL = getParam("gw");

    if (isCustom) {
      templateName = templateName.substr(1);
      if (isSelfHosted) {
        cssfilename = makeAssetURI(`trigger/templates/${templateName}/main.css`);
        templatefilename = makeAssetURI(`trigger/templates/${templateName}/tracker.html`);
        qualifierfilename = makeAssetURI(`trigger/templates/${templateName}/qualifier.html`);
        reminderfilename = makeAssetURI(`trigger/templates/${templateName}/reminder.html`);
      } else {
        cssfilename = rootURL.replace(/__gwtest__/g, `templates/${templateName}/main.css`);
        templatefilename = rootURL.replace(/__gwtest__/g, `templates/${templateName}/tracker.html`);
        qualifierfilename = rootURL.replace(
          /__gwtest__/g,
          `templates/${templateName}/qualifier.html`
        );
        reminderfilename = rootURL.replace(
          /__gwtest__/g,
          `templates/${templateName}/reminder.html`
        );
      }
    }

    // Set up an async queue
    this.queue = new Async(
      true,
      () => {
        /* pragma:DEBUG_START */
        console.warn("tracker: fetched all resources");
        /* pragma:DEBUG_END */
        if (cb) {
          return cb();
        }
      },
      () => {
        /* pragma:DEBUG_START */
        console.warn("tracker: failed to fetch resources");
        /* pragma:DEBUG_END */
      }
    );

    // Queue up the css retrieval
    this.queue.enqueue(prom => {
      /* pragma:DEBUG_START */
      console.log("tracker: getting css");
      /* pragma:DEBUG_END */
      loadCSS(
        cssfilename,
        linkel => {
          /* pragma:DEBUG_START */
          console.warn("tracker: got the css");
          /* pragma:DEBUG_END */
          this._cssLink = linkel;
          if (prom) {
            prom.resolve();
          }
        },
        null,
        this.br
      );
    });

    // Grab the template
    this.queue.enqueue(prom => {
      /* pragma:DEBUG_START */
      console.log("tracker: getting tracker template");
      /* pragma:DEBUG_END */
      const tr = new TemplateFetcher({
        success: dta => {
          /* pragma:DEBUG_START */
          console.log("tracker: got tracker template");
          /* pragma:DEBUG_END */
          this.templatehtml = dta;
          if (prom) {
            prom.resolve();
          }
        },
      });
      tr.get(templatefilename);
    });

    // Grab the template
    this.queue.enqueue(prom => {
      /* pragma:DEBUG_START */
      console.log("tracker: getting qualifier template");
      /* pragma:DEBUG_END */
      const tr = new TemplateFetcher({
        success: dta => {
          /* pragma:DEBUG_START */
          console.log("tracker: got qualifier template");
          /* pragma:DEBUG_END */
          this.qualhtml = dta;
          if (prom) {
            prom.resolve();
          }
        },
      });
      tr.get(qualifierfilename);
    });

    // Grab the Reminder Template
    this.queue.enqueue(prom => {
      /* pragma:DEBUG_START */
      console.log("tracker: getting reminder template");
      /* pragma:DEBUG_END */
      const tr = new TemplateFetcher({
        success: dta => {
          /* pragma:DEBUG_START */
          console.log("tracker: got reminder template");
          /* pragma:DEBUG_END */
          this.rmdrhtml = dta;
          if (prom) {
            prom.resolve();
          }
        },
      });
      tr.get(reminderfilename);
    });
  }

  /**
   * Render the template from the data
   */
  renderTemplate() {
    /* pragma:DEBUG_START */
    console.log(
      `"tracker: current mid: "${new Survey(
        this.data.cfg,
        this.cpps,
        this.data.cfg.active_surveydef,
        this.qualifier
      ).getMeasureId()}`,
      '"'
    );
    console.warn("tracker: rendering data to template", this.data);
    /* pragma:DEBUG_END */
    // Normalize the inviteType
    const setHtmlLang = this.data.cfg.active_surveydef.language.locale || "en";

    this.data.display.inviteType = this.data.display.inviteType.toUpperCase();
    // Merge the options with a larger object
    const displayopts = ext(
      {
        copyrightDate: new Date().getFullYear().toString(),
        supportsSVG: document.implementation.hasFeature(
          "http://www.w3.org/TR/SVG11/feature#BasicStructure",
          "1.1"
        ),
      },
      this.data.display,
      this.data.cfg.config
    );
    const rootURL = getParam("gw");

    if (displayopts.trackerLogo && displayopts.trackerLogo.length) {
      if (isDefined(assetLocation) && assetLocation != "undefined") {
        displayopts.trackerLogo = makeAssetURI(`trigger/${displayopts.trackerLogo}`);
      } else {
        displayopts.trackerLogo = rootURL.replace(/__gwtest__/g, displayopts.trackerLogo);
      }
    }

    // For new tracker only
    if (displayopts.trackerBanner && displayopts.trackerBanner.length) {
      if (isDefined(assetLocation) && assetLocation != "undefined") {
        displayopts.trackerBanner = makeAssetURI(`trigger/${displayopts.trackerBanner}`);
      } else {
        displayopts.trackerBanner = rootURL.replace(/__gwtest__/g, displayopts.trackerBanner);
      }
    }

    if (displayopts.vendorLogo && displayopts.vendorLogo.length) {
      displayopts.vendorLogo = makeAssetURI(displayopts.vendorLogo);
    }
    if (displayopts.vendorLogoPNG && displayopts.vendorLogoPNG.length) {
      displayopts.vendorLogoPNG = makeAssetURI(displayopts.vendorLogoPNG);
    }
    if (displayopts.trusteLogo && displayopts.trusteLogo.length) {
      displayopts.trusteLogo = makeAssetURI(displayopts.trusteLogo);
    }

    displayopts.loadImg = makeURI("loadimg.gif");

    // Keep track of the display options
    this._displayOpts = displayopts;

    // Set the title
    document.title = displayopts.dialog.trackerTitle;

    // Render the template to a string
    document.body.innerHTML = this.templatehtml(displayopts);

    // Set the language for html
    document.documentElement.setAttribute("lang", setHtmlLang);

    // Run the sizing
    this._doSizing();

    // Set up the convert
    if (!this._cvTimeout) {
      this._cvTimeout = setTimeout(() => {
        this._stage = 2;
        this._convertTracker();
      }, this.data.cfg.config.trackerConvertsAfter);
    } else if (this._stage == 2) {
      this._convertTracker();
    }

    // Bind to resize
    Bind(window, "tracker:resize", () => {
      // Run the sizing
      this._doSizing();
    });

    // Log that the tracker was shown
    this.jrny.addEventString(LOGGING.TRACKER_SHOWN);
  }

  /**
   * Handle any layout stuff
   * @private
   */
  _doSizing() {
    // Do any fill commands
    const fillels = document.querySelectorAll("*[acsfill=true]");
    const wn = getSize(window);

    if (fillels) {
      for (let i = 0; i < fillels.length; i++) {
        const fe = fillels[i];
        const ofl = fe.offsetLeft;
        const eft = fe.offsetTop;

        fe.style.height = `${wn.h - eft - ofl * 1}px`;
      }
    }

    // Do any vertical centering
    const vertcent = document.querySelectorAll("*[acscentervertically=true]");
    if (vertcent) {
      for (let c = 0; c < vertcent.length; c++) {
        const fe2 = vertcent[c];
        const ofl2 = fe2.offsetHeight;
        const ph = fe2.parentNode.offsetHeight;

        fe2.style.marginTop = `${(ph - ofl2) / 2}px`;
      }
    }
  }

  /**
   * Convert the tracker to ready-mode
   * @private
   */
  _convertTracker() {
    const initials = document.querySelectorAll(".initialContent");
    let i;
    for (i = 0; i < initials.length; i++) {
      addClass(initials[i], "acsNoDisplay fsrNoDisplay");
    }

    const laters = document.querySelectorAll(".showLater");
    for (i = 0; i < laters.length; i++) {
      addClass(laters[i], "acsDisplay fsrDisplay");
    }

    // Run the sizing
    this._doSizing();

    // Add the active class
    addClass(document.body, "acsActiveTracker");

    // The button activator
    const activatebuttons = document.querySelectorAll("*[acsactivatebutton=true], .fsrBeginSurvey");

    const cfunc = () => {
      // Log that the tracker was clicked
      this.jrny.addEventString(LOGGING.TRACKER_CLICKED);

      this.launchSurveyOrQualifier();
    };

    const cfuncKey = e => {
      const keyCode = window.event ? e.which : e.keyCode;
      if (keyCode === 13) {
        cfunc();
      }
    };

    for (i = 0; i < activatebuttons.length; i++) {
      Bind(activatebuttons[i], "click", cfunc);
      Bind(activatebuttons[i], "keydown", cfuncKey);
    }
  }

  /**
   * Launch the survey or the qualifier
   */
  launchSurveyOrQualifier() {
    if (this._cvTimeout) {
      clearTimeout(this._cvTimeout);
      this._cvTimeout = null;
    }
    const laters = document.querySelectorAll("*[acsshowwhenloading=true]");
    for (let i = 0; i < laters.length; i++) {
      addClass(laters[i], "acsDisplay");
    }
    const allelse = document.querySelectorAll("*[acshidewhenloading=true]");
    for (let s = 0; s < allelse.length; s++) {
      removeClass(allelse[s], "acsDisplay");
      addClass(allelse[s], "acsNoDisplay");
    }

    const qual = this.data.cfg.active_surveydef.qualifier;
    const rmdr = this.data.cfg.active_surveydef.reminder;

    const isModern = !!document.querySelector("main.fsrTracker");
    if (qual && qual.useQualifier) {
      if (isModern) {
        /* pragma:DEBUG_START */
        console.error(
          'tracker: WebSDK\'s qualifier skipped. The modern tracker lets survey handle the "qualifier" feature.'
        );
        /* pragma:DEBUG_END */
        this.goToSurvey();
      } else {
        this.goToQualifier();
      }
    } else if (rmdr && rmdr.useReminder) {
      this.goToReminder();
    } else {
      this.goToSurvey();
    }
  }

  /**
   * Present the qualifier
   */
  goToQualifier() {
    this.qualifier = new Qualifier(
      this.br,
      this.cpps,
      this.data,
      this.data.cfg.active_surveydef.qualifier,
      this.qualhtml,
      this._displayOpts
    );

    // Qualified
    this.qualifier.qualified.subscribe(
      () => {
        this.jrny.addEventString(LOGGING.QUALIFIER_ACCEPTED);
        /* pragma:DEBUG_START */
        console.log("tracker: qualified - going to survey");
        /* pragma:DEBUG_END */
        this.goToSurvey();
      },
      true,
      false
    );

    // Disqualified
    this.qualifier.disqualified.subscribe(
      () => {
        this.jrny.addEventString(LOGGING.QUALIFIER_DECLINED);
        /* pragma:DEBUG_START */
        console.warn("tracker: disqualified");
        /* pragma:DEBUG_END */
      },
      true,
      false
    );
    this.qualifier.render();

    this.jrny.addEventString(LOGGING.QUALIFIER_SHOWN);
  }

  goToReminder() {
    this.reminder = new Reminder(
      this.br,
      this.cpps,
      this.data,
      this.data.cfg.active_surveydef.reminder,
      this.rmdrhtml,
      this._displayOpts
    );

    this.reminder.accepted.subscribe(
      () => {
        this.jrny.addEventString(LOGGING.REMINDER_ACCEPTED);
        /* pragma:DEBUG_START */
        console.log("tracker: reminder accepted - going to survey");
        /* pragma:DEBUG_END */
        this.goToSurvey();
      },
      true,
      false
    );
    this.reminder.render();

    this.jrny.addEventString(LOGGING.REMINDER_SHOWN);
  }

  /**
   * Go to the actual survey
   */
  goToSurvey() {
    const surv = new Survey(
      this.data.cfg,
      this.cpps,
      this.data.cfg.active_surveydef,
      this.qualifier
    );
    const svurl = surv.getUrl();

    /* pragma:DEBUG_START */
    console.log(`tracker: sending user to ${svurl}`);
    /* pragma:DEBUG_END */

    // Make the window a little larger
    window.resizeBy(0, 200);

    // Focus the window
    window.focus();

    // After a brief pause, launch the survey
    setTimeout(() => {
      // Run the sizing
      this._doSizing();
      window.location = svurl;
    }, 100);
  }
}

export { Tracker };
