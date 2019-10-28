/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.Classes.Radio");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");

(function () {
  /**
   * Creates a RadioQuestion
   * Inherit SurveyQuestion
   * @constructor
   */
  Classes.RadioQuestion = function () {
  };
  Classes.RadioQuestion.prototype = new SurveyQuestion();

  /**
   * Bind to radios
   * @param
   */
  Classes.RadioQuestion.prototype.initRadio = function (qs, cfg) {
    this.initQuestion(qs, cfg);
    var ctx = this;
    var changefunc = function (fbblock) {
      return function (radioInput) {
        var cbij = fbblock.$("label");
        for (var p = 0; p < cbij.length; p++) {
          var cbel = $(cbij[p]),
            cbx = cbel.$("input[type=radio]")[0];
          if (cbx) {
            // The second half of this condition works because cbx will always be positive in this conditional
            if (cbx.checked || cbx === radioInput) {
              cbel.addClass("acsChecked");
              cbel.setAttribute("aria-checked", "true");
              ctx.answer = [{ answerId: cbx.value, answerText: cbx.getAttribute('label'), questionId: ctx.cfg.id }];
            } else {
              cbel.removeClass("acsChecked");
              cbel.setAttribute("aria-checked", "false");
            }
            ctx.validate();
            ctx.stateChanged.fire(ctx.cfg.id);
          }
        }
      };
    };

    var cbg = $(this.qs),
      cbi = cbg.$("input[type=radio]"),
      cbl = cbg.$("label"),
      stpPropagation = function (e) {
        e.stopPropagation();
      },
      changeFuncCB = changefunc(cbg);

    utils.Bind(cbg, "feedback:keydown", function (e) {
      var keyVal = utils.getKeyCode(e);
      // Only enter this conditional if the user has hit enter;
      e.stopPropagation();
      var radioInput;
      if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
        for (var k = 0; k < cbi.length; k++) {
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
        var currentNode = e.target;
        var childrenArr = e.target.parentNode.children;
        var labelArrLength = childrenArr.length - 1;
        var setNode;

        for (var i = 0; i <= labelArrLength && !setNode; i++) {
          if (childrenArr[i] === currentNode) {
            if (keyVal === "arrowright") {
              setNode = (i + 1 > labelArrLength) ? 0 : i + 1;
            } else {
              setNode = (i - 1 < 0) ? labelArrLength : i - 1;
            }
            childrenArr[setNode].focus();
          }
        }
      }
    });

    utils.Bind(cbg, "feedback:change", changeFuncCB);

    for (var l = 0; l < cbl.length; l++) {
      utils.Bind(cbl[l], "feedback:click", stpPropagation);
    }
  };
  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  Classes.RadioQuestion.prototype.checkRule = function (rule) {
    return this.answer !== null && this.answer[0].answerId == rule.answer;
  };

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  Classes.RadioQuestion.prototype.getAnswer = function () {
    return (this.cfg.isVisible && this.answer !== null && this.answer.length > 0) ? this.answer[0] : false;
  };
})();