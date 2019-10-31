/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

import { toLowerCase } from "../fs/index";
import { questionType } from "./qtypes";
import { SurveyQuestion } from "./surveyquestion";
import { cleanUpText } from "./surveyutils";
import { decodeHTMLEntities, Bind } from "../utils/utils";

/**
 * Creates a InputTextQuestion
 * Inherit SurveyQuestion
 * @constructor
 */
class InputTextQuestion extends SurveyQuestion {
  /**
   * Bind to text areas
   * @param
   */
  initInputText(qs, cfg) {
    this.initQuestion(qs, cfg);
    const tobj = this.qs.$("input")[0];
    this.maxlen = parseInt(tobj.getAttribute("acsmaxlength"), 10);
    const ctx = this;
    const mxln = this.maxlen;

    function keyupfunc(e) {
      e.stopPropagation();
      const targ = e.target || e.srcElement;
      ctx.answer = targ.value;
      ctx.validate();
      ctx.stateChanged.fire(ctx.cfg.id);
    }

    function keydownfunc(e) {
      e.stopPropagation();
      const targ = e.target || e.srcElement;
      const actlen = targ.value.replace(/\s+/g, " ").length;
      const remd = mxln - actlen - 1;
      const kc = e.keyCode;

      if (remd < 0 && kc != 8 && kc != 16 && !(kc >= 37 && kc <= 41)) {
        e.preventDefault();
        return false;
      }
    }

    function keypressfunc(e) {
      e.stopPropagation();
    }

    // Limit # of chars on the text field
    if (/^[0-9]+$/.test(tobj.getAttribute("acsmaxlength"))) {
      Bind(tobj, "feedback:keydown", keydownfunc);
      Bind(tobj, "feedback:keyup", keyupfunc);
      // Needed for Bluebird
      Bind(tobj, "feedback:keypress", keypressfunc);
    }
  }

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  checkRule(rule) {
    let rtn = false;
    if (this.answer !== null && this.answer.length > 0) {
      const ruleAnswer = decodeHTMLEntities(rule.answer);
      switch (rule.operator) {
        case "equals":
          rtn = ruleAnswer == this.answer;
          break;
        case "contains":
          rtn = toLowerCase(this.answer).indexOf(toLowerCase(ruleAnswer)) > -1;
          break;
        default:
          /* PRAGMA:DEBUG_START */
          console.error(`Unknown rule operator: ${rule.operator}`);
          /* PRAGMA:DEBUG_END */
          break;
      }
    }
    return rtn;
  }

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  getAnswer() {
    if (this.cfg.isVisible && this.answer !== null && this.answer.length > 0) {
      const tvalb = this.answer.replace(/\s+/g, " ");
      if (tvalb == " ") {
        return false;
      }
      return { questionId: this.cfg.id, answerText: cleanUpText(tvalb, this.maxlen) };
    }
    return false;
  }
}

InputTextQuestion.build = (qs, cfg) => {
  if (cfg.qt == questionType.TEXTAREA && cfg.dt == 1) {
    // Text Inputs
    const q = new InputTextQuestion();
    q.initInputText(qs, cfg);
    return q;
  }
};

export { InputTextQuestion };
