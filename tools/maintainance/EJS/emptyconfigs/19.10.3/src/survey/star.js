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
import { nextTick } from "../fs/index";
import { questionType } from "./qtypes";
import { SurveyQuestion } from "./surveyquestion";
import { addClass, removeClass, Bind, getKeyCode } from "../utils/utils";

/**
 * Creates a StarQuestion
 * Inherit SurveyQuestion
 * @constructor
 */
class StarQuestion extends SurveyQuestion {
  /**
   * Get the rating
   * @private
   */
  _getRating() {
    return this.score;
  }

  /**
   * Bind to star ratings
   * @param el
   */
  initStarRating(el, cfg) {
    this.initQuestion(el, cfg);

    const ctx = this;
    const sR = $(this.el);
    const ipts = sR.$("input");

    // Hover Callback.
    function lbllist1(lbllist) {
      return () => {
        for (let i = 0; i < lbllist.length; i++) {
          removeClass(lbllist[i], "_acsHover");
        }
      };
    }

    // Filling Stars..
    function lbllist2(srctx, lbllist) {
      return e => {
        let ispassed = false;
        const targ = e.srcElement || e.target;
        for (let i = 0; i < lbllist.length; i++) {
          if (ispassed) {
            removeClass(lbllist[i], "_acsHover");
          } else if (!ispassed) {
            addClass(lbllist[i], "_acsHover");
          }

          if (lbllist[i] == targ) {
            ispassed = true;
          }
        }
      };
    }

    // Click Callback..
    function lbllist3(srctx, lbls) {
      return e => {
        let ispassed = false;
        const setrating = () => {
          srctx.removeClass("_acsRatingSet");
        };
        const targ = e.srcElement || e.originalTarget;

        for (let i = 0; i < lbls.length; i++) {
          if (ispassed) {
            removeClass(lbls[i], "star-rating__star--fill");
            lbls[i].setAttribute("aria-checked", "false");
          } else if (!ispassed) {
            ctx.score = i + 1;
            addClass(lbls[i], "star-rating__star--fill");
            lbls[i].setAttribute("aria-checked", "true");
          }

          if (lbls[i] == targ || ipts[i] == targ) {
            ispassed = true;
            ipts[i].checked = true;
            ctx.answer = ipts[i].value;
            ctx.stateChanged.fire(ctx.cfg.id);
            ctx.validate();
          }
          addClass(srctx, "_acsRatingSet");
          nextTick(setrating);
        }
      };
    }

    this.score = -1;
    const starfieldSet =
      sR.getElementsByClassName("star-rating")[0] || sR.getElementsByTagName("fieldset");
    const lbls = starfieldSet.children;

    Bind(sR, "feedback:mouseleave", lbllist1(lbls));

    for (let j = 0; j < lbls.length; j++) {
      Bind(lbls[j], "feedback:mouseenter", lbllist2(sR, lbls));
    }

    const labelCB = lbllist3(sR, lbls);

    Bind(
      starfieldSet,
      "feedback:change",
      e => {
        const nameOfNode = e.target.tagName;
        if (nameOfNode.toLowerCase() === "input") {
          labelCB(e);
        } else {
          e.stopPropagation();
        }
      },
      true
    );

    Bind(
      starfieldSet,
      "feedback:click",
      e => {
        const nameOfNode = e.target.tagName;
        if (nameOfNode.toLowerCase() === "label") {
          labelCB(e);
          e.target.focus();
        } else {
          e.stopPropagation();
        }
      },
      true
    );

    Bind(
      starfieldSet,
      "feedback:mousedown",
      e => {
        // Hide the focus outline when using the mouse
        e.preventDefault();
        e.target.blur();
      },
      true
    );

    Bind(starfieldSet, "feedback:keydown", e => {
      const keyVal = getKeyCode(e);

      e.stopPropagation();
      if (keyVal === "enter" || keyVal === "spacebar") {
        e.preventDefault();
        labelCB(e);
      }
    });
  }

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  checkRule(rule) {
    let rtn = false;
    if (this.answer !== null && this.answer.length > 0) {
      switch (rule.operator) {
        case "equals":
          rtn = this.answer == rule.answer;
          break;
        case "lt":
          rtn = this.answer < rule.answer;
          break;
        case "gt":
          rtn = this.answer > rule.answer;
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
}

StarQuestion.build = (el, cfg) => {
  if (cfg.qt == questionType.STAR) {
    // Star rating.
    const q = new StarQuestion();
    q.initStarRating(el, cfg);
    return q;
  }
};

export { StarQuestion };
