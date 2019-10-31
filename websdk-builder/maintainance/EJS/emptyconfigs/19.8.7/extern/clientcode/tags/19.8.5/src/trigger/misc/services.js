/**
 * Remote services calls.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

// Set the controllerDomain and surveyOnExit domain
var _controllerDomain = ".4seeresults.com";

// Grabs mobile endpoint from config.config, should be i.4see.mobi for prod.
var _surveyOnExitDomain = config.config.surveyAsyncCurl;

/**
 * @class Service configurations.
 */
var Services = {
  /**
   * The list of possible service calls
   */
  SERVICE_TYPES: {
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
  },
};

/**
 * Log a message to the server without much in the way of parameters.
 * @param servicetype {Services.SERVICE_TYPES} The service to call.
 * @param param {Object} A data object to send along with the message
 */
Services.ping = function(servicetype, parms, success, failure) {
  var srv = new utils.ImageTransport(),
    url = "https://" + servicetype.host + servicetype.path + (servicetype.url || "");
  /* pragma:DEBUG_START */
  console.log("trigger: services ping: ", url);
  /* pragma:DEBUG_END */
  /**
   * Make the secure request using an image request
   */
  srv.send({
    url: url,
    success: success || function() {},
    failure: failure || function() {},
    data: parms,
  });
};
