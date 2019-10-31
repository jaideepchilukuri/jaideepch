/**
 * Expose a public API for recording
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Misc.PublicAPI");

fs.require("rec.Top");

(function () {

  // Event for api ready
  var __apiReady = new utils.FSEvent();

  // Start sending if we aren't already
  fs.API.expose('beginTransmitting', function () {
    __apiReady.subscribe(function () {
      Singletons.controller.beginTransmitting();
    }, true, true);
  });

  // Stop recording
  fs.API.expose('cancelRecord', function () {
    __apiReady.subscribe(function () {
      Singletons.controller.cancelRecord();
    }, true, true);
  });

  // Get the session information
  fs.API.expose('getSession', function (cb) {
    cb = cb || function () {

      };
    __apiReady.subscribe(function () {
      var lg = Singletons.controller.recorder.logger;
      cb({
        sessionid: lg.sessionid,
        gsessionid: lg.gsessionid,
        sig: lg.gsessionid + '/' + lg.sessionid
      });
    }, true, true);
  });

  /**
   * Expose the public API
   * @param context
   * @constructor
   */
  var CompleteAPI = function (controller) {
    Singletons.controller = controller;

    __apiReady.fire();
  };

})();