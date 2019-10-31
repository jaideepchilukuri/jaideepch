/**
 * The tracker class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Constructor for a new tracker instance
 * @param browser {Browser}
 * @param stg {FSStorage}
 * @param trackerdata {Object} The definition for the tracker
 * @constructor
 */
var Tracker = function(browser, stg, trackerdata) {
  /* pragma:DEBUG_START */
  console.warn("tracker: constructor setup");
  /* pragma:DEBUG_END */

  var cfg = trackerdata.cfg.config;

  this.br = browser;
  this.stg = stg;
  this.data = trackerdata;
  this._stage = 1;

  this.jrny = new utils.Journey({
    customerId: cfg.id || utils.getRootDomain() || "tracker_customerId",
    appId: utils.APPID.TRIGGER,
    stg: stg,
    browser: browser,
    throttleDuration: 50,
    useSessionId: false,
    usePopupId: true,
  });
  this.jrny.config = this.data.cfg.globalConfig;

  var surveydef = this.data.cfg.active_surveydef;

  this.jrny.addEventsDefault("properties", {
    fs_site: [utils.getRootDomain()],
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
  this.cpps.config = this.data.cfg.globalConfig;
  fs.ext(this.cpps._extras, trackerdata.cpps);

  // Get the template
  this._loadResources(
    function() {
      /* pragma:DEBUG_START */
      console.warn("tracker: got resources");
      /* pragma:DEBUG_END */

      // Get rid of any activity indicator
      document.documentElement.style.backgroundImage = "none";

      // Signal ready
      this.ready.fire();

      if (!this.br.isIE) {
        // Watch for changes to heartbeat
        stg.onCommit.subscribe(
          function() {
            var pagehb = stg.get("page_hb");

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
                setTimeout(
                  function() {
                    var agt = fs.toLowerCase(navigator.userAgent);
                    if (
                      agt.indexOf("msie") == -1 &&
                      agt.indexOf("edge") == -1 &&
                      agt.indexOf("firefox") == -1 &&
                      this.data.display.dialog
                    ) {
                      alert(this.data.display.dialog.surveyavailable);
                    }
                  }.bind(this),
                  200
                );
              }
            }
          }.bind(this)
        );
      }
    }.bind(this)
  );

  // The ready event
  this.ready = new utils.FSEvent();
};

/**
 * Updates Tracker with new browser and storage values
 * @param browser
 * @param stg
 * @param trackerdata
 */
Tracker.prototype.update = function(browser, stg, trackerdata) {
  this.br = browser;
  this.stg = stg;
  this.data = trackerdata;
};

/**
 * Setting some cpps
 * @param cppsobj
 */
Tracker.prototype.setCPPS = function(cppsobj) {
  if (cppsobj) {
    this.jrny.addEventsDefault("properties", {
      fs_pvInvited: [cppsobj.pv],
    });

    for (var cpp in cppsobj) {
      /* pragma:DEBUG_START */
      console.log("tracker: setting CPP", cpp, cppsobj[cpp]);
      /* pragma:DEBUG_END */
      this.cpps.set(cpp, cppsobj[cpp]);
    }
  }
};

/**
 * Retrieve the template and stylesheet
 * @param cb (Function) callback on complete
 */
