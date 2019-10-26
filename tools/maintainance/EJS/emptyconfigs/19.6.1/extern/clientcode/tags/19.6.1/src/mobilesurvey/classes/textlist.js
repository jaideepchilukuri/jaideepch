/**
 * A TextList Question
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.TextList");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseList");
fs.require("ms.Survey.Classes.Select");

(function () {

  /**
   * Class that represents a base TextList question.
   */
  Classes.TextList = function () {
  };

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.BaseList
   * @constructor
   */
  Classes.TextList.prototype = new Classes.BaseList();

  /**
   * Initializes a text list question/answer input class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire JSON.
   */
  Classes.TextList.prototype.initTextList = function (questionData, questionNumber, entireJSON) {

    // Extend the BaseList class
    this.initList(questionData, questionNumber, entireJSON);

    this.inputId = this.getInputId('1');

  };

  /**
   * Create the name to be used by the input.
   * @returns {String} A string representing the input name to use for the input.
   */
  Classes.TextList.prototype.getInputName = function (questionId) {
    return 'cq-1-' + questionId;
  };

  /**
   * Create the HTML for the texts.
   * @returns {HtmlNode} The texts question/answer HTML node.
   */
  Classes.TextList.prototype.create = function () {

    // Holds all the subquestions
    this.questionContents = $("<div/>").attr({"data-role": "textlistholder"});

    this.inputNode = [];

    // Add each sub question to the overall question
    for (var i = 0; i < this.subQuestions.length; i++) {
      this.questionContents.append($("<div/>").attr({"data-role": "instructionholder"}).append($("<div />").addClass("leftLegend").html(this.subQuestions[i].t)));
      var container = $('<div />').attr({'data-role': 'fieldcontain'});
      var widgetholder = $("<div />").attr({"data-role": "widgetholder", "input-type": "text"});
      this.inputNode[i] = $('<input type="text"/>').attr({
        'name': this.getInputName(this.subQuestions[i].id),
        'id': this.inputId,
        'maxlength': this.textMaxLength,
        'tabIndex': 1
      });
      this.questionContents.append(container.append(widgetholder.append(this.inputNode[i])));
    }

    return this.createQuestion().append(this.questionContents);
  };

  /**
   * Used for validating if this question has an answer or not.  Each text list question has its own required
   * indication, so if any of the ones that are required are missing a value then we'll report the entire
   * question as not having a value.
   * @returns {Boolean} true if the text list has a value for all required texts and false otherwise.
   */
  Classes.TextList.prototype.hasValue = function () {
    for (var i = 0; i < this.subQuestions.length; i++) {
      if (this.subQuestions[i].r == '1' && this.inputNode[i][0].value.length === 0) {
        return false;
      }
    }

    return true;

  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Get the answer IDs for the options that are selected.
   */
  Classes.TextList.prototype.getSelectedAnswerIds = function () {
    return []; // A text input can't have answers dependent on it at this time
  };

  /**
   * Clear all selections from the input.
   */
  Classes.TextList.prototype.clearValues = function () {
    for (var i = 0; i < this.inputNode.length; i++) {
      this.inputNode[i][0].value = '';
    }
  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();