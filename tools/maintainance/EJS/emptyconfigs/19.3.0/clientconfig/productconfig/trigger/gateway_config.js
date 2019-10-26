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
    if (fsCmd("fstest")) {
      // Loads the fsradmin page, load trigger project to be able to register the product.
      this["dependencies"] = ["$fs.utils.js", "$fs.svadmin.js"];
    } else if (fsCmd("fsoptout")) {
      // Loads the opt-out interface
      this["dependencies"] = ["$fs.utils.js", "$fs.optout.js"];
    } else if (triggerconfig.hasReplay == "true") {
      if (!productConfig.record) {
        triggerconfig.hasReplay = "false";
      } else {
        // Add the recorder so it's preloaded and ready to go
        this["dependencies"].push("$fs.record.js");
      }
    }

    function readCookie(name) {
      var nameEQ = name + "=",
        ca = document.cookie.split(';'),
        c,
        i;
      for (i = 0; i < ca.length; i++) {
        c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) == 0) {
          return c.substring(nameEQ.length, c.length);
        }
      }
      return '';
    }

    var acst = readCookie('acs.t'),
      fsrr = readCookie('fsr.r'),
      fsrs = readCookie('fsr.s'),
      fsrt = readCookie('fsr.t'),
      maxCookielen = 500;

    if (acst.length > maxCookielen || fsrr.length > maxCookielen || fsrs.length > maxCookielen || fsrt.length > maxCookielen) {
      // Bomb out
      return false;
    }

    // If you want to turn things off, then set this to false instead of true
    return true;
  },

  /**
   * The dependencies to load
   */
  "dependencies": ["$fs.utils.js", "$fs.trigger.js"]
})
