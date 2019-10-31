/**
 * Generates survey URL's
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Misc.Survey");

fs.require("track.Top");

(function (trigger) {

  /**
  * Helps build survey links
  * @param config
  * @param cpps
  * @param def
  * @constructor
  */
  var Survey = function (config, cpps, def, qual) {
    this.cfg = config;

    // tracker window gets config.globalConfig, main window gets fs.config
    this.globalConfig = (config.globalConfig || fs.config);

    this.cpps = cpps;
    this.def = def;
    this.locale = cpps.get('locale') || 'en';
    this.qual = qual;
  };

  var abTestSurvey = function (abSurveyType, currentConfig) {
    var currentName = currentConfig.name || "";
    var abName;
    var def;
    currentName += '-' + (currentConfig.section || "");
    currentName += '-' + (currentConfig.site || "");

    for (var k = 0; k < abSurveyType.defs.length; k++) {
      def = abSurveyType.defs[k];
      abName = def.name || "";
      abName += '-' + (def.section || "");
      abName += '-' + (def.site || "");

      if (abName === currentName) {
        return {
          legacyChosen: def.modernPercentage < Math.floor(Math.random() * 100),
          modernPercentage: def.modernPercentage
        };
      }
    }
    return { legacyChosen: true, modernPercentage: 0 };
  };

  /**
   * Get the URL for the survey
   */
  Survey.prototype.getUrl = function () {
    var def = this.def;
    var resurl;
    var tval = utils.now() + "_" + Math.round(Math.random() * 10000000000000);
    var measureName = def.name + '-' +
      (fs.isDefined(def.site) ? (def.site + '-') : '') +
      (fs.isDefined(def.section) ? (this.def.section + '-') : '') +
      this.locale;
    var abSurveyType = this.cfg.config.abSurveyType;
    var shouldABTest = abSurveyType && abSurveyType.shouldTest && this.globalConfig.modernSurveyUrl;
    var abTestResults;

    if (this.qual) {
      measureName += '-' + this.qual.qualifiesValue;
    }

    var parms = {
      'sid': measureName,
      'cid': this.cfg.config.id,
      'pattern': this.cpps.get(def.pattern) || def.pattern,
      'a': tval,
      'b': utils.hash(tval),
      'c': 24 * 60 * 60 * 1000
    };

    if (this.cfg.config.onlyModernSurvey) {
      resurl = this.globalConfig.modernSurveyUrl;
    } else if (shouldABTest) {
      abTestResults = abTestSurvey(abSurveyType, this.cfg.active_surveydef);
      parms.mp = abTestResults.modernPercentage;
      resurl = abTestResults.legacyChosen ? this.globalConfig.surveyUrl : this.globalConfig.modernSurveyUrl;
    } else {
      resurl = this.globalConfig.surveyUrl;
    }

    resurl += '?';

    for (var pm in parms) {
      resurl += fs.enc(pm) + '=' + fs.enc(parms[pm]) + '&';
    }

    resurl += this.cpps.toQueryString();

    return resurl;
  };

})(trigger);
