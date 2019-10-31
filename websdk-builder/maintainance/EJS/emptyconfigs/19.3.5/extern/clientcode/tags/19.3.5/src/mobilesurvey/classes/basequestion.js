/**
 * A BaseQuestion object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.BaseQuestion");

fs.require("ms.Survey.Classes");

(function () {

  /**
   * Class that represents a base question.
   * @class
   * @constructor
   */
  Classes.BaseQuestion = function () {};

  /**
   * Initialization function for BaseQuestion
   * @param questionData A reference to the entire question node of the JSON.
   * @param questionNumber The question number in the overall scheme of questions.
   */
  Classes.BaseQuestion.prototype.initQuestion = function (questionData, questionNumber, entireJSON) {
    /**
     * The database ID of the question.
     */
    this.questionId = questionData.id;

    /**
     * The question number as calculated by the rendered position in the survey. This is not in the data.
     */
    this.questionNumber = questionNumber;

    /**
     * Maps to QuestionTypesEnum.
     */
    this.questionType = questionData.qt;

    /**
     * The actual text of the question.
     * We encode quote characters in the xmlToJSON.xslt so that the JSON coming in is valid, but here we convert them back so that
     * things like a quote around a class name in some html included in the question text is treated appropriately.
     */
    this.questionText = questionData.txt.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;nbsp;/g, ' ');

    // Label if applicable
    this.questionLabel = questionData.lbl ? questionData.lbl.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;nbsp;/g, ' ') : '';

    /**
     * Boolean. Is the question required or not?
     */
    this.required = !this.questionType || questionData.r == '1';

    /**
     * Boolean. Is the question required or not?
     */
    this.randomize = questionData.rand == '1';

    /**
     * Creates a permanent reference to the entire JSON.
     */
    this.json = entireJSON;

    // Quickreference the main node
    var mainRef = this.json.survey.content.main;

    /**
     * Save off the ext meta information for easy access
     */
    this.metaExtInfo = this.json.survey.content.meta['ext-info'];

    /**
     * Quick reference to the max length to use for all text/textarea inputs
     */
    if (this.metaExtInfo.JS_TEXT_MAX_LENGTH) {
      this.textMaxLength = this.metaExtInfo.JS_TEXT_MAX_LENGTH;
    } else {
      this.textMaxLength = 1000;
    }

    /**
     * The following are references to lists in the JSON that are used elsewhere.  We initialize to an empty array in
     * cases where there isn't any data so that the other parts of the code don't have to worry about it.
     */
    this.measuredQuestionAnswers = this.getArrayFromJSON(mainRef.ma.ans);
    this.customQuestionAnswers = this.getArrayFromJSON(mainRef.ca.ans);
    this.nestedCustomQuestions = this.getArrayFromJSON(mainRef.ncq.qstn);
    this.customAnswerGroups = this.getArrayFromJSON(mainRef.cag.g);
    this.otherCustomAnswers = this.getArrayFromJSON(mainRef.oca.o);
    this.extCustomQuestionAttributes = this.getArrayFromJSON(mainRef.extcqattr.cq);

    /**
     * Set the validation specific types for use upon submission.
     */
    this.isIntField = this.hasCustomValidationAttribute('int');
    this.isDoubleField = this.hasCustomValidationAttribute('double');
    this.isZipField = this.hasCustomValidationAttribute('zip');
    this.isEmailField = utils.inArray(this.questionId, window.emailQuestions);


    /**
     * Keep track of the inline 'Other' questions that are required
     */
    this.inlineRequiredQuestions = [];

    /**
     * The answer IDs that, if selected, will enable this question to show.
     */
    this.dependentAnswerIds = this._getDependentAnswerIds(questionData);

    /**
     * The set of questions that are nested as direct children to this question.
     */
    this.nestedQuestions = this._getNestedQuestions();

    /**
     * An event that will fire when validation is tested and it passes.
     */
    this.validationPassed = new utils.FSEvent();

    /**
     * An event that will fire when validation is tested and it fails.
     */
    this.validationFailed = new utils.FSEvent();

    /**
     * Does this question already have the error class?
     */
    this.hasErrorClass = false;

  };

  /**
   * Get an array of question objects based off the JSON questions passed in.
   * @param {Object} jsonQuestions The questions you want to get, in JSON format.
   * @param {Object} entireJSON The entire JSON object to be used while creating the question objects.
   * @param {String} parentQuestionNumber The parentQuestionNumber for these questions if they are nested.
   * @returns {Array<Object>} An array of Objects that extend BaseQuestion and represent the questions from the JSON passed in.
   */
  Classes.BaseQuestion.prototype.getQuestions = function (jsonQuestions, entireJSON, parentQuestionNumber) {

    var questions = [];

    $.each(jsonQuestions, function (index) {
      var jsonQuestion = this,
        questionNumber = !parentQuestionNumber ? (index + 1) : (parentQuestionNumber + '.' + (index + 1)),
        questionType = this.qt,
        q;

      if (questionType) {
        // Custom Questions
        if (questionType == QuestionTypesEnum.TEXT) {
          if (this.dt == DisplayTypesEnum.TEXTAREA) {
            q = new Classes.Textarea();
            q.initTextarea(jsonQuestion, questionNumber, entireJSON);
            questions.push(q);
          } else {
            q = new Classes.Text();
            q.initText(jsonQuestion, questionNumber, entireJSON);
            questions.push(q);
          }
        } else if (questionType == QuestionTypesEnum.SELECT) {
          q = new Classes.Select();
          q.initSelect(jsonQuestion, questionNumber, entireJSON);
          questions.push(q);
        } else if (questionType == QuestionTypesEnum.RADIO) {
          q = new Classes.Radio();
          q.initializeRadio(jsonQuestion, questionNumber, entireJSON);
          questions.push(q);
        } else if (questionType == QuestionTypesEnum.SCALE) {
          q = new Classes.Scale();
          q.initScale(jsonQuestion, questionNumber, entireJSON, true);
          questions.push(q);
        } else if (questionType == QuestionTypesEnum.CHECKBOX) {
          q = new Classes.Checkbox();
          q.initCheckbox(jsonQuestion, questionNumber, entireJSON);
          questions.push(q);
        } else if (questionType == QuestionTypesEnum.RANK) {
          q = new Classes.Rank();
          q.initRank(jsonQuestion, questionNumber, entireJSON);
          questions.push(q);
        } else if (questionType == QuestionTypesEnum.LIST_OF_SELECTS) {
          q = new Classes.SelectList();
          q.initSelectList(jsonQuestion, questionNumber, entireJSON);
          questions.push(q);
        } else if (questionType == QuestionTypesEnum.LIST_OF_TEXTS) {
          q = new Classes.TextList();
          q.initTextList(jsonQuestion, questionNumber, entireJSON);
          questions.push(q);
        } else {
          throw {name: "unsupportedQuestionException"};
        }
      } else {
        // Measured Questions (they don't have a question type, it is implied to be a scale question)
        q = new Classes.Scale();
        q.initScale(jsonQuestion, questionNumber, entireJSON, false);
        questions.push(q);
      }
    });

    return questions;

  };

  /**
   * Get an array of question objects that are nested questions of this question.
   * @private
   * @returns {Array<Object>} An array of Objects that extend BaseQuestion and represent the nested questions for this question.
   */
  Classes.BaseQuestion.prototype._getNestedQuestions = function () {
    var classThis = this,
      jsonQuestions = [];

    $.each(this.nestedCustomQuestions, function () {
      if (this.pid == classThis.questionId) {
        jsonQuestions.push(this);
      }
    });

    return this.getQuestions(jsonQuestions, this.json, this.questionNumber);
  };

  /**
   * Using the JSON passed in, find all the question answers that are valid to trigger this question as a
   * dependent question.  The answers are either found directly with the aid (answer id), or as a one to
   * many relationship using the gid (group id) to get many aid.
   * @param {Object} The JSON question data to be used for finding dependencies.
   * @private
   * @returns {Array<String>} The answer IDs that are valid answers for the dependent question.
   */
  Classes.BaseQuestion.prototype._getDependentAnswerIds = function (questionData) {

    var dependentAnswerIds = [];

    if (questionData.pid) {
      if (questionData.aid) {
        dependentAnswerIds.push(questionData.aid);
      } else if (questionData.gid) {
        $.each(this.customAnswerGroups, function () {
          if (this.gid == questionData.gid) {
            dependentAnswerIds.push(this.aid);
          }
        });
      }
    }

    return dependentAnswerIds;
  };

  /**
   * Create the HTML for the question.
   * @param inputType {string} Used to label the ARIA-ROLE of the questionBlock
   * @returns {HtmlNode} The HTML node for the question.
   */
  Classes.BaseQuestion.prototype.createQuestion = function (inputType) {

    this.errorMessageNode = $('<div/>').addClass('errorMessages');

    // Set up the question label
    // hqn comes from the xslt template that creates the page and json to begin with
    var questionString = utils.arrayIndexOf(this.questionId, hqn) > -1 ? this.questionText : (this.questionNumber + ': ' + this.questionText);

    // Add the required/optional indicators
    var hideRequiredMarker = this.metaExtInfo.hide_reqrd_mrkr && this.metaExtInfo.hide_reqrd_mrkr == 'yes';
    var showOptionalMarker = this.metaExtInfo.show_optional_mrkr && this.metaExtInfo.show_optional_mrkr == 'yes';
    if (this.required && !hideRequiredMarker) {
      questionString = "<span class=\"requiredLabel\">*</span><span class=\"hidden-accessible\">(required)</span>" + questionString;
    } else if (!this.required && showOptionalMarker) {
      questionString = "<span class=\"optionalLabel\">*</span>" + questionString;
    }

    /**
     * Holds the entire HTML for the question, including the question text.
     */
    this.questionNode = $('<div/>').attr({
      'class': 'questionBlock',
      'id': this.questionId + '_QBlock',
      'questionId': this.questionId,
      'role': inputType || ""
    }).append($('<a/>').attr({'id': 'a' + this.questionId, 'name': 'anchor' + this.questionId}))
      .append(this.errorMessageNode)
      .append($('<div/>').attr({'class': 'questionText'}).html(questionString));

    return this.questionNode;
  };

  /**
   * Get the answers in the order they should be used for display.  This includes support for randomization as well
   * as keeping the answers with values >= 1000 at the end of the list.  In standard cases, the order will be the
   * same as it was encountered in the JSON.
   * @returns {Array<Object>} The JSON answer objects for this question, in the order they should be used for display.
   */
  Classes.BaseQuestion.prototype.getOrderedAnswers = function () {

    var classThis = this;

    var resultingAnswers = [], validAnswers = [], canBeRandomizedAnswers = [];

    var allAnswers = this.measuredQuestionAnswers.concat(this.customQuestionAnswers);

    // collect all answers, and also create a set representing the ones that are randomize-able
    $.each(allAnswers, function () {
      if (this.qid == classThis.questionId) {
        validAnswers.push(this);
        if (classThis.randomize && this.val < 1000) {
          canBeRandomizedAnswers.push(this);
        }
      }
    });

    // randomize the randomize-able ones
    if (this.randomize) {
      canBeRandomizedAnswers.sort(function () {
        return 0.5 - Math.random();
      });
    }

    // put them out in order, grabbing any random answer when the time comes, but keeping the position the same for non-random answers
    $.each(validAnswers, function () {
      if (classThis.randomize && this.val < 1000) {
        resultingAnswers.push(canBeRandomizedAnswers.splice(0, 1)[0]);
      } else {
        resultingAnswers.push(this);
      }
    });

    return resultingAnswers;

  };

  /**
   * Create the id to be used by the input based on the question and answer.
   * @param {String} answerNumber The answer number to get the input id for.
   * @returns {String} A string representing the input id to use for the question answer.
   */
  Classes.BaseQuestion.prototype.getInputId = function (answerNumber) {

    return 'q' + this.questionNumber.toString().replace(/\./g, '_') + 'a' + answerNumber;

  };

  /**
   * Create the name to be used by the input based on the question type and id.
   * @returns {String} A string representing the input name to use for the input.
   */
  Classes.BaseQuestion.prototype.getInputName = function () {

    return this.questionType ? ('cq-' + this.questionType + '-' + this.questionId) : 'mq-' + this.questionId;

  };

  /**
   * Alter the layout of anything that renders differently than we are expecting. Override in question type sub-classes.
   */
  Classes.BaseQuestion.prototype.tweakQuestionLayout = function () {

  };

  /**
   * Add common focus and blur handling to the passed in input.
   */
  Classes.BaseQuestion.prototype.addFocusBlurHandling = function (ctx, inputNode) {
    this.addShowHideHeaderHandling(inputNode);
    this.addForceBlurHandling(ctx, inputNode);
  };

  /**
   * Add hiding the header and re-showing it on focus and blur, respectively, for the passed in input.
   */
  Classes.BaseQuestion.prototype.addShowHideHeaderHandling = function (inputNode) {
    inputNode.bind("focus", function () {
      setTimeout(function () {
        $(".theHeader")[0].style.display = "none";
        var validationHeaderArr = $(".validationHeader");
        if (validationHeaderArr.size() > 0) {
          validationHeaderArr[0].style.display = "none";
        }
      }, 10);
    });
    inputNode.bind("blur", function () {
      $(".theHeader")[0].style.display = "";
      var validationHeaderArr = $(".validationHeader");
      if (validationHeaderArr.size() > 0) {
        validationHeaderArr[0].style.display = "";
      }
    });
  };

  /**
   * The purpose of this is for iPad only.  The iPad will not hide the keyboard when you touch outside a focused textarea
   * or text input, and for the time being that seems to be the desired behavior by clients.  This function will add event
   * handling to intercept any touches outside of the input once it has focus and then cause the input to blur and not
   * cascade the touch event any further.
   */
  Classes.BaseQuestion.prototype.addForceBlurHandling = function (ctx, inputNode) {
    if (Theme.isIPad) {
      ctx.blurInputFunction = function (elem) {
        return function (e) {
          var target = e.target || e.srcElement;
          if (elem.id != target.id) {
            e.stopPropagation();
            e.preventDefault();
            elem.blur();
          }
        };
      }(inputNode[0]);
      inputNode.bind('focus', function (ctx) {
        return function () {
          $(window.document).bind('touchstart', ctx.blurInputFunction, true);
        };
      }(ctx));
      inputNode.bind('blur', function (ctx) {
        return function () {
          $(window.document).unbind('touchstart', ctx.blurInputFunction, true);
        };
      }(ctx));
    }
  };

  /**************************************************************************************************
   * Begin Validation functions
   **************************************************************************************************/

  /**
   * Validate this question and it's nested questions.
   * @returns {Array<Object>} If validation fails, returns an array containing objects with the ID. Otherwise returns nothing.
   */
  Classes.BaseQuestion.prototype.validate = function () {
    var erroredQuestions = [];

    $.each(this.nestedQuestions, function () {
      if (!this.questionHidden) {
        erroredQuestions = erroredQuestions.concat(this.validate());
        this.questionNode.removeClass('nestedHideOnValidation');
      } else {
        this.questionNode.addClass('nestedHideOnValidation');
      }
    });

    var errors = [];

    // fix val req if not available
    if (!window.VAL_REQ)
      window.VAL_REQ = "required.";

    this.truncateTextField();

    // Required question check
    if (this.required && !this.hasValue()) {
      errors.push($('<div/>').html(window.QSTN_TXT + ' ' + window.VAL_REQ));
    } else {
      // Integer check
      if (this.isIntField && !this.isInteger(this.getValue())) {
        errors.push($('<div/>').html(window.QSTN_TXT + ' ' + window.VAL_NUMBER));
      }
      // Double check
      if (this.isDoubleField && !this.isDouble(this.getValue())) {
        errors.push($('<div/>').html(window.QSTN_TXT + ' ' + window.VAL_NUMBER));
      }
      // Zip check
      if (this.isZipField && !this.isZip(this.getValue())) {
        errors.push($('<div/>').html(window.QSTN_TXT + ' ' + window.VAL_ZIP));
      }
      // Email check
      if (this.isEmailField && !this.isEmail(this.getValue())) {
        errors.push($('<div/>').html(window.QSTN_TXT + ' ' + window.VAL_EMAIL));
      }
      // Inline text required check
      if (this.inlineRequiredQuestions.length > 0 && this.hasInlineRequiredValueMissing()) {
        errors.push($('<div/>').html(window.QSTN_TXT + ' ' + window.VAL_REQ));
      }
    }

    // Clear out any previous error messages
    this.errorMessageNode.html('');

    if (errors.length > 0) {

      // Set the errors message
      for (var i = 0; i < errors.length; i++) {
        this.errorMessageNode.append(errors[i]);
      }

      // Add the error CSS class
      this.setQuestionErrorClass(true);

      // Add a "next error" button
      if (!this.nextErrorButton) {
        var goToNextText = window.VAL_ERROR_GO_TO_NEXT ? window.VAL_ERROR_GO_TO_NEXT : 'Go to next error';
        this.nextErrorButton = $("<a><span class='square'>&#9642</span><span class='message'>" + goToNextText + "</span></a>").attr({
          href: "#",
          tabIndex: "1",
          role: "button",
          class: "nextError"
        }).bind("click", function (e) {
          e.preventDefault();
          e.returnValue = false;
          $("#nextErrorButton")[0].focus();
          return;
        }).bind("keydown", function (e) {
          if (e.keyCode === 32) {
            e.preventDefault();
            e.returnValue = false;
          }
        });

        // Append the 'jump to next error' button to the last control group
        if (this.contentNode) {
          var contentNodeChild = this.contentNode[0].childNodes[this.contentNode[0].childNodes.length - 1];
          $(contentNodeChild.childNodes[contentNodeChild.childNodes.length - 1]).append(this.nextErrorButton);
        } else {
          if (this.widgetholder) {
            this.widgetholder.append(this.nextErrorButton);
          }
        }
      }


      // Fire the event signifying failure
      this.validationFailed.fire();

      // Add a POJO with just the ID to the errored questions to bubble up
      erroredQuestions.push({id: this.questionId});

    } else {
      // Add the validation succeeded class
      this.setQuestionErrorClass(false);

      // Fire the event
      this.validationPassed.fire();

      // Remove the 'next error' button
      if (this.nextErrorButton && this.nextErrorButton[0].parentNode) {
        this.nextErrorButton[0].parentNode.removeChild(this.nextErrorButton[0]);
      }
    }

    if (erroredQuestions.length > 0) {
      return erroredQuestions;
    }
  };

  /**
   * Set or remove the error class on the container for the question.
   * @param {Boolean} hasError An indication of whether or not the question has an error to be used to determine the class.
   */
  Classes.BaseQuestion.prototype.setQuestionErrorClass = function (hasError) {
    if (hasError) {
      if (!this.hasErrorClass) {
        this.questionNode.addClass('questionErrored');
        this.hasErrorClass = true;
      }
    } else {
      if (this.hasErrorClass) {
        this.questionNode.removeClass('questionErrored');
        this.hasErrorClass = false;
      }
    }
  };

  /**
   * Check to see if this question has specific validation needs from the configuration.
   * @param {String} The type of custom validation attribute we are checking for.
   * @returns {Boolean} true if this question is of the type passed in, false if not.
   */
  Classes.BaseQuestion.prototype.hasCustomValidationAttribute = function (type) {
    var classThis = this;
    var hasAttribute = false;

    $.each(classThis.extCustomQuestionAttributes, function () {
      if (this.qid == classThis.questionId && this.name == 'validation' && this.textvalue == type) {
        hasAttribute = true;
        return;
      }
    });

    return hasAttribute;
  };

  /**
   * Truncate text inputs in case the maxlength attribute isn't being honored.
   */
  Classes.BaseQuestion.prototype.truncateTextField = function () {
    if (this instanceof Classes.Text || this instanceof Classes.Textarea) {
      this.setValue(this.getValue().substring(0, this.textMaxLength));
    }
  };

  /**
   * Check to see if the value of the question answer is an integer.  If nothing is passed in it will match.
   * @param {String} possibleInteger The value to check if it is an integer or not.
   * @returns {Boolean} true if the passed in value is either empty or is an integer, false otherwise.
   */
  Classes.BaseQuestion.prototype.isInteger = function (possibleInteger) {
    return !possibleInteger || possibleInteger.match(/(^-?\d\d*$)/);
  };

  /**
   * Check to see if the value of the question answer is a double.  If nothing is passed in it will match.
   * @param {String} possibleDouble The value to check if it is a double or not.
   * @returns {Boolean} true if the passed in value is either empty or is a double, false otherwise.
   */
  Classes.BaseQuestion.prototype.isDouble = function (possibleDouble) {
    return !possibleDouble || possibleDouble.match(/(^-?\d\d*\.\d*$)|(^-?\d\d*$)|(^-?\.\d\d*$)/);
  };

  /**
   * Check to see if the value of the question answer is a zip.  If nothing is passed in it will match.
   * @param {String} possibleZip The value to check if it is a zip or not.
   * @returns {Boolean} true if the passed in value is either empty or is a zip, false otherwise.
   */
  Classes.BaseQuestion.prototype.isZip = function (possibleZip) {
    if (typeof window.VAL_ZIP_REGEX == 'undefined') {
      return !possibleZip || possibleZip.match(/(^\d{5}$)|(^\d{5}-\d{4}$)/);
    } else {
      return !possibleZip || possibleZip.match(new RegExp(window.VAL_ZIP_REGEX, 'i'));
    }
  };

  /**
   * Check to see if the value of the question answer is an email.  If nothing is passed in it will match.
   * @param {String} possibleEmail The value to check if it is an email or not.
   * @returns {Boolean} true if the passed in value is either empty or is an email, false otherwise.
   */
  Classes.BaseQuestion.prototype.isEmail = function (possibleEmail) {
    return !possibleEmail || possibleEmail.match(/^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,6})+$/);
  };

  /**************************************************************************************************
   * End Validation functions
   **************************************************************************************************/


  /**************************************************************************************************
   * Begin Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Show this question.  Should only be used after this question has been drawn initially.
   */
  Classes.BaseQuestion.prototype.showQuestion = function () {
    this.questionNode.removeClass('nestedHide').attr({'tabindex': '1'});
    this.questionHidden = false;
  };

  /**
   * Check to see if this question should be shown because a parent question has one of the appropriate
   * answers selected to make this question show.
   * @param {Array<String>} A list of the answers that have been selected.
   * @returns {Boolean} true if the question should show as a dependent question, false if not.
   */
  Classes.BaseQuestion.prototype.shouldShowAsDependentQuestion = function (selectedAnswerIds) {
    var classThis = this;
    var shouldShow = false;

    // If the answer has been selected, and the dependent question relies on that answer, we'll show it
    $.each(selectedAnswerIds, function () {
      if (utils.inArray(this.toString(), classThis.dependentAnswerIds)) {
        shouldShow = true;
        return;
      }
    });

    return shouldShow;
  };

  /**************************************************************************************************
   * End Show/Hide Logic functions
   **************************************************************************************************/

  /**
   * Get an Array object containing the JSON data for the survey.  This function is here to account for
   * the fact that the JSON we start with may sometimes have a single element not in an array, sometimes
   * have more than 1 element and already be an array, or not exist at all if there are no values.  By
   * using this convenience function, none of the other code will have to do any of these checks for
   * circumstances and can just use the Object knowing it is an Array.
   * @param {Object} JSON representation of a node we want to have values for in an Array.
   * @returns {Array} JSON objects, 1 to many, or an empty Array if the value passed in was invalid or empty.
   */
  Classes.BaseQuestion.prototype.getArrayFromJSON = function (possibleArray) {
    if (!possibleArray) {
      return [];
    } else if (possibleArray instanceof Array) {
      return possibleArray;
    } else {
      return new Array(possibleArray);
    }
  };

  /**
   * Get an Array object containing the JSON data for the survey.  This function is here to account for
   * the fact that the JSON we start with may sometimes have a single element not in an array, sometimes
   * have more than 1 element and already be an array, or not exist at all if there are no values.  By
   * using this convenience function, none of the other code will have to do any of these checks for
   * circumstances and can just use the Object knowing it is an Array. This method differes from
   * getArrayFromJSON() because we are only interested in grabbing either the quesions with a negative
   * priority order or positive priority order, mutually exclusive
   * @param {Object} JSON representation of a node we want to have values for in an Array.
   * @param {Boolean/Object} true if you are interested in the negative priorty CQs, false otherwise
   * @returns {Array} JSON objects, 1 to many, or an empty Array if the value passed in was invalid or empty.
   */
  Classes.BaseQuestion.prototype.getCQArrayFromJSON = function (possibleArray, negativesOnly) {
    if (!possibleArray) {
      return [];
    } else if (possibleArray instanceof Array) {
      return splitQuestionsOnPriority(possibleArray, negativesOnly);
    } else {
      return splitQuestionsOnPriority(new Array(possibleArray), negativesOnly);
    }
  };

  /**
   * Utility function for splitting on priority values
   * @param questionArray
   * @param getNegatives
   * @returns {Array}
   */
  function splitQuestionsOnPriority(questionArray, getNegatives) {
    var newArray = [];
    questionArray.forEach(function (entry) {
      if (getNegatives) {
        if (entry.porder < 0) {
          newArray[newArray.length] = entry;
        }
      }
      else {
        if (entry.porder > 0) {
          newArray[newArray.length] = entry;
        }
      }
    });
    return newArray;
  }

  /**
   * Global enum to be used for ease of tying together the question type number and what it represents
   */
  var QuestionTypesEnum = {
    TEXT: '1',
    SELECT: '2',
    RADIO: '3',
    SCALE: '4',
    CHECKBOX: '5',
    RANK: '11',
    LIST_OF_TEXTS: '14',
    LIST_OF_SELECTS: '15'
  };

  /**
   * A subtype modifier
   */
  var DisplayTypesEnum = {
    TEXTAREA: '2'
  };

})();