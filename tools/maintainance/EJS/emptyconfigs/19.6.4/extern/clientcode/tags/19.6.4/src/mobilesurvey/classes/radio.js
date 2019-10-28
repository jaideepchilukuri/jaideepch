/**
 * A Radio object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Radio");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseRadioOrCheckbox");

(function () {

  /**
   * A radio input class.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Radio = function () {
  };

  /**
   * Extend the prototype of BaseRadioOrCheckbox.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Radio.prototype = new Classes.BaseRadioOrCheckbox();

  /**
   * Initializes the radio input class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire JSON.
   * @class
   * @augments Classes.BaseRadioOrCheckbox
   * @constructor
   */
  Classes.Radio.prototype.initializeRadio = function (questionData, questionNumber, entireJSON) {

    // Extend the BaseRadioOrCheckbox class.
    this.initRadioOrCheckbox(questionData, questionNumber, entireJSON);

    /**
     * Save off the JSON
     */
    this.json = entireJSON;

    /**
     * The question data
     */
    this.questionData = questionData;

  };

  /**
   * Create the HTML for the radio.
   * @returns {HtmlNode} The radio question/answer HTML node.
   */
  Classes.Radio.prototype.create = function () {

    var radioContents = this.createRadio();

    return this.createQuestion("radiogroup")
      .append(radioContents);

  };


  /**
   * Show or hide the questions that are dependent on this question based on the answers selected.
   */
  Classes.Radio.prototype.showHideDependentQuestions = function () {

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
  Classes.Radio.prototype.hideQuestion = function () {

    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseQuestion
    this.clearValues();

    this.showHideDependentQuestions();

    this.questionHidden = true;

  };

})();