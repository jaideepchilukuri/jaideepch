/**
 * Generates survey URL's
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.Survey");

fs.require("trig.Top");

(function (trigger) {

  var Survey = function(config, cpps, def) {
    this.cfg = config;
    this.cpps = cpps;
    this.def = def;
    this.locale = cpps.get('locale') || 'en';
  };

  /**
   * Get the URL for the survey
   */
  Survey.prototype.getUrl = function() {
    var enc = fs.enc,
      def = this.def,
      resurl = fs.config.surveyUrl + '?',
      tval = utils.now() + "_" + Math.round(Math.random() * 10000000000000),
      _measureName = def.name + '-' + (fs.isDefined(def.site) ? (def.site + '-') : '') + (fs.isDefined(def.section) ? (this.def.section + '-') : '') + this.locale;

    /*
     rtp - Replay transmission protocol (AMF or CORS)
     rta - Replay transmission attempt count
     rts - Replay transmission success count
     rtf - Replay transmission failed count
     rtcr - Replay transmission canceled recording (value 1 = client side canceled after 10 tries, value 2 = FSR server side cancel)
     rtcp - Replay transmission canceled page views
     */

    var parms = {
      'sid': enc(_measureName),
      'cid': enc(this.cfg.config.id),
      'pattern': enc(this.cpps.get(def.pattern)),
      'a': tval,
      'b': utils.hash(tval),
      'c': 24 * 60 * 60 * 1000
    };
    for (var pm in parms) {
      resurl += fs.enc(pm) + '=' + fs.enc(parms[pm]) + '&';
    }
    resurl += this.cpps.toQueryString();

    return resurl;
  };

})(trigger);
