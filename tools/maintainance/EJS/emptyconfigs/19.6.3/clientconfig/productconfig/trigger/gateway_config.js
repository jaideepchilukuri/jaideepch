({

  /**
   * Describes whether this module is to be used or not. Can be a function that returns a boolean
   * or it can just be a boolean.
   */
  "check": function () {
    // This next line is where all the properties and survey defs are inserted.
    /**
     * @preserve
     * @@CONFIG_GOES_HERE@@
     */

    // Unless you are turning everything OFF, leave all this stuff alone:
    if (triggerconfig.hasReplay == "true") {
      if (!productConfig.record) {
        triggerconfig.hasReplay = "false";
      } else {
        // Add the recorder so it's preloaded and ready to go
        this["dependencies"].push("$fs.record.js");
      }
    }

    // If you want to turn things off, then set this to false instead of true
    return true;
  },

  /**
   * The dependencies to load
   */
  "dependencies": ["$fs.utils.js", "$fs.trigger.js"]
})
