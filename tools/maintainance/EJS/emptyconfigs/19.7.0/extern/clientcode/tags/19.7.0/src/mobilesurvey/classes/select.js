/**
 * A Select object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Select");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseQuestion");

(function () {

  /**
   * Class that represents a base Select question.
   * @class
   * @augments Classes.BaseQuestion
   * @constructor
   */
  Classes.Select = function () {
  };

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.BaseQuestion
   * @constructor
   */
  Classes.Select.prototype = new Classes.BaseQuestion();

  /**
   * Initializes a select question/answer input class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire JSON.
   */
  Classes.Select.prototype.initSelect = function (questionData, questionNumber, entireJSON) {

    // Extend the BaseQuestion class
    this.initQuestion(questionData, questionNumber, entireJSON);

    /**
     * The question ID from the database
     */
    this.questionId = questionData.id;

    /**
     * The ordinal question number
     */
    this.questionNumber = questionNumber;

    /**
     * The json data block
     */
    this.json = entireJSON;

    /**
     * The ID of the select box
     */
    this.selectId = this.getInputId('1');

  };

  /**
   * Create the HTML for the select.
   * @returns {HtmlNode} The select question/answer HTML node.
   */
  Classes.Select.prototype.create = function () {

    // The name of the input
    var inputName = this.getInputName();

    /**
     * The HTML node containing the select box
     */
    this.inputNode = $('<select/>').attr({ 'name': inputName, 'id': this.selectId, 'tabIndex': 1 })
      .append($('<option/>').attr({ 'value': '' }).html(this.json.survey.content.meta.info.selecthinttext))
      .bind('change', function (ctx) {
        return function () {
          ctx.showHideDependentQuestions();
          ctx._applyNewSelectedValue();
        };
      }(this));

    Classes.BaseQuestion.prototype.addShowHideHeaderHandling(this.inputNode);

    $.each(this.getOrderedAnswers(), function (ctx) {
      return function (index) {
        ctx.inputNode.append($('<option/>').attr({ 'value': this.id }).html(this.lbl));
      };
    }(this));

    /**
     * Holds the inner label HTML
     */
    this.innerLabel = $("<div />").addClass("innerLabel").html(this.inputNode[0].options[0].text);

    /**
     * Holds most of the HTML for this question
     */
    this.widgetholder = $("<div />").attr({ "data-role": "widgetholder", "input-type": "select" })
      .append($('<div />').attr({ 'data-role': "button" })
        .append($("<div />").attr({ "data-role": "icon" }))
        .append($("<div />").addClass("innerButton")
          .append(this.innerLabel))
        .append(this.inputNode));

    // Highlight the button when the select node is focussed on
    this.inputNode.bind("focus", function (widgetholder) {
      return function (e) {
        $(widgetholder[0].childNodes[0]).addClass("focussed");
      };
    }(this.widgetholder));

    // Unighlight the button when the select node is blurred
    this.inputNode.bind("blur", function (widgetholder) {
      return function (e) {
        $(widgetholder[0].childNodes[0]).removeClass("focussed");
      };
    }(this.widgetholder));

    // Spit out the results
    return this.createQuestion()
      .append($('<div/>').attr({ 'data-role': 'fieldcontain' }).append(this.widgetholder));
  };

  /**
   * Apply the selected value to the widget.
   * @private
   */
  Classes.Select.prototype._applyNewSelectedValue = function () {
    // Get the text
    var txt = this.inputNode[0].options[this.inputNode[0].selectedIndex].text;

    // Set the label
    this.innerLabel.html(txt);
  };

  /**
   * Show or hide the questions that are dependent on this question based on the answers selected.
   */
  Classes.Select.prototype.showHideDependentQuestions = function () {
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
  Classes.Select.prototype.hideQuestion = function () {
    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseQuestion
    this.clearValues();

    this.showHideDependentQuestions();

    this.questionHidden = true;
  };

  /**
   * Used for validating if this question has an answer or not.
   * @returns {Boolean} true if the select has a value and false otherwise.
   */
  Classes.Select.prototype.hasValue = function () {
    return this.inputNode[0].options[this.inputNode[0].selectedIndex].value ? true : false;
  };

  /**
   * Alter the layout of the select question based on detection of elements being different than we expect them to render.
   */
  Classes.Select.prototype.tweakQuestionLayout = function () {
    // If the opacity attribute isn't honored, we'll just show the select as a normal select input
    if (typeof this.inputNode[0].style.opacity == 'undefined') {
      this.widgetholder.addClass('showStandardSelects');
    }
  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Get the answer IDs for the options that are selected.
   */
  Classes.Select.prototype.getSelectedAnswerIds = function () {
    var showTheseAnswerIds = [],
      items = $('option:selected', this.inputNode[0]);
    $.each(items, function () {
      showTheseAnswerIds.push(this.value);
    });

    return showTheseAnswerIds;
  };

  /**
   * Clear all selections from the input.
   */
  Classes.Select.prototype.clearValues = function () {
    this.inputNode[0].selectedIndex = 0;

    this._applyNewSelectedValue();
  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();