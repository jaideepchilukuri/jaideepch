"use strict";
/**
* @preserve
* ForeSee Gateway Script v2.0.3-rc.1. Monday, February 27th, 2017, 9:48:31 AM
* (c) Copyright 2016, ForeSee. http://www.foresee.com
* Patents pending.
**/
_fsDefine(["fs"], function(fs) {
  /**
   * Holds the global configuration
   * @type {{}}
   */
  var globalConfig = {
      "codeVer": "19.3.3-rc.1",
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

  _moduleLocationOverride = 'preview/code/19.3.3-rc.2/'; globalConfig = {"codeVer":"19.3.3-rc.2","products":{"record":false,"trigger":false,"feedback":true},"storage":"COOKIE","brainUrl":"https://brain.foresee.com","recUrl":"https://rec.replay.answerscloud.com/rec/","surveyUrl":"https://survey.foreseeresults.com/survey/display","analyticsUrl":"https://analytics.foresee.com/ingest/events","staticUrl":"https://static.foresee.com"};productConfig.feedback = ({

  /**
   * Describes whether this module is to be used or not. Can be a function that returns a boolean
   * or it can just be a boolean.
   */
  "check": function () {
    // Sets up an empty configuration object
    var config = {};
    /**
     * @preserve
     * @@CONFIG_GOES_HERE@@
     */

    /**
     * A generic configuration module that other modules may include
     */
    _fsDefine('feedbackconfig', function () {
      // Turn off all replay instances if there is no replay configuration
      if (config.instances && (!productConfig.record || typeof(Uint8Array) == 'undefined')) {
        for (var i = 0; i < config.instances.length; i++) {
          config.instances[i].replay = false;
        }
      }
      if (config.instances && typeof(Uint8Array) !== 'undefined') {
        for (var j = 0; j < config.instances.length; j++) {
          if (config.instances[j].replay == true) {
            config.cxReplay = true;
            break;
          }
        }
      }
      /**
       * Export all the config
       */
      return config;
    });

    // Unless you are turning everything OFF, leave all this stuff alone:
    if (typeof fsCmd != "undefined" && fsCmd("feedbackreport") || (supportsDomStorage && sessionStorage.getItem('fsFeedbackLoaded') == 'true')) {
      if (supportsDomStorage) {
        sessionStorage.setItem('fsFeedbackLoaded', 'true');
      }
      // Loads the reporting interface instead of the other stuff.
      this["dependencies"] = ["$fs.feedbackreport.v1.js"];
    } else if (supportsDomStorage && sessionStorage.getItem('acsFeedbackSubmitted') == 'true') {
      // Feedback has been submitted already, don't load the feedback script
      return false;
    }

    // If we're using cxReplay then load it
    if (config.cxReplay && productConfig.record) {
      this["dependencies"].push("$fs.record.v1.js");
    } else {
      config.cxReplay = false;
    }
    return true;
  },

  /**
   * The dependencies to load
   */
  "dependencies": ["$fs.feedback.v1.js", "$fs.survey.v1.js"]
});

  return {global: globalConfig, product: productConfig, static: staticCodeLocation};
});