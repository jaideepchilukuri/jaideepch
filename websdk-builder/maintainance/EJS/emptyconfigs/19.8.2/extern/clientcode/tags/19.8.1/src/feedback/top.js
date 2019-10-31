/**
 * Top file for feedback
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Holds singletons
 * @type {{}}
 */
var Singletons = {
  config: JSON.parse(JSON.stringify(config)),
  onFeedbackSubmitted: new utils.FSEvent(),
  onFeedbackShown: new utils.FSEvent(),
  onFeedbackClosed: new utils.FSEvent(),
  onModalCssRetrieved: new utils.FSEvent(),
};

// Handle the feedback report UI
if (
  fs.fsCmd("feedbackreport") ||
  (fs.supportsDomStorage && sessionStorage.getItem("fsFeedbackLoaded") == "true")
) {
  if (fs.supportsDomStorage) {
    sessionStorage.setItem("fsFeedbackLoaded", "true");
  }
  require([fs.makeURI("$fs.feedbackreport.js")], function(FBReport) {});
  return;
}
