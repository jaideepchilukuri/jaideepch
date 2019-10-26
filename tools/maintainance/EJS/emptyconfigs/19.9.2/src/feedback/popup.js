/**
 * PopUp Controller
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { FullPageSurvey } from "./fullpage";
import { Modal } from "./modal";
import { Pop } from "./pop";
import { Singletons } from "./top";
import { isDefined } from "../fs/index";
import { Survey } from "../survey/survey";
import { FSEvent } from "../utils/utils";

/**
 * A popup
 * @param cfg
 */
class Popup {
  constructor(cfg, browser, cpps, errortemplate, modaltemplate, eptemplate) {
    this.cfg = cfg;
    this.br = browser;
    this.cpps = cpps;
    this.errortemplate = errortemplate;
    this.modaltemplate = modaltemplate;
    this.eptemplate = eptemplate;
    this.jrny = cfg.jrny;
    this.init();
    this.SurveySubmitted = new FSEvent();
    this.NetworkError = new FSEvent();
  }

  /**
   * Initialize a popup
   */
  init() {
    const ctx = this;

    switch (this.cfg.surveytype) {
      case "popup":
        this.survey = new Survey(this.cfg, this.cpps, this.br);
        this.chrome = new Pop(this.survey, this.cfg, this.br);
        this.chrome.SurveySubmitted.subscribe(() => {
          // Note: that's also fired when the popup is closed without submitting
          ctx.SurveySubmitted.fire();
          Singletons.onFeedbackClosed.fire();
        });
        this.chrome.show();
        break;

      case "modal":
        if (isDefined(this.chrome)) {
          this.chrome.show();
          Singletons.onFeedbackShown.fire();
        } else {
          this.survey = new Survey(this.cfg, this.cpps, this.br);
          this.chrome = new Modal(
            this.survey,
            this.br,
            this.cfg,
            this.errortemplate,
            this.modaltemplate,
            this.eptemplate
          );
          this.chrome.SurveySubmitted.subscribe(() => {
            ctx.SurveySubmitted.fire();
          });
          this.chrome.networkError.subscribe(() => {
            ctx.NetworkError.fire();
          });
        }
        break;

      case "fullpage":
        if (isDefined(this.chrome)) {
          this.chrome.show();
          Singletons.onFeedbackShown.fire();
        } else {
          this.survey = new Survey(this.cfg, this.cpps, this.br);
          this.chrome = new FullPageSurvey(
            this.survey,
            this.br,
            this.cfg,
            this.errortemplate,
            this.modaltemplate,
            this.eptemplate
          );
          this.chrome.SurveySubmitted.subscribe(() => {
            ctx.SurveySubmitted.fire();
          });
          this.chrome.networkError.subscribe(() => {
            ctx.NetworkError.fire();
          });
        }
        break;

      default:
        throw new Error(`Unknown feedback surveytype: ${this.cfg.surveytype}`);
    }
  }

  /**
   * Reveal an existing instance of the modal chrome
   */
  show() {
    this.chrome.show();
  }

  /**
   * Hide the chrome
   */
  remove() {
    if (this.chrome && this.chrome.remove) {
      this.chrome.remove();
    }
  }
}

export { Popup };
