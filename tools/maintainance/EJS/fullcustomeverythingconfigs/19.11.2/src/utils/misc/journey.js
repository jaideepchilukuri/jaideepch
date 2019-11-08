/**
 * Logs meta data against our servers
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, ext, isDefined, isObject, isString, hasProp } from "../../fs/index";
import { AjaxTransport } from "../network/ajax";
import { getBrainStorage } from "../storage/brainstorage";
import { APPID } from "../top";
import { generateUUID } from "./guid";
import { isNumeric } from "./numbers";

const VISIT_EXPIRY_DESKTOP = 30 * 60 * 1000; // 30 min
const VISIT_EXPIRY_MOBILE = 5 * 60 * 1000; // 5 min

const POPUP_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Logs journey events
 * @constructor
 */
class Journey {
  constructor(options) {
    options = options || {};

    // Save the CID
    this.customerId = options.customerId;

    // Set the throttleDuration much smaller in tracker window, so we can transmit before it converts to survey
    this.throttleDuration = options.throttleDuration || 400;

    this.browser = options.browser;

    // Override this in contexts that don't have access to the config
    // (tracker window, feedback popups, etc)
    this.config = globalConfig;

    // in standalone/weblink surveys there is no stg so fake it
    this.stg = options.stg;
    if (!this.stg.get) {
      this.stg.get = () => {};
    }

    // This must be one of utils.APPID
    this.appId = options.appId;
    if (!isString(this.appId)) {
      this.appId = "";
    }

    /* pragma:DEBUG_START */
    // Make sure that the provided appId is one is part of utils.APPID (utils/top.js)
    const aids = [];
    for (const aid in APPID) {
      aids.push(APPID[aid]);
    }
    if (!this.appId || !aids.some(id => this.appId === id)) {
      console.error('Unrecognized appId "%s". Supported: %s', this.appId, aids.join(", "));
    }
    /* pragma:DEBUG_END */

    // see CC-4538 for details on when to use fs_session_id and fs_popup_id
    this.useSessionId = !!options.useSessionId;
    this.usePopupId = !!options.usePopupId;

    this.ajax = new AjaxTransport();
    this.url = globalConfig.analyticsUrl;
    this.data = {
      customerId: this.customerId || "NULL",
      appId: this.appId || "NULL",
      userId: this.stg.uid || this.stg.get("rid") || "00000000-0000-0000-0000-00000000000",
      deviceProfile: {
        fs_os: this.browser.os.name,
        fs_osVersion: this.browser.os.version,
        fs_sdkVersion: globalConfig.codeVer,
        fs_browserName: this.browser.browser.name,
        fs_browserVersion: this.browser.browser.version,
        fs_type: this.browser.isTablet ? "Tablet" : this.browser.isMobile ? "Mobile" : "Desktop",
        fs_productType: "web sdk",
      },
      events: [],
    };

    this.eventsDefault = { properties: { fs_pageUrl: [location.href] } };
  }

  addEventsDefault(key, obj) {
    // validate the key
    if (!key || ["properties", "metrics", "data"].indexOf(key) < 0) {
      /* pragma:DEBUG_START */
      console.warn("utils: addEventsDefault invalid key", key);
      /* pragma:DEBUG_END */
      return this.eventsDefault;
    }

    // validate the obj
    if (!validateEventObject(key, obj)) {
      return this.eventsDefault;
    }

    // prune the obj (when it's an Array)
    // fs.ext is later used and will ignore any "empty" objects
    for (const k in obj) {
      if (hasProp(obj, k)) {
        // it is an Array
        if (Array.isArray(obj[k]) && obj[k].length > 0) {
          // prune the Array's items
          obj[k] = obj[k].filter(isDefined);
          // remove the item if it's empty
          if (obj[k].length < 1) {
            delete obj[k];
          }
        }
      }
    }

    this.eventsDefault = this.eventsDefault || {};
    this.eventsDefault[key] = ext(this.eventsDefault[key], obj);

    return this.eventsDefault;
  }

