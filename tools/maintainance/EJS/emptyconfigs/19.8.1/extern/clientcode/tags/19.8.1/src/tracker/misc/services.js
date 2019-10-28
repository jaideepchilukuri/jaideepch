/**
 * Remote services calls.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

// TODO clean up the rest of this file

// Get the foresee domain either from properties.survey or default 'survey.foreseeresults.com'
var _foreseeDomain = "survey.foreseeresults.com";

// Get the foresee events domain either from properties.survey or default 'events.foreseeresults.com'
var _foreseeEventsDomain = "events.foreseeresults.com";

// Set the controllerDomain and surveyOnExit domain
var _controllerDomain = ".4seeresults.com";

// Check config to see if other mobi endpoint available else default to i.4see.mobi
var _surveyOnExitDomain =
  typeof config !== "undefined" ? config.config.surveyAsyncCurl : "i.4see.mobi";

/**
 * @class Service configurations.
 */
var Services = {
  /**
   * The list of possible service calls
   */
  SERVICE_TYPES: {
    /**
     * The survey service configuration
     */
    survey: {
      host: _foreseeDomain,
      path: "/survey",
      url: "/display",
      protocol: "https",
    },

    /**
     * The mobileOnExit service initialize configuration
     */
    mobileOnExitInitialize: {
      host: _surveyOnExitDomain,
      path: "/e",
      url: "/initialize",
    },

    /**
     * The mobileOnExit service heartbeat configuration
     */
    mobileOnExitHeartbeat: {
      host: _surveyOnExitDomain,
      path: "/e",
      url: "/recordHeartbeat",
    },

    /**
     * The check service configuration
     */
    check: {
      host: "controller" + _controllerDomain,
      path: "/fsrSurvey",
      url: "/OTCImg",
      success: 3,
    },

    /**
     * The events service configuration
     */
    event: {
      host: _foreseeEventsDomain,
      path: "/rec",
      url: "/process?event=logit",
    },

    /**
     * The domain service configuration for "hybrid cookies"
     */
    domain: {
      host: _foreseeDomain,
      path: "/survey",
      url: "/FSRImg",
      success: 3,
    },

    /**
     * The replay service configuration
     */
    replay: {
      host: "replaycontroller" + _controllerDomain,
      path: "/images",
      enabled: true,
    },
  },
};

/**
 * Log a message to the server without much in the way of parameters.
 * @param servicetype {Services.SERVICE_TYPES} The service to call.
 * @param param {Object} A data object to send along with the message
 */
Services.ping = function(servicetype, parms, success, failure) {
  var srv = new utils.ImageTransport();

  /**
   * Make the secure request using an image request
   */
  srv.send({
    url: "https://" + servicetype.host + servicetype.path + (servicetype.url || ""),
    success: success || function() {},
    failure: failure || function() {},
    data: parms,
  });
};
