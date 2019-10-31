/**
 * A BaseQuestion object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.BaseRadioOrCheckbox");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseQuestion");

(function () {

  /**
   * Class that represents a base radio or checkbox based question.
   */
  Classes.BaseRadioOrCheckbox = function () {};

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.BaseQuestion
   * @constructor
   */
  Classes.BaseRadioOrCheckbox.prototype = new Classes.BaseQuestion();

  /**
   * Initializes the object
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param questionData
   * @param questionNumber
   * @param entireJSON
   */
  Classes.BaseRadioOrCheckbox.prototype.initRadioOrCheckbox = function (questionData, questionNumber, entireJSON) {
    // Extend the BaseQuestion class
    this.initQuestion(questionData, questionNumber, entireJSON);

    /**
     * The maximum number of answers that can be chosen for this question.  Only used for checkboxes.
     */
    this.maxAnswers = questionData.m;

    /**
     * Keep track of the question data
     */
    this.questionData = questionData;
  };

  /**
   * Enumerator for radio or checkbox type
   * @type {{RADIO: number, CHECKBOX: number}}
   */
  Classes.BaseRadioOrCheckbox.type = {
    RADIO: 1,
    CHECKBOX: 2
  };

  /**
   * Create the radio inputs for the question.
   * @param entireJSON A reference to the entire JSON where the question answers can be found.
   * @returns {HtmlNode} The HTML node for the answer radio inputs.
   */
  Classes.BaseRadioOrCheckbox.prototype.createRadio = function () {
    this.type = Classes.BaseRadioOrCheckbox.type.RADIO;
    return this.createRadioOrCheckbox('radio');
  };

  /**
   * Create the checkbox inputs for the question.
   * @param entireJSON A reference to the entire JSON where the question answers can be found.
   * @returns {HtmlNode} The HTML node for the answer checkbox inputs.
   */
  Classes.BaseRadioOrCheckbox.prototype.createCheckbox = function () {
    this.type = Classes.BaseRadioOrCheckbox.type.CHECKBOX;
    return this.createRadioOrCheckbox('checkbox');
  };

  /**
   * Create the radio, checkbox, or scale inputs.
   * @param {Array} answersArray An array of answers that contain the answers for this question.
   * @param {String} inputType The input type to use for this input.
   * @private
   * @returns {HtmlNode} The HTML node for the answer radio or checkbox inputs.
   */
  Classes.BaseRadioOrCheckbox.prototype.createRadioOrCheckbox = function (inputType) {
    var classThis = this,
      answerNumber = 1;

    this.inputType = inputType;

    var widgetholder = $('<div />').attr({'data-role': 'widgetholder'});
    var containerNode = $('<div />').attr({
      'data-role': 'controlgroup',
      'data-type': 'vertical',
      'widget-type': 'radioorcb',
      'input-type': inputType
    }).append(widgetholder);

    var answers = this.getOrderedAnswers();

    this.buttonArr = [];

    for (var i = 0; i < answers.length; i++) {
      var answerId = answers[i].id,
        inputId = this.getInputId(i + 1),
        but = classThis.getLabel(i === 0, answers[i], inputId, answerId, i + 1 == answers.length).append(this.getRadioOrCheckboxInput(inputId, answerId, inputType, answers[i].val));
      this.buttonArr[this.buttonArr.length] = but;
      widgetholder.append(but);
      but.bind('mousedown', function (btn, classThis) {
        return function () {
          classThis.selectInput(btn);
        };
      }(but, this));

      // Bind inputType specific callbacks
      if (inputType == "radio") {
        but.bind('keydown', function (ctx) {
          return function (evt) {
            ctx.handleRadioKeyDown(evt);
          };
        }(this));
      } else if (inputType == "checkbox") {
        but.bind('keydown', function (ctx) {
          return function (evt) {
            ctx.handleCheckboxKeyDown(evt, ctx.buttonArr);
          };
        }(this));
      }
    }

    /**
     * The number of choices
     */
    this.answerLength = answers.length;

    /**
     * The main content node
     */
    this.contentNode = $('<div/>').attr({'data-role': 'fieldcontain'})
      .append(containerNode);

    return this.contentNode;
  };

  /**
   * @param {Object} button The button to find the first radio or checkbox input in.
   * @returns {Object} The first input node found of type radio or checkbox in the button passed in.
   */
  Classes.BaseRadioOrCheckbox.prototype.getFirstRadioOrCheckboxInput = function (button) {
    var inputs = button.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].type == 'checkbox' || inputs[i].type == 'radio') {
        return inputs[i];
      }
    }
  };

  /**
   * Get the selector to use for all the inputs for this question.
   * @private
   * @returns {Object} The selector that finds all inputs for this question.
   */
  Classes.BaseRadioOrCheckbox.prototype.getInputsUsingNameSelector = function () {
    return $('div[data-role="button"] input[name="' + this.getInputName() + '"]', this.contentNode[0]);
  };

  /**
   * Get the selector to use for all the checked inputs for this question.
   * @private
   * @returns {Object} The selector that finds all checked inputs for this question.
   */
  Classes.BaseRadioOrCheckbox.prototype.getCheckedInputsUsingNameSelector = function () {
    return $('div[data-role="button"] input[name="' + this.getInputName() + '"]:checked', this.contentNode[0]);
  };

  /**
   * Get the selector to use for all the buttons for this question.
   * @private
   * @returns {Object} The selector that finds all the buttons for this question.
   */
  Classes.BaseRadioOrCheckbox.prototype.getAllButtonsSelector = function () {
    return $('div[data-role="button"]', this.contentNode[0]);
  };


  /**
   * Perform anything necessary after an input has been clicked.
   * @param {Object} The html input object that was just changed.
   */
  Classes.BaseRadioOrCheckbox.prototype.processPostInputChange = function (input) {
    // The order we call these is important, logic follows:

    // Max answers will disable inputs once you reach the max, but enable all inputs if you aren't at max.
    this.handleMaxAnswers();

    // None of the above will uncheck and disable all other selections when it is picked,
    // or enable them all (all unchecked) when it isn't.
    this.handleNoneOfTheAbove(input);

    // Show/hide all inline other inputs based on if the option is selected. This is called after 'none of the above'
    // handling since that could result in unchecking some options.
    this.handleInlineOther(input);

    // After all the manipulation of selections, show or hide the dependent questions based on the answers selected.
    this.showHideDependentQuestions();
  };

  /**
   * Create the actual input object.
   * @param {String} inputId The id of the input that this label goes with.
   * @param {String} value The value to use for this input.
   * @param {String} inputType The input type to use for this input.
   * @param {String} val The val from the JSON object that represents this radio or checkbox answer.
   * @returns {HtmlNode} A radio or checkbox input HTML node.
   */
  Classes.BaseRadioOrCheckbox.prototype.getRadioOrCheckboxInput = function (inputId, answerId, inputType, val) {
    return $('<input type="' + inputType + '"/>').attr({
      'name': this.getInputName(),
      'id': inputId,
      'value': answerId,
      'val': val
    });
  };

  /**
   * Create the label object.
   * @param {Object} answerObj The question object from the JSON.
   * @param {String} inputId The id of the input that this label goes with.
   * @private
   * @returns {HtmlNode} A label HTML node.
   */
  Classes.BaseRadioOrCheckbox.prototype.getLabel = function (isFirst, answerObj, inputId, answerId, isLast) {
    var label = answerObj.dv == '1' ? answerObj.val : (answerObj.dl == '1' ? answerObj.lbl : ''),
      apos = String.fromCharCode(65533),
      re = new RegExp(apos, "g"),
      button;

    label = label.replace(re, "'");
    var innrBtn = $('<div />').addClass('innerButton')
      .append($("<span></span>").addClass("hidden-accessible").html(isFirst ? this.questionText : (this.questionLabel || "")));

    var otherInlineInput = this.getOtherInlineInput(answerId);
    innrBtn.append($('<div />').addClass('innerLabel').html(label));

    if (isLast) {
      innrBtn.addClass('lastButton');
    }

    if (otherInlineInput) {
      button = $("<div/>").attr({
        'data-role': 'button'
      }).append($('<div />').attr({'data-role': 'icon'}));

      var innerRadio = $("<div/>").attr({
        'role': this.inputType,
        'aria-checked': false
      }).append($('<div />').attr({'data-role': 'icon'}))
        .append($("<span></span>").addClass("hidden-accessible").html(isFirst ? this.questionText : (this.questionLabel || "")))
        .append($("<div/>").addClass('innerLabel').html(label));

      var innerButton = $("<div/>")
        .addClass("innerButton");

      if (isLast) {
        innerButton.addClass("lastButton");
      }

      if (!this.tabIndexWasSet || this.inputType != "radio") {
        innerRadio.attr("tabIndex", "1");
        this.tabIndexWasSet = true;
      } else {
        innerRadio.attr("tabIndex", "-1");
      }

      innerRadio.bind("focus", function (ctx, button) {
        return function () {
          ctx.selectInput(button);
        };
      }(this, button));

      innerButton.append(innerRadio);
      innerButton.append($("<div/>").addClass("inlineInputContainer").append(otherInlineInput));
      button.append(innerButton);

    } else {
      button = $('<div />').attr({
        'data-role': 'button',
        'role': this.inputType,
        'aria-checked': false
      }).append($('<div />').attr({'data-role': 'icon'})).append(innrBtn);

      if (!this.tabIndexWasSet || this.inputType != "radio") {
        button.attr("tabIndex", "1");
        this.tabIndexWasSet = true;
      } else {
        button.attr("tabIndex", "-1");
      }
    }

    return button;
  };

  /**
   * Callback when user inputs a keypress when focussed on a radio button
   * @param evt
   */
  Classes.BaseRadioOrCheckbox.prototype.handleRadioKeyDown = function (evt) {
    // Make it work with IE <= 10
    evt.target = evt.target || evt.srcElement;

    // Quickreference the button array
    var inputs = this.buttonArr;

    // Prevent the default event from happening
    var preventEvent = function (evt) {
      evt.preventDefault();
      evt.returnValue = false;
    };

    var getButtonNode = function (target) {
      while (target && $(target).attr("data-role") !== "button")
        target = target.parentNode;

      return target;
    };

    // Move the focus to the right radio button
    var moveRight = function (ctx, evt) {
      var target = getButtonNode(evt.target);
      for (var i = 0; i < inputs.length; i++) {
        if (target == inputs[i][0]) break;
      }
      if (i < inputs.length - 1) {
        preventEvent(evt);
        ctx.selectInput(inputs[i + 1][0]);
      }
    };

    // Move the focus to the left radio button
    var moveLeft = function (ctx, evt) {
      var target = getButtonNode(evt.target);
      for (var i = 0; i < inputs.length; i++) {
        if (target == inputs[i][0]) break;
      }
      if (i > 0) {
        preventEvent(evt);
        ctx.selectInput(inputs[i - 1][0]);
      }
    };

    switch (evt.keyCode) {
      // Space bar
      case 32:

        // Get the 'button' div that contains this element
        var containerNode = $(evt.target);
        do {
          containerNode = $(containerNode[0]).parentNode;
        } while (containerNode && containerNode.attr("data-role") != "button");

        // Only apply the spacebar action to checkboxes or unchecked radio buttons
        if (this.type === Classes.BaseRadioOrCheckbox.type.CHECKBOX || (containerNode && !containerNode.hasClass("selected"))) {
          preventEvent(evt);
          this.selectInput(evt.target);
        }
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
   * Callback from keydown event on a checkbox item
   * @param evt
   */
  Classes.BaseRadioOrCheckbox.prototype.handleCheckboxKeyDown = function (evt) {
    switch (evt.keyCode) {
      case 32:
        evt.preventDefault();
        evt.returnValue = false;
        this.selectInput(evt.target);
        break;
      default:
        break;
    }
  };

  /**
   * Don't allow selection of more than the configured number of answers allowed for checkboxes.
   * @private
   */
  Classes.BaseRadioOrCheckbox.prototype.handleMaxAnswers = function () {
    if (this instanceof Classes.Checkbox && this.maxAnswers && this.maxAnswers < this.answerLength) {
      if (this.getCheckedInputsUsingNameSelector().length >= this.maxAnswers) {
        this.getAllButtonsSelector().each(function () {
          var btn = $(this);
          if (!btn.hasClass('selected')) {
            btn.attr('is-disabled', 'true');
          }
        });
      } else {
        this.getAllButtonsSelector().attr('is-disabled', '');
      }
    }
  };


  /**
   * Handle the case where the selection was for a 'None of the above' option.
   * When the 'None of the above' option was checked, we will uncheck and disable the rest of the inputs for this question.
   * When the 'None of the above' option was unchecked, we will re-enable (without re-checking) all the other options.
   * @param {Object} input The input element that was clicked.
   * @private
   */
  Classes.BaseRadioOrCheckbox.prototype.handleNoneOfTheAbove = function (input) {
    var selectedVal = $(input).attr('val');      // this is the customanswervalue
    var selectedValue = $(input).attr('value');  // this is the actual custanswerid
    if (this.isNoneOfTheAboveAnswer(selectedVal)) {
      var allButtons = this.getAllButtonsSelector();
      if (input.checked) {
        allButtons.each(function () {
          var btn = $(this);
          var ipt = btn[0].getElementsByTagName('input')[0];
          if ($(ipt).attr('value') != selectedValue) {
            ipt.checked = false;
            btn.removeClass('selected').attr('is-disabled', 'true');
          }
        });
      } else {
        allButtons.attr('is-disabled', '');
      }
    }
  };

  /**
   * Select this element
   * @param target
   */
  Classes.BaseRadioOrCheckbox.prototype.selectInput = function (target) {
    // Quickreferences
    target = target[0] || target;
    var inputs = this.buttonArr;

    // Don't do anything if component is disabled
    if (target.getAttribute('is-disabled')) {
      return false;
    }

    // Iterate through all inputs
    for (var i = 0; i < inputs.length; i++) {

      if (target == inputs[i][0]) {

        // Select, check, and set tab index to 1 for the target element.
        if (this.inputType == "radio" || !inputs[i].hasClass("selected")) {
          inputs[i].addClass("selected");
          this.getFirstRadioOrCheckboxInput(inputs[i][0]).checked = true;
          if (inputs[i].attr("role") == "radio") {
            inputs[i].attr("aria-checked", true);
            inputs[i].attr("tabIndex", 1);
          } else {
            $("div[role=radio]", inputs[i][0]).attr("aria-checked", true);
            $("div[role=radio]", inputs[i][0]).attr("tabIndex", 1);
          }
        } else {

          // Toggle 'selected' state for checkboxes
          inputs[i].removeClass("selected");
          this.getFirstRadioOrCheckboxInput(inputs[i][0]).checked = false;
          if (inputs[i].attr("role") == "radio") {
            inputs[i].attr("aria-checked", false);
          } else {
            $("div[role=radio]", inputs[i][0]).attr("aria-checked", false);
          }
        }

        inputs[i][0].focus();
      } else {

        // Unselect, uncheck and set tab index to -1 on all other radio buttons
        if (this.inputType == "radio") {
          inputs[i].removeClass("selected");
          this.getFirstRadioOrCheckboxInput(inputs[i][0]).checked = false;
          if (inputs[i].attr("role") == "radio") {
            inputs[i].attr("aria-checked", false);
            inputs[i].attr("tabIndex", -1);
          } else {
            $("div[role=radio]", inputs[i][0]).attr("aria-checked", false);
            $("div[role=radio]", inputs[i][0]).attr("tabIndex", -1);
          }

        }
      }
    }

    // Process changes
    var ipt = this.getFirstRadioOrCheckboxInput(target);
    this.showHideDependentQuestions();
    this.processPostInputChange(ipt);
  };


  /**
   * @returns {boolean} indicating if the passed in value represents a 'none of the above' answer choice
   */
  Classes.BaseRadioOrCheckbox.prototype.isNoneOfTheAboveAnswer = function (val) {
    return val && (val == '8889' || (val >= '8900' && val <= '8910'));
  };

  /**
   * Show or hide all the inline other answers for this question.  We loop over all the inputs in case
   * another answer's on click has changed the value of other answers (which wouldn't trigger it's onclick).
   * If we are hiding the input, also clear the text value from it.
   * @param {Object} input The input element that was clicked.
   * @private
   */

  Classes.BaseRadioOrCheckbox.prototype.handleInlineOther = function (input) {
    var inputlist = this.getInputsUsingNameSelector();

    inputlist.each(function () {
      var answers = $('div[data-role="button"] input[type=\"text\"][aid="' + this.value + '"]');
      if (this.checked) {
        answers.removeClass('nestedHide');
        answers.addClass('nestedShow');
      } else {
        answers.removeClass('nestedShow');
        answers.addClass('nestedHide');
        if (answers.length > 0) {
          answers[0].value = '';
        }
      }
    });

    var tb = $('input[type=\"text\"].nestedShow', input.parentNode);
    if (tb.length > 0) {
      setTimeout(function (el) {
        return function () {
          el.focus();
          el.select();
        };
      }(tb[0]), 800);
    }
  };

  /**
   * If there should be an 'Other' inline input, create and return it here.
   * @param {String} answerId The id for the answer to check if an other inline input should go with it.
   * @private
   * @returns {HtmlNode} The input representing the dependent 'Other' description.
   */
  Classes.BaseRadioOrCheckbox.prototype.getOtherInlineInput = function (answerId) {
    var classThis = this,
      otherInline;

    $.each(this.otherCustomAnswers, function () {
      if (classThis.questionId == this.qid && answerId == this.aid) {
        otherInline = $('<input type="text"/>')
          .addClass('nestedHide')
          .attr({'name': 'cq-1-' + this.oid, 'id': 'o' + this.oid, 'aid': this.aid, 'tabIndex': '-1'})
          .bind('mousedown', function (e) {
            e.stopPropagation();
          });
        Classes.BaseQuestion.prototype.addFocusBlurHandling(this, otherInline);
        if (this.r == '1') {
          classThis.inlineRequiredQuestions.push(otherInline);
        }
      }
    });

    return otherInline;
  };

  /**
   * Used for validating if this question has an answer or not.
   * @returns {Boolean} true if the radio/checkbox input set has at least one value chosen and false otherwise.
   */
  Classes.BaseRadioOrCheckbox.prototype.hasValue = function () {
    return this.getCheckedInputsUsingNameSelector().length > 0;
  };

  /**
   * Check to see if any inline text inputs are required and showing yet don't have a value entered.
   * @returns {Boolean} true if there are any inline required questions that are showing but don't have a value set, false otherwise.
   */
  Classes.BaseRadioOrCheckbox.prototype.hasInlineRequiredValueMissing = function () {
    for (var i = 0; i < this.inlineRequiredQuestions.length; i++) {
      var textInput = this.inlineRequiredQuestions[i][0];
      if ($(textInput).hasClass('nestedShow') && !textInput.value) {
        return true;
      }
    }

    return false;
  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Get the list of answer IDs that represent what the user has selected on that page.
   * @returns {Array<String>} The list of answer IDs that have been selected on the page.
   */
  Classes.BaseRadioOrCheckbox.prototype.getSelectedAnswerIds = function () {
    var showTheseAnswerIds = [];

    this.getCheckedInputsUsingNameSelector().each(function () {
      showTheseAnswerIds.push(this.value);
    });

    return showTheseAnswerIds;
  };

  /**
   * Clear out the values for this input.
   */
  Classes.BaseRadioOrCheckbox.prototype.clearValues = function () {
    this.getCheckedInputsUsingNameSelector().each(function () {
      this.checked = false;
    });

    this.getAllButtonsSelector().removeClass('selected');
  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();