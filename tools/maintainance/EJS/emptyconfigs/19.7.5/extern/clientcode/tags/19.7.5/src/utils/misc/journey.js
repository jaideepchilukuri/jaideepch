/**
 * Logs meta data against our servers
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Journey");

fs.require("fs.Top");
fs.require("fs.Utils.Dom.Frame");

(function (utils) {

  var VISIT_EXPIRY_DESKTOP = 30 * 60 * 1000; // 30 min
  var VISIT_EXPIRY_MOBILE = 5 * 60 * 1000; // 5 min

  var POPUP_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours

  /**
   * Logs journey events
   * @constructor
   */
  utils.Journey = function (options) {
    options = options || {};

    // Save the CID
    this.customerId = options.customerId;

    // Set the throttleDuration much smaller in tracker window, so we can transmit before it converts to survey
    this.throttleDuration = options.throttleDuration || 400;

    this.browser = options.browser;

    // Override this in contexts that don't have access to the config
    // (tracker window, feedback popups, etc)
    this.config = fs.config;

    // in standalone/weblink surveys there is no stg so fake it
    this.stg = options.stg;
    if (!this.stg.get) {
      this.stg.get = function () { };
    }

    // This must be one of utils.APPID
    this.appId = options.appId;
    if (!fs.isString(this.appId)) {
      this.appId = "";
    }

    /* pragma:DEBUG_START */
    // Make sure that the provided appId is one is part of utils.APPID (utils/top.js)
    var aids = [];
    for (var aid in utils.APPID) {
      aids.push(utils.APPID[aid]);
    }
    if (!this.appId || !aids.some(function (id) {
      return this.appId === id;
    }.bind(this))) {
      console.error('Unrecognized appId "%s". Supported: %s', this.appId, aids.join(', '));
    }
    /* pragma:DEBUG_END */

    // see CC-4538 for details on when to use fs_session_id and fs_popup_id
    this.useSessionId = !!options.useSessionId;
    this.usePopupId = !!options.usePopupId;

    this.ajax = new utils.AjaxTransport();
    this.url = fs.config.analyticsUrl;
    this.data = {
      'customerId': this.customerId || "NULL",
      'appId': this.appId || "NULL",
      'userId': this.stg.uid || this.stg.get('rid') || "00000000-0000-0000-0000-00000000000",
      'deviceProfile': {
        'fs_os': this.browser.os.name,
        'fs_osVersion': this.browser.os.version,
        'fs_sdkVersion': fs.config.codeVer,
        'fs_browserName': this.browser.browser.name,
        'fs_browserVersion': this.browser.browser.version,
        'fs_type': this.browser.isTablet ? 'Tablet' : this.browser.isMobile ? 'Mobile' : 'Desktop',
        'fs_productType': 'web sdk'
      },
      'events': []
    };

    this.eventsDefault = { properties: { fs_pageUrl: [location.href] } };
  };

  utils.Journey.prototype.addEventsDefault = function (key, obj) {
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
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        // it is an Array
        if (Array.isArray(obj[k]) && obj[k].length > 0) {
          // prune the Array's items
          obj[k] = obj[k].filter(fs.isDefined);
          // remove the item if it's empty
          if (obj[k].length < 1) {
            delete obj[k];
          }
        }
      }
    }

    this.eventsDefault = this.eventsDefault || {};
    this.eventsDefault[key] = fs.ext(this.eventsDefault[key], obj);

    return this.eventsDefault;
  };

  /**
   * Sets a Key - adds an event if none exist to force transmit
   * @param name
   * @param value
   * @returns {boolean}
   */
  utils.Journey.prototype.setKey = function (name, value) {
    if (fs.isObject(value)) {
      this.data[name] = value;
      // if there aren't any events queued, create one so we get at least one transmit
      if (!this.data.events.length) {
        this.addEventString('fs_setKey');
      }
      return true;
    }
    return false;
  };

  /**
   * Adds an event to events array
   * Handles objects and strings
   * @param param
   */
  utils.Journey.prototype.addEvent = function (param) {
    var type = typeof param;
    switch (type) {
      case "string":
        this.addEventString(param);
        break;
      case "object":
        this.addEventObj(param);
        break;
      default:
        console.error('ForeSee: event is not a valid type: ', type);
        break;
    }
  };

  /**
   * Adds an event object
   * This can be for public use, this function has format validation
   * @param evt
   */
  utils.Journey.prototype.addEventObj = function (evt) {
    // Validate the timestamp
    if (!evt.timestamp) {
      evt.timestamp = (new Date()).toISOString();
    }

    // Validate the timezone
    if (!evt.timezone) {
      evt.timezone = (new Date()).getTimezoneOffset();
    }

    // Validate the rest of the event
    if (evt.name && evt.name.length > 0 &&
      validateEventObject('properties', evt.properties) &&
      validateEventObject('metrics', evt.metrics) &&
      validateEventObject('data', evt.data)
    ) {
      // Merge the event with the default one (eventsDefault)
      this._updateVisitId();
      this._updatePopupId();
      if (!this._isEventAllowed(evt.name)) return;
      evt = applyEventsDefault(evt, this.eventsDefault);
      this.data.events.push(evt);
      this.send();
    }
  };

  /**
   * A simpler add event function
   * This has no validation
   * @param name
   * @private
   */
  utils.Journey.prototype.addEventString = function (name) {
    this._updateVisitId();
    this._updatePopupId();
    if (!this._isEventAllowed(name)) return;
    this.data.events.push(applyEventsDefault({
      'name': name,
      'timestamp': (new Date()).toISOString(),
      'timezone': (new Date()).getTimezoneOffset()
    }, this.eventsDefault));
    this.send();
  };

  utils.Journey.prototype._isEventAllowed = function (event) {
    if (!this.config) return false;

    if (!this.config.journeyEvents) {
      // helpful message for support
      /* pragma:DEBUG_START */
      console.error("Missing journeyEvents config in global config");
      /* pragma:DEBUG_END */
      return true;
    }

    var journeyEvents = this.config.journeyEvents;
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
    console.error(
      "journeyEvents.transmit invalid value:",
      journeyEvents.transmit
    );
    /* pragma:DEBUG_END */

    return false;
  };

  utils.Journey.prototype._updateVisitId = function () {
    // Should we even?
    // Are we in a context that does not have stg available?
    if (!this.useSessionId || !this.stg.set) {
      return;
    }

    var visitId = this.stg.get('vi');
    if (!visitId) { visitId = utils.generateUUID(); }

    // set every time we use it to reset the expiry time
    this.stg.set('vi', visitId, this.browser.isMobile ? VISIT_EXPIRY_MOBILE : VISIT_EXPIRY_DESKTOP);

    this.addEventsDefault('data', { "fs_session_id": visitId });
  };

  utils.Journey.prototype.initPopupId = function () {
    var brain = utils
      .getBrainStorage(
        this.browser,
        this.stg.uid,
        fs.config.siteKey
      );
    // get the fs_popup_id value if already generated, or create one otherwose
    var pid = this.stg.get("pid") || brain.get("pid") || utils.generateUUID();
    // save value in stg (brain may not be used as the primary storage)
    this.stg.set("pid", pid, POPUP_EXPIRY);
    // save value to brain (to be sure it is available to the popup)
    brain.set("pid", pid, POPUP_EXPIRY);
  };

  utils.Journey.prototype._updatePopupId = function () {
    // Are we in a context that does not have stg available?
    if (!this.stg.set) { return; }

    var popupId = this.stg.get('pid');

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
      this.stg.set('pid', popupId, POPUP_EXPIRY);
    }

    this.addEventsDefault('data', { "fs_popup_id": popupId });
  };

  function applyEventsDefault(evt, eventsDefault) {
    // merge each event's field with the default values from eventsDefault, using fs.ext
    return ["properties", "metrics", "data"].reduce(function (evt, evtProp) {
      // only bother if there is something to add
      if (eventsDefault[evtProp]) {
        evt[evtProp] = fs.ext(evt[evtProp], eventsDefault[evtProp]);
      }
      return evt;
    }, evt);
  }

  /**
   * Performs a throttled send of event data.
   * @param force (Boolean) true to ignore throttling (Optional)
   */
  utils.Journey.prototype.send = function (force) {
    /* pragma:DEBUG_START */
    console.warn("utils: Events to buffer:", force ? " (force) " : "", fs.ext({}, this.data));
    /* pragma:DEBUG_END */

    if (force) {
      _send(this);
    } else {
      if (!this._svT) {
        this._svT = setTimeout(function () {
          _send(this);
        }.bind(this), this.throttleDuration);
      }
    }
  };

  /**
   * Sends the Events using AJAX
   * @private
   */
  var _send = function (ctx) {
    ctx._svT = null;

    // only send if there are some events
    if (ctx.data.events.length > 0) {
      // copy the events to send...
      var payload = fs.ext({}, ctx.data);
      // ... add assume they'll be sent.
      ctx.data.events = [];

      ctx.ajax.send({
        url: ctx.url,
        contentType: 'application/json',
        headers: { 'Request-API-Version': '1.0.0' },
        data: payload,
        method: "POST",
        failure: function () {
          // Restores the events that were not sent after all.
          // This does not ensure that they will ever be sent. But it
          // gives them another chance in case there is a
          // subsequent call to _send().
          ctx.data.events = payload.events;
        }.bind(ctx),
      });
    }
  };

  /**
   * Helper Function - Returns false if the format of the object isn't correct
   * @param tp - type
   * @param obj - object
   * @returns {boolean}
   */
  var validateEventObject = function (tp, obj) {
    var key;
    switch (tp) {
      // Properties capture event dimensions (Optional)
      case "properties":
        // properties must be an array
        if (obj) {
          for (key in obj) {
            if (!Array.isArray(obj[key])) {
              console.error('ForeSee: Invalid properties');
              return false;
            }
          }
        }
        break;
      case "metrics":
        // metrics must be numeric
        if (obj) {
          for (key in obj) {
            if (!utils.isNumeric(obj[key])) {
              console.error("ForeSee: Invalid metrics");
              return false;
            }
          }
        }
        break;
      // Note: We removed the data validator because data can be almost any type according to
      // https://fsrwiki.foreseeresults.com/display/DEV/Ingestion+Endpoint+and+Event+Payload
    }
    // valid if none of the switch cases matched
    return true;
  };

})(utils);