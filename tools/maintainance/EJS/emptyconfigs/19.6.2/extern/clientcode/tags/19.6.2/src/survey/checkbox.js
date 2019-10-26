/**
 * Evaluates topics
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foresee.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.Classes.CheckBox");

fs.require("sv.Dom.MiniDOM");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");
(function () {
  /**
   * Creates a CheckBoxQuestion
   * Inherit SurveyQuestion
   * @constructor
   */
  Classes.CheckBoxQuestion = function () {
  };
  Classes.CheckBoxQuestion.prototype = new SurveyQuestion();

  /**
   * Bind to radios
   * @param
   */
  Classes.CheckBoxQuestion.prototype.initCheckBox = function (qs, cfg) {
    this.initQuestion(qs, cfg);
    var ctx = this,
      changefunc = function (tel) {
        return function (e) {
          if (e) {
            e.stopPropagation();
          }

          var cbij = tel.$("label");
          for (var p = 0; p < cbij.length; p++) {
            var cbel = $(cbij[p]),
              cbx = cbel.$("input[type=checkbox]")[0];
            if (cbx) {
              if (!cbx.checked) {
                cbel.setAttribute("aria-checked", "false");
                cbel.removeClass("acsChecked");
                if (ctx.answer) {
                  var ind;
                  for (var i = 0; i < ctx.answer.length; i++) {
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
                  ctx.answer = [cbx.getAttribute('questionid')];
                } else {
                  var flag = false;
                  for (var j = 0; j < ctx.answer.length; j++) {
                    if (ctx.answer[j] == cbx.getAttribute('questionid')) {
                      flag = true;
                      break;
                    }
                  }
                  if (!flag) {
                    ctx.answer.push(cbx.getAttribute('questionid'));
                    flag = false;
                  }
                }
              }
              ctx.validate();
              ctx.stateChanged.fire(ctx.cfg.id);
            }
          }
        };
      },
      cbg = $(this.qs),
      cbi = cbg.$("input[type=checkbox]"),
      stpPropagation = function (e) {
        e.stopPropagation();
      };

    var changeFuncCB = changefunc(cbg);

    utils.Bind(cbg, "feedback:keydown", function (e) {
      e.stopPropagation();
      var keyVal = utils.getKeyCode(e);

      if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
        e.preventDefault();
        for (var l = 0; l < cbi.length; l++) {
          if (e.target.control === cbi[l] || e.target.firstElementChild === cbi[l]) {
            cbi[l].checked = !cbi[l].checked;
            cbi[l].setAttribute("checked", cbi[l].checked);
          }
        }
        changeFuncCB();
      }
    });

    utils.Bind(cbg, "feedback:change", changeFuncCB);

    utils.Bind(cbg, "feedback:click", stpPropagation);
  };
  /**
   * Check if the skiplogic rule is validated
   * @param Object rule object that has {questionid, answer|answerid, operator}
   */
  Classes.CheckBoxQuestion.prototype.checkRule = function (rule) {
    if (this.answer !== null && this.answer.length > 0) {
      for (var i = 0; i < this.answer.length; i++) {
        if (this.answer[i] == rule.answer) {
          return true;
        }
      }
    }
    return false;
  };

  /**
   * Supports single answer types. To be overriden when needed.
   * @return Boolean|Array False if answer is null, array of objects otherwise.
   */
  Classes.CheckBoxQuestion.prototype.getAnswer = function () {
    if (this.cfg.isVisible && this.answer !== null && this.answer.length > 0) {
      var rtn = [];
      for (var i = 0; i < this.answer.length; i++) {
        rtn.push({
          "questionId": this.cfg.id,
          "answerId": this.answer[i]
        });
      }
      return rtn;
    }
    return false;
  };
})();