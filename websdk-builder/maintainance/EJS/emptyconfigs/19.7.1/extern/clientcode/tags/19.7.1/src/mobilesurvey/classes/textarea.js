/**
 * A Textarea object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Textarea");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.Text");
fs.require("ms.Survey.Classes.BaseQuestion");

(function () {

  /**
   * Class that represents a base Textarea question.
   * @class
   * @augments Classes.Text
   * @constructor
   */
  Classes.Textarea = function () {
  };

  /**
   * Extend the prototype of Text.
   * @class
   * @augments Classes.Text
   * @constructor
   */
  Classes.Textarea.prototype = new Classes.Text();

  /**
   * Initializes a textarea class
   * @param questionData A reference to the entire question node of the JSON
   * @param questionNumber The question number in the overall scheme of questions.
   */
  Classes.Textarea.prototype.initTextarea = function (questionData, questionNumber, entireJSON) {

    // Extends Text
    this.initText(questionData, questionNumber, entireJSON);

    /**
     * The object containing the count of characters left available for this textarea.
     */
    this.textareaCntId = this.inputId + 'cnt';

  };

  /**
   * Create the HTML for the textarea
   * @returns {HtmlNode} The textarea question/answer HTML node.
   */
  Classes.Textarea.prototype.create = function () {

    var classThis = this;
    var inputName = this.getInputName();

    this.inputNode = $('<textarea></textarea>').attr({
        'name': inputName,
        'id': this.inputId,
        'maxlength': this.textMaxLength,
        'tabIndex': 1,
        'placeholder': this.piiPlaceholder
      })
      .bind('keyup', function (classThis) {
        return function () {
          $('#' + classThis.textareaCntId).html(this.value.length);
        };
      }(this));

    Classes.BaseQuestion.prototype.addFocusBlurHandling(this, this.inputNode);

    var remainingChars = $("<div />").attr({"data-role": "instructionholder"}).addClass('textareacounter').append($("<div />").attr({"aria-live": "polite"}).addClass("leftLegend").append($('<span/>').attr({'id': this.textareaCntId}).html('0')).append($('<span/>').html('/' + this.textMaxLength)));

    return this.createQuestion()
      .append($('<div/>').attr({'data-role': 'fieldcontain'})
        .append($('<label/>').attr({'for': inputName}))
        .append(remainingChars)
        .append(this.inputNode));

  };

  /**
   * Hide this question.  Should only be used after this question has been drawn initially.
   */
  Classes.Textarea.prototype.hideQuestion = function () {
    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseQuestion
    this.clearValues();

    this.questionHidden = true;
  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Clear all selections from the input.
   */
  Classes.Textarea.prototype.clearValues = function () {

    this.inputNode[0].value = '';

    // Reset the counter text since we cleared out the value.
    $('#' + this.textareaCntId).html('0');

  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();