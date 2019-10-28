/**
 * Preview Badge
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 */

import { GlobalLoader } from "./globalloader";
import { ButtonBadge } from "./ui/badge";

/**
 */
class PreviewBadge {
  constructor(cfg, browser, cpps) {
    this.cfg = cfg;
    // Keep track of the browser
    this.br = browser;
    this.cpps = cpps;
    // Backward compatibility, older surveys don't have this data.
    this.cfg.template = typeof this.cfg.template !== "undefined" ? this.cfg.template : "default";
    this.cfg.surveytype =
      typeof this.cfg.surveytype !== "undefined" ? this.cfg.surveytype : "modal";
    this.cfg.fbcolor = typeof this.cfg.fbcolor !== "undefined" ? this.cfg.fbcolor : "#F24554";
    this.cfg.fbcolortext =
      typeof this.cfg.fbcolortext !== "undefined" ? this.cfg.fbcolortext : "#FFFFFF";
    this.cfg.replay = typeof this.cfg.replay !== "undefined" ? this.cfg.replay : false;
  }

  /**
   * Show the badge
   * @private
   */
  renderBadge() {
    const gl = new GlobalLoader(this.br, this.cpps, [this.cfg.template]);
    gl.loadSuccess.subscribe(tmp => {
      /* jshint ignore:start */
      const template = tmp[this.cfg.template];
      /* pragma:DEBUG_START */
      console.warn("fb: rendering badge..");
      /* pragma:DEBUG_END */
      this.cfg.badge = new ButtonBadge(
        this.cfg,
        this.br,
        this.cpps,
        template.typeTemplate,
        template.emTemplate,
        false
      );
      this.cfg.badge.setBtnTemplate();
      /* jshint ignore:end */
    });

    gl.loadFailure.subscribe(() => {
      /* pragma:DEBUG_START */
      console.warn("fb: rendering badge failed..");
      /* pragma:DEBUG_END */
    });
  }
}

export { PreviewBadge };
