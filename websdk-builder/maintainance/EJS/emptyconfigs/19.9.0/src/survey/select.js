/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

import { $ } from "./dom/minidom";
import { toLowerCase } from "../fs/index";
import { questionType } from "./qtypes";
import { SurveyQuestion } from "./surveyquestion";
import { Bind } from "../utils/utils";

/**
 * Creates a SelectQuestion
 * Inherit SurveyQuestion
 * @constructor
 */
class SelectQuestion extends SurveyQuestion {
  /**
   * Bind to Select Boxes
   * @param
   */
  initSelect(qs, cfg) {
    this.initQuestion(qs, cfg);
    const ctx = this;

    const evtfn = sob => e => {
      const optionsArr = $(sob).$("option");
      const opt = $(sob).$("option")[sob.selectedIndex];
      for (let i = 0; i < optionsArr.length; i++) {
        if (opt === optionsArr[i]) {
          opt.setAttribute("selected", "selected");
        } else if (optionsArr[i].getAttribute("selected")) {
          optionsArr[i].removeAttribute("selected");
        }
      }
      ctx.answer = toLowerCase(opt.value).indexOf("choose") > -1 ? null : opt.value;
      ctx.validate();
      ctx.stateChanged.fire(ctx.cfg.id);
      e.preventDefault();
      // Hide the focus outline when using the mouse
      e.target.blur();
    };

    const sel = $(this.qs);
    const sobj = sel.$("select")[0];
    const s = sel.$("div.acs-feedback__select")[0];
    $(sobj).css({ height: `${s.offsetHeight || 38}px` });

    Bind(sobj, "feedback:change", evtfn(sobj), false);
  }

  /**
   * Update select boxes
   * @param
   */
  updateSelects() {
    const sel = $(this.qs);
    const sobj = sel.$("select")[0];
    const s = sel.$("div.acs-feedback__select")[0];
    if (sel.offsetHeight > 0) {
      $(sobj).css({ height: `${s.offsetHeight || 38}px` });
    }
  }

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  checkRule(rule) {
    return this.answer !== null && this.answer.length && this.answer == rule.answer;
  }
}

SelectQuestion.build = (qs, cfg) => {
  if (cfg.qt == questionType.SELECT) {
    // Selects
    const q = new SelectQuestion();
    q.initSelect(qs, cfg);
    return q;
  }
};

export { SelectQuestion };
