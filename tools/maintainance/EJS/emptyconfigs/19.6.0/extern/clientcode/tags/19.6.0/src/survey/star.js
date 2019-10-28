/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.Classes.Star");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");
(function () {
  /**
   * Creates a StarQuestion
   * Inherit SurveyQuestion
   * @constructor
   */
  Classes.StarQuestion = function () {
  };
  Classes.StarQuestion.prototype = new SurveyQuestion();

  /**
   * Get the rating
   * @private
   */
  Classes.StarQuestion.prototype._getRating = function () {
    return this.score;
  };

  /**
   * Bind to star ratings
   * @param qs
   */
  Classes.StarQuestion.prototype.initStarRating = function (qs, cfg) {
    this.initQuestion(qs, cfg);

    var ctx = this,

      // Hover Callback.
      lbllist1 = function (lbllist) {
        return function () {
          for (var i = 0; i < lbllist.length; i++) {
            utils.removeClass(lbllist[i], "_acsHover");
          }
        };
      },

      // Filling Stars..
      lbllist2 = function (srctx, lbllist) {
        return function (e) {
          var ispassed = false,
            targ = e.srcElement || e.target;
          for (var i = 0; i < lbllist.length; i++) {
            if (ispassed) {
              utils.removeClass(lbllist[i], "_acsHover");
            } else if (!ispassed) {
              utils.addClass(lbllist[i], "_acsHover");
            }

            if (lbllist[i] == targ) {
              ispassed = true;
            }
          }
        };
      },

      // Click Callback..
      inputList = function (srctx, ipts, isfirst) {
        return function (e) {

          if (isfirst) {
            ctx.validationPassed = true;
          }
          var ispassed = false,
            setrating = function () {
              srctx.removeClass("_acsRatingSet");
            },
            targ = e.srcElement || e.originalTarget;
          for (var i = 0; i < ipts.length; i++) {
            if (!ispassed) {
              ctx.score = i + 1;
            }

            if (ipts[i] == targ) {
              ispassed = true;
              targ.checked = true;
              ctx.answer = ipts[i].value;
              ctx.stateChanged.fire(ctx.cfg.id);
              ctx.validate();
            }
            utils.addClass(srctx, "_acsRatingSet");
            fs.nextTick(setrating);
          }
        };
      },

      // Click Callback..
      lbllist3 = function (srctx, lbls) {
        return function (e) {
          var ispassed = false,
            setrating = function () {
              srctx.removeClass("_acsRatingSet");
            },
            targ = e.srcElement || e.originalTarget;
          for (var i = 0; i < lbls.length; i++) {
            if (ispassed) {
              utils.removeClass(lbls[i], "star-rating__star--fill");
              lbls[i].setAttribute("aria-checked", "false");
            } else if (!ispassed) {
              ctx.score = i + 1;
              utils.addClass(lbls[i], "star-rating__star--fill");
              lbls[i].setAttribute("aria-checked", "true");
            }

            if (lbls[i] == targ || ipts[i] == targ) {
              ispassed = true;
              ipts[i].checked = true;
              ctx.answer = ipts[i].value;
              ctx.stateChanged.fire(ctx.cfg.id);
              ctx.validate();
            }
            utils.addClass(srctx, "_acsRatingSet");
            fs.nextTick(setrating);
          }
        };
      };

    this.score = -1;
    var sR = $(this.qs),
      ipts = sR.$("input"),
      starfieldSet = sR.getElementsByClassName("star-rating")[0] || sR.getElementsByTagName("fieldset"),
      lbls = starfieldSet.children;

    utils.Bind(sR, "feedback:mouseleave", lbllist1(lbls));

    for (var j = 0; j < lbls.length; j++) {
      utils.Bind(lbls[j], "feedback:mouseenter", lbllist2(sR, lbls));
    }

    var labelCB = lbllist3(sR, lbls);

    utils.Bind(starfieldSet, "feedback:change", function (e) {
      var nameOfNode = e.target.tagName;
      if (nameOfNode.toLowerCase() === "input") {
        labelCB(e);
      } else {
        e.stopPropagation();
      }
    }, true);

    utils.Bind(starfieldSet, "feedback:click", function (e) {
      var nameOfNode = e.target.tagName;
      if (nameOfNode.toLowerCase() === "label") {
        labelCB(e);
      } else {
        e.stopPropagation();
      }
    }, true);

    utils.Bind(starfieldSet, "feedback:keydown", function (e) {
      var nameOfNode = e.target.tagName;
      var keyVal = utils.getKeyCode(e);

      e.stopPropagation();
      if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
        e.preventDefault();
        labelCB(e);
      }
    });
  };

  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  Classes.StarQuestion.prototype.checkRule = function (rule) {
    var rtn = false;
    if (this.answer !== null && this.answer.length > 0) {
      switch (rule.operator) {
        case 'equals':
          rtn = (this.answer == rule.answer);
          break;
        case 'lt':
          rtn = (this.answer < rule.answer);
          break;
        case 'gt':
          rtn = (this.answer > rule.answer);
          break;
      }
    }
    return rtn;
  };
})();