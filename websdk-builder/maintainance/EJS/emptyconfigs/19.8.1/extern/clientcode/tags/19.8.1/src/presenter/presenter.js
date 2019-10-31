/**
 * Presents a short-form survey in an iframe
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

function Presenter(config, surveydef, display, cpps) {
  // TODO: get this from configs somehow?
  // fs.config.surveyUrl has the modern survey url normally used by trigger
  this.surveyUrl =
    "https://qal-cxsurvey.foresee.com/sv?mid=VA8Z4EEwtwJggUlhEItxJQ4C&template=contextual";
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
  console.log("presenter: load resources");

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
  console.log("presenter: >>>> POP! <<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
  var iframe = document.createElement("iframe");
  iframe.width = 450;
  iframe.height = 550;
  iframe.srcdoc = this.html;
  iframe.style = "position:fixed; bottom: 0; right: 0; border: none;";
  document.body.appendChild(iframe);
  this.iframe = iframe;
};

Presenter.prototype.fixURLs = function(html) {
  // todo: get this from configs?
  return html.replace(/"\/static\//g, '"https://qal-cxsurvey.foresee.com/static/');
};

Presenter.prototype.dispose = function() {
  document.body.removeChild(this.iframe);
};

return Presenter;
