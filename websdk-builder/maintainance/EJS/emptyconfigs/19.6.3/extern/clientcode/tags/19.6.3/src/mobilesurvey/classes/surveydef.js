/**
 * Describes the survey
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author Alexei White: alexei.white $
 *
 * @modified 12/28/2011: 2011-05-06 08:50:51 -0700 (Fri, 06 May 2011) $
 */

fs.provide("ms.Survey.Classes.SurveyDef");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseQuestion");
fs.require("ms.Survey.Classes.Text");
fs.require("ms.Survey.Classes.Textarea");
fs.require("ms.Survey.Classes.Select");
fs.require("ms.Survey.Classes.Radio");
fs.require("ms.Survey.Classes.Scale");
fs.require("ms.Survey.Classes.Checkbox");
fs.require("ms.Survey.Classes.Rank");

(function () {

  /**
   * A survey definition class.
   * @param {Array<Object>} questions An array containing all the questions to create.
   * @param entireJSON A reference to the entire JSON.
   * @class
   * @constructor
   */
  Classes.SurveyDef = function (questions, entireJSON) {
    this.questions = questions;

    this.json = entireJSON;
  };

  /**
   * Loop over all the questions for the survey while creating an instance of the question and calling create on it.
   * @returns {HtmlNode} The HTML node containing the entire question/answers.
   */
  Classes.SurveyDef.prototype.create = function () {

    var classThis = this;

    var questionsBlock = $('<div/>').attr({ 'class': 'questionsBlock' });

    this.addQuestions(this.questions, questionsBlock, false);

    return questionsBlock;

  };

  /**
   * Recursively creates questions starting at the level passed in.
   * @param {Array} An array of question objects that all extend BaseQuestion.
   * @param {HtmlNode} The node to append all of the questions to.
   */
  Classes.SurveyDef.prototype.addQuestions = function (questions, questionsBlock, isNested) {
    var classThis = this;
    $.each(questions, function () {
      var questionNode = this.create();
      if (isNested) {
        questionNode.addClass('nestedHide');
        this.questionHidden = true;
      }
      questionsBlock.append(questionNode);
      if (this.nestedQuestions.length > 0) {
        classThis.addQuestions(this.nestedQuestions, questionsBlock, true);
      }
    });
  };

})();