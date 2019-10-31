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
  /**
   * Logs journey events
   * @constructor
   */
  utils.Journey = function (customerId, appId, userId, browser, threshold) {
    // Save the CID
    this.customerId = customerId;
    // Set the threshold much smaller in tracker window, so we can transmit before it converts to survey
    this.threshold = threshold || 400;
    this.browser = browser;
    if (!fs.isString(appId)) {
      appId = "";
    }

    /* pragma:DEBUG_START */
    // Make sure that the provided appId is one is part of utils.APPID (utils/top.js)
    var aids = [];
    for (var aid in utils.APPID) {
      aids.push(utils.APPID[aid]);
    }
    if (!appId || !aids.some(function (id) {
      return appId === id;
    })) {
      console.error('Unrecognized appId "%s". Supported: %s', appId, aids.join(', '));
    }
    /* pragma:DEBUG_END */

    this.ajax = new utils.AjaxTransport();
    this.url = fs.config.analyticsUrl;
    this.data = {
      'customerId': customerId,
      'appId': appId,
      'userId': userId || "0000-0000-0000-0000-0000",
      'deviceProfile': {
        'fs_os': browser.os.name,
        'fs_osVersion': browser.os.version,
        'fs_sdkVersion': fs.config.codeVer,
        'fs_browserName': browser.browser.name,
        'fs_browserVersion': browser.browser.version,
        'fs_timezone': new Date().getTimezoneOffset(),
        'fs_type': browser.isMobile ? 'Mobile' : browser.isTablet ? 'Tablet' : 'Desktop',
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
      evt = applyEventsDefault(evt, this.eventsDefault);

      this.data.events.push(evt);
    } else {
      console.error("ForeSee: Invalid Event. For proper usage, please refer to http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/event-logging/");
      return;
    }
    this.send();
  };

  /**
   * A simpler add event function
   * This has no validation
   * @param name
   * @private
   */
  utils.Journey.prototype.addEventString = function (name) {
    this.data.events.push(applyEventsDefault({
      'name': name,
      'timestamp': (new Date()).toISOString(),
      'timezone': (new Date()).getTimezoneOffset()
    }, this.eventsDefault));
    this.send();
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
        }.bind(this), this.threshold);
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
          // This does not ensure that they will ever be sent. It only gives them another chance
          // in case there is a subsequent call to _send().
          ctx.data.events = payload.events;
        }.bind(ctx),
      });
    }
  };

  /**
   * Helper Funciton - Returns false if the format of the object isn't correct
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