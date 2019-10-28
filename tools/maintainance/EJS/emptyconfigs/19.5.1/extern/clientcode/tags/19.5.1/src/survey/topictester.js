/**
 * Evaluates topics
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("sv.TopicTester");

(function () {
  /**
   * Validates topics
   */
  var TopicTester = function (tp) {
    var url = window._acsURL || window.location.toString(),
      i;

    url = fs.toLowerCase(url);

    /**
     * Test a regex against a url
     */
    function testUrlReg(tpex) {
      if (!fs.isArray(tpex)) {
        return false;
      }
      for (i = 0; i < tpex.length; i++) {
        // Did we pass?
        if (utils.testAgainstSearch(tpex[i], url)) {
          // Great, tell the world
          return true;
        }
      }
      return false;
    }

    // Check if we meet Whitelist and Blacklist requirements
    return (!tp.whitelistActive || testUrlReg(tp.whitelistData)) && (!tp.blacklistActive || !testUrlReg(tp.blacklistData));
  };

})();