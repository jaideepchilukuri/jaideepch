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
 * Creates a RadioQuestion
 * Inherit SurveyQuestion
 * @constructor
 */
class RadioQuestion extends SurveyQuestion {
  /**
   * Bind to radios
   * @param
   */
  initRadio(qs, cfg) {
    this.initQuestion(qs, cfg);
    const ctx = this;
    const changefunc = fbblock => radioInput => {
      const cbij = fbblock.$("label");
      for (let p = 0; p < cbij.length; p++) {
        const cbel = $(cbij[p]);
        const cbx = cbel.$("input[type=radio]")[0];
        if (cbx) {
          // The second half of this condition works because cbx will always be positive in this conditional
          if (cbx.checked || cbx === radioInput) {
            cbel.addClass("acsChecked");
            cbel.setAttribute("aria-checked", "true");
            ctx.answer = [
              {
                answerId: cbx.value,
                answerText: cbx.getAttribute("label"),
                questionId: ctx.cfg.id,
              },
            ];
          } else {
            cbel.removeClass("acsChecked");
            cbel.setAttribute("aria-checked", "false");
          }
          ctx.validate();
          ctx.stateChanged.fire(ctx.cfg.id);
        }
      }
    };

    const cbg = $(this.qs);
    const cbi = cbg.$("input[type=radio]");
    const cbl = cbg.$("label");

    const stpPropagation = e => {
      e.stopPropagation();
    };

    const changeFuncCB = changefunc(cbg);

    Bind(cbg, "feedback:keydown", e => {
      const keyVal = getKeyCode(e);
      // Only enter this conditional if the user has hit enter;
      e.stopPropagation();
      let radioInput;
      if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
        e.preventDefault();
        for (let k = 0; k < cbi.length; k++) {
          if (e.target.control === cbi[k] || e.target.firstElementChild === cbi[k]) {
            cbi[k].checked = true;
            cbi[k].setAttribute("checked", true);
            radioInput = cbi[k];
          } else {
            cbi[k].checked = false;
          }
        }
        changeFuncCB(radioInput);
      } else if (keyVal === "arrowleft" || keyVal === "arrowright") {
        const currentNode = e.target;
        const childrenArr = e.target.parentNode.children;
        const labelArrLength = childrenArr.length - 1;
        let setNode;

        for (let i = 0; i <= labelArrLength && !setNode; i++) {
          if (childrenArr[i] === currentNode) {
            if (keyVal === "arrowright") {
              setNode = i + 1 > labelArrLength ? 0 : i + 1;
            } else {
              setNode = i - 1 < 0 ? labelArrLength : i - 1;
            }
            childrenArr[setNode].focus();
          }
        }
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

    for (let l = 0; l < cbl.length; l++) {
      Bind(cbl[l], "feedback:click", stpPropagation);
    }
  }

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  checkRule(rule) {
    return this.answer !== null && this.answer[0].answerId == rule.answer;
  }

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  getAnswer() {
    return this.cfg.isVisible && this.answer !== null && this.answer.length > 0
      ? this.answer[0]
      : false;
  }
}

RadioQuestion.build = (qs, cfg) => {
  if (cfg.qt == questionType.RADIO) {
    // Radio
    const q = new RadioQuestion();
    q.initRadio(qs, cfg);
    return q;
  }
};

export { RadioQuestion };
