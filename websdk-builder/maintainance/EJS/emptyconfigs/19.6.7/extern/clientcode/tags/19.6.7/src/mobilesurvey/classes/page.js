/**
 * A Page object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.Page");

fs.require("ms.Survey.Classes");
fs.require("ms.Survey.Classes.SurveyDef");
fs.require("ms.Survey.Classes.BaseQuestion");

(function () {

  /**
   * A page class
   * @param entireJSON A reference to the entire JSON
   * @class
   * @constructor
   */
  Classes.Page = function (entireJSON) {
    /**
     * Save off the json
     */
    this.json = entireJSON;

    /**
     * Save off the meta information for easy access
     */
    this.metaInfo = this.json.survey.content.meta.info;

    /**
     * Save off the meta information for easy access
     */
    this.metaExtInfo = this.json.survey.content.meta['ext-info'];

    /**
     * Populate the questions for this page
     */
    this.questions = this._loadQuestions();

    /**
     * The current collection of invalid responses
     */
    this.currentValidationState = [];

    /**
     * Are we in the middle of an error review move?
     */
    this.isInErrorReviewMode = false;

    /**
     * An event that will fire when validation is tested and it passes.
     */
    this.validationPassed = new utils.FSEvent();

    /**
     * An event that will fire when validation is tested and it fails.
     */
    this.validationFailed = new utils.FSEvent();

    /**
     * An event that will fire when the user wants to close the survey.
     */
    this.closeRequested = new utils.FSEvent();

    /**
     * An event that will fire when the page is scrolled.
     */
    this.pageScrolled = new utils.FSEvent();

    /**
     * Set up the HTML contents
     */
    this.htmlContents = this._createContents();
  };

  /**
   * Update the scroll info and fire the scroll event if necessary.
   * @private
   */
  Classes.Page.prototype._updateScrollInfo = function () {
    // Get the scroll position
    var scrollTop = window.document.body.scrollTop || window.document.documentElement.scrollTop || window.pageYOffset;

    // if its changed, signal
    if (this.scrollPosition != scrollTop) {
      this.pageScrolled.fire(scrollTop);
    }

    /**
     * The last known scroll position
     */
    this.scrollPosition = scrollTop;
  };

  /**
   * Set the values for the standard parameters that we control/keep track of on the survey.
   */
  Classes.Page.prototype.setStandardParameters = function (startTime) {
    // Record the length of time it took to take the survey
    this._ensureExistsOrCreateHiddenField('sTime')[0].value = new Date().getTime() - startTime;

    // Record the number of times the user attempted to submit the survey before successfully doing so
    this._ensureExistsOrCreateHiddenField('sSubmits')[0].value = window.numberOfSubmits;

    // Record the current time
    this._ensureExistsOrCreateHiddenField('currentTime')[0].value = ((new Date()) - 0);

    // The query string that launched the survey - used to pass CPPs on
    this._ensureExistsOrCreateHiddenField('qs')[0].value = location.search.substring(1);

    // Set a value to represent whether or not cookies are enabled on the user's browser.
    // Used to prevent duplicate submissions server side when the thank you page is refreshed after cookies have been cleared.
    this._ensureExistsOrCreateHiddenField('supportsCookies')[0].value = this.cookiesEnabled();
  };

  /**
   * Check to see if the user browser has cookie support turned on.
   * @returns true or false based on if the user browser does or doesn't have cookies turned on, respectively.
   */
  Classes.Page.prototype.cookiesEnabled = function () {
    document.cookie = "supportsCookies";
    return (document.cookie.indexOf("supportsCookies") != -1) ? true : false;
  };

  /**
   * Ensure a form field exists and create it if not
   * @param fieldid
   * @returns {HTMLNode} The node
   */
  Classes.Page.prototype._ensureExistsOrCreateHiddenField = function (fieldid) {
    if ($('#' + fieldid, this.pageNode[0]).length === 0) {
      var ipt = $("<input type='hidden' />").attr({ "id": fieldid });
      this.formNode.append(ipt);
    }

    return $('#' + fieldid, this.pageNode[0]);
  };

  /**
   * Render the HTML for the page.
   * @returns {HtmlNode} The HTML node containing the entire page.
   */
  Classes.Page.prototype._createContents = function () {
    // Create the page node
    this.pageNode =
      this._getPage()
        .append(this._getHeader())
        .append(this._getContent()
          .append(this._getIntro())
          .append(this._getForm()
            .append(this._getHiddenFields())
            .append(this._getDefinition())
            .append(this._getCustomerEpilogueContent())
            .append(this._getButtons())))
        .append(this._getLastBitOfContent())
        .append(this._getFooter())
        .append(this._getWaitDialog());

    // Bind the node
    $("*[role=radio], *[role=checkbox], input[type=text], #formSubmit", this.pageNode[0]).bind("keydown", function (ctx) {
      return function (e) {
        if (e.keyCode === 13) {
          ctx.showErrorHeader();
          ctx._validate();
          ctx.showErrorHeader();
        }
      };
    }(this));

    // Spit out the node
    return this.pageNode;
  };

  /**
   * Allow for each question type to make layout changes after rendering.
   */
  Classes.Page.prototype.tweakQuestionLayouts = function () {
    $.each(this.questions, function () {
      this.tweakQuestionLayout();
      $.each(this.nestedQuestions, function () {
        this.tweakQuestionLayout();
      });
    });
  };

  /**
   * Update the types of text that we support doing dynamically through a CPP in conjunction with meta ext info
   */
  Classes.Page.prototype.processDynamicText = function () {
    this.updateDynamicText('dynamicText', 'dynamic_text_cpp_name', 'dynamic_text-');
    this.updateDynamicText('dynamicProduct', 'dynamic_product_cpp_name', 'dynamic_product-');
    this.updateDynamicText('dynamicCompany', 'dynamic_company_cpp_name', 'dynamic_company-');
  };

  /**
   * Update any spans that we support doing dynamically through a CPP in conjunction with meta ext info
   */
  Classes.Page.prototype.updateDynamicText = function (spanClass, cppParam, extValuePrefix) {
    var cppParamNameToUse = this.metaExtInfo[cppParam];
    if (cppParamNameToUse) {
      var cppValue = Utils.GetQueryVariable("cpp[" + cppParamNameToUse + "]");
      if (cppValue) {
        var valueToUse = this.metaExtInfo[extValuePrefix + cppValue];
        if (valueToUse) {
          $('.' + spanClass).html(valueToUse);
        }
      }
    }
  };

  /**
   * Remove all the html below the header and above the footer. Show the wait dialog.
   */
  Classes.Page.prototype.clearAndShowWait = function () {
    // Hide the content just before the footer
    if (this.finalContent) {
      this.finalContent.css({ "display": "none" });
    }

    // Hide the footer
    if (this.footer)
      this.footer.css({ "display": "none" });

    // Remove the error header
    if (this.errorHeader) {
      this.errorHeader[0].parentNode.removeChild(this.errorHeader[0]);
    }

    // Remove the content itself
    if (this.contentArea) {
      this.contentArea.html("");
    }

    // Scroll top the top
    utils.setScroll(window, 0, 0);

    // Position the wait dialog
    var size = utils.GetSize(window);
    this.waitDialog.css({
      "visibility": "visible",
      "top": ((size.h - this.waitDialog[0].offsetHeight) / 2) + "px",
      "left": ((size.w - this.waitDialog[0].offsetWidth) / 2) + "px"
    });
  };

  /**
   * Render the thank you page
   * @param (HtmlNode) Then thank you content class instance
   */
  Classes.Page.prototype.renderThankyou = function (thankyoucontent) {
    if (this.waitDialog) {
      this.waitDialog.css({ "display": "none", "top": "-10000px", "left": "-10000px" });
    }

    // Add the content
    this.contentArea.append(thankyoucontent);

    // Show the content just before the footer
    if (this.finalContent)
      this.finalContent.css({ "display": "block" });

    // Show the footer
    if (this.footer) {
      this.footer.css({ "display": "block" });
    }

    // Scroll to the top
    window.scrollTo(0, 0);

    // Set the min-height
    this.footer.addClass("thankyouPageFooter");
  };

  /**
   * Create the wait dialog.
   */
  Classes.Page.prototype._getWaitDialog = function () {
    /**
     * The wait dialog
     */
    this.waitDialog = $("<div />").addClass("waitDialog").append($("<div />").addClass("waitIcon"));

    // Spit out the wait dialog
    return this.waitDialog;
  };

  /**
   * Get the validation results and assign them to the instance collection.
   * @private
   */
  Classes.Page.prototype._collectValidationResults = function () {
    var questionsIdsWithErrors = [];

    // Gather all the errored questions and append to the error list for the block errors display
    $.each(this.questions, function () {
      questionsIdsWithErrors = questionsIdsWithErrors.concat(this.validate());
    });

    // eliminate empties
    for (var i = 0; i < questionsIdsWithErrors.length; i++) {
      if (!questionsIdsWithErrors[i])
        questionsIdsWithErrors.splice(i--, 1);
    }

    // Assign it to the global so we can use it elsewhere
    this.currentValidationState = questionsIdsWithErrors;

    if (questionsIdsWithErrors.length === 0) {
      // Increment the number of submission attempts due to the successful attempt
      window.numberOfSubmits++;
      this.validationPassed.fire();
    } else {
      this.validationFailed.fire();
    }
  };

  /**
   * Handle the user pressing a key when focussed on the error button
   */
  Classes.Page.prototype.handleErrorButtonKeydown = function (evt) {
    switch (evt.keyCode) {
      // Enter key
      case 13:
        evt.preventDefault();
        evt.returnValue = false;
        this._advanceToNextErrorQuestion(true, true);
        break;
      default:
        break;
    }
  };

  /**
   * Advance the focus to the next error question.
   * @private
   */
  Classes.Page.prototype._advanceToNextErrorQuestion = function (runValidation, setFocusToo) {
    // Collect the validation results
    if (runValidation) {
      this._collectValidationResults();
    }

    // Only do anything if there are validation results to work with
    if (this.currentValidationState.length > 0) {

      this._setErrorFoundMessage();

      // Set focus to the first element in the control group that has a tab index greater than one
      if (setFocusToo) {
        $('#' + this.currentValidationState[0].id + '_QBlock *[tabIndex=1]')[0].focus();
      }

      // Get the node and scroll to it
      var topPos = $('#' + this.currentValidationState[0].id + '_QBlock', this.pageNode[0]).offset().top;
      utils.setScroll(window, 0, topPos - (this.errorHeader[0].offsetHeight + 3));

    } else {
      this.errorHeader.css({ "display": "none" });
    }
  };

  /**
   * Set the errors found message text. If you don't want this to display at all, configure the extsurveyproperty with a whitespace only string.
   * @private
   */
  Classes.Page.prototype._setErrorFoundMessage = function () {
    if (window.VAL_ERROR_COUNT_PLURAL && window.VAL_ERROR_COUNT_SINGULAR) {
      var messageText = this.currentValidationState.length > 1 ? window.VAL_ERROR_COUNT_PLURAL : window.VAL_ERROR_COUNT_SINGULAR;
      if (utils.trim(messageText).length > 0) {
        $('.nbrErrors', this.errorHeader[0]).html(this.currentValidationState.length);
        $('.errFndMsg', this.errorHeader[0]).html(messageText);
      }
    }
  };

  /**
   * Perform validation for the page.
   * @private
   * @returns Nothing. Use the validation events instead.
   */
  Classes.Page.prototype._validate = function () {
    // Get the validation results. Puts the results into this.currentValidationState
    this._collectValidationResults();

    // Only do any more if there were validation results
    if (this.currentValidationState.length > 0) {

      // Increment the number of submission attempts due to the failed attempt
      window.numberOfSubmits++;

      // Set up the validation UI
      this._addErrorHeader();

      // Focus on the 'next error' button
      $("#nextErrorButton")[0].focus();

      // first add the post-validation class to all nodes to make them semi-opaque
      this.pageNode.addClass('postValidationDefaultState');

      // Jump to the first question
      this._advanceToNextErrorQuestion(false);

    }
    // This function does not return anything. use the validation events instead
  };

  /**
   * Load the questions that are a part of this page.
   * @private
   * @returns {Array<Object>} An array of the questions for this page.
   */
  Classes.Page.prototype._loadQuestions = function () {
    var jsonQuestions = [];
    jsonQuestions = jsonQuestions.concat(
      Classes.BaseQuestion.prototype.getCQArrayFromJSON(this.json.survey.content.main.cq.qstn, true)).concat(
      Classes.BaseQuestion.prototype.getArrayFromJSON(this.json.survey.content.main.mq.qstn)).concat(
      Classes.BaseQuestion.prototype.getCQArrayFromJSON(this.json.survey.content.main.cq.qstn, false));

    var questionList = Classes.BaseQuestion.prototype.getQuestions(jsonQuestions, this.json);

    return questionList;
  };

  /**
   * Create the html for the page element.
   * @private
   * @returns {HtmlNode} The page HTML node.
   */
  Classes.Page.prototype._getPage = function () {
    return $('<div/>').attr({ 'data-role': 'page' });
  };

  /**
   * Create the html for the error header element.
   * @private
   * @returns {HtmlNode} The error header HTML node.
   */
  Classes.Page.prototype._addErrorHeader = function () {
    // Prevent double-adding
    if (!this.errorHeader) {

      /**
       * The error header HTML node
       */
      var nextErrorButton = this.getValidationNextButton();
      this.errorHeader = $('<div/>').attr({
        'data-role': 'header',
        'data-position': 'fixed',
        'style': 'z-index:100000'
      }).addClass('validationHeader')
        .append($('<h1/>'))
        .append($('<div/>').addClass('h1').append($("<label></label>").attr("for", "nextErrorButton").html('<span class="nbrErrors"></span> <span class="errFndMsg"></span>')))
        .append(nextErrorButton);

      // Add it to the page
      this.pageNode[0].insertBefore(this.errorHeader[0], this.pageNode[0].childNodes[0]);

      if (this.errorHeader.css('position') != 'fixed') {
        // Start tracking the scroll position
        setInterval(function (ctx) {
          return function () {
            ctx._updateScrollInfo();
          };
        }(this), 100);

        $(this.errorHeader[0]).bind("touchstart", function (ctx) {
          return function (eventHandle) {
            ctx.stopDefaultScrollBehavior = true;
            setTimeout(function () {
              ctx.stopDefaultScrollBehavior = false;
            }, 500);
          };
        }(this));

        $(this.errorHeader[0]).bind("touchmove", function (ctx) {
          return function (eventHandle) {
            eventHandle.preventDefault();
            eventHandle.stopPropagation();
          };
        }(this));

        // User began touching the document
        $(window.document).bind("touchstart", function (ctx) {
          return function (e) {
            if (!ctx.stopDefaultScrollBehavior) {
              ctx.errorHeader.css({ "opacity": "0", "webkitTransitionDuration": "0ms" });
            }
          };
        }(this));

        // User stopped touching the document
        $(window.document).bind("touchend", function (ctx) {
          return function (e) {
            if (!ctx.stopDefaultScrollBehavior) {
              clearTimeout(ctx.errorHeaderTimer);
              ctx.errorHeaderTimer = setTimeout(function () {
                ctx.errorHeader.css({ "opacity": "1", "webkitTransitionDuration": "500ms" });
              }, 100);
            }
          };
        }(this));

        // User moved the document
        $(window.document).bind("touchmove", function (ctx) {
          return function (e) {
            if (!ctx.stopDefaultScrollBehavior) {
              ctx.errorHeader.css({ "opacity": "0", "webkitTransitionDuration": "0ms" });
            }
          };
        }(this));

        // Bind to the page scrolled event
        this.pageScrolled.subscribe(function (ctx) {
          return function (scrollTop) {
            clearTimeout(ctx.errorHeaderTimer);
            ctx.errorHeaderTimer = setTimeout(function () {
              ctx.errorHeader.css({ "top": (scrollTop - 1) + "px", "opacity": "1", "webkitTransitionDuration": "500ms" });
            }, 100);
          };
        }(this));
      }
    }

    return this.errorHeader;
  };

  /**
   * Show the error header
   */
  Classes.Page.prototype.showErrorHeader = function () {
    if (this.errorHeader) {
      this.errorHeader.css({ "display": "block" });
    }
  };

  /**
   * Creates a Next button to forward the user on to the next question that has a validation error.
   * @returns {HtmlNode} The validation next button html.
   */
  Classes.Page.prototype.getValidationNextButton = function () {
    var nextErrorText = "Next Error";
    if (window.VAL_NEXT_ERROR) {
      nextErrorText = window.VAL_NEXT_ERROR;
    }
    var nextErrorButton = $("<div />").attr({
      "role": "button",
      "id": "nextErrorButton",
      "tabIndex": 1
    }).addClass("innerButton").addClass("lastButton").html(nextErrorText);

    nextErrorButton.bind("mousedown", function (ctx) {
      return function (e) {
        e.preventDefault();
        e.returnValue = false;
        ctx._advanceToNextErrorQuestion(true, true);
      };
    }(this));

    nextErrorButton.bind("keydown", function (ctx) {
      return function (evt) {
        ctx.handleErrorButtonKeydown(evt);
      };
    }(this));

    return $("<div />").attr({ "data-role": "button" }).addClass("special")
      .append(nextErrorButton);
  };

  /**
   * Create the html for the content element.
   * @private
   * @returns {HtmlNode} The content HTML node.
   */
  Classes.Page.prototype._getContent = function () {
    /**
     * Holds the main content of the page
     */
    this.contentArea = $('<div/>').attr({ 'data-role': 'content' });

    // Spit out the node
    return this.contentArea;
  };

  /**
   * Create the html for the header element.
   * @private
   * @returns {HtmlNode} The header HTML node.
   */
  Classes.Page.prototype._getHeader = function () {
    /**
     * The header HTML node
     */
    this.header = $('<div/>').attr({
      'data-role': 'header',
      'data-theme': 'b',
      'data-position': 'inline'
    }).addClass('theHeader')
      .append($('<h1/>').html(this.metaInfo.surveytitle));

    return this.header;
  };

  /**
   * Create the html for the intro element.
   * @private
   * @returns {HtmlNode} The intro HTML node.
   */
  Classes.Page.prototype._getIntro = function () {
    var clientLogo = this._getLogo1(),
      foreSeeLogo = this._getLogo2(),
      logo1height = (this.metaInfo.logo1graphicheight ? 'height="' + this.metaInfo.logo1graphicheight + '"' : ''),
      logo2height = (this.metaInfo.logo2graphicheight ? 'height="' + this.metaInfo.logo2graphicheight + '"' : ''),
      l1 = (fs.isDefined(this.metaInfo.logo1graphic)) ? '<img src="' + clientLogo + '" alt="' + this.metaInfo.logo1graphicalttag + '" ' + logo1height + '>' : '',
      l2 = (fs.isDefined(this.metaInfo.logo2graphic)) ? '<img src="' + foreSeeLogo + '" alt="' + this.metaInfo.logo2graphicalttag + '" ' + logo2height + '>' : '';

    var trusteLogoDiv = $('<div />').addClass('trustelogo').html('<div id="9b0abf8f-8adf-4dac-bb74-9bf54769d968"><script type="text/javascript" src="//privacy-policy.truste.com/privacy-seal/ForeSee-Results/asc?rid=9b0abf8f-8adf-4dac-bb74-9bf54769d968"></script><a href="//privacy.truste.com/privacy-seal/ForeSee-Results/validation?rid=fc7be566-92aa-4667-be44-67d8412088c1" title="TRUSTe European Safe Harbor certification" target="_blank"><img style="border: none" src="//privacy-policy.truste.com/privacy-seal/ForeSee-Results/seal?rid=fc7be566-92aa-4667-be44-67d8412088c1" alt="TRUSTe European Safe Harbor certification" height="34"/></a></div>');
    var prologueText = this.metaInfo.prologuetext.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;nbsp;/g, ' '); // This is to avoid having duplicate quotes in the output, which could invalidate things like replacing dynamic text based on class name
    var intro = $('<div class="prologue"><table class="logoTable"><tr><td class="headerLeftLogo">' + l1 + '</td><td class="headerRightLogo">' + l2 + '</td></tr></table>').append($("<div />").addClass('prologueText').html(prologueText)).append(trusteLogoDiv);

    // This is defined in the constants-<languageCode>.js include
    if (window.REQ_NOTE) {
      intro.append($('<p/>').addClass('reqNoteText').html(window.REQ_NOTE));
    }

    return intro;
  };

  /**
   * Get the path to the image to use for the client logo. This can come from the database setup, or be overridden by a CPP
   */
  Classes.Page.prototype._getLogo1 = function () {
    var clientLogo = this.metaInfo.logo1graphic;
    if (this.metaExtInfo.dynamic_logo_cpp_name) {
      var logoCppName = this.metaExtInfo.dynamic_logo_cpp_name;
      if (logoCppName) {
        var cppImageLogoValue = Utils.GetQueryVariable('cpp[' + logoCppName + ']');
        if (cppImageLogoValue) {
          clientLogo = '/images/logos/' + cppImageLogoValue + '.gif';
        }
      }
    }
    return clientLogo;
  };

  /**
   * Get the path to the image to use for the fsr logo. This can come from the database setup, or be overridden by a CPP
   */
  Classes.Page.prototype._getLogo2 = function () {
    var foreSeeLogo = this.metaInfo.logo2graphic;
    if (this.metaExtInfo.dynamic_fsrlogo_cpp_name) {
      var logoCppName = this.metaExtInfo.dynamic_fsrlogo_cpp_name;
      if (logoCppName) {
        var cppImageLogoValue = Utils.GetQueryVariable('cpp[' + logoCppName + ']');
        if (cppImageLogoValue) {
          foreSeeLogo = '/images/logos/' + cppImageLogoValue + '.gif';
        }
      }
    }
    return foreSeeLogo;
  };

  /**
   * Create the html for the form element.
   * @private
   * @returns {HtmlNode} The form HTML node.
   */
  Classes.Page.prototype._getForm = function () {
    /**
     * The form for this page
     */
    this.formNode = $('<form/>', this.pageNode).attr({ 'action': '/survey/process', 'method': 'post' });

    // Spit out the node
    return this.formNode;
  };

  /**
   * Get the hidden fields that were put on the page from the server side.
   * @private
   * @returns {HtmlNode} The hidden fields HTML node.
   */
  Classes.Page.prototype._getHiddenFields = function () {
    // The hidden fields are drawn out by the xslt and then cut/pasted to be in the form object here
    return $('#hiddenFields', this.pageNode);
  };

  /**
   * Create the html for the questions element.
   * @private
   * @returns {HtmlNode} The HTML node containing all the question/answers for the page.
   */
  Classes.Page.prototype._getDefinition = function () {
    return (new Classes.SurveyDef(this.questions, this.json)).create();
  };

  /**
   * Create the html for the epilogue element.
   * @private
   * @returns {HtmlNode} The customer epilogue HTML node.
   */
  Classes.Page.prototype._getCustomerEpilogueContent = function () {
    // Pre treat link quotes
    var meta = this.metaInfo.epiloguetext;

    // Will match on hyperlinks with &quot; symbols
    var tagMatch = /<([A-Z][A-Z0-9]*)\b[^>]*(&quot;)[^>]*>/gi;

    // Loop over the contents and re-encode hyperlinks to not have quot; symbols in them.
    while (meta.match(tagMatch)) {
      var res = meta.match(tagMatch);
      meta = meta.replace(res[0], res[0].replace(/&quot;/gi, "\""));
    }

    return $('<div/>')
      .append($('<div/>').addClass('epilogueText').html(meta));
  };

  /**
   * Create the html for the buttons element.
   * @private
   * @returns {HtmlNode} The buttons HTML node.
   */
  Classes.Page.prototype._getButtons = function () {
    // Sets up the widget holder
    var widgetholder = $("<div />").attr({ "data-role": "widgetholder", "area-type": "finalbuttons" });

    /**
     * The control group indicates a horizontal alignment and we keep a reference to this
     */
    this.buttonArea = $("<div />").attr({ "data-role": "controlgroup", "data-type": "horizontal" }).append(widgetholder);

    // The Cancel button
    var cancelbtn = $("<div/>").addClass("halfWidth").append($("<div />").addClass("buttonSeparatorLeft").append($("<div />").attr({
      "data-role": "button",
      "role": "button",
      "tabIndex": "1"
    }).addClass("cancelButton").append($("<div />").addClass("innerButton").addClass("lastButton").html(this.metaInfo.canceltext)))).bind("mousedown", function (ctx) {
      return function () {
        ctx.closeRequested.fire();
      };
    }(this));

    // If the window wasn't opened by javascript (and we aren't InStore), just show the Submit button
    var submitClass = "halfWidth",
      isInStore = this.metaInfo.channeltype && (this.metaInfo.channeltype == '2' || this.metaInfo.channeltype == '10');
    if (isInStore || opener) {
      widgetholder.append(cancelbtn);
    } else {
      submitClass = "fullWidth";
    }

    // The Submit button
    var submitbtn = $("<div/>").addClass(submitClass)
      .append($("<div />").addClass("buttonSeparatorRight")
        .append($("<div />").attr({
          "data-role": "button",
          "id": "formSubmit",
          "role": "button",
          "tabIndex": 1
        }).addClass("special")
          .append($("<div />").addClass("innerButton").addClass("lastButton").html(this.metaInfo.submittext))
        )
      ).bind("click", function (ctx) {
        return function () {
          ctx._validate();
        };
      }(this))
      .attr({ 'type': 'button', 'data-theme': 'b' });

    widgetholder.append(submitbtn);

    // Spit out the results
    return this.buttonArea;
  };

  /**
   * Create the html for the footer element.
   * @private
   * @returns {HtmlNode} The footer HTML node.
   */
  Classes.Page.prototype._getFooter = function () {
    /**
     * Holds the footer content
     */
    this.footer = $('<div/>').attr({ 'data-role': 'footer' }).addClass('footer').append(this._getCopyrightText(this.metaInfo.copyrighttext));

    // Return the node
    return this.footer;
  };

  /**
   * Create the html for the final content.
   * @private
   * @returns {HtmlNode} The final content HTML node.
   */
  Classes.Page.prototype._getLastBitOfContent = function () {
    /**
     * The content just before the footer
     */
    this.finalContent = $('<div/>').attr({ 'data-role': 'finalContent' });

    if (this.metaInfo.ombflg && this.metaInfo.ombvalue && this.metaInfo.ombflg == '1') {
      this.finalContent.append($('<small/>').append($('<div/>').addClass('ombHolder').html(this.metaInfo.ombvalue)));
    }

    if (this.metaExtInfo.policy_text) {
      //store
      this.finalContent.append($('<small/>').append(this._buildFooterLink(this.metaExtInfo.policy_text, this.metaExtInfo.policy_url, this.metaExtInfo.policy_text, 'policyfooterlink'))
        .append(this._buildFooterLink(this.metaExtInfo.policy_text2, this.metaExtInfo.policy_url2, this.metaExtInfo.policy_text2, 'policy2footerlink'))
        .append(this._buildFooterLink(this.metaInfo.scrprivacytext, this.metaInfo.privacyurl, this.metaInfo.privacytext, 'privacyfooterlink'))
        .append(this._buildFooterLink(this.metaInfo.scrwebsitetext, this.metaInfo.websiteurl, this.metaInfo.websitetext, 'websitefooterlink'))
        .append(this._buildFooterLink(this.metaInfo.scrcontactustext, this.metaInfo.contactusurl, this.metaInfo.contactustext, 'contactusfooterlink'))
        .append(this._buildFooterLink(this.metaExtInfo.cust_privacy_txt, this.metaExtInfo.cust_privacy_url, this.metaExtInfo.cust_privacy_txt, 'custprivacyfooterlink')));
    } else {
      //not store
      this.finalContent.append($('<small/>').append(this._buildFooterLink(this.metaInfo.scrwebsitetext, this.metaInfo.websiteurl, this.metaInfo.websitetext, 'websitefooterlink'))
        .append(this._buildFooterLink(this.metaInfo.scrprivacytext, this.metaInfo.privacyurl, this.metaInfo.privacytext, 'privacyfooterlink'))
        .append(this._buildFooterLink(this.metaInfo.scrcontactustext, this.metaInfo.contactusurl, this.metaInfo.contactustext, 'contactusfooterlink'))
        .append(this._buildFooterLink(this.metaExtInfo.cust_privacy_txt, this.metaExtInfo.cust_privacy_url, this.metaExtInfo.cust_privacy_txt, 'custprivacyfooterlink')));
    }

    return this.finalContent;
  };

  /**
   * Construct and return an anchor element that will open a new window linking to the specified location.
   * @param {String} title The title to use for the link.
   * @param {String} href The location to use for the link.
   * @param {String} linkText The text to display for the link.
   * @private
   * @returns {HtmlNode} The anchor tag, or nothing if the survey setup doesn't define this link.
   */
  Classes.Page.prototype._buildFooterLink = function (title, href, linkText, linkHolderClass) {
    if (href && linkText) {
      return $('<div/>').addClass('footerLinkHolder').addClass(linkHolderClass).append($('<a/>').attr({
        'target': '_blank',
        'title': title,
        'href': href
      }).html(linkText));
    } else if (linkText) {
      return $('<div/>').addClass('footerLinkHolder').addClass(linkHolderClass).html(linkText.replace(/&quot;/g, '"'));
    }
  };

  /**
   * Get the copyright text node.  Replaces the year variable with the current year, if necessary.
   * @param {String} The text including a possible variable for the year.
   * @private
   * @returns {HtmlNode} A node containing the copyright text with the year variable substituted with the actual text of the current year.
   */
  Classes.Page.prototype._getCopyrightText = function (copyrightText) {
    if (copyrightText) {
      var text = !copyrightText ? '' : (copyrightText.indexOf('${year}') == -1 ? copyrightText : copyrightText.replace("${year}", new Date().getFullYear()));
      return $('<h4 />').addClass('copyrighttext').html(text);
    }
  };

  /**
   * Serializes the form to a string that can be transmitted.
   * @returns {Object} An object containing key value pairs
   */
  Classes.Page.prototype.serializeForm = function () {
    var formNode = this.formNode[0];

    // Get all the inputs
    var inputs = $("input,textarea,select", formNode);

    // Keeps track of which radios and cb's we've handled already
    var inputArr = {};

    // The output object
    var outObj = [];

    // Loop over each one and find out if its visible or not
    for (var i = 0; i < inputs.length; i++) {
      var inputName = inputs[i].getAttribute("name"),
        inputType = inputs[i].type,
        inputValues,
        j;

      if (!inputArr[inputName]) {
        if (inputType == "radio" || inputType == "checkbox") {
          // Get the form value or input collection (radio, cb)
          inputValues = formNode.elements[inputName];
          for (j = 0; j < inputValues.length; j++) {
            if (inputValues[j].checked) {
              outObj.push({ 'name': inputName, 'value': inputValues[j].value });
            }
          }
        } else if (inputType == "select") {
          inputValues = formNode.elements[inputName].options;
          for (j = 0; j < inputValues.length; j++) {
            if (inputValues[j].selected) {
              outObj.push({ 'name': inputName, 'value': inputValues[j].value });
            }
          }
        } else {
          outObj.push({ 'name': inputName, 'value': inputs[i].value });
        }
      }

      // Mark that we've handled this input by name
      inputArr[inputName] = true;
    }

    // Spit out the result
    return outObj;
  };

})();