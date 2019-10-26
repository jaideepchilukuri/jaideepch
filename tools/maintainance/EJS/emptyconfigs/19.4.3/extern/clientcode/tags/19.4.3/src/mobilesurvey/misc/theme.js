/**
 * Applies themes as appropriate
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author Alexei White: alexei.white $
 *
 * @modified 12/28/2011: 2011-05-06 08:50:51 -0700 (Fri, 06 May 2011) $
 */

fs.provide("ms.Survey.Misc.Theme");

fs.require("ms.Survey");

(function() {

  /**
   * Holds all the code related to themes. A static module.
   */
  var Theme = {};

  /**
   * detect the context and apply the theme as appropriate
   */
  Theme.Apply = function() {

    // Get the user agent
    var userAgent = fs.toLowerCase(window.navigator.userAgent);

    // Does the agent have a specific string?
    var agentHas = function(str) {
      return userAgent.indexOf(str) > -1;
    };

    var overrideDevice = fs.getParam("overrideDevice");
    var nobanner = fs.getParam("nobanner");
    var cppbrand = fs.toLowerCase(fs.getParam("cpp[brand_name]") || "");
    var isblackberry = agentHas("blackberry") || agentHas("playbook") || overrideDevice == "blackberry";
    var isplaybook = agentHas("rim") && agentHas("playbook");
    var isiphoneipod = agentHas("iphone") || agentHas("ipod");
    var isipad = agentHas("ipad") || overrideDevice == "ipad";
    var isios = isipad || isiphoneipod || overrideDevice == "ios";
    var isandroid = agentHas("android") || overrideDevice == "android";
    var isie = agentHas("msie");
    var isinapp = window.location.toString().indexOf("appRevision") > -1 || window.fsrTracker || cppbrand.indexOf("apple") > -1;
    var newios = agentHas("os 5") && isios;
    var bodyRef = $(window.document.body);

    if (nobanner) {
      bodyRef.addClass("nobanner");
    }
    
    // Are we in-app?
    if (isinapp) {

      if (isios)
        bodyRef.addClass("iosinapp");
      else if (isandroid)
        bodyRef.addClass("androidinapp");

      if (isipad)
        bodyRef.addClass("ipad");

    } else {

      // NOT in-app

      if (isblackberry)
        bodyRef.addClass("blackberryweb");
      else if (isandroid)
        bodyRef.addClass("androidweb");
      else if (isie)
        bodyRef.addClass("ieweb");

    }

    // A special class for new ios
    if (newios)
      bodyRef.addClass("newios");

    // Used for convenience elsewhere
    Theme.isIPad = isipad;

    // I'm doing it this way for testing reasons - dont change
    Theme.isNewIOS = bodyRef.hasClass("newios");

    // I'm doing it this way for testing reasons - dont change
    Theme.isNewAndroid = bodyRef.hasClass("androidweb") || bodyRef.hasClass("androidinapp");

  };

})();