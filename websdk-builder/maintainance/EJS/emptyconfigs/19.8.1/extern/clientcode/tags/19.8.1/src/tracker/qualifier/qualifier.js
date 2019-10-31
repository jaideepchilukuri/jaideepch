/**
 * Handles qualifier surveys
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Starts a heartbeat
 * @constructor
 */
var Qualifier = function(browser, cpps, data, qual, template, displayopts) {
  this.br = browser;
  this.data = data;
  this.qual = qual;
  this.cpps = cpps;
  this.templatehtml = template;
  this.displayOpts = displayopts;
  this.userLocale = this.data.cfg.active_surveydef.language.locale || "en";
  this.qualified = new utils.FSEvent();
  this.disqualified = new utils.FSEvent();
  this.validationFailed = new utils.FSEvent();
  this.qualifiesValue = null;

  // Set the survey based on user locale
  if (this.userLocale !== "en") {
    if (fs.isDefined(this.data.cfg.active_surveydef.qualifier.survey.locales[this.userLocale])) {
      this.qual.survey = fs.ext(
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

  var questions,
    questionsLength = this.qual.survey.questions.length;

  // Loop over the questions and fill in the blanks
  for (var i = 0; i < questionsLength; i++) {
    questions = this.qual.survey.questions[i];
    for (var c = 0; c < questions.choices.length; c++) {
      fs.ext(questions.choices[c], {
        id: "q" + i + "c" + c,
        value: "q" + i + "c" + c,
        name: "q" + i,
        type: fs.toLowerCase(questions.questionType),
      });
    }
  }

  // Subscribe to the disqualified event
  this.disqualified.subscribe(
    function() {
      this.showNoThanks();
    }.bind(this)
  );

  // Bind to validation failed
  this.validationFailed.subscribe(
    function(msg) {
      /* pragma:DEBUG_START */
      console.log("tracker: validation failed");
      /* pragma:DEBUG_END */
      alert(msg);
    }.bind(this)
  );
};

/**
 * Render the qualifier
 */
Qualifier.prototype.render = function() {
  // Create a final options object
  var finalOpts = fs.ext({}, this.displayOpts, { qual: this.qual });

  // Set the ID of the document
  document.documentElement.setAttribute("id", "fsrQualifier");

  // Render the template to a string
  document.body.innerHTML = Templater(this.templatehtml, finalOpts);

  // Bind to buttons
  utils.Bind(
    document.getElementById("qualifierForm"),
    "qualifier:submit",
    function(e) {
      utils.preventDefault(e);
      this.validateAndSubmit();
    }.bind(this)
  );

  utils.Bind(
    document.getElementById("qualCancelButton"),
    "qualifier:click",
    function(e) {
      utils.preventDefault(e);
      this.disqualified.fire();
    }.bind(this)
  );

  utils.Bind(
    document.getElementById("qualCloseButton"),
    "qualifier:click",
    function(e) {
      utils.preventDefault(e);
      window.close();
    }.bind(this)
  );
};

/**
 * Validate and submit
 */
Qualifier.prototype.validateAndSubmit = function() {
  /* pragma:DEBUG_START */
  console.log("tracker: qualifier is validating");
  /* pragma:DEBUG_END */
  var activeQuestions = document.querySelectorAll(".activeQuestion");
  var selectedItems = [],
    isMissingItem = false;
  for (var i = 0; i < activeQuestions.length; i++) {
    var qnum = parseInt(activeQuestions[i].getAttribute("questionNum")),
      qobj = this.qual.survey.questions[qnum];

    if (qobj.questionType == "RADIO") {
      // Validate a radio button
      var radios = document.getElementsByName("q" + qnum),
        hasItem = false;
      for (var p = 0; p < radios.length; p++) {
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
    var noQualify = false;
    for (var k = 0; k < selectedItems.length; k++) {
      var sl = selectedItems[k];
      this.qualifiesValue = sl.qualifies || null;
      if (sl.cpps && sl.cpps.length > 0) {
        for (var c = 0; c < sl.cpps.length; c++) {
          for (var cp in sl.cpps[c]) {
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
};

/**
 * Show the no-thanks message
 */
Qualifier.prototype.showNoThanks = function() {
  utils.addClass(document.getElementById("fsrQualifierMain"), "acsNoDisplay");
  utils.removeClass(document.getElementById("fsrQualifierNoThanks"), "acsNoDisplay");
};
