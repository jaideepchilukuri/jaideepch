/* global chrome */

// ANTICIPATED REDIRECTOR REQUEST MATCH PATTERN EXAMPLES
// https://gateway.answerscloud.com/macys/production/gateway.min.js
// https://gateway.answerscloud.com/macys/staging/gateway.min.js
// https://gateway.foresee.com/sites/hunterdouglas/production/gateway.min.js
// https://gateway.foresee.com/sites/hunterdouglas/production/gateway.min.js
// https://gateway.foresee.com/sites/usbank/production/config.json
// https://gateway.foresee.com/sites/usbank/staging/config.json

//Pairs eligible swap Regexs with the required replacement redirection path
const MATCH_PATTERNS = [
  {
    matcher: new RegExp(/^(https?):\/\/gateway\.foresee\.com\/sites\/(.*)\/(staging|production)\/gateway\.min\.js.*$/,"i"),
    replacer: (new_env) => { return "$1://gateway.foresee.com/sites/$2/" + new_env + "/gateway.min.js?FSRDevExtension=configSwap";}
  },
  {
    matcher: new RegExp(/^(https?):\/\/gateway\.answerscloud\.com\/(.*)\/(staging|production)\/gateway\.min\.js.*$/,"i"),
    replacer: (new_env) => {return "$1://gateway.answerscloud.com/$2/" + new_env + "/gateway.min.js?FSRDevExtension=configSwap";}
  },
  {
    matcher: new RegExp(/^(https?):\/\/gateway\.foresee\.com\/sites\/(.*)\/(staging|production)\/config\.json.*$/,"i"),
    replacer: (new_env) => {return "$1://gateway.foresee.com/sites/$2/" + new_env + "/config.json?FSRDevExtension=configSwap";}
  }
];

class ConfigRedirector {
  constructor(settings) {
    this.configSwap = settings.configSwap;
    this.redirectionConfig = settings.redirectionConfig;
    this._updateRedirectionSettings = this._updateRedirectionSettings.bind(this);
    this._addRequestListener = this._addRequestListener.bind(this);
    this._configListener = this._configListener.bind(this);
  }

  _updateRedirectionSettings(settings){
    this.configSwap = settings.configSwap;
    this.redirectionConfig = settings.redirectionConfig;
  }

  _configListener(details){
    var match_set;
    var match = MATCH_PATTERNS.some(TRIAL_SET => {
      // Break execution when first member of Array.some() returns true, dictates matcher/replace for request
      match_set = TRIAL_SET;
      return match_set.matcher.test(details.url);
    });

    if(match){
      console.log("Heard request for config file: " + details.url);
      let redirectUrl = details.url.replace(match_set.matcher,match_set.replacer(this.redirectionConfig));
      console.log("Redirecting config file request to: " + redirectUrl);
      return ({redirectUrl});
    }
  }

  _addRequestListener(){
    console.log("Updating Config Redirection listener");
    chrome.webRequest.onBeforeRequest.removeListener(this._configListener);
    if(this.configSwap){
      console.log("Config Redirector active");
      chrome.webRequest.onBeforeRequest.addListener(
        this._configListener,
        {urls: ["<all_urls>"]},
        ["blocking"]
      );
    }
  }
}

ConfigRedirector.redirectorShouldUpdate = function(previousSettings,currentSettings){
  return(
    previousSettings.configSwap !== currentSettings.configSwap ||
    previousSettings.redirectionConfig !== currentSettings.redirectionConfig
  );
};

export default ConfigRedirector;
