/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

import { $ } from "./dom/minidom";
import { questionType } from "./qtypes";
import { FSEvent } from "../utils/utils";

/**
 * Deals with displaying and/or updating the state of a single question.
 * @constructor
 */
class SurveyQuestion {
  /**
   * This is a common function used by all subclasses.
   * It inits a bunch of common functionality/config.
   * @param qs DOMElement - DOM markup for the question
   * @param cfg Object - the config object for the question.
   */
  initQuestion(qs, cfg) {
    this.qs = qs;
    this.cfg = cfg;

    // Whether this is a persistent quesiton or not.
    this.cfg.isPersistent = !!$(this.qs).hasClass("acs-persistent__block");

    // Keep track of whether the question is visible or not.
    this.cfg.isVisible = !!this.cfg.isPersistent;

    // Required-to-be-answered logic.
    this.cfg.isRequired =
      cfg.r === "1" || (this.cfg.isPersistent && this.cfg.qt == questionType.STAR);

    if (this.cfg.rules_info && this.cfg.rules_info.length > 0) {
      let temp = this.cfg.rules_info.replace(/&amp;/g, "&");
      temp = temp.replace(/&quot;/g, '"');
      this.cfg.rules = JSON.parse(temp);
    } else {
      this.cfg.rules = [];
    }
    // Keep track of current answer.
    this.answer = null;
    // Trigger a state changed event whenever a question's state changes.
    this.stateChanged = new FSEvent();
  }

  /**
   * Hides the question
   */
  hide() {
    this.cfg.isVisible = false;
    if (!this.cfg.isPersistent) {
      $(this.qs).addClass("acs-feedback__block--hidden");
    }
  }

  /**
   * Shows the question
   */
  show() {
    this.cfg.isVisible = true;
    if (!this.cfg.isPersistent) {
      $(this.qs).removeClass("acs-feedback__block--hidden");
    }
  }

  /**
   * Validation
   */
  validate() {
    let rtn = true;
    if (this.cfg.isVisible) {
      if (this.cfg.isRequired) {
        rtn = this.answer !== null && this.answer.length > 0;
      }
      if (!rtn) {
        $(this.qs).addClass("acs-feedback__block--invalid");
      } else {
        $(this.qs).removeClass("acs-feedback__block--invalid");
      }
    }
    return rtn;
  }

  /**
   * Supports single answer types. To be overriden when needed.
   */
  getAnswer() {
    if (this.cfg.isVisible && this.answer && this.answer !== null) {
      return { questionId: this.cfg.id, answerId: this.answer };
    } else {
      return false;
    }
  }
}

export { SurveyQuestion };