Tracker.prototype._loadResources = function(cb) {
  /* pragma:DEBUG_START */
  console.log("tracker: loading resources", this.data);
  /* pragma:DEBUG_END */

  // Catch doomsday scenario
  if (!this.data || !this.data.template || typeof this.data.template != "string") {
    return;
  }

  var templateName = this.data.template,
    isCustom = templateName.indexOf("@") > -1,
    cssfilename = fs.makeURI("templates/trigger/" + templateName + "/main.css"),
    templatefilename = fs.makeURI("templates/trigger/" + templateName + "/tracker.html"),
    qualifierfilename = fs.makeURI("templates/trigger/" + templateName + "/qualifier.html"),
    reminderfilename = fs.makeURI("templates/trigger/" + templateName + "/reminder.html"),
    rootURL = fs.getParam("gw");

  if (isCustom) {
    templateName = templateName.substr(1);
    if (fs.isSelfHosted) {
      cssfilename = fs.makeAssetURI("trigger/templates/" + templateName + "/main.css");
      templatefilename = fs.makeAssetURI("trigger/templates/" + templateName + "/tracker.html");
      qualifierfilename = fs.makeAssetURI("trigger/templates/" + templateName + "/qualifier.html");
      reminderfilename = fs.makeAssetURI("trigger/templates/" + templateName + "/reminder.html");
    } else {
      cssfilename = rootURL.replace(/__gwtest__/g, "templates/" + templateName + "/main.css");
      templatefilename = rootURL.replace(
        /__gwtest__/g,
        "templates/" + templateName + "/tracker.html"
      );
      qualifierfilename = rootURL.replace(
        /__gwtest__/g,
        "templates/" + templateName + "/qualifier.html"
      );
      reminderfilename = rootURL.replace(
        /__gwtest__/g,
        "templates/" + templateName + "/reminder.html"
      );
    }
  }

  // Set up an async queue
  this.queue = new utils.Async(
    true,
    function() {
      /* pragma:DEBUG_START */
      console.warn("tracker: fetched all resources");
      /* pragma:DEBUG_END */
      if (cb) {
        cb();
      }
    }.bind(this),
    function() {
      /* pragma:DEBUG_START */
      console.warn("tracker: failed to fetch resources");
      /* pragma:DEBUG_END */
    }.bind(this)
  );

  // Queue up the css retrieval
  this.queue.enqueue(
    function(prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting css");
      /* pragma:DEBUG_END */
      utils.loadCSS(
        cssfilename,
        function(linkel) {
          /* pragma:DEBUG_START */
          console.warn("tracker: got the css");
          /* pragma:DEBUG_END */
          this._cssLink = linkel;
          if (prom) {
            prom.resolve();
          }
        }.bind(this),
        null,
        this.br
      );
    }.bind(this)
  );

  // Grab the template
  this.queue.enqueue(
    function(prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting tracker via JSONP");
      /* pragma:DEBUG_END */
      var tr = new utils.JSONP({
        success: function(dta) {
          /* pragma:DEBUG_START */
          console.log("tracker: got tracker template");
          /* pragma:DEBUG_END */
          this.templatehtml = dta;
          if (prom) {
            prom.resolve();
          }
        }.bind(this),
      });
      tr.get(templatefilename, "templates_trigger_" + templateName + "_");
    }.bind(this)
  );

  // Grab the template
  this.queue.enqueue(
    function(prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting qualifier via JSONP");
      /* pragma:DEBUG_END */
      var tr = new utils.JSONP({
        success: function(dta) {
          /* pragma:DEBUG_START */
          console.log("tracker: got qualifier template");
          /* pragma:DEBUG_END */
          this.qualhtml = dta;
          if (prom) {
            prom.resolve();
          }
        }.bind(this),
      });
      tr.get(qualifierfilename, "templates_trigger_" + templateName + "_");
    }.bind(this)
  );

  // Grab the Reminder Template
  this.queue.enqueue(
    function(prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting reminder via JSONP");
      /* pragma:DEBUG_END */
      var tr = new utils.JSONP({
        success: function(dta) {
          /* pragma:DEBUG_START */
          console.log("tracker: got reminder template");
          /* pragma:DEBUG_END */
          this.rmdrhtml = dta;
          if (prom) {
            prom.resolve();
          }
        }.bind(this),
      });
      tr.get(reminderfilename, "templates_trigger_" + templateName + "_");
    }.bind(this)
  );
};

/**
 * Render the template from the data
 */
