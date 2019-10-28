/**
 * A Rank Question
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Rank");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.SelectList");
fs.require("ms.Survey.Classes.Select");

(function () {

  /**
   * Class that represents a base Rank question.
   */
  Classes.Rank = function () {
  };

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.SelectList
   * @constructor
   */
  Classes.Rank.prototype = new Classes.SelectList();

  /**
   * Initializs a rank question/answer input class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire JSON.
   */
  Classes.Rank.prototype.initRank = function (questionData, questionNumber, entireJSON) {
    // Extend the SelectList class
    this.initSelectList(questionData, questionNumber, entireJSON);
  };

  /**
   * Get the label to use for the default options.
   * @returns {String} The label to use for the default options.
   */
  Classes.Rank.prototype.getDefaultOptionLabel = function () {
    return this.json.survey.content.meta.info.rankhinttext;
  };

  /**
   * De-select any other rank options that were previously selected as the same as the one just chosen.
   */
  Classes.Rank.prototype.postSelectChanges = function (which, inode) {
    // Get the text
    var txt = inode[0].options[inode[0].selectedIndex].text;

    // Now reset the options from the other lists if they match the one just selected
    for (var i = 0; i < this.inputArray.length; i++) {
      var selectedItem = this.inputArray[i][0].options[this.inputArray[i][0].selectedIndex].text;
      if (i != which) {
        if (selectedItem == txt) {
          this.inputArray[i][0].selectedIndex = 0;
          this.labelArray[i].html(this.getDefaultOptionLabel());
        }
      }
    }
  };

})();