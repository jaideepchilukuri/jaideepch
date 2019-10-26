/**
 * A Checkbox object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Checkbox");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseRadioOrCheckbox");

(function () {

  /**
   * A checkbox class.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Checkbox = function () { };

  /**
   * Extend the prototype of BaseRadioOrCheckbox.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Checkbox.prototype = new Classes.BaseRadioOrCheckbox();

  /**
   * Intitializes the checkbox
   * @param {Object} questionData A reference to the entire question node of the JSON.
   * @param {Number} questionNumber The question number in the overall scheme of questions.
   * @param {Object} entireJSON A reference to the entire JSON.

   */
  Classes.Checkbox.prototype.initCheckbox = function (questionData, questionNumber, entireJSON) {
    // Inherits from BaseRadioOrCheckbox
    this.initRadioOrCheckbox(questionData, questionNumber, entireJSON);

    // Save off the JSON
    this.json = entireJSON;
  };

  /**
   * Create the HTML for the checkbox.
   * @param {String} questionId The Question ID from the database.
   * @param {Number} questionNumber The question number.
   * @returns {HtmlNode} The HTML Node of the question.
   */
  Classes.Checkbox.prototype.create = function (questionId, questionNumber) {
    return this.createQuestion("group")
      .append(this.createCheckbox());
  };

  /**
   * Show or hide the questions that are dependent on this question based on the answers selected.
   */
  Classes.Checkbox.prototype.showHideDependentQuestions = function () {

    // This function must be defined in the class that is extending BaseQuestion
    var selectedAnswerIds = this.getSelectedAnswerIds();

    $.each(this.nestedQuestions, function () {
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
  Classes.Checkbox.prototype.hideQuestion = function () {

    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseQuestion
    this.clearValues();

    this.showHideDependentQuestions();

    this.questionHidden = true;

  };

})();