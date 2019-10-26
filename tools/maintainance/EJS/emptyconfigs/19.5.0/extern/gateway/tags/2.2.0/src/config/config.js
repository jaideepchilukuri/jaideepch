_fsDefine(["fs"], function(fs) {
  /**
   * Holds the global configuration
   * @type {{}}
   */
  var globalConfig = {
      "codeVer": "${defaultCodeVer}",
      "products": {},
      "storage": "COOKIE",
      "recUrl": "https://rec.replay.answerscloud.com/rec/",
      "surveyUrl": "https://survey.foreseeresults.com/survey/display",
      "analyticsUrl": "https://analytics.foresee.com/ingest/events"
    },
    productConfig = {},
    staticCodeLocation = "${staticCodeLocation}",
    supportsDomStorage = false,
    _moduleLocationOverride;

  try {
    sessionStorage.set('a', 0);
    supportsDomStorage = true;
  } catch(e) {
    supportsDomStorage = false;
  }

  /**
   * @preserve
   * [GENERAL_CONFIG]
   */

  return {global: globalConfig, product: productConfig, static: staticCodeLocation};
});
