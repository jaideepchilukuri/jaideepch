/**
 * Handles qualifier surveys
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext, isDefined, toLowerCase } from "../../fs/index";
import { addClass, removeClass, Bind, FSEvent, preventDefault } from "../../utils/utils";

/**
 * Starts a heartbeat
 * @constructor
 */
class Qualifier {
  constructor(browser, cpps, data, qual, template, displayopts) {
    this.br = browser;
    this.data = data;
    this.qual = qual;
    this.cpps = cpps;
    this.templatehtml = template;
    this.displayOpts = displayopts;
    this.userLocale = this.data.cfg.active_surveydef.language.locale || "en";
    this.qualified = new FSEvent();
    this.disqualified = new FSEvent();
    this.validationFailed = new FSEvent();
    this.qualifiesValue = null;

    // Set the survey based on user locale
    if (this.userLocale !== "en") {
      if (isDefined(this.data.cfg.active_surveydef.qualifier.survey.locales[this.userLocale])) {
        this.qual.survey = ext(
          {},
          this.data.cfg.active_surveydef.qualifier.survey.locales[this.userLocale]
        );
      } else {
        /* pragma:DEBUG_START */
        console.warn(
          [
            "tracker:qualifier: the locale selected (",
            this.userLocale,
            ") has no qualifier overrides (",
            this.data.cfg.active_surveydef.qualifier.survey.locales,
            "). This may highlight a misconfiguration",
          ].join("")
        );
        /* pragma:DEBUG_END */
      }
    }

    let questions;
    const questionsLength = this.qual.survey.questions.length;

    // Loop over the questions and fill in the blanks
    for (let i = 0; i < questionsLength; i++) {
      questions = this.qual.survey.questions[i];
      for (let c = 0; c < questions.choices.length; c++) {
        ext(questions.choices[c], {
          id: `q${i}c${c}`,
          value: `q${i}c${c}`,
          name: `q${i}`,
          type: toLowerCase(questions.questionType),
        });
      }
    }

    // Subscribe to the disqualified event
    this.disqualified.subscribe(() => {
      this.showNoThanks();
    });

    // Bind to validation failed
    this.validationFailed.subscribe(msg => {
      /* pragma:DEBUG_START */
      console.log("tracker: validation failed");
      /* pragma:DEBUG_END */
      // eslint-disable-next-line no-alert
      alert(msg);
    });
  }

  /**
   * Render the qualifier
   */
  render() {
    // Create a final options object
    const finalOpts = ext({}, this.displayOpts, { qual: this.qual });

    // Set the ID of the document
    document.documentElement.setAttribute("id", "fsrQualifier");

    // Render the template to a string
    document.body.innerHTML = this.templatehtml(finalOpts);

    // Bind to buttons
    Bind(document.getElementById("qualifierForm"), "qualifier:submit", e => {
      preventDefault(e);
      this.validateAndSubmit();
    });

    Bind(document.getElementById("qualCancelButton"), "qualifier:click", e => {
      preventDefault(e);
      this.disqualified.fire();
    });

    Bind(document.getElementById("qualCloseButton"), "qualifier:click", e => {
      preventDefault(e);
      window.close();
    });
  }

  /**
   * Validate and submit
   */
  validateAndSubmit() {
    /* pragma:DEBUG_START */
    console.log("tracker: qualifier is validating");
    /* pragma:DEBUG_END */
    const activeQuestions = document.querySelectorAll(".activeQuestion");
    const selectedItems = [];
    let isMissingItem = false;
    for (let i = 0; i < activeQuestions.length; i++) {
      const qnum = parseInt(activeQuestions[i].getAttribute("questionNum"), 10);
      const qobj = this.qual.survey.questions[qnum];

      if (qobj.questionType == "RADIO") {
        // Validate a radio button
        const radios = document.getElementsByName(`q${qnum}`);
        let hasItem = false;
        for (let p = 0; p < radios.length; p++) {
          if (radios[p].checked) {
            hasItem = true;
            selectedItems.push(qobj.choices[p]);
            break;
          }
        }
        if (!hasItem) {
          isMissingItem = true;
          break;
        }
      }
    }

    if (isMissingItem) {
      this.validationFailed.fire(this.qual.survey.validationFailedMsg);
    } else {
      let noQualify = false;
      for (let k = 0; k < selectedItems.length; k++) {
        const sl = selectedItems[k];
        this.qualifiesValue = sl.qualifies || null;
        if (sl.cpps && sl.cpps.length > 0) {
          for (let c = 0; c < sl.cpps.length; c++) {
            for (const cp in sl.cpps[c]) {
              this.cpps.set(cp, sl.cpps[c][cp]);
            }
          }
        }
        if (sl.qualifies === false) {
          noQualify = true;
          break;
        }
      }
      if (noQualify === true) {
        // They checked an item that has a qualifies: false on it
        this.disqualified.fire();
      } else {
        this.qualified.fire();
      }
    }
  }

  /**
   * Show the no-thanks message
   */
  showNoThanks() {
    addClass(document.getElementById("fsrQualifierMain"), "acsNoDisplay");
    removeClass(document.getElementById("fsrQualifierNoThanks"), "acsNoDisplay");
  }
}

export { Qualifier };
