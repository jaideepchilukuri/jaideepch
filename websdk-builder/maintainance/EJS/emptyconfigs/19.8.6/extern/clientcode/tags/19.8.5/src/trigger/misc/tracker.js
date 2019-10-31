/**
 * Manages a tracker window.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Creates a new tracker window
 * @param template
 * @param def
 * @param cfg
 * @param stg
 * @param framecontroller
 * @param events
 * @param cpps
 * @param display
 * @constructor
 */
var Tracker = function(template, def, cfg, stg, cpps, display, browser) {
  /**
   * Force only one instance at a time
   */
  if (Singletons.tracker) {
    Singletons.tracker.dispose();
    Singletons.tracker = null;
  }

  Singletons.tracker = this;

  fs.ext(this, {
    template: template,
    def: def,
    cfg: cfg,
    disp: display,
    _fcBindings: [],
  });

  // Set up the tracker and some other stuff
  this.cpps = cpps;
  this.br = browser;
  this.stg = stg;

  // page heartbeat interval value
  var loadTime = 0;
  if (window.performance && window.performance.timing) {
    loadTime = window.performance.timing.domComplete - window.performance.timing.navigationStart;
  }
  this.hbi = Math.max(cfg.config.trackerHeartbeatTimeout, Singletons.pageLoadTime, loadTime) * 3;
  /* pragma:DEBUG_START */
  console.log("Setting hb_i to", this.hbi, loadTime);
  /* pragma:DEBUG_END */

  // If we have a template, then this is a new tracker window
  if (template) {
    // Fire tracker shown event handler
    Singletons.trackerShownEmitter.fire(def, stg, cfg, cpps);
  }

  // if the Brain server is only use for Tracker communication...
  if (fs.config.storage !== utils.storageTypes.MC) {
    // ... then check if server errors occur and save a flag to prevent invites
    // to show up for a while
    this.stg._readyState.subscribe(
      function() {
        if (stg._serverFails > 0) {
          /* pragma:DEBUG_START */
          console.warn(
            "trigger: brain server is having issues. Invite will be blocked for some time"
          );
          /* pragma:DEBUG_END */
          generalStorage = utils.getGeneralStorage(browser);
          generalStorage.set("i", "f");
          Singletons.state.inviteSituation = "BRAINFAILED";
          // set the brain fail waiting time before another invite is allowed to be presented
          generalStorage.set("fw", utils.now() + 12 * 60 * 60 * 1000);
        }
      },
      true,
      false
    );
  }

  this.stg.ready.subscribe(
    function() {
      // Cheating: Init the tracker_hb c/o the Tracker. That's to cover the case
      // where the page closes/dies/implodes/rots before receiving the first
      // real one..
      this.stg.set("tracker_hb", utils.now(), this.hbi, false);

      // Start the tracker heartbeat
      var hbf = function(emergency) {
        this.stg.set("page_hb", utils.now(), this.hbi, !!emergency);
      }.bind(this);

      // on each commit, check for the tracker heartbeat value
      var onStorageCommit = this.stg.onCommit.subscribe(
        function() {
          if (stg.get("tracker_hb") === null) {
            if (utils.now() - this.lastTimeSeenTracker > this.cfg.config.trackerHeartbeatTimeout) {
              onStorageCommit.unsubscribe();
              /* pragma:DEBUG_START */
              console.warn(
                "trigger: The tracker must be closed now, there's no tracker_hb ",
                stg._data
              );
              /* pragma:DEBUG_END */
              delete this.lastTimeSeenTracker;
              this.dispose();
            }
          } else {
            this.lastTimeSeenTracker = utils.now();
          }
        }.bind(this),
        false,
        false
      );

      this._heartbeat = setInterval(hbf, Math.round(this.cfg.config.trackerHeartbeatTimeout * 0.5));
      // Call it right away
      hbf(true);
    }.bind(this),
    true,
    true
  );

  // Send an emergency message on unload to give us extra time
  utils.Bind(
    _W,
    "unload",
    function() {
      this.hbi = this.cfg.config.trackerHeartbeatLongTimeout;
      this.stg.set("page_hb", utils.now(), this.hbi, true);
    }.bind(this)
  );

  // Set the URL
  var enc = fs.enc;
  this._url = fs.makeURI(
    [
      "$fs.tracker.html?uid=",
      enc(stg.uid || ""),
      "&sitekey=",
      enc(fs.config.siteKey),
      "&domain=",
      enc(utils.getRootDomain()),
      "&gw=",
      enc(fs.makeURI("trigger/__gwtest__")),
      "&brain_url=",
      enc(fs.config.brainUrl),
      "&fsrlocale=",
      enc(cpps.get("locale") || "en"),
      "&_svu_=",
      enc(fs.config.surveyUrl),
      "&_cv_=",
      enc(fs.config.codeVer),
      "&_issh_=",
      enc(fs.isSelfHosted),
      "&_vt_=",
      enc(fs.tagVersion),
      "&_au_=",
      enc(fs.config.analyticsUrl),
      "&_pa_=",
      enc(fs.assetLocation),
    ].join("")
  );

  /* pragma:DEBUG_START */
  console.log("trigger: This is the tracker url ", this._url);
  console.log(
    'trigger: current mid "' + new Survey(config, this.cpps, this.def).getMeasureId() + '"'
  );
  /* pragma:DEBUG_END */

  this.cpps.onSet.subscribe(
    function(key, value) {
      /* pragma:DEBUG_START */
      console.warn("trigger: sending CPP's to the tracker window: ", key, value);
      /* pragma:DEBUG_END */
      var nobj = {};
      nobj[key] = value;
      this.stg.set("ckcpps", nobj, 200000, false);
    }.bind(this)
  );

  this.stg.set("ckcpps", this.cpps.all(), 200000, false);

  // Send the definition when ready
  this._sendDefinition();
};

