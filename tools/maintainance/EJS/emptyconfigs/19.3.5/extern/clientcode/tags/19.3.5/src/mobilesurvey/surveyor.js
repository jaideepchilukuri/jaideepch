/**
 * Mobile Survey
 *
 * Implements a web survey
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2011-04-20 12:04:36 -0700 (Wed, 20 Apr 2011) $
 * @version $Revision: 5287 $

 * Created: November 30, 2011
 */

fs.provide("ms.Survey.Surveyor");

fs.require("ms.Survey");
fs.require("ms.Survey.Classes.Page");
fs.require("ms.Survey.Classes.ThankYouContent");
fs.require("ms.Survey.Misc.Theme");

(function () {

  // Keeps track of the number of times the user has attempted to submit the survey until they do so successfully.
  window.numberOfSubmits = 0;

  /**
   * @class A class to implement a survey based on a survey definition.
   * @param docObj {Document} A reference to the window object to use as the host for the survey.
   * @constructor
   */
  var Surveyor = function (winObj) {
    // set the window reference
    this.win = winObj;

    // Get the HTML for the page
    //try {
      this.mainPage = new Classes.Page(this.win.surveyJSON);
    /*} catch (e) {
      if (e && e.name == 'unsupportedQuestionException') {
        $(window.document.body).append($('<div/>').addClass('unsupportedQuestionException').html('Our apologies, this ForeSee survey is currently not available. We appreciate your patience as we work to correct the issue, please try again at a later time.'));
        var errorMsg = 'Mobile Survey display attempted on a survey that has an unsupported question type.  MID: ' + this.win.surveyJSON.survey.content.meta.info.mid;
        new utils.AjaxTransport({
          url: "/survey/utils?type=logError",
          data: [{name: 'errorMessage', value: errorMsg}]
        }).send();
        return;
      } else {
        throw e;
      }
    }*/

    // Bind to the validation passed event
    this.mainPage.validationPassed.subscribe(function (ctx) {
      return function () {
        // All we have to do when validation passes, is submit the survey
        ctx.submitSurvey();
      };
    }(this), true);

    // User requested page close
    this.mainPage.closeRequested.subscribe(function (ctx) {
      return function () {
        var isInAppTestMode = fs.getParam("inAppTestMode");

        // This is for in-app
        if (window.fsrTracker && !isInAppTestMode) {
          fsrTracker.abortSurvey();
        } else if (window.fsrTracker && isInAppTestMode) {
          fsrTracker.completeSurvey();
        }

        // do ios
        window.surveycomplete = false;

        if ($('input[type=\"hidden\"][name=\"channeltype\"][value=\"2\"]').length > 0 || $('input[type=\"hidden\"][name=\"channeltype\"][value=\"10\"]').length > 0) {
          // go back to the store flow
          var storeSessionId = fs.getParam('cpp[sessionid]');
          window.location = '/store/controller?action=submit&sessionid=' + storeSessionId + '&ptypeid=3&errCode=5';
        } else {
          // close the window
          ctx.win.close();
        }
      };
    }(this), true);

    // Activate the survey
    this.activate();
  };

  /**
   * The survey should be submitted to the server
   */
  Surveyor.prototype.submitSurvey = function () {
    // Set the values for the standard parameters that we control/keep track of on the survey
    this.mainPage.setStandardParameters(this.startTime);

    var parm = fs.getParam;
    var url = parm("env") ? "survey-qa" : "survey";

    // This will be used only if the client is going to host the survey themselves
    if (parm("cors")) {
      // Set the formData before we hide the page (windows phone doesn't like it if you try to access it after hiding)
      var formData = this.mainPage.serializeForm();

      // Clear the page and show the wait symbol
      this.mainPage.clearAndShowWait();

      // This callback will be used to display the thankyou page
      var completionCallback = function (ctx) {
        return function () {
          // This is for in-app
          if (window.fsrTracker) {
            fsrTracker.completeSurvey();
          } else {
            ctx.processThankYou();
            setTimeout(function () {
              ctx.win.close();
            }, 2000);
          }

          // do ios
          window.surveycomplete = true;
        };
      }(this);

      // We are binding to both success AND error because currently we have defined no case
      // for failure responses. In this situation, its better to just fail gracefully and
      // show the thankyou page.
      var ajax = new utils.CORS({
        type: 'POST',
        url: "http://" + url + ".foreseeresults.com/survey/process",
        data: formData,
        success: completionCallback,
        failure: completionCallback
      });

      ajax.send();

    } else {
      this.mainPage.formNode[0].submit();
    }
  };

  /**
   * Activate the survey
   */
  Surveyor.prototype.activate = function () {

    // Append the constructed HTML to the body
    $(window.document.body).append(this.mainPage.htmlContents);

    // Now that the page has rendered, we are able to tweak layout issues we detect
    this.mainPage.tweakQuestionLayouts();

    this.mainPage.processDynamicText();

    // Log the start time so we can use it on page submission to know how long the survey took
    this.startTime = new Date().getTime();
    
    // Make things visible
    $(this.win.document.documentElement).addClass("ready");
  };

  /**
   * Create the Thank You content, and then hide the survey and display the Thank You content
   */
  Surveyor.prototype.processThankYou = function () {
    /**
     * The thank you page class
     */
    var thankYouContent = new Classes.ThankYouContent(this.win.surveyJSON.survey.content.meta.info.stdrcpturl);

    // Bind to the content ready event
    thankYouContent.contentReady.subscribe(function (ctx) {
      return function (htmlContents) {
        // Render the thank you html
        ctx.mainPage.renderThankyou(htmlContents);
      };
    }(this));

    // Grab the file
    thankYouContent.bind();
  };

  /**
   * The DomReady Entry point
   */
  utils.Bind(window, 'load', fs.proxy(function () {
    // Apply the theme immediately
    Theme.Apply();

    // Create a new instance of the survey
    var survey = new Surveyor(window);
  }, this));

})();