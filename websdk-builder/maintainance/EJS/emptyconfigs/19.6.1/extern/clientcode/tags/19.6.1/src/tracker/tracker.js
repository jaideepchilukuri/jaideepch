/**
 * The tracker class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Tracker");

fs.require("track.Top");
fs.require("track.Misc.Template");
fs.require("track.Misc.Survey");
fs.require("track.Misc.CPPS");
fs.require("track.qualifier.Qualifier");
fs.require("track.reminder.Reminder");

(function (tracker) {

  /**
   * Constructor for a new tracker instance
   * @param browser {Browser}
   * @param stg {FSStorage}
   * @param trackerdata {Object} The definition for the tracker
   * @constructor
   */
  var Tracker = function (browser, stg, trackerdata) {
    /* pragma:DEBUG_START */
    console.warn("tracker: constructor setup");
    /* pragma:DEBUG_END */

    var cfg = trackerdata.cfg.config;

    this.br = browser;
    this.stg = stg;
    this.data = trackerdata;
    this._stage = 1;
    this.jrny = new utils.Journey(cfg.id, utils.APPID.TRIGGER, stg.get('rid'), browser, 50);

    this.jrny.addEventsDefault("properties", {
      'fs_site': [utils.getRootDomain()],
      'fs_repeatDaysAccept': [cfg.repeatDays.accept],
      'fs_repeatDaysDecline': [cfg.repeatDays.decline],
      'fs_reinviteDelayAfterInviteAbandon': [cfg.reinviteDelayAfterInviteAbandon],
      'fs_defName': [this.data.def.name],
      'fs_section': [this.data.def.section],
      'fs_displayName': [this.data.display.displayname],
      'fs_language': [this.data.cfg.active_surveydef.locale],
      'fs_samplePercentage': [this.data.def.criteria.sp.reg],
      'fs_loyaltyFactor': [this.data.def.criteria.lf]
    });

    // Set up the cpps interface
    this.cpps = new CPPS(this.stg);
    fs.ext(this.cpps._extras, trackerdata.cpps);

    // Get the template
    this._loadResources(fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("tracker: got resources");
      /* pragma:DEBUG_END */

      // Get rid of any activity indicator
      document.documentElement.style.backgroundImage = 'none';

      // Signal ready
      this.ready.fire();

      // Watch for changes to heartbeat
      stg.onSync.subscribe(fs.proxy(function () {
        var pagehb = stg.get('page_hb');

        if (!pagehb) {

          // Stop listening
          stg.onSync.unsubscribeAll();

          /* pragma:DEBUG_START */
          console.warn("tracker: heartbeat expired");
          /* pragma:DEBUG_END */

          // Convert the survey
          this.launchSurveyOrQualifier();
          if (!this.data.display.removeSurveyAlerts) {
            // Bring it forward
            setTimeout(fs.proxy(function () {
              var agt = fs.toLowerCase(navigator.userAgent);
              if (agt.indexOf('msie') == -1 && agt.indexOf('edge') == -1 && agt.indexOf('firefox') == -1 && this.data.display.dialog) {
                alert(this.data.display.dialog.surveyavailable);
              }
            }, this), 200);
          }
        }
      }, this));
    }, this));

    // The ready event
    this.ready = new utils.FSEvent();
  };

  /**
   * Updates Tracker with new browser and storage values
   * @param browser
   * @param stg
   * @param trackerdata
   */
  Tracker.prototype.update = function (browser, stg, trackerdata) {
    this.br = browser;
    this.stg = stg;
    this.data = trackerdata;
  };

  /**
   * Setting some cpps
   * @param cppsobj
   */
  Tracker.prototype.setCPPS = function (cppsobj) {
    if (cppsobj) {
      this.jrny.addEventsDefault("properties", {
        'fs_pvInvited': [cppsobj.pv]
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
  Tracker.prototype._loadResources = function (cb) {
    /* pragma:DEBUG_START */
    console.log("tracker: loading resources", this.data);
    /* pragma:DEBUG_END */

    // Catch doomsday scenario
    if (!this.data || !this.data.template || typeof this.data.template != "string") {
      return;
    }

    var templateName = this.data.template,
      isCustom = templateName.indexOf('@') > -1,
      cssfilename = fs.makeURI('templates/trigger/' + templateName + '/main.css'),
      templatefilename = fs.makeURI('templates/trigger/' + templateName + '/tracker.html'),
      qualifierfilename = fs.makeURI('templates/trigger/' + templateName + '/qualifier.html'),
      reminderfilename = fs.makeURI('templates/trigger/' + templateName + '/reminder.html'),
      rootURL = fs.getParam('gw');

    if (isCustom) {
      templateName = templateName.substr(1);
      if (fs.isSelfHosted) {
        cssfilename = fs.makeAssetURI('trigger/templates/' + templateName + '/main.css');
        templatefilename = fs.makeAssetURI('trigger/templates/' + templateName + '/tracker.html');
        qualifierfilename = fs.makeAssetURI('trigger/templates/' + templateName + '/qualifier.html');
        reminderfilename = fs.makeAssetURI('trigger/templates/' + templateName + '/reminder.html');
      } else {
        cssfilename = rootURL.replace(/__gwtest__/g, 'templates/' + templateName + '/main.css');
        templatefilename = rootURL.replace(/__gwtest__/g, 'templates/' + templateName + '/tracker.html');
        qualifierfilename = rootURL.replace(/__gwtest__/g, 'templates/' + templateName + '/qualifier.html');
        reminderfilename = rootURL.replace(/__gwtest__/g, 'templates/' + templateName + '/reminder.html');
      }
    }

    // Set up an async queue
    this.queue = new utils.Async(true, fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("tracker: fetched all resources");
      /* pragma:DEBUG_END */
      if (cb) {
        cb();
      }
    }, this), fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("tracker: failed to fetch resources");
      /* pragma:DEBUG_END */
    }, this));

    // Queue up the css retrieval
    this.queue.enqueue(fs.proxy(function (prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting css");
      /* pragma:DEBUG_END */
      utils.loadCSS(cssfilename, fs.proxy(function (linkel) {
        /* pragma:DEBUG_START */
        console.warn("tracker: got the css");
        /* pragma:DEBUG_END */
        this._cssLink = linkel;
        if (prom) {
          prom.resolve();
        }
      }, this), null, this.br);
    }, this));

    // Grab the template
    this.queue.enqueue(fs.proxy(function (prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting tracker via JSONP");
      /* pragma:DEBUG_END */
      var tr = new utils.JSONP({
        success: fs.proxy(function (dta) {
          /* pragma:DEBUG_START */
          console.log("tracker: got tracker template");
          /* pragma:DEBUG_END */
          this.templatehtml = dta;
          if (prom) {
            prom.resolve();
          }
        }, this)
      });
      tr.get(templatefilename, 'templates_trigger_' + templateName + '_');
    }, this));

    // Grab the template
    this.queue.enqueue(fs.proxy(function (prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting qualifier via JSONP");
      /* pragma:DEBUG_END */
      var tr = new utils.JSONP({
        success: fs.proxy(function (dta) {
          /* pragma:DEBUG_START */
          console.log("tracker: got qualifier template");
          /* pragma:DEBUG_END */
          this.qualhtml = dta;
          if (prom) {
            prom.resolve();
          }
        }, this)
      });
      tr.get(qualifierfilename, 'templates_trigger_' + templateName + '_');
    }, this));

    // Grab the Reminder Template
    this.queue.enqueue(fs.proxy(function (prom) {
      /* pragma:DEBUG_START */
      console.log("tracker: getting reminder via JSONP");
      /* pragma:DEBUG_END */
      var tr = new utils.JSONP({
        success: fs.proxy(function (dta) {
          /* pragma:DEBUG_START */
          console.log("tracker: got reminder template");
          /* pragma:DEBUG_END */
          this.rmdrhtml = dta;
          if (prom) {
            prom.resolve();
          }
        }, this)
      });
      tr.get(reminderfilename, 'templates_trigger_' + templateName + '_');
    }, this));

  };

  /**
   * Render the template from the data
   */
  Tracker.prototype.renderTemplate = function () {
    /* pragma:DEBUG_START */
    console.warn("tracker: rendering data to template", this.data);
    /* pragma:DEBUG_END */
    // Normalize the inviteType
    var setHtmlLang = this.data.def.language.locale || "en";

    this.data.display.inviteType = this.data.display.inviteType.toUpperCase();
    // Merge the options with a larger object
    var displayopts = fs.ext({
      copyrightDate: (new Date()).getFullYear().toString(),
      supportsSVG: document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")
    }, this.data.display, this.data.cfg.config);
    var rootURL = fs.getParam('gw');
    if (displayopts.trackerLogo && displayopts.trackerLogo.length > 0) {
      if (fs.isDefined(fs.assetLocation) && fs.assetLocation != 'undefined') {
        displayopts.trackerLogo = fs.makeAssetURI('trigger/' + displayopts.trackerLogo);
      } else {
        displayopts.trackerLogo = rootURL.replace(/__gwtest__/g, displayopts.trackerLogo);
      }
    }
    if (displayopts.vendorLogo && displayopts.vendorLogo.length > 0) {
      displayopts.vendorLogo = fs.makeAssetURI(displayopts.vendorLogo);
    }
    if (displayopts.vendorLogoPNG && displayopts.vendorLogoPNG.length > 0) {
      displayopts.vendorLogoPNG = fs.makeAssetURI(displayopts.vendorLogoPNG);
    }
    if (displayopts.trusteLogo && displayopts.trusteLogo.length > 0) {
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
      this._cvTimeout = setTimeout(fs.proxy(function () {
        this._stage = 2;
        this._convertTracker();
      }, this), this.data.cfg.config.trackerConvertsAfter);
    } else if (this._stage == 2) {
      this._convertTracker();
    }

    // Bind to resize
    utils.Bind(window, "tracker:resize", fs.proxy(function () {
      // Run the sizing
      this._doSizing();
    }, this));

    // Log that the tracker was shown
    this.jrny.addEventString(LOGGING.TRACKER_SHOWN);
  };

  /**
   * Handle any layout stuff
   * @private
   */
  Tracker.prototype._doSizing = function () {
    // Do any fill commands
    var fillels = document.querySelectorAll('*[acsfill=true]'),
      wn = utils.getSize(window);
    if (fillels) {
      for (var i = 0; i < fillels.length; i++) {
        var fe = fillels[i],
          ofl = fe.offsetLeft,
          eft = fe.offsetTop;

        fe.style.height = (wn.h - eft - (ofl * 1)) + 'px';
      }
    }

    // Do any vertical centering
    var vertcent = document.querySelectorAll('*[acscentervertically=true]');
    if (vertcent) {
      for (var c = 0; c < vertcent.length; c++) {
        var fe2 = vertcent[c],
          ofl2 = fe2.offsetHeight,
          ph = fe2.parentNode.offsetHeight;

        fe2.style.marginTop = ((ph - ofl2) / 2) + 'px';
      }
    }
  };

  /**
   * Convert the tracker to ready-mode
   * @private
   */
  Tracker.prototype._convertTracker = function () {
    var initials = document.querySelectorAll('.initialContent'),
      i;
    for (i = 0; i < initials.length; i++) {
      utils.addClass(initials[i], 'acsNoDisplay');
    }

    var laters = document.querySelectorAll('.showLater');
    for (i = 0; i < laters.length; i++) {
      utils.addClass(laters[i], 'acsDisplay');
    }

    // Run the sizing
    this._doSizing();

    // Add the active class
    utils.addClass(document.body, 'acsActiveTracker');

    // The button activator
    var activatebuttons = document.querySelectorAll('*[acsactivatebutton=true]'),
      cfunc = fs.proxy(function () {
        // Log that the tracker was clicked
        this.jrny.addEventString(LOGGING.TRACKER_CLICKED);

        this.launchSurveyOrQualifier();
      }, this),
      cfuncKey = function (e) {
        var keyCode = (window.event) ? e.which : e.keyCode;
        if (keyCode === 13) {
          cfunc();
        }
      };
    for (i = 0; i < activatebuttons.length; i++) {
      utils.Bind(activatebuttons[i], 'click', cfunc);
      utils.Bind(activatebuttons[i], 'keydown', cfuncKey);
    }
  };

  /**
   * Launch the survey or the qualifier
   */
  Tracker.prototype.launchSurveyOrQualifier = function () {
    if (this._cvTimeout) {
      clearTimeout(this._cvTimeout);
      this._cvTimeout = null;
    }
    var laters = document.querySelectorAll('*[acsshowwhenloading=true]');
    for (var i = 0; i < laters.length; i++) {
      utils.addClass(laters[i], 'acsDisplay');
    }
    var allelse = document.querySelectorAll('*[acshidewhenloading=true]');
    for (var s = 0; s < allelse.length; s++) {
      utils.removeClass(allelse[s], 'acsDisplay');
      utils.addClass(allelse[s], 'acsNoDisplay');
    }

    var qual = this.data.def.qualifier,
      rmdr = this.data.def.reminder;

    if (qual && qual.useQualifier) {
      this.goToQualifier();
    } else if (rmdr && rmdr.useReminder) {
      this.goToReminder();
    } else {
      this.goToSurvey(null);
    }
  };

  /**
   * Present the qualifier
   */
  Tracker.prototype.goToQualifier = function () {
    this.qualifier = new Qualifier(this.br, this.cpps, this.data, this.data.def.qualifier, this.qualhtml, this._displayOpts);

    // Qualified
    this.qualifier.qualified.subscribe(fs.proxy(function () {
      this.jrny.addEventString(LOGGING.QUALIFIER_ACCEPTED);
      /* pragma:DEBUG_START */
      console.log("tracker: qualified - going to survey");
      /* pragma:DEBUG_END */
      this.goToSurvey(this.qualifier);
    }, this), true, false);

    // Disqualified
    this.qualifier.disqualified.subscribe(fs.proxy(function () {
      this.jrny.addEventString(LOGGING.QUALIFIER_DECLINED);
      /* pragma:DEBUG_START */
      console.warn("tracker: disqualified");
      /* pragma:DEBUG_END */
    }, this), true, false);
    this.qualifier.render();

    this.jrny.addEventString(LOGGING.QUALIFIER_SHOWN);
  };

  Tracker.prototype.goToReminder = function () {
    this.reminder = new Reminder(this.br, this.cpps, this.data, this.data.def.reminder, this.rmdrhtml, this._displayOpts);

    this.reminder.accepted.subscribe(fs.proxy(function () {
      this.jrny.addEventString(LOGGING.REMINDER_ACCEPTED);
      /* pragma:DEBUG_START */
      console.log("tracker: reminder accepted - going to survey");
      /* pragma:DEBUG_END */
      this.goToSurvey();
    }, this), true, false);
    this.reminder.render();

    this.jrny.addEventString(LOGGING.REMINDER_SHOWN);
  };

  /**
   * Go to the actual survey
   * @param qualifier {Qualifier} Optional. The qualifier that led us here.
   */
  Tracker.prototype.goToSurvey = function (qualifier) {
    var surv = new Survey(this.data.cfg, this.cpps, this.data.def, this.qualifier),
      svurl = surv.getUrl();

    /* pragma:DEBUG_START */
    console.log("tracker: sending user to " + svurl);
    /* pragma:DEBUG_END */

    // Make the window a little larger
    window.resizeBy(0, 200);

    // Focus the window
    window.focus();

    // After a brief pause, launch the survey
    setTimeout(fs.proxy(function () {
      // Run the sizing
      this._doSizing();
      window.location = svurl;
    }, this), 100);
  };

})(tracker);