  /**
   * Sets a Key - adds an event if none exist to force transmit
   * @param name
   * @param value
   * @returns {boolean}
   */
  setKey(name, value) {
    if (isObject(value)) {
      this.data[name] = value;
      // if there aren't any events queued, create one so we get at least one transmit
      if (!this.data.events.length) {
        this.addEventString("fs_setKey");
      }
      return true;
    }
    return false;
  }

  /**
   * Adds an event to events array
   * Handles objects and strings
   * @param param
   */
  addEvent(param) {
    const type = typeof param;
    switch (type) {
      case "string":
        this.addEventString(param);
        break;
      case "object":
        this.addEventObj(param);
        break;
      default:
        console.error("ForeSee: event is not a valid type: ", type);
        break;
    }
  }

  /**
   * Adds an event object
   * This can be for public use, this function has format validation
   * @param evt
   */
  addEventObj(evt) {
    // Validate the timestamp
    if (!evt.timestamp) {
      evt.timestamp = new Date().toISOString();
    }

    // Validate the timezone
    if (!evt.timezone) {
      evt.timezone = new Date().getTimezoneOffset();
    }

    // Validate the rest of the event
    if (
      evt.name &&
      evt.name.length > 0 &&
      validateEventObject("properties", evt.properties) &&
      validateEventObject("metrics", evt.metrics) &&
      validateEventObject("data", evt.data)
    ) {
      // Merge the event with the default one (eventsDefault)
      this._updateVisitId();
      this._updatePopupId();
      if (!this._isEventAllowed(evt.name)) return;
      evt = applyEventsDefault(evt, this.eventsDefault);
      this.data.events.push(evt);
      this.send();
    }
  }

  /**
   * A simpler add event function
   * This has no validation
   * @param name
   * @private
   */
  addEventString(name) {
    this._updateVisitId();
    this._updatePopupId();
    if (!this._isEventAllowed(name)) return;
    this.data.events.push(
      applyEventsDefault(
        {
          name,
          timestamp: new Date().toISOString(),
          timezone: new Date().getTimezoneOffset(),
        },
        this.eventsDefault
      )
    );
    this.send();
  }

  _isEventAllowed(event) {
    if (!this.config) return false;

    if (!this.config.journeyEvents) {
      // helpful message for support
      /* pragma:DEBUG_START */
      console.error("Missing journeyEvents config in global config");
      /* pragma:DEBUG_END */
      return true;
    }

    const journeyEvents = this.config.journeyEvents;
    if (journeyEvents.transmit === "never") {
      if (journeyEvents.list.indexOf(event) > -1) {
        /* pragma:DEBUG_START */
        console.warn("utils: journey event blocked:", event);
        /* pragma:DEBUG_END */

        return false;
      }

      return true;
    } else if (journeyEvents.transmit === "only") {
      if (journeyEvents.list.indexOf(event) > -1) {
        return true;
      }

      /* pragma:DEBUG_START */
      console.warn("utils: journey event blocked:", event);
      /* pragma:DEBUG_END */

      return false;
    }

    /* pragma:DEBUG_START */
    console.error("journeyEvents.transmit invalid value:", journeyEvents.transmit);
    /* pragma:DEBUG_END */

    return false;
  }

  _updateVisitId() {
    // Should we even?
    // Are we in a context that does not have stg available?
    if (!this.useSessionId || !this.stg.set) {
      return;
    }

    let visitId = this.stg.get("vi");
    if (!visitId) {
      visitId = generateUUID();
    }

    // set every time we use it to reset the expiry time
    this.stg.set("vi", visitId, this.browser.isMobile ? VISIT_EXPIRY_MOBILE : VISIT_EXPIRY_DESKTOP);

    this.addEventsDefault("data", { fs_session_id: visitId });
  }