/**
 * Transmit the definition
 * @private
 */
Tracker.prototype._sendDefinition = function() {
  // Now tell the tracker window about config and display values
  var jobj = {
    method: "init",
    cfg: fs.ext({ active_surveydef: null }, this.cfg, { globalConfig: fs.config }),
    hb_i: this.hbi,
    cpps: this.cpps.all(),
  };

  if (this.disp) {
    jobj.display = this.disp;
  }
  if (this.template) {
    jobj.template = this.template;
  }

  // Tell the tracker about the whole state. Make this expire after 60 seconds.
  this.stg.set("page_hb", utils.now(), this.cfg.config.trackerHeartbeatTimeout, false);
  this.stg.set("trackerinfo", jobj, 60000, false);
  /* pragma:DEBUG_START */
  console.warn("trigger: sending CPP's to the tracker window: ", this.cpps.all());
  /* pragma:DEBUG_END */
  this.stg.set("ckcpps", this.cpps.all(), 200000, false);
};

/**
 * Shows the window
 */
Tracker.prototype.show = function(browser) {
  /* pragma:DEBUG_START */
  console.warn("trigger: showing tracker: ", this._url, this.cfg);
  /* pragma:DEBUG_END */
  this.wref = popup(
    this._url,
    "fsTracker",
    {
      width: 700,
      height: 450,
    },
    browser,
    true,
    this.cfg.config.centerTrackerPopup
  );
};

/**
 * Applies the URL to an exiting window
 */
Tracker.prototype.applyExisting = function(browser, winref) {
  /* pragma:DEBUG_START */
  console.warn("trigger: apply URL to existing tracker pop up");
  /* pragma:DEBUG_END */
  this.wref = winref;
  winref.location = this._url;
};

/**
 * Shut down this tracker instance
 */
Tracker.prototype.dispose = function() {
  for (var i = 0; i < this._fcBindings.length; i++) {
    this._fcBindings[i].unsubscribe();
  }
  // If this storage was only used for communication, it is not useful anymore
  if (utils.getGeneralStorage(this.br) === this.stg) {
    this.stg.dispose();
  }
  this.stg = null;
  clearInterval(this._heartbeat);
};
