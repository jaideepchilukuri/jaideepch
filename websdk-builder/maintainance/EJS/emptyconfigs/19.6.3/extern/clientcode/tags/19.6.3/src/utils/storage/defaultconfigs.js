/**
 * Provides various default configurations
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 */

fs.provide("fs.Utils.defaultConfigs");

fs.require("fs.Top");

(function (utils) {

  utils.defaultConfigs = {
    global: {
      storage: "COOKIE",
      alwaysOnLatest: 1,
      cookieSecure: false,
      deferredLoading: false,
      products: {
        trigger: false,
        feedback: false,
        record: false
      }
    },

    survey: {
      devices: {
        overridesEnabled: true,
        desktop: {
          icon: "aspark100.png",
          fbtype: "badge",
          surveytype: "popup",
          disabled: true,
          size: "medium",
          fbsize: "medium"
        },
        mobile: {
          icon: "aspark100.png",
          fbtype: "badge",
          surveytype: "popup",
          disabled: true,
          size: "medium",
          fbsize: "medium"
        },
        tablet: {
          icon: "aspark100.png",
          fbtype: "badge",
          surveytype: "popup",
          popup: true,
          disabled: true,
          fbsize: "medium",
          size: "medium",
          fbdirection: "horizontal",
          fblocation: "middleleft"
        }
      },
      icon: "aspark100.png",
      delay: 0,
      template: "default",
      fblocation: "bottomleft",
      fbtype: "badge",
      disabled: false,
      fbanimate: false,
      fbfixed: true,
      fbdirection: "horizontal",
      surveytype: "popup",
      replay: true,
      fbcolor: "#f1c40f",
      isExistingSurveyDisabled: true,
      saved: true,
      whitelistActive: false,
      blacklistActive: false,
      whitelistData: [],
      blacklistData: []
    }
  };

})(utils);