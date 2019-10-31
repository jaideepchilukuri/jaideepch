/**
 * Expose a public API for recording
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

import { API, globalConfig, getProductConfig } from "../../fs/index";
import { EVENT_TYPES } from "../capture/actions";
import { FSEvent } from "../../utils/utils";

// Event for api ready
const RecordAPI = {};

RecordAPI._apiReady = new FSEvent();

// Start sending if we aren't already
API.expose("beginTransmitting", () => {
  RecordAPI._apiReady.subscribe(
    () => {
      RecordAPI._controller.beginTransmitting();
    },
    true,
    true
  );
});

// Stop recording
API.expose("cancelRecord", () => {
  RecordAPI._apiReady.subscribe(
    () => {
      RecordAPI._controller.cancelRecord();
    },
    true,
    true
  );
});

// Get the session information
API.expose("getSession", cb => {
  cb = cb || console.table || console.log;
  RecordAPI._apiReady.subscribe(
    () => {
      const gid = RecordAPI._controller.getGlobalId();
      const sid = RecordAPI._controller.getSessionId();
      cb({
        gsessionid: gid,
        sessionid: sid,
        sig: `${gid}/${sid}`,
      });
    },
    true,
    true
  );
});

// Going forward, please add API methods to the Record namespace only
// the above methods are for backwards compatibility
API.expose("Record", {
  /**
   * Return a copy of the record config
   */
  getConfig(cb) {
    cb = cb || console.log;
    cb(JSON.parse(JSON.stringify(getProductConfig("record"))));
  },

  /**
   * Trigger immediate processing of the current recording.
   */
  process() {
    RecordAPI._apiReady.subscribe(
      () => {
        if (RecordAPI._controller.recorder) {
          RecordAPI._controller.recorder.flush();
          setTimeout(() => {
            RecordAPI._controller.recorder.processImmediately(0);
          }, 1000);
        }
      },
      true,
      true
    );
  },

  /**
   * Trigger immediate send of data waiting to be sent to server
   */
  flush() {
    RecordAPI._apiReady.subscribe(
      () => {
        if (RecordAPI._controller.recorder) {
          RecordAPI._controller.recorder.flush();
        }
      },
      true,
      true
    );
  },

  /**
   * Open replay dashboard
   */
  dashboard() {
    RecordAPI._apiReady.subscribe(
      () => {
        const gid = RecordAPI._controller.getGlobalId();
        const sid = RecordAPI._controller.getSessionId();
        let env = "prod";
        if (/qa-/.test(globalConfig.recUrl)) {
          env = "qa";
        } else if (/dev-/.test(globalConfig.recUrl)) {
          env = "dev";
        }
        window.open(`https://replay-dashboard.foresee.com/${env}/${gid}/${sid}`, "_blank");
      },
      true,
      true
    );
  },

  /**
   * Trigger immediate processing of the current recording.
   */
  getPIIConfig(cb) {
    cb = cb || console.table || console.log;
    RecordAPI._apiReady.subscribe(
      () => {
        if (RecordAPI._controller.recorder) {
          return cb(JSON.parse(JSON.stringify(RecordAPI._controller.recorder.getPIIConfig())));
        }
      },
      true,
      true
    );
  },

  /**
   * Get masking target elements
   */
  getPIIElements(cb) {
    cb = cb || console.log;
    RecordAPI._apiReady.subscribe(
      () => {
        if (RecordAPI._controller.recorder) {
          const targs = RecordAPI._controller.recorder.getMaskingTargets() || {};
          return cb({
            selectiveUnMaskZones: targs.unmasked,
            selectiveMaskZones: targs.masked,
            visibleInputs: targs.whitelist,
            redactZones: targs.redact,
          });
        }
      },
      true,
      true
    );
  },

  /**
   * Get masking target elements
   */
  diagnoseCriteria(cb) {
    cb = cb || console.table || console.log;
    RecordAPI._apiReady.subscribe(
      () => {
        if (RecordAPI._controller.crit) {
          return cb(RecordAPI._controller.crit.reasons);
        }
      },
      true,
      true
    );
  },

  /**
   * Send a custom error event in the record event stream.
   *
   * @param {String} msg the msg -- max 256 chars
   * @param {Object} meta the meta object -- max 10k chars
   */
  error(msg, meta) {
    RecordAPI._apiReady.subscribe(
      () => {
        RecordAPI._controller.sendCustomEvent(EVENT_TYPES.CUSTOM_ERROR, "ERROR", msg, meta);
      },
      true,
      true
    );
  },

  /**
   * Send a custom event in the record event stream.
   *
   * @param {String} msg the msg -- max 256 chars
   * @param {Object} meta the meta object -- max 10k chars
   */
  event(msg, meta) {
    RecordAPI._apiReady.subscribe(
      () => {
        RecordAPI._controller.sendCustomEvent(EVENT_TYPES.CUSTOM_BEHAVIOR, "EVENT", msg, meta);
      },
      true,
      true
    );
  },
});

/**
 * Expose the public API
 * @param context
 * @constructor
 */
RecordAPI.ready = controller => {
  RecordAPI._controller = controller;

  RecordAPI._apiReady.fire();
};

export { RecordAPI };
