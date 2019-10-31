/**
 * A Text object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Text");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseQuestion");

(function () {

  /**
   * Class that represents a base Text question.
   * @class
   * @augments Classes.BaseQuestion
   * @constructor
   */
  Classes.Text = function () {
  };

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.BaseQuestion
   * @constructor
   */
  Classes.Text.prototype = new Classes.BaseQuestion();

  /**
   * Initializes a text class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire survey definition JSON object.
   */
  Classes.Text.prototype.initText = function (questionData, questionNumber, entireJSON) {

    // Extends basequestion.
    this.initQuestion(questionData, questionNumber, entireJSON);

    this.inputId = this.getInputId('1');

    /**
     * Add pii warning to reduce the risk of personal information being recorded.
     */

    this.piiPlaceholder = entireJSON.survey.content.meta['ext-info'].JS_DEFAULT_TEXTAREA || '';

  };

  /**
   * Create the HTML for the text question.
   * @returns {HtmlNode} The text question/answer HTML node.
   */
  Classes.Text.prototype.create = function () {

    var inputName = this.getInputName();

    this.inputNode = $('<input type="text"/>').attr({
      'name': inputName,
      'id': this.inputId,
      'maxlength': this.textMaxLength,
      'tabIndex': 1,
      'placeholder': this.piiPlaceholder
    });

    Classes.BaseQuestion.prototype.addFocusBlurHandling(this, this.inputNode);

    return this.createQuestion()
      .append(
        $('<div/>').attr({'data-role': 'fieldcontain'})
          .append($('<label/>').attr({'for': inputName}))
          .append(this.inputNode)
      );

  };

  /**
   * Used for validating if this question has an answer or not.
   * @returns {Boolean} true if the text has a value and false otherwise.
   */
  Classes.Text.prototype.hasValue = function () {

    return this.inputNode[0].value.length > 0;

  };

  /**
   * Get the actual value of the input field.
   * @returns {String} The value of the input field.
   */
  Classes.Text.prototype.getValue = function () {

    return this.inputNode[0].value;

  };

  /**
   * Set the actual value of the text input field.
   * @param {String} The value to set the text input field to.
   */
  Classes.Text.prototype.setValue = function (value) {

    this.inputNode[0].value = value;

  };


  /**
   * Hide this question.  Should only be used after this question has been drawn initially.
   */
  Classes.Text.prototype.hideQuestion = function () {

    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseQuestion
    this.clearValues();

    this.questionHidden = true;

  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Get the answer ID for the text input.
   */
  Classes.Text.prototype.getSelectedAnswerIds = function () {

    return []; // A text input can't have answers dependent on it at this time

  };

  /**
   * Clear all selections from the input.
   */
  Classes.Text.prototype.clearValues = function () {

    this.inputNode[0].value = '';

  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();