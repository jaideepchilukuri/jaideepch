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
  Classes.SelectQuestion = function () { };
  Classes.SelectQuestion.prototype = new SurveyQuestion();

  /**
   * Bind to Select Boxes
   * @param
   */
  Classes.SelectQuestion.prototype.initSelect = function (qs, cfg) {
    this.initQuestion(qs, cfg);
    var ctx = this,
      evtfn = function (sob) {
        return function (e) {
          var optionsArr = $(sob).$('option');
          var opt = $(sob).$('option')[sob.selectedIndex];
          for (var i = 0; i < optionsArr.length; i++) {
            if (opt === optionsArr[i]) {
              opt.setAttribute("selected", "selected");
            } else if (optionsArr[i].getAttribute("selected")) {
              optionsArr[i].removeAttribute("selected");
            }
          }
          ctx.answer = (fs.toLowerCase(opt.value).indexOf('choose') > -1) ? null : opt.value;
          ctx.validate();
          ctx.stateChanged.fire(ctx.cfg.id);
          e.preventDefault();
          // Hide the focus outline when using the mouse
          e.target.blur();
        };
      },
      sel = $(this.qs),
      sobj = sel.$("select")[0],
      s = sel.$("div.acs-feedback__select")[0];
    $(sobj).css({ 'height': (s.offsetHeight || 38) + 'px' });

    utils.Bind(sobj, "feedback:change", evtfn(sobj), false);
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
      $(sobj).css({ 'height': (s.offsetHeight || 38) + 'px' });
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