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
            $(lbllist[i]).removeClass("_acsHover");
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
              $(lbllist[i]).removeClass("_acsHover");
            } else if (!ispassed) {
              $(lbllist[i]).addClass("_acsHover");
            }

            if (lbllist[i] == targ) {
              ispassed = true;
            }
          }
        };
      },

      // Click Callback..
      lbllist3 = function (srctx, ipts, isfirst) {
        return function (e) {
          e.stopPropagation();
          if (isfirst) {
            ctx.validationPassed = true;
          }
          var ispassed = false,
            setrating = function () {
              srctx.removeClass("_acsRatingSet");
            },
            targ = e.srcElement || e.originalTarget;
          for (var i = 0; i < ipts.length; i++) {
            if (ispassed) {
              $(ipts[i]).removeClass("star-rating__star--fill");
            } else if (!ispassed) {
              ctx.score = i + 1;
              $(ipts[i]).addClass("star-rating__star--fill");
            }
            if (ipts[i] == targ) {
              ispassed = true;
              targ.checked = true;
              ctx.answer = ipts[i].value;
              ctx.stateChanged.fire(ctx.cfg.id);
              ctx.validate();
            }
            srctx.addClass("_acsRatingSet");
            fs.nextTick(setrating);
          }
        };
      };
    this.score = -1;
    var sR = $(this.qs),
      lbls = sR.$("label"),
      ipts = sR.$("input");
    utils.Bind(sR, "feedback:mouseleave", lbllist1(lbls));
    for (var j = 0; j < lbls.length; j++) {
      utils.Bind(lbls[j], "feedback:mouseenter", lbllist2(sR, lbls));
      // Needed for Bluebird.
      utils.Bind(lbls[j], "feedback:click", function (e) {
        e.stopPropagation();
      });
    }
    for (var w = 0; w < ipts.length; w++) {
      utils.Bind(ipts[w], "feedback:click", lbllist3(sR, ipts, w === 0));
    }
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