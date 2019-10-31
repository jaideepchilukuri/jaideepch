({

  /**
   * Describes whether this module is to be used or not. Can be a function that returns a boolean
   * or it can just be a boolean.
   */
  "check": function () {
    // Minimum HTML5 compatible browser
    if (typeof (Uint8Array) == 'undefined') {
      return;
    }

    /**
     * @preserve
     * @@CONFIG_GOES_HERE@@
     */

    // Used for legacy implementations
    if (typeof (recconfig) != 'undefined') {
      var config = recconfig;
    }

    /**
     * A generic configuration module that other modules may include
     */
    _fsDefine('recordconfig', function () {
      /**
       * Export all the config
       */
      return config;
    });

    return true;
  },

  /**
   * The dependencies to load
   */
  "dependencies": ["$fs.record.js", "$fs.utils.js"]
})