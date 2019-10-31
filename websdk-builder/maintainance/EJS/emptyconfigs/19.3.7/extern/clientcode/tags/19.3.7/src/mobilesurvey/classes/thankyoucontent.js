/**
 * A ThankYouContent object
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Elliott Richards (elliott.richards@foresee.com)
 * @author $Author: $
 *
 * @modified $Date: $
 */

fs.provide("ms.Survey.Classes.ThankYouContent");

fs.require("ms.Survey.Classes");

(function () {

  /**
   * A thank you content class.
   * @class
   * @constructor
   * @param {String} stdrcpturl The name of the json file to load for the Thank You content on a survey.
   */
  Classes.ThankYouContent = function (stdrcpturl) {
    /**
     * The URL of the json file for the thank-you page
     */
    this.jsonFile = stdrcpturl.replace(/\.html/g, ".json").replace(/\.htm/g, ".json");

    /**
     * An event that will fire when the HTML content is ready.
     */
    this.contentReady = new utils.FSEvent();

    /**
     * The default settings for the thank you page
     */
    this._settings = {
      "thankyoumessage": "Your survey has been submitted. Thank you for your input!",
      "useforeseelogo": true
    };
  };

  /**
   * Create the html for the thank you section of the survey.
   * @private
   * @returns {HtmlNode} The html for the thank you contents.
   */
  Classes.ThankYouContent.prototype.bind = function () {
    // Set up an ajax request to grab the thank-you definition
    var ajax = new utils.AjaxTransport({
      type: 'GET',
      url: "/scripts/thankYouJSON/" + this.jsonFile,
      success: fs.proxy(function (data) {
        this._settings = fs.ext(ctx._settings, window.JSON.parse(data));
        this._createContentFromJSON();
      }, this),
      failure: fs.proxy(function () {
        this._createContentFromJSON();
      }, this)
    });

    // Send the data
    ajax.send();
  };

  /**
   * Compose the html for the Thank You content using the class level JSON objects.
   * @private
   */
  Classes.ThankYouContent.prototype._createContentFromJSON = function () {
    /**
     * The HTML contents of the page
     */
    this.htmlContents = $('<div/>').addClass('thankyoumessage');

    // Add the logo if needed
    if (this._settings.useforeseelogo) {
      this.htmlContents.append($("<div />").addClass("foreseeLogo"));
    }

    // Add the message
    this.htmlContents.append($("<span />").addClass("innerMessage").html(this._settings.thankyoumessage));

    // Fire the content ready event
    this.contentReady.fire(this.htmlContents);
  };

})();