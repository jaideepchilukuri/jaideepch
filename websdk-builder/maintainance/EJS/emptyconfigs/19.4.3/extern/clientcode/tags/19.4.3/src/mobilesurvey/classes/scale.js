/**
 * A Scale object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Scale");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseRadioOrCheckbox");

(function () {

  /**
   * A Scale class.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Scale = function () {
  };

  /**
   * Extend the prototype of BaseRadioOrCheckbox.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Scale.prototype = new Classes.BaseRadioOrCheckbox();

  /**
   * Intitializes a scale class
   * @param questionData A reference to the entire question node of the JSON
   * @param questionNumber The question number in the overall scheme of questions
   * @param entireJSON A reference to the entire JSON
   */
  Classes.Scale.prototype.initScale = function (questionData, questionNumber, entireJSON, isCq) {
    // Extend the BaseRadioOrCheckbox class
    this.initRadioOrCheckbox(questionData, questionNumber, entireJSON);

    // The button array
    this.buttonArr = [];

    this.isCq = isCq;
  };

  /**
   * Create the HTML for the scale.
   * @returns {HtmlNode} The scale question/answer HTML node.
   */
  Classes.Scale.prototype.create = function () {
    return this.createQuestion("radiogroup").append(this.createScale());
  };

  /**
   * Create the scale inputs.
   * @private
   * @returns {HtmlNode} The scale answers HTML node.
   */
  Classes.Scale.prototype.createScale = function () {
    // Get the array of ordered answers
    var answers = this.getOrderedAnswers(),
      hasOtherAnswer = false,
      i,
      but;

    if (fs.toLowerCase(answers[0].lbl).indexOf('<img') > -1) {
      this.imageLabels = true;
    }

    // Create the various pieces of html
    this.widgetholder = $("<div />").attr({"data-role": "widgetholder"});
    var instructionHolder = $("<div />")
      .attr({"data-role": "instructionholder"})
      .append($("<div/>").addClass("leftLegend")
        .html(this.getLegendLeftLabel(answers)))
      .append($("<div/>").addClass("rightLegend")
        .html(this.getLegendRightLabel(answers)));

    if (this.metaExtInfo.display_mq_mid_anchor && this.metaExtInfo.display_mq_mid_anchor == 'yes') {
      var mqMidAnchorText = this.getLegendMiddleLabel(answers);
      if (mqMidAnchorText) {
        instructionHolder.append($("<div/>").addClass("mqMidAnchor").html(mqMidAnchorText));
      }
    }
    this.controlGroup = $("<div />").attr({
      "data-role": "controlgroup",
      "data-type": "horizontal"
    }).addClass("likertScale").append(instructionHolder).append(this.widgetholder);

    this.contentNode = $("<div />").attr({"data-role": "likertHolder"}).addClass("ansCnt" + answers.length).append(this.controlGroup);

    // Keep an array of all the inputs
    this.hasTabbedInput = false;

    // This function generates the html for each button
    var genButton = function (ctx, iname) {
      return function (itemnum, label, answer, isLast) {

        if (answer.lbl && fs.toLowerCase(answer.lbl).indexOf('<img') > -1) {
          var iml = answer.lbl;
          var rxp = /src[ ]*=[ ]*['"]([^'"]+)['"]/gi;
          var nl = rxp.exec(iml);
          if (nl.length >1) {
            label = "<img src=\"" + nl[1] + "\">";
          }
        }
        var innrBtn = $("<div />").addClass("innerButton")
          .append($("<span></span>").addClass("hidden-accessible").html(itemnum === 0 ? (ctx.questionText || "") : (ctx.questionLabel || "")))
          .append($("<span></span>").html(label))
          .append($("<input type='radio' />").attr({"name": iname, "value": answer.id}));
        if (isLast) {
          innrBtn.addClass("lastButton");
        }
        var btn = $("<div>").attr({
          "data-role": "button",
          'role': 'radio'
        }).append(innrBtn);

        return btn;
      };
    }(this, this.getInputName());

    var actualanswerlength = 0;

    // count some things ahead of time so we can use the values to drive the display as we go
    for (i = 0; i < answers.length; i++) {
      if (answers[i].val == '9999') {
        hasOtherAnswer = true;
      } else {
        actualanswerlength++;
      }
    }

    var currentActualAnswer = 0;
    // It's a 1 to x scale. Loop over and create each button
    for (i = 0; i < answers.length; i++) {
      if (answers[i].val != '9999') {
        currentActualAnswer++;
        var scaleLabel = answers[i].val;
        if (answers.length == 2 && answers[i].lbl) {
          scaleLabel = answers[i].lbl;
        }
        but = genButton(i, scaleLabel, answers[i], currentActualAnswer == actualanswerlength);
        this.buttonArr[this.buttonArr.length] = but;

        but.bind("mousedown", function (btn, ctx) {
          return function (e) {
            ctx.selectInput(btn);
          };
        }(but, this));

        but.bind("keydown", function (ctx) {
          return function (evt) {
            ctx.handleRadioKeyDown(evt, ctx.buttonArr);
          };
        }(this));

        // Set the tabIndex to 1 if it's the first element, otherwise set it to -1
        if (!this.hasTabbedInput) {
          but.attr("tabIndex", "1");
          this.hasTabbedInput = true;
        } else {
          but.attr("tabIndex", "-1");
        }

        this.widgetholder.append(but);
      }
    }

    // add the size class to widgetholder
    var itemCountClass = "itemCount" + actualanswerlength;
    this.widgetholder.addClass(itemCountClass);

    // Handle "other" or "dont know"
    if (hasOtherAnswer) {
      var answer = answers[answers.length - 1],
        iconDiv = $('<div/>').attr({'data-role': 'icon'}),
        dontKnowValue = this.isCq ? answer.id : answer.id + '-x';
      but = $('<div />').attr({
        'data-role': "button",
        'button-type': 'otherbutton',
        'role': 'radio',
        'aria-labelledby': 'a' + dontKnowValue + "-label-other"
      }).append($("<div />").addClass("innerButton").append(iconDiv).append($("<div />").addClass("innerLabel").append($("<input type='radio' />").attr({
        "name": this.getInputName(),
        "value": dontKnowValue
      }))));
      this.buttonArr[this.buttonArr.length] = but;
      but.bind("mousedown", function (btn, ctx) {
        return function () {
          ctx.selectInput(btn);
        };
      }(but, this));

      but.bind("keydown", function (ctx) {
        return function (evt) {
          ctx.handleRadioKeyDown(evt, ctx.buttonArr);
        };
      }(this));

      var otherText = $("<div/>").addClass("otherText").attr({
        'id': 'a' + dontKnowValue + "-label-other",
        'aria-hidden': 'true'
      }).append($("<span></span>").addClass("hidden-accessible").html(this.questionLabel || ""))
        .append($("<span></span>").html(answer.lbl));

      var otherButtonHolder = $("<div />").attr({
        "data-role": "widgetholder",
        "is-other": "true"
      }).addClass(itemCountClass).append(but).append(otherText);

      var controlGroup2 = $("<div />").attr({
        "data-role": "controlgroup",
        "data-type": "horizontal"
      }).addClass("likertScale").addClass("likertScaleOther")
        .append(otherButtonHolder);
      this.contentNode.append(controlGroup2);
    }

    return this.contentNode;
  };

  /**
   * Callback when user inputs a keypress when focussed on a radio button
   * @param evt
   */
  Classes.Scale.prototype.handleRadioKeyDown = function (evt) {
    // Make it work with IE <= 10
    evt.target = evt.target || evt.srcElement;

    // Quickreference the button array
    var inputs = this.buttonArr;

    // Prevent the default event from happening
    var preventEvent = function (evt) {
      evt.preventDefault();
      evt.returnValue = false;
    };

    // Set all inputs to tab index -1
    var negateAllTabs = function () {
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].attr("tabIndex", "-1");
      }
    };

    // Move the focus to the right radio button
    var moveRight = function (ctx, evt) {
      for (var i = 0; i < inputs.length; i++) {
        if (evt.target == inputs[i][0]) break;
      }
      if (i < inputs.length - 1) {
        preventEvent(evt);
        negateAllTabs();
        ctx.selectInput(inputs[i + 1][0]);
      }
    };

    // Move the focus to the left radio button
    var moveLeft = function (ctx, evt) {
      for (var i = 0; i < inputs.length; i++) {
        if (evt.target == inputs[i][0]) break;
      }
      if (i > 0) {
        preventEvent(evt);
        negateAllTabs();
        ctx.selectInput(inputs[i - 1][0]);
      }
    };

    switch (evt.keyCode) {
      // Space bar
      case 32:
        preventEvent(evt);
        this.selectInput(evt.target);
        break;

      // Left arrow
      case 37:
        moveLeft(this, evt);
        break;

      // Up arrow
      case 38:
        moveLeft(this, evt);
        break;

      // Right arrow
      case 39:
        moveRight(this, evt);
        break;

      // Down arrow
      case 40:
        moveRight(this, evt);
        break;

      default:
        break;
    }
  };

  /**
   * Select this element
   * @param target
   */
  Classes.Scale.prototype.selectInput = function (target) {
    // Quickreferences
    target = target[0] || target;
    var inputs = this.buttonArr;

    // Iterate through all inputs
    for (var i = 0; i < inputs.length; i++) {

      if (target == inputs[i][0]) {

        // Select, check, and set tab index to 1 for the target element
        inputs[i].addClass("selected");
        inputs[i][0].getElementsByTagName("input")[0].checked = true;
        inputs[i][0].focus();
        inputs[i].attr("aria-checked", true);
        inputs[i].attr("tabIndex", 1);
      } else {

        // Unselect, uncheck and set tab index to -1 otherwise
        inputs[i].removeClass("selected");
        inputs[i][0].getElementsByTagName("input")[0].checked = false;
        inputs[i].attr("aria-checked", false);
        inputs[i].attr("tabIndex", -1);
      }

    }

    this.showHideDependentQuestions();
  };

  /**
   * Show or hide the questions that are dependent on this question based on the answers selected.
   */
  Classes.Scale.prototype.showHideDependentQuestions = function () {
    var classThis = this;

    // This function must be defined in the class that is extending BaseQuestion
    var selectedAnswerIds = this.getSelectedAnswerIds();

    $.each(classThis.nestedQuestions, function () {
      if (this.shouldShowAsDependentQuestion(selectedAnswerIds)) {
        this.showQuestion();
      } else {
        this.hideQuestion();
      }
    });

  };


  /**
   * Hide this question.  Should only be used after this question has been drawn initially.
   */
  Classes.Scale.prototype.hideQuestion = function () {
    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseQuestion
    this.clearValues();

    this.showHideDependentQuestions();

    this.questionHidden = true;
  };

  /**
   * Get the lower bound label for the scale legend.
   * @param {Array<Object>} answers An array containing all the answers for this question.
   * @private
   * @returns {String} The label to use for the left side of the scale legend.
   */
  Classes.Scale.prototype.getLegendLeftLabel = function (answers) {
    var firstAnswer = answers[0];

    return utils.stripHTML(firstAnswer.lbl ? firstAnswer.lbl : '');
  };

  /**
   * Get the middle label, only available for MQs.
   * @param {Array<Object>} answers An array containing all the answers for this question.
   * @private
   * @returns {String} The label to use for the middle scale legend.
   */
  Classes.Scale.prototype.getLegendMiddleLabel = function (answers) {
    if (!this.isCq) {
      var endIndexToUse = answers.length - 1;
      while (endIndexToUse > 0) {
        if (answers[endIndexToUse].val != '9999') {
          break;
        }
        endIndexToUse--;
      }
      for (var i = 1; i < endIndexToUse; i++) {
        if (answers[i].dl == '1' && answers[i].lbl) {
          return answers[i].lbl;
        }
      }
    }
    return '';
  };

  /**
   * Get the upper bound label for the scale legend.  Ignore the 9999 answers (Don't Know, etc.).
   * @param {Array<Object>} answers An array containing all the answers for this question.
   * @private
   * @returns {String} The label to use for the right side of the scale legend.
   */
  Classes.Scale.prototype.getLegendRightLabel = function (answers) {
    var indexToUse = answers.length - 1;

    while (indexToUse > 0) {
      if (answers[indexToUse].val != '9999') {
        break;
      }
      indexToUse--;
    }

    var lastAnswer = answers[indexToUse];

    return utils.stripHTML(lastAnswer.lbl ? lastAnswer.lbl : '');
  };

  /**
   * Alter the layout of the scale question based on detection of elements being different than we expect them to render.
   */
  Classes.Scale.prototype.tweakQuestionLayout = function () {
    // This detects when the top row of buttons are wrapping to more than 1 line
    var singleButtonHeight = $('div[data-role=\"button\"]', this.widgetholder[0])[0].offsetHeight;
    if (this.widgetholder[0].offsetHeight > singleButtonHeight) {
      this.controlGroup.addClass('likertScaleShrink');
    }
  };

  /**
   * Used for validating if this question has an answer or not.
   * @returns {Boolean} true if the scale has a value and false otherwise.
   */
  Classes.Scale.prototype.hasValue = function () {

    return $("div[data-role=\"button\"] input:checked", this.contentNode[0]).length > 0;

  };

})();