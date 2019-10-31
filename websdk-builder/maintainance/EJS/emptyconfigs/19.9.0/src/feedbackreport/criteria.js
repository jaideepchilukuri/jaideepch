/**
 * Criteria Checker
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Criteria checker
 * @constructor
 */
class Criteria {
  constructor(browser, cfg) {
    this.br = browser;
    this.cfg = cfg;
  }

  /**
   * Is the platform ok?
   */
  platformOK() {
    const cfg = this.cfg;
    const br = this.br;

    // Return false if it's on the unsupported list and the version is too old
    if (
      cfg.browser_cutoff[br.browser.name] &&
      br.browser.actualVersion < cfg.browser_cutoff[br.browser.name]
    ) {
      return false;
    }
    if (cfg.platform_cutoff[br.os.name] && br.os.version < cfg.platform_cutoff[br.os.name]) {
      return false;
    }
    return true;
  }
}

export { Criteria };
