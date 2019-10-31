/**
 * Generates survey URL's
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Helps build survey links
 * @param config
 * @param cpps
 * @param def
 * @constructor
 */
var Survey = function(config, cpps, def, qual) {
  this.cfg = config;

  // tracker window gets config.globalConfig, main window gets fs.config
  this.globalConfig = config.globalConfig || fs.config;

  this.cpps = cpps;
  this.def = def;
  this.locale = cpps.get("locale") || "en";
  this.qual = qual;
};

var findABConfig = function(abSurveyType, activeDef) {
  var k;
  var abName;
  var config;
  var defName = activeDef.name || "";
  defName += "-" + (activeDef.section || "");
  defName += "-" + (activeDef.site || "");

  for (k = 0; k < abSurveyType.defs.length; k++) {
    config = abSurveyType.defs[k];
    abName = config.name || "";
    abName += "-" + (config.section || "");
    abName += "-" + (config.site || "");

    if (abName === defName) {
      return config;
    }
  }
  return null;
};

/**
 * Makes the decision about whether to show the modern survey or not.
 *
 * @returns {{modernChosen: boolean, modernPercentage: number}} decision information
 */
Survey.prototype.decideModernSurvey = function() {
  var abSurveyType = this.cfg.config.abSurveyType;
  var shouldABTest = abSurveyType && abSurveyType.shouldTest && this.globalConfig.modernSurveyUrl;
  var abConfig = shouldABTest && findABConfig(abSurveyType, this.def);

  if (this.cfg.config.onlyModernSurvey) {
    return { modernChosen: true, modernPercentage: 100 };
  }

  if (abConfig) {
    return {
      modernChosen: abConfig.modernPercentage >= Math.floor(Math.random() * 100),
      modernPercentage: abConfig.modernPercentage,
    };
  }

  return { modernChosen: false, modernPercentage: 0 };
};

/**
 * Get the measure name for the survey (alias: mid, sid)
 */
Survey.prototype.getMeasureId = function() {
  var measureNameComponents = [
    this.def.name,
    this.def.site,
    this.def.section,
    this.locale,
    this.qual ? this.qual.qualifiesValue : null,
  ]
    // Only keep the defined components
    .filter(function(i) {
      return i;
    });

  return measureNameComponents.join("-");
};

/**
 * Get the URL for the survey
 */
Survey.prototype.getUrl = function() {
  var resurl;
  var tval = utils.now() + "_" + Math.round(Math.random() * 10000000000000);
  var abDecision = this.decideModernSurvey();

  var parms = {
    sid: this.getMeasureId(),
    cid: this.cfg.config.id,
    pattern: this.cpps.get(this.def.pattern) || this.def.pattern,
    a: tval,
    b: utils.hash(tval),
    c: 24 * 60 * 60 * 1000,
    mp: abDecision.modernPercentage,
  };

  if (abDecision.modernChosen) {
    resurl = this.globalConfig.modernSurveyUrl;
  } else {
    resurl = this.globalConfig.surveyUrl;
  }

  resurl += "?";

  for (var pm in parms) {
    resurl += fs.enc(pm) + "=" + fs.enc(parms[pm]) + "&";
  }

  resurl += this.cpps.toQueryString();

  return resurl;
};
