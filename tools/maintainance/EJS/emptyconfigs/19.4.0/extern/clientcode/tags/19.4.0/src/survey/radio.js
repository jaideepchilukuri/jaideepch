/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.Classes.Radio");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");

(function () {
  /**
   * Creates a RadioQuestion
   * Inherit SurveyQuestion
   * @constructor
   */
  Classes.RadioQuestion = function () {};
  Classes.RadioQuestion.prototype = new SurveyQuestion();

  /**
   * Bind to radios
   * @param
   */
  Classes.RadioQuestion.prototype.initRadio = function (qs, cfg) {
    this.initQuestion(qs, cfg);
    var ctx = this;
    var changefunc = function (fbblock) {
        return function (e) {
          e.stopPropagation();
          var cbij = fbblock.$("label");
          for (var p = 0; p < cbij.length; p++) {
            var cbel = $(cbij[p]),
              cbx = cbel.$("input[type=radio]")[0];
            if(cbx) {
              if (cbx.checked) {
                cbel.addClass("acsChecked");
                ctx.answer = [{answerId: cbx.value, answerText: cbx.getAttribute('label'), questionId: ctx.cfg.id}];
              } else {
                cbel.removeClass("acsChecked");
              }
              ctx.validate();
              ctx.stateChanged.fire(ctx.cfg.id);
            }
          }
        };
      },
      cbg = $(this.qs),
      cbi = cbg.$("input[type=radio]"),
      cbl = cbg.$("label"),
      stpPropagation = function (e) {
        e.stopPropagation();
      };

    for (var k = 0; k < cbi.length; k++) {
      utils.Bind(cbi[k], "feedback:change", changefunc(cbg));
    }

    // Needed for Bluebird.
    for (var l = 0; l < cbl.length; l++) {
      utils.Bind(cbl[l], "feedback:click", stpPropagation);
    }
  };
  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  Classes.RadioQuestion.prototype.checkRule = function (rule) {
    return this.answer !== null && this.answer[0].answerId == rule.answer;
  };

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  Classes.RadioQuestion.prototype.getAnswer = function () {
    return (this.cfg.isVisible && this.answer !== null && this.answer.length > 0) ? this.answer[0] : false;
  };
})();