Tracker.prototype.renderTemplate = function() {
  /* pragma:DEBUG_START */
  console.log(
    '"tracker: current mid: "' +
      new Survey(
        this.data.cfg,
        this.cpps,
        this.data.cfg.active_surveydef,
        this.qualifier
      ).getMeasureId(),
    '"'
  );
  console.warn("tracker: rendering data to template", this.data);
  /* pragma:DEBUG_END */
  // Normalize the inviteType
  var setHtmlLang = this.data.cfg.active_surveydef.language.locale || "en";

  this.data.display.inviteType = this.data.display.inviteType.toUpperCase();
  // Merge the options with a larger object
  var displayopts = fs.ext(
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
  var rootURL = fs.getParam("gw");

  if (displayopts.trackerLogo && displayopts.trackerLogo.length) {
    if (fs.isDefined(fs.assetLocation) && fs.assetLocation != "undefined") {
      displayopts.trackerLogo = fs.makeAssetURI("trigger/" + displayopts.trackerLogo);
    } else {
      displayopts.trackerLogo = rootURL.replace(/__gwtest__/g, displayopts.trackerLogo);
    }
  }

  // For new tracker only
  if (displayopts.trackerBanner && displayopts.trackerBanner.length) {
    if (fs.isDefined(fs.assetLocation) && fs.assetLocation != "undefined") {
      displayopts.trackerBanner = fs.makeAssetURI("trigger/" + displayopts.trackerBanner);
    } else {
      displayopts.trackerBanner = rootURL.replace(/__gwtest__/g, displayopts.trackerBanner);
    }
  }

  if (displayopts.vendorLogo && displayopts.vendorLogo.length) {
    displayopts.vendorLogo = fs.makeAssetURI(displayopts.vendorLogo);
  }
  if (displayopts.vendorLogoPNG && displayopts.vendorLogoPNG.length) {
    displayopts.vendorLogoPNG = fs.makeAssetURI(displayopts.vendorLogoPNG);
  }
  if (displayopts.trusteLogo && displayopts.trusteLogo.length) {
    displayopts.trusteLogo = fs.makeAssetURI(displayopts.trusteLogo);
  }

  displayopts.loadImg = fs.makeURI("loadimg.gif");

  // Keep track of the display options
  this._displayOpts = displayopts;

  // Set the title
  document.title = displayopts.dialog.trackerTitle;

  // Render the template to a string
  document.body.innerHTML = Templater(this.templatehtml, displayopts);

  // Set the language for html
  document.documentElement.setAttribute("lang", setHtmlLang);

  // Run the sizing
  this._doSizing();

  // Set up the convert
  if (!this._cvTimeout) {
    this._cvTimeout = setTimeout(
      function() {
        this._stage = 2;
        this._convertTracker();
      }.bind(this),
      this.data.cfg.config.trackerConvertsAfter
    );
  } else if (this._stage == 2) {
    this._convertTracker();
  }

  // Bind to resize
  utils.Bind(
    window,
    "tracker:resize",
    function() {
      // Run the sizing
      this._doSizing();
    }.bind(this)
  );

  // Log that the tracker was shown
  this.jrny.addEventString(LOGGING.TRACKER_SHOWN);
};

/**
 * Handle any layout stuff
 * @private
 */
Tracker.prototype._doSizing = function() {
  // Do any fill commands
  var fillels = document.querySelectorAll("*[acsfill=true]"),
    wn = utils.getSize(window);
  if (fillels) {
    for (var i = 0; i < fillels.length; i++) {
      var fe = fillels[i],
        ofl = fe.offsetLeft,
        eft = fe.offsetTop;

      fe.style.height = wn.h - eft - ofl * 1 + "px";
    }
  }

  // Do any vertical centering
  var vertcent = document.querySelectorAll("*[acscentervertically=true]");
  if (vertcent) {
    for (var c = 0; c < vertcent.length; c++) {
      var fe2 = vertcent[c],
        ofl2 = fe2.offsetHeight,
        ph = fe2.parentNode.offsetHeight;

      fe2.style.marginTop = (ph - ofl2) / 2 + "px";
    }
  }
};

/**
 * Convert the tracker to ready-mode
 * @private
 */
Tracker.prototype._convertTracker = function() {
  var initials = document.querySelectorAll(".initialContent"),
    i;
  for (i = 0; i < initials.length; i++) {
    utils.addClass(initials[i], "acsNoDisplay fsrNoDisplay");
  }

  var laters = document.querySelectorAll(".showLater");
  for (i = 0; i < laters.length; i++) {
    utils.addClass(laters[i], "acsDisplay fsrDisplay");
  }

  // Run the sizing
  this._doSizing();

  // Add the active class
  utils.addClass(document.body, "acsActiveTracker");

  // The button activator
  var activatebuttons = document.querySelectorAll("*[acsactivatebutton=true], .fsrBeginSurvey"),
    cfunc = function() {
      // Log that the tracker was clicked
      this.jrny.addEventString(LOGGING.TRACKER_CLICKED);

      this.launchSurveyOrQualifier();
    }.bind(this),
    cfuncKey = function(e) {
      var keyCode = window.event ? e.which : e.keyCode;
      if (keyCode === 13) {
        cfunc();
      }
    };
  for (i = 0; i < activatebuttons.length; i++) {
    utils.Bind(activatebuttons[i], "click", cfunc);
    utils.Bind(activatebuttons[i], "keydown", cfuncKey);
  }
};

/**
 * Launch the survey or the qualifier
 */
Tracker.prototype.launchSurveyOrQualifier = function() {
  if (this._cvTimeout) {
    clearTimeout(this._cvTimeout);
    this._cvTimeout = null;
  }
  var laters = document.querySelectorAll("*[acsshowwhenloading=true]");
  for (var i = 0; i < laters.length; i++) {
    utils.addClass(laters[i], "acsDisplay");
  }
  var allelse = document.querySelectorAll("*[acshidewhenloading=true]");
  for (var s = 0; s < allelse.length; s++) {
    utils.removeClass(allelse[s], "acsDisplay");
    utils.addClass(allelse[s], "acsNoDisplay");
  }

  var qual = this.data.cfg.active_surveydef.qualifier,
    rmdr = this.data.cfg.active_surveydef.reminder;

  var isModern = !!document.querySelector("main.fsrTracker");
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
};

/**
 * Present the qualifier
 */
Tracker.prototype.goToQualifier = function() {
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
    function() {
      this.jrny.addEventString(LOGGING.QUALIFIER_ACCEPTED);
      /* pragma:DEBUG_START */
      console.log("tracker: qualified - going to survey");
      /* pragma:DEBUG_END */
      this.goToSurvey();
    }.bind(this),
    true,
    false
  );

  // Disqualified
  this.qualifier.disqualified.subscribe(
    function() {
      this.jrny.addEventString(LOGGING.QUALIFIER_DECLINED);
      /* pragma:DEBUG_START */
      console.warn("tracker: disqualified");
      /* pragma:DEBUG_END */
    }.bind(this),
    true,
    false
  );
  this.qualifier.render();

  this.jrny.addEventString(LOGGING.QUALIFIER_SHOWN);
};

