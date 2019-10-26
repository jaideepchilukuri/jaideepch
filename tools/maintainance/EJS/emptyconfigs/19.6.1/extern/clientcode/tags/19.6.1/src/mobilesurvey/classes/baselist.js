/**
 * A BaseList Question
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.BaseList");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseQuestion");

(function () {

  /**
   * Class that represents a base list question.
   */
  Classes.BaseList = function () {
  };

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.BaseQuestion
   * @constructor
   */
  Classes.BaseList.prototype = new Classes.BaseQuestion();

  /**
   * Initializes a base list question/answer input class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire JSON.
   */
  Classes.BaseList.prototype.initList = function (questionData, questionNumber, entireJSON) {
    // Extend the BaseQuestion class
    this.initQuestion(questionData, questionNumber, entireJSON);

    // The data for this question specifically
    this.questionData = questionData;

    // Extract the sub questions
    this._getSubQuestions();
  };

  /**
   * Extract the sub questions from the data.
   * @private
   */
  Classes.BaseList.prototype._getSubQuestions = function () {
    // Quickreference main
    var mainGroup = this.json.survey.content.main;

    // Quickreference caset
    var caset = mainGroup.caset.as;

    // Quickreference the answers
    var ans = mainGroup.ca.ans;

    var classThis = this,
      subQuestions = [],
      randIdx = [];

    for (var i = 0; i < caset.length; i++) {
      if (this.questionData.id == caset[i].qid) {
        var qInfo = caset[i],
          resultingAnswers = [],
          validAnswers = [],
          canBeRandomizedAnswers = [],
          randomizedAnswers = [];

        // Save off the valid answers, as well as a list of answers that can be randomized
        /* jshint ignore:start */
        $.each(ans, function () {
          if (this.qid == qInfo.id) {
            validAnswers.push(this);
            if (classThis.randomize && this.val < 1000) {
              canBeRandomizedAnswers.push(this);
            }
          }
        });
        /* jshint ignore:end */

        // If we should randomize, create a randIdx array 1 time for the group with a set of randomized indexes to use
        // then, always use that randomized index list to push the answers in to the randomizedAnswers to use later
        if (this.randomize) {
          if (randIdx.length === 0) {
            for (var idx = 0; idx < canBeRandomizedAnswers.length; idx++) {
              randIdx.push(idx);
            }
            /* jshint ignore:start */
            randIdx.sort(function () {
              return 0.5 - Math.random();
            });
            /* jshint ignore:end */
          }
          for (var j = 0; j < randIdx.length; j++) {
            randomizedAnswers.push(canBeRandomizedAnswers[randIdx[j]]);
          }
        }

        // Now, add the answer choices where they should go, with a random selection when needed
        /* jshint ignore:start */
        $.each(validAnswers, function () {
          if (classThis.randomize && this.val < 1000) {
            resultingAnswers.push(randomizedAnswers.splice(0, 1)[0]);
          } else {
            resultingAnswers.push(this);
          }
        });
        /* jshint ignore:end */

        qInfo.subs = resultingAnswers;
        subQuestions[subQuestions.length] = qInfo;
      }
    }

    // Assign it
    this.subQuestions = subQuestions;
  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Show or hide the questions that are dependent on this question based on the answers selected.
   */
  Classes.BaseList.prototype.showHideDependentQuestions = function () {
    // This function must be defined in the class that is extending BaseList
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
  Classes.BaseList.prototype.hideQuestion = function () {
    this.questionNode.addClass('nestedHide');

    // This function must be defined in the class that is extending BaseList
    this.clearValues();

    this.showHideDependentQuestions();

    this.questionHidden = true;
  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();