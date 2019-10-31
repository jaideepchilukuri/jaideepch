/**
 * Preview Badge
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 */

fs.provide("fs.PreviewBadge");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.GlobalLoader");

(function () {

  /**
   */
  var PreviewBadge = function (cfg, browser, cpps, mode) {
    this.cfg = cfg;
    // Keep track of the browser
    this.br = browser;
    this.cpps = cpps;
    // Backward compatibility, older surveys don't have this data.
    this.cfg.template = (typeof this.cfg.template !== 'undefined') ? this.cfg.template : 'default';
    this.cfg.surveytype = (typeof this.cfg.surveytype !== 'undefined') ? this.cfg.surveytype : 'modal';
    this.cfg.fbcolor = (typeof this.cfg.fbcolor !== 'undefined') ? this.cfg.fbcolor : '#F24554';
    this.cfg.fbcolortext = (typeof this.cfg.fbcolortext !== 'undefined') ? this.cfg.fbcolortext : '#FFFFFF';
    this.cfg.replay = (typeof this.cfg.replay !== 'undefined') ? this.cfg.replay : false;
  };

  /**
   * Show the badge
   * @private
   */
  PreviewBadge.prototype.renderBadge = function () {
    var gl = new GlobalLoader(this.br, this.cpps, [this.cfg.template]);
    gl.loadSuccess.subscribe(fs.proxy(function (tmp) {
      /* jshint ignore:start */
      var template = tmp[this.cfg.template];
      /* pragma:DEBUG_START */
      console.warn("fb: rendering badge..");
      /* pragma:DEBUG_END */
      this.cfg.badge = new ButtonBadge(this.cfg, this.br, this.cpps, template.typeTemplate, template.emTemplate, false);
      this.cfg.badge.setBtnTemplate();
      /* jshint ignore:end */
    }, this));

    gl.loadFailure.subscribe(fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("fb: rendering badge failed..");
      /* pragma:DEBUG_END */
    }));
  };

})();