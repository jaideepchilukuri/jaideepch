/* global chrome */

class SDKRedirector {
  constructor(settings) {
    this.redirection = settings.redirection;
    this.replace_string = this.buildReplaceString(settings);
    this._updateRedirectionSettings = this._updateRedirectionSettings.bind(this);
    this._addRequestListener = this._addRequestListener.bind(this);
    this._SDKListener = this._SDKListener.bind(this);
  }

  buildReplaceString(settings){
    // If settings.redirectionVersion === inherit then we should use regex to detect version. Otherwise, insert user selected version.
    if(settings.redirectionVersion === "inherit"){
      return "$1://"+ settings.redirectionTarget + "/code/$2/fs.$3.js?FSRDevExtension=redirect";
    } else{
      return "$1://"+ settings.redirectionTarget + "/code/" + settings.redirectionVersion + "/fs.$3.js?FSRDevExtension=redirector";
    }
  }

  _updateRedirectionSettings(settings){
    this.redirection = settings.redirection;
    this.replace_string = this.buildReplaceString(settings);
  }

  _SDKListener(details){
    //Limits request to only ForeSee Files
    let matcher = new RegExp(/^(https?):\/\/.*\/code\/(.*)\/fs\.(.*)\.js$/,"i");
    if(matcher.test(details.url)){
      console.log("Heard request for ForeSee Asset: " + details.url);
      let redirectUrl = details.url.replace(matcher,this.replace_string);
      console.log("Redirecting request to: " + redirectUrl);
      return ({redirectUrl});
    }
  }

  _addRequestListener(){
    console.log("Updating SDK Redirection listener");
    chrome.webRequest.onBeforeRequest.removeListener(this._SDKListener);
    if(this.redirection){
      console.log("SDK Redirector active");
      chrome.webRequest.onBeforeRequest.addListener(
        this._SDKListener,
        {urls: ["<all_urls>"]},
        ["blocking"]
      );
    }
  }
}

SDKRedirector.redirectorShouldUpdate = function(previousSettings,currentSettings){
  return(
    previousSettings.redirection !== currentSettings.redirection ||
    previousSettings.redirectionVersion !== currentSettings.redirectionVersion ||
    previousSettings.redirectionTarget !== currentSettings.redirectionTarget
  );
};

export default SDKRedirector;
