/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.Classes.Select");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");
(function () {
  /**
   * Creates a SelectQuestion
   * Inherit SurveyQuestion
   * @constructor
   */
  Classes.SelectQuestion = function () {};
  Classes.SelectQuestion.prototype = new SurveyQuestion();

  /**
   * Bind to Select Boxes
   * @param
   */
  Classes.SelectQuestion.prototype.initSelect = function (qs, cfg) {
    this.initQuestion(qs, cfg);
    var ctx = this,
      evtfn = function (dv, sob) {
        return function (e) {
          var opt = $(sob).$('option')[sob.selectedIndex];
          dv.innerHTML = opt.innerHTML;
          ctx.answer = (fs.toLowerCase(opt.value).indexOf('choose') > -1) ? null : opt.value;
          ctx.validate();
          ctx.stateChanged.fire(ctx.cfg.id);
          e.stopPropagation();
        };
      },
      sel = $(this.qs),
      sobj  = sel.$("select")[0],
      sdisp = sel.$("div.acs-feedback__select-button")[0],
      s = sel.$("div.acs-feedback__select")[0];
    $(sobj).css({'height': (s.offsetHeight || 38) + 'px'});
    utils.Bind(sobj, "feedback:change", evtfn(sdisp, sobj), false);
  };

  /**
   * Update select boxes
   * @param
   */
  Classes.SelectQuestion.prototype.updateSelects = function () {
    var sel = $(this.qs),
      sobj = sel.$("select")[0],
      s = sel.$("div.acs-feedback__select")[0];
    if (sel.offsetHeight > 0) {
      $(sobj).css({'height': (s.offsetHeight || 38) + 'px'});
    }
  };

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  Classes.SelectQuestion.prototype.checkRule = function (rule) {
    return this.answer !== null && this.answer.length && this.answer == rule.answer;
  };
})();