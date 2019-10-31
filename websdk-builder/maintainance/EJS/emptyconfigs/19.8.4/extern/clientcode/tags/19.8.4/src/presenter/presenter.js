/**
 * Presents a short-form survey in an iframe
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

function Presenter(config, surveydef, display, cpps, stg) {
  // TODO: figure out a better way to configure this
  // Having the setting on the display is just temporary
  this.stg = stg;
  var shortSurveyURL =
      display.shortSurveyUrl ||
      "https://qal-cxsurvey.foresee.com/sv?mid=VA8Z4EEwtwJggUlhEItxJQ4C&template=contextual",
    storedURL,
    pageView = this.stg.get("pv");

  if (pageView === 1) {
    sessionStorage.removeItem("FSR_SSURL");
  }
  if (pageView > 1) {
    storedURL = sessionStorage.getItem("FSR_SSURL");
    if (!!storedURL) {
      shortSurveyURL = storedURL;
    }
  }

  this.surveyUrl = shortSurveyURL;

  this.config = config;
  this.surveydef = surveydef;
  this.display = display;
  this.locale = cpps.get("locale") || "en";

  this.declined = new utils.FSEvent();
  this.abandoned = new utils.FSEvent();
  this.accepted = new utils.FSEvent();
  this.completed = new utils.FSEvent();
}

Presenter.prototype.loadResources = function(readyEvent) {
  /* pragma:DEBUG_START */
  console.log("presenter: load resources");
  /* pragma:DEBUG_END */

  var done = function done(text) {
    this.html = this.fixURLs(text);
    readyEvent.fire();
  }.bind(this);

  new utils.AjaxTransport().send({
    url: this.surveyUrl,
    method: "GET",
    success: done,
    failure: function(text, code) {
      /* pragma:DEBUG_START */
      console.error("Failed to download survey:", code);
      /* pragma:DEBUG_END */
      done(text);
    }.bind(this),
  });
};

Presenter.prototype.present = function() {
  /* pragma:DEBUG_START */
  console.log("presenter: >>>> POP! <<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
  /* pragma:DEBUG_END */

  this.setupAPI();
  var iframe = document.createElement("iframe");
  iframe.width = 480;
  iframe.height = 500;
  iframe.srcdoc = this.html;
  iframe.style =
    "position:fixed; bottom: 0; right: 0; border: none; background: transparent; z-index: 99999999";
  document.body.appendChild(iframe);
  this.iframe = iframe;
};

Presenter.prototype.fixURLs = function(html) {
  // todo: get this from configs?

  return html.replace(/"\/static\//g, '"https://qal-cxsurvey.foresee.com/static/');
};

/**
 * API for the contextual survey to iteract with the SDK.
 */
Presenter.prototype.setupAPI = function() {
  fs.API.expose("Survey", {
    close: function() {
      this.declined.fire("INVITE_DECLINED_BTN");
      this.dispose();
    }.bind(this),

    complete: function() {
      this.completed.fire(true);
      this.dispose();
    }.bind(this),

    accepted: function() {
      this.accepted.fire(this.display.inviteType);
    }.bind(this),

    updateSize: function(width, height) {
      if (!this.iframe) return;

      if (width != null) {
        this.iframe.width = width;
      }

      if (height != null) {
        this.iframe.height = height;
      }
    }.bind(this),
  });
};

Presenter.prototype.dispose = function() {
  document.body.removeChild(this.iframe);
  this.iframe = null;
};

return Presenter;
