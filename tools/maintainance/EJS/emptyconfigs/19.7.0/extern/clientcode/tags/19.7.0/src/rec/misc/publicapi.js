/**
 * Expose a public API for recording
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

fs.provide("rec.Misc.PublicAPI");

fs.require("rec.Top");

(function () {

  // Event for api ready
  var RecordAPI = {};

  RecordAPI._apiReady = new utils.FSEvent();

  // Start sending if we aren't already
  fs.API.expose('beginTransmitting', function () {
    RecordAPI._apiReady.subscribe(function () {
      RecordAPI._controller.beginTransmitting();
    }, true, true);
  });

  // Stop recording
  fs.API.expose('cancelRecord', function () {
    RecordAPI._apiReady.subscribe(function () {
      RecordAPI._controller.cancelRecord();
    }, true, true);
  });

  // Get the session information
  fs.API.expose('getSession', function (cb) {
    cb = cb || console.table || console.log;
    RecordAPI._apiReady.subscribe(function () {
      var gid = RecordAPI._controller.getGlobalId();
      var sid = RecordAPI._controller.getSessionId();
      cb({
        gsessionid: gid,
        sessionid: sid,
        sig: gid + '/' + sid
      });
    }, true, true);
  });

  // Going forward, please add API methods to the Record namespace only
  // the above methods are for backwards compatibility
  fs.API.expose('Record', {
    /**
     * Return a copy of the record config
     */
    getConfig: function (cb) {
      cb = cb || console.log;
      RecordAPI._apiReady.subscribe(function () {
        cb(JSON.parse(JSON.stringify(recordconfig)));
      }, true, true);
    },

    /**
     * Trigger immediate processing of the current recording.
     */
    process: function () {
      RecordAPI._apiReady.subscribe(function () {
        if (RecordAPI._controller.recorder) {
          if (RecordAPI._controller.recorder.worker) {
            RecordAPI._controller.recorder.worker.emergency();
          }
          setTimeout(function () {
            RecordAPI._controller.recorder.processImmediately(0);
          }, 500);
        }
      }, true, true);
    },

    /**
     * Trigger immediate processing of the current recording.
     */
    getPIIConfig: function (cb) {
      cb = cb || console.table || console.log;
      RecordAPI._apiReady.subscribe(function () {
        if (RecordAPI._controller.recorder) {
          cb(JSON.parse(JSON.stringify(RecordAPI._controller.recorder.getPIIConfig())));
        }
      }, true, true);
    },

    /**
     * Get masking target elements
     */
    getPIIElements: function (cb) {
      cb = cb || console.log;
      RecordAPI._apiReady.subscribe(function () {
        if (RecordAPI._controller.recorder) {
          var targs = RecordAPI._controller.recorder.getMaskingTargets() || {};
          cb({
            selectiveUnMaskZones: targs.unmasked,
            selectiveMaskZones: targs.masked,
            visibleInputs: targs.whitelist,
            redactZones: targs.redact,
          });
        }
      }, true, true);
    },

    /**
     * Get masking target elements
     */
    diagnoseCriteria: function (cb) {
      cb = cb || console.table || console.log;
      RecordAPI._apiReady.subscribe(function () {
        if (RecordAPI._controller.crit) {
          cb(RecordAPI._controller.crit.reasons);
        }
      }, true, true);
    },

    /**
     * Send a custom error event in the record event stream.
     *
     * @param {String} msg the msg -- max 256 chars
     * @param {Object} meta the meta object -- max 10k chars
     */
    error: function (msg, meta) {
      RecordAPI._apiReady.subscribe(function () {
        RecordAPI._controller.sendCustomEvent(
          EVENT_TYPES.CUSTOM_ERROR, "ERROR", msg, meta);
      }, true, true);
    },

    /**
     * Send a custom event in the record event stream.
     *
     * @param {String} msg the msg -- max 256 chars
     * @param {Object} meta the meta object -- max 10k chars
     */
    event: function (msg, meta) {
      RecordAPI._apiReady.subscribe(function () {
        RecordAPI._controller.sendCustomEvent(
          EVENT_TYPES.CUSTOM_BEHAVIOR, "EVENT", msg, meta);
      }, true, true);
    },
  });

  /**
   * Expose the public API
   * @param context
   * @constructor
   */
  RecordAPI.ready = function (controller) {
    RecordAPI._controller = controller;

    RecordAPI._apiReady.fire();
  };

})();