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
    // Set the threshold much smaller in tracker window, so we can transmit before it converts to survey
    this.threshold = threshold || 400;
    this.browser = browser;
    if (!fs.isString(appId)) {
      appId = "";
    }
    this.cors = new utils.AjaxTransport();
    this.url = fs.config.analyticsUrl.replace(/^https?:/i, location.protocol);
    this.data = {
      'customerId': customerId,
      'appId': appId,
      'userId': userId || "0000-0000-0000-0000-0000",
      'deviceProfile': {
        'fs_timezone': (new Date()).getTimezoneOffset(),
        'fs_os': browser.os.name,
        'fs_osver': browser.os.version,
        'fs_browser': browser.browser.name,
        'fs_browserver': browser.browser.version
      },
      'events': []
    };
  };

  /**
   * Sends the Events using CORS
   * @private
   */
  utils.Journey.prototype._send = function () {
    this._svT = null;

    // only send if there are some events
    if (this.data.events.length > 0) {
      utils.Healthy(this.browser, ["events"], fs.proxy(function () {
        this.cors.send({
          url: this.url,
          contentType: 'application/json',
          data: this.data,
          method: "POST",
          success: fs.proxy(function () {
            this.data.events = [];
          }, this)
        });
      }, this));
    }
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

    // Validate the rest of the event
    if (evt.name && evt.name.length > 0 &&
      validateEventObject('properties', evt) &&
      validateEventObject('metrics', evt) &&
      validateEventObject('data', evt)
    ) {
      // Validate the pageUrl
      if (!evt.properties) {
        evt.properties = {};
      }
      if (!evt.properties.fs_pageUrl) {
        evt.properties.fs_pageUrl = [location.href];
      }
      this.data.events.push(evt);
    } else {
      console.error("ForeSee: Invalid Event. For proper usage, please refer to http://developer.foresee.com/docs-articles/foresee-hosted-code/calling-api-methods/event-logging/");
      return;
    }
    journeyBuffer(this);
  };

  /**
   * A simpler add event function
   * This has no validation
   * @param name
   * @private
   */
  utils.Journey.prototype.addEventString = function (name) {
    this.data.events.push({
      'name': name,
      'timestamp': (new Date()).toISOString(),
      'properties': {
        'fs_pageUrl': [location.href]
      }
    });
    journeyBuffer(this);
  };

  /**
   * Performs a throttled send of event data.
   * @param emergency (Boolean) Do it right away? (Optional)
   */
  var journeyBuffer = function (ctx, emergency) {
    // TODO this is still showing up as empty
    /* pragma:DEBUG_START */
    console.warn("utils: Events to buffer:", ctx.data);
    /* pragma:DEBUG_END */

    if (emergency) {
      ctx._send(true);
    } else {
      if (!ctx._svT) {
        ctx._svT = setTimeout(fs.proxy(function () {
          ctx._send(true);
        }, ctx), ctx.threshold);
      }
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
        if (obj.properties) {
          for (key in obj.properties) {
            if (!fs.isArray(obj.properties[key])) {
              console.error('ForeSee: Invalid properties');
              return false;
            }
          }
        }
        break;
      case "metrics":
        // metrics must be numeric
        if (obj.metrics) {
          for (key in obj.metrics) {
            if (!utils.isNumeric(obj.metrics[key])) {
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