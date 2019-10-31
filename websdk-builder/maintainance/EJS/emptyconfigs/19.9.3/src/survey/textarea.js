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
import { cleanUpText } from "./surveyutils";
import { Bind, decodeHTMLEntities, isControlKey } from "../utils/utils";

/**
 * Creates a TextAreaQuestion
 * Inherit SurveyQuestion
 * @constructor
 */
class TextAreaQuestion extends SurveyQuestion {
  /**
   * Bind to text areas
   * @param
   */
  initTextArea(el, cfg) {
    this.initQuestion(el, cfg);
    const tobj = this.el.$("textarea")[0];
    this.maxlen = parseInt(tobj.getAttribute("acsmaxlength"), 10);
    const ctx = this;

    const keyupfunc = (mxln => e => {
      e.stopPropagation();
      const targ = e.target || e.srcElement;
      const actlen = targ.value.replace(/\s+/g, " ").length;
      const remd = mxln - actlen;
      const sel = $(targ.parentNode);
      const lbl = sel.$(".acs-feedback__textarea--count")[0];
      const remaining = Math.max(0, remd);

      lbl.innerHTML = remaining;
      // for screen readers
      targ.setAttribute("title", `${remaining} characters remaining`);

      if (remd < 0) {
        targ.value = targ.value.substr(0, targ.value.length + remd);
        return false;
      } else {
        ctx.answer = targ.value;
        ctx.validate();
        ctx.stateChanged.fire(ctx.cfg.id);
      }
    })(this.maxlen);

    const keydownfunc = (mxln => e => {
      e.stopPropagation();
      const targ = e.target || e.srcElement;
      const actlen = targ.value.replace(/\s+/g, " ").length;
      const remd = mxln - actlen - 1;

      if (remd < 0 && !isControlKey(e)) {
        e.preventDefault();
        return false;
      }
    })(this.maxlen);

    const keypressfunc = e => {
      e.stopPropagation();
    };

    // Limit # of chars on the text field
    if (/^[0-9]+$/.test(tobj.getAttribute("acsmaxlength"))) {
      Bind(tobj, "feedback:keydown", keydownfunc);
      Bind(tobj, "feedback:keyup", keyupfunc);
      // Needed for Bluebird, don't let the event bubble up after capture.
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
          rtn = rule.answer == this.answer;
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
      return { questionId: this.cfg.id, answerText: cleanUpText(tvalb) };
    }
    return false;
  }
}

TextAreaQuestion.build = (el, cfg) => {
  if (cfg.qt == questionType.TEXTAREA && cfg.dt == 2) {
    // TextAreas
    const q = new TextAreaQuestion();
    q.initTextArea(el, cfg);
    return q;
  }
};

export { TextAreaQuestion };
