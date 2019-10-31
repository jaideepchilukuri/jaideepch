/**
 * Handles qualifier surveys
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

fs.provide("track.reminder.Reminder");

fs.require("track.Top");

(function () {

  var Reminder = function (browser, cpps, data, rmdr, template, displayopts) {
    this.br = browser;
    this.data = data;
    this.rmdr = rmdr;
    this.lng = data.def.language.locale;
    this.cpps = cpps;
    this.templatehtml = template;
    this.displayOpts = displayopts;
    this.accepted = new utils.FSEvent();
  };

  Reminder.prototype.render = function () {
    var finalOpts, localeRmdr;

    // Reusing fsrQualifier id to make use of existing CSS
    document.documentElement.setAttribute('id', "fsrReminder");

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

    utils.Bind(document.getElementById('reminderForm'), 'reminder:submit', fs.proxy(function (e) {
      utils.preventDefault(e);
      this.accepted.fire();
    }, this));
  };
})(utils);
