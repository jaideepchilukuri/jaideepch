/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.Classes.TextArea");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");
(function () {
  /**
   * Creates a TextAreaQuestion
   * Inherit SurveyQuestion
   * @constructor
   */
  Classes.TextAreaQuestion = function () {
  };
  Classes.TextAreaQuestion.prototype = new SurveyQuestion();

  /**
   * Bind to text areas
   * @param
   */
  Classes.TextAreaQuestion.prototype.initTextArea = function (qs, cfg) {
    this.initQuestion(qs, cfg);
    var tobj = this.qs.$("textarea")[0];
    this.maxlen = parseInt(tobj.getAttribute("acsmaxlength"), 10);
    var ctx = this,
      keyupfunc = function (mxln) {
        return function (e) {
          e.stopPropagation();
          var targ = e.target || e.srcElement,
            actlen = targ.value.replace(/\s+/g, " ").length,
            remd = mxln - actlen,
            sel = $(targ.parentNode),
            lbl = sel.$(".acs-feedback__textarea--count")[0];

          lbl.innerHTML = Math.max(0, remd);

          if (remd < 0) {
            targ.value = targ.value.substr(0, targ.value.length + remd);
            return false;
          }
          else {
            ctx.answer = targ.value;
            ctx.validate();
            ctx.stateChanged.fire(ctx.cfg.id);
          }
        };
      }(this.maxlen),
      keydownfunc = function (mxln) {
        return function (e) {
          e.stopPropagation();
          var targ = e.target || e.srcElement,
            actlen = targ.value.replace(/\s+/g, " ").length,
            remd = mxln - actlen - 1,
            kc = e.keyCode;

          if (remd < 0 && kc != 8 && kc != 16 && !(kc >= 37 && kc <= 41)) {
            e.preventDefault();
            return false;
          }
        };
      }(this.maxlen),
      keypressfunc = function (e) {
        e.stopPropagation();
      };

    // Limit # of chars on the text field
    if (/^[0-9]+$/.test(tobj.getAttribute("acsmaxlength"))) {
      utils.Bind(tobj, "feedback:keydown", keydownfunc);
      utils.Bind(tobj, "feedback:keyup", keyupfunc);
      // Needed for Bluebird, don't let the event bubble up after capture.
      utils.Bind(tobj, "feedback:keypress", keypressfunc);
    }
  };
  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  Classes.TextAreaQuestion.prototype.checkRule = function (rule) {
    var rtn = false;
    if (this.answer !== null && this.answer.length > 0) {
      switch (rule.operator) {
        case 'equals':
          rtn = (rule.answer == this.answer);
          break;
        case 'contains':
          rtn = (fs.toLowerCase(this.answer).indexOf(fs.toLowerCase(rule.answer)) > -1);
          break;
      }
    }
    return rtn;
  };

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  Classes.TextAreaQuestion.prototype.getAnswer = function () {
    if (this.cfg.isVisible && this.answer !== null && this.answer.length > 0) {
      var tvalb = this.answer.replace(/\s+/g, " ");
      if (tvalb == ' ') {
        return false;
      }
      return {questionId: this.cfg.id, answerText: surveyUtils.cleanUpText(tvalb)};
    }
    return false;
  };
})();