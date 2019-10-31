/**
 * Mobile Heartbeat
 *
 * Helps the server know when to send on-exit messages
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.MobileHeartbeat");

fs.require("trig.Top");
fs.require("trig.Misc.Services");

(function (trigger) {

  /**
   * Handles mobile heartbeats
   * @param invitetype
   * @param modality
   * @param cfg
   * @param def
   * @param cpps
   * @constructor
   */
  var MobileHeartbeat = function (invitetype, cfg, def, cpps, rid, locale) {
    this.itype = invitetype;
    this.cfg = cfg;
    this.def = def;
    this.cpps = cpps;
    this.rid = rid;
    this._measureName = this.def.name + '-' + (fs.isDefined(this.def.site) ? (this.def.site + '-') : '') + (fs.isDefined(this.def.section) ? (this.def.section + '-') : '') + (locale || this.def.language.locale);
  };

  /**
   * Send the init event
   * @param usercontactinfo (String) Email or SMS phone number
   * @param callback (Function) Success callback
   */
  MobileHeartbeat.prototype.init = function (usercontactinfo, callback) {
    callback = callback || function () {
    };
    var survey = new Survey(this.cfg, this.cpps, this.def, null);
    var decision = survey.decideModernSurvey();
    var a = utils.now() + "_" + Math.round(Math.random() * 10000000000000);
    var params = {
      'a': a,
      'notify': usercontactinfo,
      'b': utils.hash(a),
      'c': 24 * 60 * 60 * 1000,
      'cid': this.cfg.config.id,
      'sid': this._measureName,
      'rid': this.rid,
      'uid': utils.now(),
      'support': (this.itype == 'SMSEMAIL') ? 'b' : (this.itype == 'EMAIL') ? 'e' : 's',
      'cpps': 'version=' + encodeURIComponent(this.cfg.config.version) + '&' + this.cpps.toQueryString()
    };
    if (decision.modernChosen) {
      /* pragma:DEBUG_START */
      console.log("trigger: asking for modern survey on-exit mobile!");
      /* pragma:DEBUG_END */
      params = fs.ext({'fs_renderer': 'modern'}, params);
    } else {
      /* pragma:DEBUG_START */
      console.log("trigger: asking for legacy survey on-exit mobile!");
      /* pragma:DEBUG_END */
    }
    Services.ping(Services.SERVICE_TYPES.mobileOnExitInitialize, params, callback, callback);
  };

  /**
   * Start up the heartbeat
   */
  MobileHeartbeat.prototype.beginHeartbeat = function () {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    /* pragma:DEBUG_START */
    console.log("trigger: starting mobile heartbeat on interval: ", config.config.onExitMobileHeartbeatInterval);
    /* pragma:DEBUG_END */
    var hb = fs.proxy(function () {
      Services.ping(Services.SERVICE_TYPES.mobileOnExitHeartbeat, {
        'cid': this.cfg.config.id,
        'sid': this._measureName,
        'rid': this.rid,
        'uid': utils.now()
      }, function () {
        // No-op success
      }, function () {
        // No-op failure
      });
    }, this);
    this._timer = setInterval(hb, config.config.onExitMobileHeartbeatInterval);
    hb();
  };

})(trigger);