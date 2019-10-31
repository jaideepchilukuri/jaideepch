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
import { questionType } from "./qtypes";
import { SurveyQuestion } from "./surveyquestion";
import { Bind, getKeyCode } from "../utils/utils";

/**
 * Creates a CheckBoxQuestion
 * Inherit SurveyQuestion
 * @constructor
 */
class CheckBoxQuestion extends SurveyQuestion {
  /**
   * Bind to radios
   * @param
   */
  initCheckBox(qs, cfg) {
    this.initQuestion(qs, cfg);
    const ctx = this;

    const changefunc = tel => e => {
      if (e) {
        e.stopPropagation();
      }

      const cbij = tel.$("label");
      for (let p = 0; p < cbij.length; p++) {
        const cbel = $(cbij[p]);
        const cbx = cbel.$("input[type=checkbox]")[0];
        if (cbx) {
          if (!cbx.checked) {
            cbel.setAttribute("aria-checked", "false");
            cbel.removeClass("acsChecked");
            if (ctx.answer) {
              let ind;
              for (let i = 0; i < ctx.answer.length; i++) {
                if (ctx.answer[i] == cbx.getAttribute("questionid")) {
                  ind = i;
                  break;
                }
              }
              if (ind >= 0) {
                ctx.answer.splice(ind, 1);
              }
            }
          } else {
            cbel.setAttribute("aria-checked", "true");
            cbel.addClass("acsChecked");
            if (ctx.answer === null) {
              ctx.answer = [cbx.getAttribute("questionid")];
            } else {
              let flag = false;
              for (let j = 0; j < ctx.answer.length; j++) {
                if (ctx.answer[j] == cbx.getAttribute("questionid")) {
                  flag = true;
                  break;
                }
              }
              if (!flag) {
                ctx.answer.push(cbx.getAttribute("questionid"));
                flag = false;
              }
            }
          }
          ctx.validate();
          ctx.stateChanged.fire(ctx.cfg.id);
        }
      }
    };

    const cbg = $(this.qs);
    const cbi = cbg.$("input[type=checkbox]");

    const stpPropagation = e => {
      e.stopPropagation();
    };

    const changeFuncCB = changefunc(cbg);

    Bind(cbg, "feedback:keydown", e => {
      e.stopPropagation();
      const keyVal = getKeyCode(e);

      if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
        e.preventDefault();
        for (let l = 0; l < cbi.length; l++) {
          if (e.target.control === cbi[l] || e.target.firstElementChild === cbi[l]) {
            cbi[l].checked = !cbi[l].checked;
            cbi[l].setAttribute("checked", cbi[l].checked);
          }
        }
        changeFuncCB();
      }
    });

    Bind(cbg, "feedback:change", changeFuncCB);

    Bind(
      cbg,
      "feedback:mousedown",
      e => {
        // Hide the focus outline when using the mouse
        e.preventDefault();
        e.target.blur();
      },
      true
    );

    Bind(cbg, "feedback:click", stpPropagation);
  }

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  checkRule(rule) {
    if (this.answer !== null && this.answer.length > 0) {
      for (let i = 0; i < this.answer.length; i++) {
        if (this.answer[i] == rule.answer) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  getAnswer() {
    if (this.cfg.isVisible && this.answer !== null && this.answer.length > 0) {
      const rtn = [];
      for (let i = 0; i < this.answer.length; i++) {
        rtn.push({
          questionId: this.cfg.id,
          answerId: this.answer[i],
        });
      }
      return rtn;
    }
    return false;
  }
}

CheckBoxQuestion.build = (qs, cfg) => {
  if (cfg.qt == questionType.CHECKBOX) {
    // CheckBox
    const q = new CheckBoxQuestion();
    q.initCheckBox(qs, cfg);
    return q;
  }
};

export { CheckBoxQuestion };
