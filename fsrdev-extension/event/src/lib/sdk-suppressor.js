/* global chrome */
class SDKSuppressor {
  constructor(settings) {
    this.suppression = settings.suppression;
    this._updateRedirectionSettings = this._updateRedirectionSettings.bind(this);
    this._addRequestListener = this._addRequestListener.bind(this);
    this._suppressionListener = this._suppressionListener.bind(this);
    this.isInTrackerId = null;
    this.isInSurveyWindowId = null;
  }

  _updateRedirectionSettings(settings) {
    this.suppression = settings.suppression;
  }

  _suppressionListener(details) {
    //Blocks all requests to Gateway and legacy trigger, unless managed by extension
    let SDK_match = new RegExp(/^.*(gateway(\.min)?\.js|foresee-trigger\.js).*$/, "i");
    let extension_match = new RegExp(/^.*FSRDevExtension.*$/, "i");
    let isInTrackerId = details.url.indexOf("fs.tracker") > -1;
    let isInNewSurveyTab = details.url.indexOf("fs.feedbacksurvey.html") > -1;

    if (isInTrackerId) {
      this.isInTrackerId = details.tabId;
    } else if (isInNewSurveyTab) {
      this.isInSurveyWindowId = details.tabId;
    }

    if (SDK_match.test(details.url) && !extension_match.test(details.url)) {
      /**
       * Cases (Below):
       * 1. If the tabID comes from a survey window we want to let all requests for this flow through 
       * 2. We check above if the url comes from a tracker window, if it does any tabId from that tracker window should not be canceled 
       * 3. We check to see if the frameID is a positive integer if it is, we are in a subframe, we don't have to block these 
       *    Ex. frame.html loading frame.js
       * For more information on frameId and tabId
       * https://developer.chrome.com/extensions/webRequest
       * 
       */
      if (this.isInSurveyWindowId === details.tabId || this.isInTrackerId === details.tabId || details.frameId > 0) {
        console.log("Allowing all requests from window, CANCEL: False", details);
        return { cancel: false };
      }

      console.log("CANCEL: True", details);
      return { cancel: true };
    }
  };

  _addRequestListener() {
    console.log("Updating SDK Suppressor");
    chrome.webRequest.onBeforeRequest.removeListener(this._suppressionListener);
    if (this.suppression) {

      console.log("SDK Suppressor active");
      chrome.webRequest.onBeforeRequest.addListener(
        this._suppressionListener,
        { urls: ["<all_urls>"] },
        ["blocking"]
      );
    }
  }
}

SDKSuppressor.redirectorShouldUpdate = function (previousSettings, currentSettings) {
  return (previousSettings.suppression !== currentSettings.suppression);
};

export default SDKSuppressor;
