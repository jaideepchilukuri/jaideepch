/**
 * Handles qualifier surveys
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez: pablo.suarez $
 *
 */

import { ext, isDefined } from "../../fs/index";
import { Bind, FSEvent, preventDefault } from "../../utils/utils";

class Reminder {
  constructor(browser, cpps, data, rmdr, template, displayopts) {
    this.br = browser;
    this.data = data;
    this.rmdr = rmdr;
    this.lng = data.cfg.active_surveydef.language.locale;
    this.cpps = cpps;
    this.templatehtml = template;
    this.displayOpts = displayopts;
    this.accepted = new FSEvent();
  }

  render() {
    // Reusing fsrQualifier id to make use of existing CSS
    document.documentElement.setAttribute("id", "fsrReminder");

    // Check to see if we have a different reminder for the locale
    const localeRmdr = ext({}, this.rmdr);
    if (this.lng !== "en") {
      // have to check if it exists to prevent reference error
      if (isDefined(this.rmdr.display.locales[this.lng])) {
        localeRmdr.display = this.rmdr.display.locales[this.lng];
      }
    }

    // Create a final options object
    const finalOpts = ext({}, this.displayOpts, { rmdr: localeRmdr });

    // Render the template to a string
    document.body.innerHTML = this.templatehtml(finalOpts);

    let bindEvent;
    let element = document.getElementById("reminderForm");

    // Submit on old-tracker FORM, Click on new-tracker BUTTON
    if (element) {
      bindEvent = "submit";
    } else {
      bindEvent = "click";
      element = document.querySelector(".fsrBeginSurvey");
    }

    Bind(element, `reminder:${bindEvent}`, e => {
      preventDefault(e);
      this.accepted.fire();
    });
  }
}

export { Reminder };
