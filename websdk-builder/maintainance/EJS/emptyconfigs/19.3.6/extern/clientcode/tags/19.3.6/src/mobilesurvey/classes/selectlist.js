/**
 * A SelectList Question
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.SelectList");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.BaseList");
fs.require("ms.Survey.Classes.Select");

(function () {

  /**
   * Class that represents a base SelectList question.
   */
  Classes.SelectList = function () {
  };

  /**
   * Extend the prototype of BaseQuestion.
   * @class
   * @augments Classes.BaseList
   * @constructor
   */
  Classes.SelectList.prototype = new Classes.BaseList();

  /**
   * Initializes a select list question/answer input class.
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   * @param entireJSON A reference to the entire JSON.
   */
  Classes.SelectList.prototype.initSelectList = function (questionData, questionNumber, entireJSON) {
    // Extend the BaseList class
    this.initList(questionData, questionNumber, entireJSON);
  };

  /**
   * Create the name to be used by the input.
   * @returns {String} A string representing the input name to use for the input.
   */
  Classes.SelectList.prototype.getInputName = function (questionId) {
    return 'cq-2-' + questionId;
  };

  /**
   * Create the HTML for the select list.
   * @returns {HtmlNode} The select questions/answers HTML node.
   */
  Classes.SelectList.prototype.create = function () {
    // Holds all the subquestions
    this.questionContents = $("<div/>").attr({"data-role": "selectlistholder"});

    var inputArr = [];
    var labelArr = [];
    this.inputNode = [];
    var defaultOptionLabel = this.getDefaultOptionLabel();

    // Add each sub question to the overall question
    for (var i = 0; i < this.subQuestions.length; i++) {
      this.questionContents.append($("<div/>").attr({"data-role": "instructionholder"}).append($("<div />").addClass("leftLegend").html(this.subQuestions[i].t)));
      var container = $('<div />').attr({'data-role': 'fieldcontain'});
      var widgetholder = $("<div />").attr({"data-role": "widgetholder", "input-type": "select"});
      var innerLabel = $("<div />").addClass("innerLabel").html(defaultOptionLabel);
      var buttonContainer = $('<div />').attr({'data-role': "button"}).append($("<div />").attr({"data-role": "icon"})).append($("<div />").addClass("innerButton").append(innerLabel));
      this.inputNode[i] = $('<select/>').attr({
        'name': this.getInputName(this.subQuestions[i].id),
        'id': this.getInputId(i + 1),
        'tabIndex': 1
      });
      this.inputNode[i].append($('<option/>').attr({'value': ''}).html(defaultOptionLabel))
        .bind('change', function (ctx, which, inode, ilabel) {
          return function () {
            ctx._applyNewSelectedValue(inode, ilabel);
            ctx.postSelectChanges(which, inode);
          };
        }(this, i, this.inputNode[i], innerLabel));

      Classes.BaseQuestion.prototype.addShowHideHeaderHandling(this.inputNode[i]);

      inputArr[inputArr.length] = this.inputNode[i];
      labelArr[labelArr.length] = innerLabel;

      // Add all the sub nodes
      for (var j = 0; j < this.subQuestions[i].subs.length; j++) {
        this.inputNode[i].append($("<option />").attr({'value': this.subQuestions[i].subs[j].id}).html(this.subQuestions[i].subs[j].lbl));
      }

      this.questionContents.append(container.append(widgetholder.append(buttonContainer.append(this.inputNode[i]))));
    }

    // Save the input array
    this.inputArray = inputArr;

    // Save the label array
    this.labelArray = labelArr;

    return this.createQuestion().append(this.questionContents);

  };

  /**
   * Get the label to use for the default options.
   * @returns {String} The label to use for the default options.
   */
  Classes.SelectList.prototype.getDefaultOptionLabel = function () {
    return this.json.survey.content.meta.info.selecthinttext;
  };

  /**
   * Apply the selected value to the widget.
   * @private
   */
  Classes.SelectList.prototype._applyNewSelectedValue = function (inode, ilabel) {
    // Get the text
    var txt = inode[0].options[inode[0].selectedIndex].text;

    // Set the label
    ilabel.html(txt);

  };

  /**
   * Process any changes that are needed after a select input has been changed.
   * @param which The index of the select input that was changed.
   */
  Classes.SelectList.prototype.postSelectChanges = function (which) {
    // Implement when extending this class if necessary
  };

  /**
   * Used for validating if this question has an answer or not.  Each select list question has its own required
   * indication, so if any of the ones that are required are missing a value then we'll report the entire
   * question as not having a value.
   * @returns {Boolean} true if the select list has a value for all required selects and false otherwise.
   */
  Classes.SelectList.prototype.hasValue = function () {

    for (var i = 0; i < this.subQuestions.length; i++) {
      if (this.subQuestions[i].r == '1' && !$('option:selected', this.inputNode[i][0])[0].value) {
        return false;
      }
    }

    return true;

  };

  /**
   * Alter the layout of the scale question based on detection of elements being different than we expect them to render.
   */
  Classes.SelectList.prototype.tweakQuestionLayout = function () {
    // If the opacity attribute isn't honored, we'll just show the select as a normal select input
    if (typeof this.inputArray[0][0].style.opacity == 'undefined') {
      this.questionContents.addClass('showStandardSelects');
    }
  };

  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Get the answer IDs for the options that are selected.
   */
  Classes.SelectList.prototype.getSelectedAnswerIds = function () {

    var showTheseAnswerIds = [];
    var items = $('option:selected', this.inputNode[0]);
    $.each(items, function () {
      showTheseAnswerIds.push(this.getAttribute('answerid'));
    });

    return showTheseAnswerIds;

  };

  /**
   * Clear all selections from the inputs.
   */
  Classes.SelectList.prototype.clearValues = function () {

    for (var i = 0; i < this.subQuestions.length; i++) {
      this.inputArray[i][0].selectedIndex = 0;
      this.labelArray[i].html(this.getDefaultOptionLabel());
    }

  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

})();