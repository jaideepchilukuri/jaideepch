/**
 * Manages a tracker window.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.Tracker");

fs.require("trig.Top");
fs.require("trig.Misc.PopUp");

(function (trigger) {

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
  var Tracker = function (template, def, cfg, stg, cpps, display, browser) {
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
      _fcBindings: []
    });

    // Set up the tracker and some other stuff
    this.cpps = cpps;
    this.br = browser;
    this.stg = stg;
    this.forceLong = false;

    // If we have a template, then this is a new tracker window
    if (template) {
      // Fire tracker shown event handler
      Singletons.trackerShownEmitter.fire(def, stg, cfg, cpps);
    }

    // Start the tracker heartbeat
    var hbf = fs.proxy(function (notemerg) {
      this.stg.set('page_hb', utils.now(), this.forceLong ? cfg.config.trackerHeartbeatLongTimeout : cfg.config.trackerHeartbeatTimeout, !notemerg);
    }, this);
    this._heartbeat = setInterval(hbf, Math.round(cfg.config.trackerHeartbeatTimeout * 0.5));
    // Call it right away
    hbf(true);

    // Send an emergency message on unload to give us extra time
    utils.Bind(_W, 'unload', fs.proxy(function () {
      this.forceLong = true;
      this.stg.set('page_hb', utils.now(), cfg.config.trackerHeartbeatLongTimeout, true);
    }, this));

    // Set the URL
    var enc = fs.enc;
    this._url = fs.makeURI("$fs.tracker.html?uid=" + enc(stg.uid || '') + "&sitekey=" + enc(fs.config.siteKey) + "&domain=" + enc(utils.getRootDomain()) + "&gw=" + enc(fs.makeURI("trigger/__gwtest__")) + "&brain_url=" + enc(fs.config.brainUrl) + "&fsrlocale=" + enc(cpps.get('locale') || 'en') + "&_svu_=" + enc(fs.config.surveyUrl) + "&_cv_=" + enc(fs.config.codeVer) + '&_issh_=' + enc(fs.isSelfHosted) + "&_vt_=" + enc(fs.tagVersion) + "&_au_=" + enc(fs.config.analyticsUrl) + '&_pa_=' + enc(fs.assetLocation));

    /* pragma:DEBUG_START */
    console.log('trigger: This is the tracker url ', this._url);
    /* pragma:DEBUG_END */

    this.cpps.onSet.subscribe(fs.proxy(function (key, value) {
      /* pragma:DEBUG_START */
      console.warn("trigger: sending CPP's to the tracker window: ", key, value);
      /* pragma:DEBUG_END */
      var nobj = {};
      nobj[key] = value;
      this.stg.set('ckcpps', nobj, 200000, false);
    }, this));
    this.stg.set('ckcpps', this.cpps.all(), 200000, false);

    // Send the definition when ready
    this._sendDefinition();
  };

  /**
   * Transmit the definition
   * @private
   */
  Tracker.prototype._sendDefinition = function () {
    // Now tell the tracker window about config and display values
    var jobj = {
      method: 'init',
      cfg: fs.ext({}, this.cfg, { globalConfig: fs.config }),
      def: this.def
    };

    if (this.disp) {
      jobj.display = this.disp;
    }
    if (this.template) {
      jobj.template = this.template;
    }

    jobj.hb_i = this.cfg.config.trackerHeartbeatTimeout;
    jobj.cpps = this.cpps.all();

    // Tell the tracker about the whole state. Make this expire after 60 seconds.
    this.stg.set('page_hb', utils.now(), this.cfg.config.trackerHeartbeatTimeout, false);
    this.stg.set('trackerinfo', jobj, 60000, false);
    /* pragma:DEBUG_START */
    console.warn("trigger: sending CPP's to the tracker window: ", this.cpps.all());
    /* pragma:DEBUG_END */
    this.stg.set('ckcpps', this.cpps.all(), 200000, false);
  };

  /**
   * Shows the window
   */
  Tracker.prototype.show = function (browser) {
    /* pragma:DEBUG_START */
    console.warn("trigger: showing tracker: ", this._url);
    /* pragma:DEBUG_END */
    this.wref = popup(this._url, 'fsTracker', {
      width: 700,
      height: 450
    }, browser, true);
  };

  /**
   * Applies the URL to an exiting window
   */
  Tracker.prototype.applyExisting = function (browser, winref) {
    /* pragma:DEBUG_START */
    console.warn("trigger: apply URL to existing tracker pop up");
    /* pragma:DEBUG_END */
    this.wref = winref;
    winref.location = this._url;
  };

  /**
   * Shut down this tracker instance
   */
  Tracker.prototype.dispose = function () {
    for (var i = 0; i < this._fcBindings.length; i++) {
      this._fcBindings[i].unsubscribe();
    }
    this.stg = null;
    clearInterval(this._heartbeat);
  };

})(trigger);