  initPopupId() {
    const brain = getBrainStorage(this.browser, this.stg.uid, globalConfig.siteKey);
    // get the fs_popup_id value if already generated, or create one otherwose
    const pid = this.stg.get("pid") || brain.get("pid") || generateUUID();
    // save value in stg (brain may not be used as the primary storage)
    this.stg.set("pid", pid, POPUP_EXPIRY);
    // save value to brain (to be sure it is available to the popup)
    brain.set("pid", pid, POPUP_EXPIRY);
  }

  _updatePopupId() {
    // Are we in a context that does not have stg available?
    if (!this.stg.set) {
      return;
    }

    const popupId = this.stg.get("pid");

    // Happens when no popup has been created yet
    if (!popupId) {
      if (this.usePopupId) {
        /* pragma:DEBUG_START */
        console.error("There is no pid (fs_popup_id) in this storage!", this.stg);
        /* pragma:DEBUG_END */
      }
      return;
    }

    // Update every time we "use" it to refresh the expiry time
    // (Popups will refresh it, but not the main page)
    if (this.usePopupId) {
      this.stg.set("pid", popupId, POPUP_EXPIRY);
    }

    this.addEventsDefault("data", { fs_popup_id: popupId });
  }

  /**
   * Performs a throttled send of event data.
   * @param force (Boolean) true to ignore throttling (Optional)
   */
  send(force) {
    /* pragma:DEBUG_START */
    console.warn("utils: Events to buffer:", force ? " (force) " : "", ext({}, this.data));
    /* pragma:DEBUG_END */

    if (force) {
      _send(this);
    } else if (!this._svT) {
      this._svT = setTimeout(() => {
        _send(this);
      }, this.throttleDuration);
    }
  }
}

function applyEventsDefault(evt, eventsDefault) {
  // merge each event's field with the default values from eventsDefault, using fs.ext
  return ["properties", "metrics", "data"].reduce((evt, evtProp) => {
    // only bother if there is something to add
    if (eventsDefault[evtProp]) {
      evt[evtProp] = ext(evt[evtProp], eventsDefault[evtProp]);
    }
    return evt;
  }, evt);
}

/**
 * Sends the Events using AJAX
 * @private
 */
function _send(ctx) {
  ctx._svT = null;

  // only send if there are some events
  if (ctx.data.events.length > 0) {
    // copy the events to send...
    const payload = ext({}, ctx.data);
    // ... add assume they'll be sent.
    ctx.data.events = [];

    ctx.ajax.send({
      url: ctx.url,
      contentType: "application/json",
      headers: { "Request-API-Version": "1.0.0" },
      data: payload,
      method: "POST",
      failure() {
        // Restores the events that were not sent after all.
        // This does not ensure that they will ever be sent. But it
        // gives them another chance in case there is a
        // subsequent call to _send().
        ctx.data.events = payload.events;
      },
    });
  }
}

/**
 * Helper Function - Returns false if the format of the object isn't correct
 * @param tp - type
 * @param obj - object
 * @returns {boolean}
 */
function validateEventObject(tp, obj) {
  let key;
  switch (tp) {
    // Properties capture event dimensions (Optional)
    case "properties":
      // properties must be an array
      if (obj) {
        for (key in obj) {
          if (!Array.isArray(obj[key])) {
            console.error("ForeSee: Invalid properties");
            return false;
          }
        }
      }
      break;
    case "metrics":
      // metrics must be numeric
      if (obj) {
        for (key in obj) {
          if (!isNumeric(obj[key])) {
            console.error("ForeSee: Invalid metrics");
            return false;
          }
        }
      }
      break;
    // Note: We removed the data validator because data can be almost any type according to
    // https://fsrwiki.foreseeresults.com/display/DEV/Ingestion+Endpoint+and+Event+Payload
    default:
      break;
  }
  // valid if none of the switch cases matched
  return true;
}

export { Journey };
