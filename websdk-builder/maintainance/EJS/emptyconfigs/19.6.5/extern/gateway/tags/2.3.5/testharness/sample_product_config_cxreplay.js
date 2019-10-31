({
  /**
   * Describes whether this module is to be used or not. Can be a function that returns a boolean
   * or it can just be a boolean.
   */
  "check": function () {
    console.log("Hi Im cxr check");
    // If you want to turn things off, then set this to false instead of true
    return true;
  },

  /**
   * The dependencies to load
   */
  "dependencies": ["$fs.utils.js", "$fs.record.js"]
})
