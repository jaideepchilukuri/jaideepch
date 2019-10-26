/**
 * Pops the survey in a new window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Pop");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");

(function () {

  /**
   * Pops a survey in a new window
   * @param survey
   * @constructor
   */
  var Pop = function (survey, cfg, browser) {
    this.height = 600;
    this.width = 400;
    this.survey = survey;
    this.cfg = cfg;
    this.cpps = survey.cpps;
    this.SurveySubmitted = new utils.FSEvent();
    this.br = browser;
    this.jrny = cfg.jrny;
    this.networkError = utils.FSEvent();
  };

  /**
   * Pass along any relevant CxReplay parameters
   * @private
   */
  Pop.prototype._getCXRParams = function () {
    var fstr = "";
    // Do cxReplay session ID's only if we're not in blacklist mode
    if (this.cfg.replay === true && typeof _recordController !== 'undefined' && _recordController.recorder) {
      fstr += "cxrid=" + fs.enc(_recordController.recorder.getGlobalId()) + "&cxrurl=" + fs.enc(fs.config.recUrl);
    }
    return fstr;
  };

  /**
   * Start a new window
   */
  Pop.prototype.show = function () {
    if (!this.winRef) {
      var cppo = (!!this.cfg.preview) ? null : JSON.stringify(this.cpps.all()),
        cxrStr = this._getCXRParams(),
        ctx = this,
        wref = window,
        generalConfig = {
          global: fs.config,
          product: Singletons.config
        },
        inf = '&_gwl_=' + fs.enc(fs.home) + '&_cv_=' + fs.enc(fs.config.codeVer) + '&_au_=' + fs.enc(fs.config.analyticsUrl) + '&_vt_=' + fs.enc(fs.tagVersion) + '&_issh_=' + fs.enc(fs.isSelfHosted) + '&_pa_=' + fs.enc(fs.assetLocation) + (!!fs.codeLocation ? '&_cl_=' + fs.enc(fs.codeLocation) : '') + '&_gcfg_=' + fs.enc(utils.Compress.compress(JSON.stringify(generalConfig))),
        url = (!!this.cfg.preview) ?
          fs.makeURI("$fs.feedbacksurvey.html?mid=" + fs.enc(this.survey.cfg.mid) + "&t=" + fs.enc(this.cfg.template || 'default') + "&datauri=" + fs.getParam('datauri') + '&ns=' + fs.enc('preview') + inf)
          : fs.makeURI("$fs.feedbacksurvey.html?mid=" + fs.enc(this.survey.cfg.mid) + "&t=" + fs.enc(this.cfg.template || 'default') + "&fsUrl=" + fs.enc(wref.location.href) + '&cid=' + fs.enc(this.jrny.data.customerId) + '&uid=' + fs.enc(this.jrny.data.userId) + '&cpps=' + fs.enc(utils.Compress.compress(cppo)) + '&ns=' + fs.enc('site_id') + inf + "&" + cxrStr);

      if (this.br.isIE && this.br.browser.actualVersion <= 11) {
        // FORCE https (needed for ie and mob)
        if (url.substr(0, 2) == '//') {
          url = 'https:' + url;
        }
        if (url.substr(0, 4) == 'http') {
          url.replace('http', 'https');
        }
      }

      // If this is preview and we're in an iFrame..
      if (!!this.cfg.preview && (wref !== wref.top || wref.location.toString().indexOf('fscommand=feedbackpreview') > -1)) {
        wref.location.href = url;
      } else {
        this.winRef = wref.open(url, '_system');
        this._checker = setInterval(function () {
          try {
            var hsh = ctx.winRef.location + '',
              locm = 'fsSurveyComplete=';

            if (hsh.indexOf(locm) > -1) {
              clearInterval(ctx._checker);
              var fsData = utils.Compress.decompress(decodeURIComponent(hsh.substr(hsh.indexOf(locm) + locm.length)));
              Singletons.onFeedbackSubmitted.fire(JSON.parse(fsData));
              ctx.SurveySubmitted.fire(JSON.parse(fsData));
            }
          } catch (e) {
            clearInterval(ctx._checker);
            ctx.SurveySubmitted.fire();
          }
        }, 500);
      }
    }
  };

})();