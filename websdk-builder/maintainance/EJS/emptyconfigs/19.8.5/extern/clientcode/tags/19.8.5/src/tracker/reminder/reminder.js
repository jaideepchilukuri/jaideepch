/**
 * Handles qualifier surveys
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

var Reminder = function(browser, cpps, data, rmdr, template, displayopts) {
  this.br = browser;
  this.data = data;
  this.rmdr = rmdr;
  this.lng = data.cfg.active_surveydef.language.locale;
  this.cpps = cpps;
  this.templatehtml = template;
  this.displayOpts = displayopts;
  this.accepted = new utils.FSEvent();
};

Reminder.prototype.render = function() {
  var finalOpts;
  var localeRmdr;

  // Reusing fsrQualifier id to make use of existing CSS
  document.documentElement.setAttribute("id", "fsrReminder");

  // Check to see if we have a different reminder for the locale
  localeRmdr = fs.ext({}, this.rmdr);
  if (this.lng !== "en") {
    // have to check if it exists to prevent reference error
    if (fs.isDefined(this.rmdr.display.locales[this.lng])) {
      localeRmdr.display = this.rmdr.display.locales[this.lng];
    }
  }

  // Create a final options object
  finalOpts = fs.ext({}, this.displayOpts, { rmdr: localeRmdr });

  // Render the template to a string
  document.body.innerHTML = Templater(this.templatehtml, finalOpts);

  var bindEvent;
  var element = document.getElementById("reminderForm");

  // Submit on old-tracker FORM, Click on new-tracker BUTTON
  if (element) {
    bindEvent = "submit";
  } else {
    bindEvent = "click";
    element = document.querySelector(".fsrBeginSurvey");
  }

  utils.Bind(
    element,
    "reminder:" + bindEvent,
    function(e) {
      utils.preventDefault(e);
      this.accepted.fire();
    }.bind(this)
  );
};
