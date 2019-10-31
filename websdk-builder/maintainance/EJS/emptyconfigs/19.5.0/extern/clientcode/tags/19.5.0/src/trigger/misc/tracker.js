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
fs.require("trig.Misc.MouseTracker");

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
    this.mtrk = new MouseTracker();
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
      this.stg.set('page_hb', utils.now(), this.forceLong ? cfg.config.trackerHeartbeatLongTimeout : cfg.config.trackerHeartbeatTimeout, !notemerg, utils.persistDataType.TRACKER);
    }, this);
    this._heartbeat = setInterval(hbf, Math.round(cfg.config.trackerHeartbeatTimeout / 3));
    // Call it right away
    hbf(true);

    // Send an emergency message on unload to give us extra time
    utils.Bind(_W, 'unload', fs.proxy(function () {
      this.forceLong = true;
      this.stg.set('page_hb', utils.now(), cfg.config.trackerHeartbeatLongTimeout, true, utils.persistDataType.TRACKER);
    }, this));

    // Set the URL
    var enc = fs.enc;
    this._url = fs.makeURI("$fs.tracker.html?uid=" + enc(stg.uid || '') + "&sitekey=" + enc(utils.siteKey) + "&domain=" + enc(utils.getRootDomain()) + "&stg=" + enc(this.stg.pers) + "&gw=" + enc(fs.makeURI("trigger/__gwtest__")) + "&brain_url=" + enc(fs.config.brainUrl) + "&fsrlocale=" + enc(cpps.get('locale') || 'en') + "&_svu_=" + enc(fs.config.surveyUrl) + "&_cv_=" + enc(fs.config.codeVer) + '&_issh_=' + enc(fs.isSelfHosted) + "&_vt_=" + enc(fs.tagVersion) + "&_au_=" + enc(fs.config.analyticsUrl) + '&_pa_=' + enc(fs.assetLocation));

    /* pragma:DEBUG_START */
    console.log('trigger: This is the tracker url ', this._url);
    /* pragma:DEBUG_END */

    if (stg.fr && stg.fr.isSSL) {
      this._url = this._url.replace(/http:/gi, 'https:').replace(/:\d{3,4}/, '');
      if (this._url.substr(0, 2) == '//') {
        this._url = "https:" + this._url;
      } else if (this._url.substr(0, 4) != 'http' && /^\//.test(this._url)) {
        this._url = 'https://' + _W.location.host + this._url;
      }
      if (_W.location.hostname === 'localhost') {
        this._url = this._url.replace(/:8080/gi, ':443');
      }
    }

    if (this.stg.pers == utils.storageTypes.CK) {
      this.cpps.onSet.subscribe(fs.proxy(function (key, value) {
        /* pragma:DEBUG_START */
        console.warn("trigger: sending CPP's to the tracker window: ", key, value);
        /* pragma:DEBUG_END */
        var nobj = {};
        nobj[key] = value;
        this.stg.set('ckcpps', nobj, 200000, true, utils.persistDataType.TRACKER);
      }, this));
    }

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
      cfg: this.cfg,
      def: this.def
    };

    if (this.disp) {
      jobj.display = this.disp;
    }
    if (this.template) {
      jobj.template = this.template;
    }

    // Tell the tracker about the whole state. Make this expire after 60 seconds.
    this.stg.set('page_hb', utils.now(), this.cfg.config.trackerHeartbeatTimeout, false, utils.persistDataType.TRACKER);
    this.stg.set('hb_i', this.cfg.config.trackerHeartbeatTimeout, 60000, false, utils.persistDataType.TRACKER);
    this.stg.set('trackerinfo', jobj, 60000, true, utils.persistDataType.TRACKER);
    if (this.stg.pers == utils.storageTypes.CK) {
      /* pragma:DEBUG_START */
      console.warn("trigger: sending CPP's to the tracker window: ", this.cpps.all());
      /* pragma:DEBUG_END */
      this.stg.set('ckcpps', this.cpps.all(), 200000, true, utils.persistDataType.TRACKER);
    }
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
   * Applys the URL to an exiting window
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
    this.fstg = null;
  };

})(trigger);
