/**
 * PopUp Controller
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.PopUp");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.FullPage");

(function () {

  /**
   * A popup
   * @param cfg
   */
  var Popup = function (cfg, browser, cpps, errortemplate, modaltemplate, eptemplate) {
    this.cfg = cfg;
    this.br = browser;
    this.cpps = cpps;
    this.errortemplate = errortemplate;
    this.modaltemplate = modaltemplate;
    this.eptemplate = eptemplate;
    this.jrny = cfg.jrny;
    this.init();
    this.SurveySubmitted = new utils.FSEvent();
    this.NetworkError = new utils.FSEvent();
  };

  /**
   * Initialize a popup
   */
  Popup.prototype.init = function () {
    var ctx = this,
      wni = utils.getSize(window);

    // If it's a mobile device.. or if the screen width is less than 500 ..
    if (this.cfg.surveytype !== 'fullpage' && (this.br.isMobile || wni.w <= 500)) {
      this.cfg.surveytype = 'popup';
    }

    switch (this.cfg.surveytype) {
      case 'popup':
        this.survey = new survey.SurveyBuilder(this.cfg, this.cpps, this.br);
        this.chrome = new Pop(this.survey, this.cfg, this.br);
        this.chrome.SurveySubmitted.subscribe(function () {
          // Note: that's also fired when the popup is closed without submitting
          ctx.SurveySubmitted.fire();
          Singletons.onFeedbackClosed.fire();
        });
        this.chrome.show();
        break;

      case 'modal':
        if (fs.isDefined(this.chrome)) {
          this.chrome.show();
          Singletons.onFeedbackShown.fire();
        } else {
          this.survey = new survey.SurveyBuilder(this.cfg, this.cpps, this.br);
          this.chrome = new Modal(this.survey, this.br, this.cfg, this.errortemplate, this.modaltemplate, this.eptemplate);
          this.chrome.SurveySubmitted.subscribe(function () {
            ctx.SurveySubmitted.fire();
          });
          this.chrome.networkError.subscribe(function () {
            ctx.NetworkError.fire();
          });
        }
        break;

      case 'fullpage':
        if (fs.isDefined(this.chrome)) {
          this.chrome.show();
          Singletons.onFeedbackShown.fire();
        } else {
          this.survey = new survey.SurveyBuilder(this.cfg, this.cpps, this.br);
          this.chrome = new FullPageSurvey(this.survey, this.br, this.cfg, this.errortemplate, this.modaltemplate, this.eptemplate);
          this.chrome.SurveySubmitted.subscribe(function () {
            ctx.SurveySubmitted.fire();
          });
          this.chrome.networkError.subscribe(function () {
            ctx.NetworkError.fire();
          });
        }
        break;
    }
  };

  /**
   * Reveal an existing instance of the modal chrome
   */
  Popup.prototype.show = function () {
    this.chrome.show();
  };

  /**
   * Hide the chrome
   */
  Popup.prototype.remove = function () {
    if (this.chrome && this.chrome.remove) {
      this.chrome.remove();
    }
  };
})();