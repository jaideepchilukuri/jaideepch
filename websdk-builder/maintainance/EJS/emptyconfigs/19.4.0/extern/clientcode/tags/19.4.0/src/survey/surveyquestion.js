/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.SurveyQuestion");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");

(function () {
  /**
   * Deals with displaying and/or updating the state of a single question.
   * @constructor
   */
  SurveyQuestion = function () {};

  /**
   * This is a common function used by all subclasses.
   * It inits a bunch of common functionality/config.
   * @param qs DOMElement - DOM markup for the question
   * @param cfg Object - the config object for the question.
   */
  SurveyQuestion.prototype.initQuestion = function (qs, cfg) {
    this.qs = qs;
    this.cfg = cfg;

    // Whether this is a persistent quesiton or not.
    this.cfg.isPersistent = ($(this.qs).hasClass('acs-persistent__block')) ? true : false;

    // Keep track of whether the question is visible or not.
    this.cfg.isVisible = (this.cfg.isPersistent) ? true : false;

    // Required-to-be-answered logic.
    this.cfg.isRequired = (cfg.r === "1") || (this.cfg.isPersistent && this.cfg.qt == Classes.questionType.STAR);

    // To-Do, remove this once fixed..
    this.cfg.isRequired = (this.cfg.isPersistent && this.cfg.qt == Classes.questionType.SELECT) ? false : this.cfg.isRequired;

    if (this.cfg.rules_info && this.cfg.rules_info.length > 0) {
      var temp = this.cfg.rules_info.replace(/&amp;/g, '&');
      temp = temp.replace(/&quot;/g, '"');
      this.cfg.rules = JSON.parse(temp);
    } else {
      this.cfg.rules = [];
    }
    // Keep track of current answer.
    this.answer = null;
    // Trigger a state changed event whenever a question's state changes.
    this.stateChanged = new utils.FSEvent();
  };

  /**
   * Hides the question
   */
  SurveyQuestion.prototype.hide = function() {
    this.cfg.isVisible = false;
    if(!this.cfg.isPersistent) {
      $(this.qs).addClass('acs-feedback__block--hidden');
    }
  };

  /**
   * Shows the question
   */
  SurveyQuestion.prototype.show = function() {
    this.cfg.isVisible = true;
    if(!this.cfg.isPersistent) {
      $(this.qs).removeClass('acs-feedback__block--hidden');
    }
  };

  /**
   * Factory Pattern logic. Creates appropriate questions
   * @param qs markup
   * @param cfg Object config
   */
  SurveyQuestion.prototype.getQuestion = function (qs, cfg) {
    var q;
    if (cfg.qt == Classes.questionType.TEXTAREA && cfg.dt == 2) {
      // TextAreas
      q = new Classes.TextAreaQuestion();
      q.initTextArea(qs, cfg);
    } else if (cfg.qt == Classes.questionType.TEXTAREA && cfg.dt == 1) {
      // Text Inputs
      q = new Classes.InputTextQuestion();
      q.initInputText(qs, cfg);
    } else if (cfg.qt == Classes.questionType.SELECT) {
      // Selects
      q = new Classes.SelectQuestion();
      q.initSelect(qs, cfg);
    } else if (cfg.qt == Classes.questionType.RADIO) {
      // Radio
      q = new Classes.RadioQuestion();
      q.initRadio(qs, cfg);
    } else if (cfg.qt == Classes.questionType.STAR) {
      // Star rating.
      q  = new Classes.StarQuestion();
      q.initStarRating(qs, cfg);
    } else if (cfg.qt == Classes.questionType.CHECKBOX) {
      // CheckBox
      q  = new Classes.CheckBoxQuestion();
      q.initCheckBox(qs, cfg);
    }

    if(q) {
      return q;
    } else {
      return null;
    }
  };

  /**
   * Validation
   */
  SurveyQuestion.prototype.validate = function () {
    var rtn = true;
    if (this.cfg.isVisible) {
      if (this.cfg.isRequired) {
        rtn = (this.answer !== null && this.answer.length > 0);
      }
      if(!rtn) {
        $(this.qs).addClass('acs-feedback__block--invalid');
      } else {
        $(this.qs).removeClass('acs-feedback__block--invalid');
      }
    }
    return rtn;
  };

  /**
  * Supports single answer types. To be overriden when needed.
  */
  SurveyQuestion.prototype.getAnswer = function () {
    if(this.cfg.isVisible && this.answer && this.answer !== null) {
      return {"questionId":this.cfg.id, "answerId":this.answer};
    } else {
      return false;
    }
  };

})();