Tracker.prototype.goToReminder = function() {
  this.reminder = new Reminder(
    this.br,
    this.cpps,
    this.data,
    this.data.cfg.active_surveydef.reminder,
    this.rmdrhtml,
    this._displayOpts
  );

  this.reminder.accepted.subscribe(
    function() {
      this.jrny.addEventString(LOGGING.REMINDER_ACCEPTED);
      /* pragma:DEBUG_START */
      console.log("tracker: reminder accepted - going to survey");
      /* pragma:DEBUG_END */
      this.goToSurvey();
    }.bind(this),
    true,
    false
  );
  this.reminder.render();

  this.jrny.addEventString(LOGGING.REMINDER_SHOWN);
};

/**
 * Go to the actual survey
 */
Tracker.prototype.goToSurvey = function() {
  var surv = new Survey(this.data.cfg, this.cpps, this.data.cfg.active_surveydef, this.qualifier),
    svurl = surv.getUrl();

  /* pragma:DEBUG_START */
  console.log("tracker: sending user to " + svurl);
  /* pragma:DEBUG_END */

  // Make the window a little larger
  window.resizeBy(0, 200);

  // Focus the window
  window.focus();

  // After a brief pause, launch the survey
  setTimeout(
    function() {
      // Run the sizing
      this._doSizing();
      window.location = svurl;
    }.bind(this),
    100
  );
};
