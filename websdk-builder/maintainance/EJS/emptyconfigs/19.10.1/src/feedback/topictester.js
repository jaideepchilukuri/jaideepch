/**
 * Evaluates topics
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { toLowerCase } from "../fs/index";
import { testAgainstSearch } from "../utils/utils";

/**
 * Validates topics
 */
const checkTopicAllowed = tp => {
  let url = window._acsURL || window.location.toString();
  url = toLowerCase(url);

  /**
   * Test a regex against a url
   */
  function testUrlReg(tpex) {
    if (!Array.isArray(tpex)) {
      return false;
    }
    for (let i = 0; i < tpex.length; i++) {
      // Did we pass?
      if (testAgainstSearch(tpex[i], url)) {
        // Great, tell the world
        return true;
      }
    }
    return false;
  }

  // Check if we meet Whitelist and Blacklist requirements
  return (
    (!tp.whitelistActive || testUrlReg(tp.whitelistData)) &&
    (!tp.blacklistActive || !testUrlReg(tp.blacklistData))
  );
};

export { checkTopicAllowed };
