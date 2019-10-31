({
  /**
   * Describes whether this module is to be used or not. Can be a function that returns a boolean
   * or it can just be a boolean.
   */
  check: function() {
    // Sets up an empty configuration object
    var config = {};
    /**
     * @preserve
     * @@CONFIG_GOES_HERE@@
     */

    /**
     * A generic configuration module that other modules may include
     */
    _fsDefine("feedbackconfig", function() {
      // Turn off all replay instances if there is no replay configuration
      if (config.instances && (!productConfig.record || typeof Uint8Array == "undefined")) {
        for (var i = 0; i < config.instances.length; i++) {
          config.instances[i].replay = false;
        }
      }
      if (config.instances && typeof Uint8Array !== "undefined") {
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
    if (supportsDomStorage && sessionStorage.getItem("acsFeedbackSubmitted") == "true") {
      // Feedback has been submitted already, don't load the feedback script
      return false;
    }

    // If we're using cxReplay then load it
    if (config.cxReplay && productConfig.record) {
      this["dependencies"].push("$fs.record.js");
    } else {
      config.cxReplay = false;
    }
    return true;
  },

  /**
   * The dependencies to load
   */
  dependencies: ["$fs.feedback.js", "$fs.survey.js"],
});
