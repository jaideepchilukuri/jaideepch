/**
 * Manages the logging for the recorder
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Data.Log");

fs.require("rec.Top");
fs.require("rec.Misc.Symbols");

(function () {

  /**
   * Keeps a cache of the xPaths we've used
   * @private
   */
  var _xPathList = [];

  /**
   * @class A class to manage the log for a particular page.
   * @param stg {GlobalStorage}
   * @param browser {Browser}
   * @param recorder {Recorder} The recorder.
   * @constructor
   */
  var Logger = function (stg, browser, recorder, config) {
    // The config
    this.config = config;

    // Record the session information
    this.recorder = recorder;

    // Keep a record of the browser
    this.browser = browser;

    // The cors object
    this.cors = new utils.AjaxTransport();

    // Keep a local copy of the isIframeMode flag for convenience
    this.isIframeMode = recorder.isIframeMode;

    // Grab some things from storage
    var results = stg.get([SESSION_SYMBOLS.GLOBALSESSIONID, SESSION_SYMBOLS.TRANSMITTING, SESSION_SYMBOLS.CANCELED, 'pv']),
      globalSessionID = results[SESSION_SYMBOLS.GLOBALSESSIONID],
      transmitting = results[SESSION_SYMBOLS.TRANSMITTING],
      canceled = results[SESSION_SYMBOLS.CANCELED],
      screenResolution = utils.getScreenResolution();

    // The storage instance
    this.stg = stg;

    // Keep a record of the number of page views we have so far
    this.pageViews = stg.get('pv');

    // Keeps track of failed transmissions
    this.failCount = 0;

    // id for transport sent
    this.transportid = 0;

    // Keeps track of the last transmission time
    this.lastTransmissionTime = 0;

    // Track if we should halt transmits temporarily.
    this.holdTransmits = false;

    // Track if we are transmitting
    this.transmitting = false;

    // Track if logging has been canceled
    this.canceled = false;

    // Id used to distinguish stores for different record implementations on different sites
    this.siteid = config.clientId || 'unk';

    // Root domain we are recording in
    this.domain = document.domain.toString();

    // Create an event for when our storage methods are available
    this.StorageReady = new utils.FSEvent();

    // Fires when transport class is available
    this.TransportReady = new utils.FSEvent();

    // Create a quick-access xpath cache
    this._quickXpathCache = {};

    // Session storage variables
    this._session = {};

    // Setup everything from scratch
    this._reset();

    // Don't worry about storage or sessions if this is a cross-origin iFrame
    if (!this.isIframeMode) {
      // Put in a page marker
      this.log(recorder, Logger.EVENT_TYPES.PAGE_MARKER, {
        'dtm': fs.startTS,
        'ofs': (new Date()).getTimezoneOffset(),
        'v': browser.browser.name,
        'dv': browser.browser.version,
        'sid': config.clientId,
        'r': 'W3C',
        'l': config.layout,
        'm': browser.isMobile,
        'f': document.referrer.toString(),
        'sz': { "w": screenResolution.w, "h": screenResolution.h }
      }, -1);

      // Call an emergency send on unload
      // Note, this needs to go BEFORE the storage initializers
      utils.Bind(window, 'unload', function () {
        this.commitData();
      }.bind(this));

      // Set up the storage type: Session storage if it is supported
      this._backup_storage = new utils.DomStorage(this.siteid, false, false, browser);

      // Set up the storage type: window name if it is supported
      this._storage = new utils.WindowStorage(this.siteid, false, browser);

      // Sync up primary and backups storage
      this._syncStorage();

      // Sync up recording state
      this._syncSession(globalSessionID, !!transmitting, !!canceled);

      // Sync up recording data
      this._syncData();

      // Start heartbeat which keeps session open
      this.startStateMonitor();

      // Start heartbeat which keeps session open
      this.startStorageMonitor();

      // Bind to the storage ready
      this.TransportReady.subscribe(function () {
        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "transport ready");
        /* pragma:DEBUG_END */

        // For now this means storageready is ready too
        this.StorageReady.fire();

        // Start the transmit heartbeat
        if (this.transmitting) {
          this.startHeartbeat();
        }

        // Trigger a send (should it be emergency) when page loads
        this._flushAndTransmit();
      }.bind(this), true, true);

      /*
       * Create a transport instance
       */
      this.TransportReady.fire();

      // When the recorder is ready, do this
      this.recorder.ready.subscribe(function () {
        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "recorder is ready");
        /* pragma:DEBUG_END */
        /*
         * When an emergency save is requested, also attempt a transmit.
         */
        this.recorder.EmergencySendRequired.subscribe(function () {
          // Dump the log to storage and try to transmit if possible
          this._flushAndTransmit(true);
        }.bind(this));

      }.bind(this), true, true);
    } else {
      // This is a cross-origin iFrame. Signal ready now.
      this.TransportReady.fire();

      // Signal that we are transmitting so that the data gets sent up to the parent frame
      this.transmitting = true;

      // Signal storage ready
      this.StorageReady.fire();

      // Regularly commit the data
      this.iFrameCommitItv = setInterval(this._flushAndTransmit.bind(this), 1000);
    }

    // Free up some stuff
    recorder = null;
  };

  /**
   * Commit storage. Should be called on onbeforeunload
   */
  Logger.prototype.commitData = function () {
    this._flush();

    // Dump the log to storage and try to transmit if possible
    if (this.transmitting) {
      this._transmit();
    }

    if (this._storage) {
      this._storage.set(SESSION_SYMBOLS.SESSION, this._session);
      this._storage.setBlob(this._data);
      this._storage.commit();
    }

    if (this._backup_storage) {
      this._backup_storage.set(SESSION_SYMBOLS.SESSION, this._session);
      this._backup_storage.setBlob(this._data);
      this._backup_storage.commit();
    }
  };

  /**
   * Cleanup before unloading logger
   */
  Logger.prototype.dispose = function () {
    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "logger dispose");
    /* pragma:DEBUG_END */

    // Empty out the xpath list
    _xPathList = [];

    this._flush();

    // If the transportClass has a dispose method, call it
    this.cors.dispose();

    // Get rid of the periodic iFrame commit interval if applicable
    if (this.iFrameCommitItv) {
      clearInterval(this.iFrameCommitItv);
    }

    // Unsubscribe it all
    this.recorder.EmergencySendRequired.unsubscribeAll();
    this.recorder.EmergencySendRequired = null;

    // Stop the monitors
    this.stopStorageMonitor();
    this.stopStateMonitor();
  };

  /**
   * Put the logger in transmit mode
   */
  Logger.prototype.setTransmitOK = function () {
    /* pragma:DEBUG_START */
    console.log('sr: ' + (window === window.top ? '' : '[frm] ') + 'setTransmitOK()');
    /* pragma:DEBUG_END */

    if (!this.canceled) {
      this.transmitting = true;
      this._session[SESSION_SYMBOLS.TRANSMITTING] = true;
      this.stg.set(SESSION_SYMBOLS.TRANSMITTING, true);

      // Dump the log to storage and try to transmit if possible
      this._flushAndTransmit();
      this.startHeartbeat();
    } else {
      /* pragma:DEBUG_START */
      console.warn('sr: ' + (window === window.top ? '' : '[frm] ') + 'not transmitting because cancel already set');
      /* pragma:DEBUG_END */
    }
  };

  /**
   * Put the logger in cache mode
   */
  Logger.prototype.setTransmitNotOK = function () {
    /* pragma:DEBUG_START */
    console.log('sr: setTransmitNotOK()');
    /* pragma:DEBUG_END */

    // Clear the emergency transmit heart beat
    this.stopHeartbeat();

    this.transmitting = false;
    this._session[SESSION_SYMBOLS.TRANSMITTING] = false;
    this.stg.set(SESSION_SYMBOLS.TRANSMITTING, false);
  };

  /**
   * Stop logging permanently
   */
  Logger.prototype.cancelRecord = function (permanent) {
    /* pragma:DEBUG_START */
    console.log('sr: cancelRecord()');
    /* pragma:DEBUG_END */

    this.setTransmitNotOK();
    this.stopStateMonitor();
    this.stopStorageMonitor();

    this.canceled = true;

    this._session[SESSION_SYMBOLS.CANCELED] = true;

    this.stg.set(SESSION_SYMBOLS.CANCELED, true);

    if (permanent) {
      this.stg.set(_SESSION_SYMBOLS.CANCELEDPERMANENT, this.cancel);
    }

    if (this.iFrameCommitItv) {
      clearInterval(this.iFrameCommitItv);
    }

    this._reset();
  };

  /**
   * Fixes corrupt storage problems due to things like PDF viewing, etc.
   * Will only run if both storage and backup_storage are supported
   * @private
   */
  Logger.prototype._syncStorage = function () {
    var storage = this._storage,
      backup_storage = this._backup_storage,
      session,
      data;

    if (storage && backup_storage && storage.isNew() && !backup_storage.isNew()) {
      session = backup_storage.get(SESSION_SYMBOLS.SESSION);
      storage.set(SESSION_SYMBOLS.SESSION, session);
      data = backup_storage.getBlob();
      storage.setBlob(data);
    }
  };

  /**
   * Synchronize the session.
   * @private
   */
  Logger.prototype._syncSession = function (gsessionid, transmitting, canceled) {
    // Use window.name as storage but fall back to session storage if window.name is not supported and session storage is
    var winStorage = this._storage,
      seshStorage = this._backup_storage;

    if (!winStorage) {
      return;
    }

    // Kill the session id's if they are expired
    this.refreshLastTime = this.stg.get(SESSION_SYMBOLS.GLOBALREFRESHTIME);
    if (this.refreshLastTime) {
      this.refreshLastTime = parseInt(this.refreshLastTime);
      // Session expiration 1 hour of inactivity
      var expireDuration = 1000 * 60 * 60;
      if (utils.now() - this.refreshLastTime > expireDuration) {
        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "this session was last observed more than " + expireDuration + "ms ago - resetting id's");
        /* pragma:DEBUG_END */
        // Stale global ID. Make new ones
        gsessionid = null;
        winStorage.erase(SESSION_SYMBOLS.SESSION);
        this.stg.erase(SESSION_SYMBOLS.GLOBALSESSIONID);
      } else {
        /* pragma:DEBUG_START */
        console.log("sr: " + (window === window.top ? '' : '[frm] ') + "we have a valid non-expired global session id: ", (utils.now() - this.refreshLastTime), "ms old", "- it needs to be a minimum of ", expireDuration);
        /* pragma:DEBUG_END */
      }
    } else {
      /* pragma:DEBUG_START */
      console.log("sr: " + (window === window.top ? '' : '[frm] ') + "no refresh time marker was found");
      /* pragma:DEBUG_END */
    }

    // Now check for a session
    if (!winStorage.get(SESSION_SYMBOLS.SESSION)) {
      this._session = {};
      this.sessionid = utils.generateGUID();
      this._session[SESSION_SYMBOLS.SESSIONID] = this.sessionid;

      if (!gsessionid) {
        gsessionid = utils.generateGUID();
      }

      this.gsessionid = gsessionid;

      this._session[SESSION_SYMBOLS.GLOBALSESSIONID] = this.gsessionid;

      this.transmitting = transmitting;
      this._session[SESSION_SYMBOLS.TRANSMITTING] = this.transmitting;
      this.stg.set(SESSION_SYMBOLS.TRANSMITTING, this.transmitting);

      this.canceled = canceled;
      this._session[SESSION_SYMBOLS.CANCELED] = this.canceled;
      this.stg.set(SESSION_SYMBOLS.CANCELED, this.canceled);
      this.stg.set(SESSION_SYMBOLS.GLOBALSESSIONID, gsessionid);

      // Mobile Safari unload binding can be skipped. This call will make sure the SessionID is set and is carried over into the next page in window.name
      winStorage.set(SESSION_SYMBOLS.SESSION, this._session);

      // Save it real quick
      winStorage.commit();
    } else {
      // Get or create the storage array
      this._session = winStorage.get(SESSION_SYMBOLS.SESSION);

      this.sessionid = this._session[SESSION_SYMBOLS.SESSIONID];
      this.gsessionid = this._session[SESSION_SYMBOLS.GLOBALSESSIONID];

      winStorage.set(SESSION_SYMBOLS.SESSIONID, this.sessionid);

      if (!fs.isDefined(transmitting)) {
        this.transmitting = this._session[SESSION_SYMBOLS.TRANSMITTING];
        this.stg.set(SESSION_SYMBOLS.TRANSMITTING, this.transmitting);
      }
      else {
        this.transmitting = transmitting;
        this._session[SESSION_SYMBOLS.TRANSMITTING] = this.transmitting;
      }

      if (!fs.isDefined(canceled)) {
        this.canceled = this._session[SESSION_SYMBOLS.CANCELED];
        this.stg.set(SESSION_SYMBOLS.CANCELED, this.canceled);
      } else {
        this.canceled = canceled;
        this._session[SESSION_SYMBOLS.CANCELED] = this.canceled;
      }
      winStorage.set(SESSION_SYMBOLS.SESSION, this._session);
    }

    this.refreshLastTime = utils.now();
    this._session[SESSION_SYMBOLS.GLOBALREFRESHTIME] = this.refreshLastTime;
    this.stg.set(SESSION_SYMBOLS.GLOBALREFRESHTIME, this.refreshLastTime);

    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "Session Info - global:", this.gsessionid, "session:", this.sessionid);
    var baseReplayUrl = fs.config.recUrl.replace(/rec\.replay/, 'replay.replay').replace(/\/rec\//, ''),
      processUrl = baseReplayUrl + '/process/' + this.gsessionid,
      browserPlaybackUrl = baseReplayUrl + '/replay/replay?session_id=' + this.sessionid + '&gsession_id=' + this.gsessionid + '&page_number=0';
    console.log("sr: Process URL: ", processUrl, "\n\tBrowser Playback: ", browserPlaybackUrl);
    /* pragma:DEBUG_END */
  };

  /**
   * Fixes corrupt storage problems due to things like PDF viewing, etc.
   * @private
   */
  Logger.prototype._syncData = function () {
    // Prefer setting this._data from window.name but use session storage if window.name is not supported.
    if (this._storage) {
      this._data = this._storage.getBlob();
    } else if (this._backup_storage) {
      this._data = this._backup_storage.getBlob();
    }
  };

  /**
   * Clear the log and send it to storage
   * @private
   */
  Logger.prototype._flushAndTransmit = function (isEmergency) {
    // If no storage method is available or transmission is cancelled, return
    if (((!this._storage && !this._backup_storage) || this.canceled) && !this.isIframeMode) {
      return;
    }

    var storageLimit = this.testStorageLimit();

    // If we are transmitting, attempt a transmit
    // Conditions are that transmitting has happened, a transport class is defined, we are not waiting for a large transmit, and (the interval between transmissions has passed or we have flag this transmission as critical.)
    if ((this.transmitting && (utils.now() - this.lastTransmissionTime > 5000 || isEmergency)) || storageLimit || this.isIframeMode) {
      // Clear the _data block and set things up from scratch
      this._flush();
      this._transmit();
    }

    // If this is a mobile device, and the log was flagged as important/emergency and we currently are not transmitting
    // backup the current data into window.name because the unload callback may not run.
    else if (isEmergency && this.browser.isMobile) {
      this.commitData();
    }
  };

  /**
   * Make the server request to start processing
   * @param delay {Number} How many MS to delay the start of processing
   */
  Logger.prototype.processImmediately = function (delay) {
    // Perform the send
    this.cors.send({
      method: 'GET',
      url: utils.sign(fs.config.recUrl + 'process/' + fs.enc(this.gsessionid) + '?delay=' + (delay || 0)),
      failure: function (result) {
        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "Session processing request failed for global", this.gsessionid, "Note: this doesn't necessarily mean there is a problem. The processing may already have been started.");
        /* pragma:DEBUG_END */
      }.bind(this),
      success: function (result) {
        /* pragma:DEBUG_START */
        console.log("sr: " + (window === window.top ? '' : '[frm] ') + "Session processing started for global", this.gsessionid);
        /* pragma:DEBUG_END */
      }.bind(this)
    });
  };

  /**
   * Send data to server
   * @private
   */
  Logger.prototype._transmit = function () {
    if (this._data.length === 0 && !this.isIframeMode) {
      /* pragma:DEBUG_START */
      console.warn('sr: ' + (window === window.top ? '' : '[frm] ') + 'not transmitting because there\'s no data or we\'re running in iFrame mode');
      /* pragma:DEBUG_END */
      return;
    }

    // Is this an x-domain iFrame?
    if (this.isIframeMode) {
      /* pragma:DEBUG_START */
      console.warn('sr: ' + (window === window.top ? '' : '[frm] ') + 'we\'re in an iFrame so looking at sending data to parent frame');
      /* pragma:DEBUG_END */
      if (this._data.length > 0) {
        // This is an cross-domain iFrame - send via postmessage
        XDomainFrame.SendDataToParentFrame(this.recorder.iFrameParentFr, this.recorder.ifrid, this._data);
        // Blank out the data
        this._data = "";
      }
      return;
    }

    if (this.holdTransmits && (utils.now() - this.lastTransmissionTime) < 10000) {
      /* pragma:DEBUG_START */
      console.warn('sr: ' + (window === window.top ? '' : '[frm] ') + 'in the middle of transmitting and the last transmit attempt was less than 10 seconds ago');
      /* pragma:DEBUG_END */
      this.hasEmergency = true;
      return;
    }

    this.holdTransmits = true;
    this.hasEmergency = false;

    // Set the last transmission time
    this.lastTransmissionTime = utils.now();

    // Get the service name as a string
    var serviceName = "corsservice",
      siteid = fs.toLowerCase(this.siteid.replace(/[- _.&]/g, "")),
      // Compress the payload only if it's over 1000 bytes
      payload = "{\"data\":[" + this._data + "]}",
      metaStr,
      plen = payload.length;

    Meta.set('rtp', serviceName.substr(0, 1));

    if (!this.config.advancedSettings.skipCompression && plen > 1000 && plen < 1000000) {
      payload = utils.Compress.fragmentAndCompress(payload);
    }

    /* pragma:DEBUG_START */
    console.log('sr: ' + (window === window.top ? '' : '[frm] ') + 'transmitting ', (payload.length >= this._data.length) ? 'CORS uncompressed' : 'CORS compressed size: ' + Math.round((payload.length / (this._data.length + 10)) * 100) + '%');
    /* pragma:DEBUG_END */

    // Set the meta-data string
    metaStr = "datalen:" + payload.length + ",time:" + utils.now();

    // Increment the transmission attempt count in the meta data
    Meta.increment('rta');

    // Perform the send
    this.cors.send({
      action: "data",
      method: "POST",
      contentType: "text/plain;charset=UTF-8",
      encoding: fs.enc(Dom.getEncoding()),
      version: 5.0,
      gSessionId: this.gsessionid,
      sessionId: this.sessionid,
      domain: this.domain || window.location.hostname,
      siteId: siteid,
      url: fs.config.recUrl + serviceName + "?action=data" + "&metadata=" + fs.enc(metaStr) + "&encoding=" + fs.enc(Dom.getEncoding()) + "&session_id=" + fs.enc(this.sessionid) + "&global_session_id=" + fs.enc(this.gsessionid) + "&domain=" + fs.enc(this.domain) + "&site_id=" + fs.enc(siteid) + "&version=5.0&cachebust=" + (Math.random()),
      skipEncode: true,
      data: payload,
      failure: function (result) {

        // Log the transmit fail event
        Singletons.jrny.addEventString(RECLOGGING.RECORDER_TRANSMIT_FAILED);

        /* pragma:DEBUG_START */
        console.error("sr: " + (window === window.top ? '' : '[frm] ') + "transport failed!");
        /* pragma:DEBUG_END */

        Meta.increment('rtf');

        // Reset failed count
        this.failCount++;

        // Transmit did return, so allow more transmits.
        this.holdTransmits = false;

        // Attempt to extract the JSON from the result
        try {
          result = JSON.parse(result);
        } catch (e) {
        }

        if (fs.isDefined(result.status)) {
          var scode = Math.abs(parseInt(result.status));
          Meta.increment('rtf' + scode);
        }

        if (this.failCount > 10) {
          Meta.set('rtcr', 1);
          Meta.set('rtcp', this.pageViews);

          this.cancelRecord();
          return;
        }

        if (this.hasEmergency)
          setTimeout(function () {
            this._flushAndTransmit(true);
          }.bind(this), 100);

      }.bind(this),
      // Handles successful response
      success: function (ctx, id, odata) {
        return function (result) {
          Meta.increment('rts');

          // Reset failed count
          ctx.failCount = 0;

          // Transmit did indeed complete, allow more transmits.
          ctx.holdTransmits = false;

          // Attempt to extract the JSON from the result
          try {
            result = JSON.parse(result);
          } catch (e) {
          }

          // Check for success
          if (fs.isDefined(result.status)) {
            var scode = parseInt(result.status, 10);
            if (scode == 1) {
              if (id == ctx.transportid) {
                ctx._data = "";
              } else if (ctx._data.substr(0, odata.length) == odata) {
                ctx._data = ctx._data.substr(odata.length);
              }
            } else if (scode == 2) {
              Meta.set('rtcr', 2);
              Meta.set('rtcp', ctx.pageViews);

              ctx.cancelRecord();
              return;
            }

            if (ctx.hasEmergency) {
              setTimeout(function () {
                ctx._flushAndTransmit(true);
              }, 100);
            }
          }
        };
      }(this, this.transportid, this._data + '')
    });
  };

  /**
   * Ping server that session is still alive
   * @private
   */
  Logger.prototype._ping = function () {
    if (!fs.isDefined(this.transport) || this.canceled) {
      return;
    }

    var siteid = fs.toLowerCase(this.siteid.replace(/[- _.&]/g, ""));

    // Send it
    if (!this.transport) {
      this.transport = new this.transport();
    }

    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "ping");
    /* pragma:DEBUG_END */

    // Send the ping
    this.cors.send({
      action: "ping",
      contentType: "text/plain;charset=UTF-8",
      sessionId: this.sessionid,
      siteId: siteid,
      url: fs.config.recUrl + "corsservice?action=ping" + "&session_id=" + fs.enc(this.sessionid) + "&site_id=" + fs.enc(siteid) + "&cachebust=" + (Math.random()),
      skipEncode: true, data: '', failure: function () {
      }, success: function () {
        // nothing
      }
    });
  };

  /**
   * Resets the log. This is called when data is moved into a transport buffer or at the beginning of a session.
   * @private
   */
  Logger.prototype._reset = function () {
    // Holds all the data
    this._log = {
      'start': !!this._log ? utils.now() : fs.startTS,
      'log': [],
      'guid': utils.generateGUID()
    };
    this._log_size_est = 0;
  };

  /**
   * Resets the log. This is called when data is moved into a transport buffer or at the beginning of a session.
   * @private
   */
  Logger.prototype._flush = function () {
    if (this._log.log.length === 0) {
      return;
    }

    // increment the transport count
    this.transportid++;

    // null out existing toJSON methods on .log Array, DELIVERYSUPPORT-77234
    this._log.log.toJSON = null;

    // Convert the log to data
    var data = JSON.stringify(this._log);

    if (data && data.length > 0) {
      if (this._data && this._data.length > 0) {
        this._data = this._data + "," + data;
      } else {
        this._data = data;
      }
    }

    this._reset();
  };

  /**
   * Log an xpath entry. Returns the index.
   * @param xpath {Array} The xpath.
   */
  Logger.prototype.logXPath = function (context, xpath) {
    // Don't do anything if cancelled
    if (this.canceled) {
      return;
    }

    // Convert to a string
    xpath = xpath.join(",");

    // Is it not in the cache already?
    if (!fs.isDefined(this._quickXpathCache[xpath])) {
      // It doesn't exist in the cache, so add it
      _xPathList[_xPathList.length] = xpath;
      var res = this.recorder.iFramexPathPrefix + (_xPathList.length - 1);

      // Add it to the cache
      this._quickXpathCache[xpath] = res;

      // Log it with the xpath override
      this.log(context, Logger.EVENT_TYPES.XPATH_CACHE, { "idx": res, "xp": xpath }, res);
    }

    // Output the result code
    return this._quickXpathCache[xpath];
  };

  /**
   * Make a log entry.
   * @param context {Recorder} The recorder context.
   * @param evt {Logger.EVENT_TYPES} The event type from the enum SessionRecord.Log.EventTypes.
   * @param data {Object} The event data as a POJO.
   * @param xPathOverride {String} Optional The xPath string to the context.
   * @public
   */
  Logger.prototype.log = function (context, evt, data, xPathOverride, tzofs) {
    // Don't log anymore if it's been canceled
    if (this.canceled) {
      return;
    }

    var log_size_est = 0;
    if (!tzofs) {
      tzofs = 0;
    }

    // Set up the event instance
    var eventObj = {
      "x": (!fs.isDefined(xPathOverride) ? this.logXPath(context, context.getPath()) : xPathOverride),
      "e": evt,
      "d": data,
      "t": Math.max(0, (utils.now() - this._log.start - tzofs))
    };

    // Append it to the log
    this._log.log[this._log.log.length] = eventObj;
    if (evt == Logger.EVENT_TYPES.DOM_SERIALIZE) {
      if (data.dom.str) {
        log_size_est = data.dom.str.length;
        this._log_size_est += log_size_est;
      }
    }
    else if (evt == Logger.EVENT_TYPES.CSS_SERIALIZE) {
      if (data.stylesheet) {
        log_size_est = data.stylesheet.length;
        this._log_size_est += log_size_est;
      } else if (data.v) {
        log_size_est = Math.round(1.00 * data.v.length);
        this._log_size_est += log_size_est;
      }
    }
    else if (evt == Logger.EVENT_TYPES.DOM_MUTATION_NODE_MODIFIED) {
      if (data.h.str || data.h.diff) {
        log_size_est = Math.round(1.00 * ((data.h.str ? data.h.str.length : 0) + (data.h.diff ? data.h.diff.d.r.length : 0) + (data.h.kl ? data.h.kl.length : 0) + (data.h.uid ? data.h.uid.length : 0)));
        log_size_est += 50;
        this._log_size_est += log_size_est;
      } else {
        log_size_est = 84;
        this._log_size_est += log_size_est;
      }
    }
    else {
      log_size_est = 60;
      this._log_size_est += log_size_est;
    }
  };

  /**
   * Are we at the storage limit?
   */
  Logger.prototype.testStorageLimit = function () {
    if (!this.isIframeMode && (this._data.length + this._log_size_est) > 3000000) {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "over the storage limit: ", this._data.length + this._log_size_est, "vs", 3000000);
      /* pragma:DEBUG_END */
      return true;
    }

    return false;
  };

  /**
   * Monitor for changes to transmit and canceled states.
   */
  Logger.prototype._monitorState = function () {
    var results = this.stg.get([SESSION_SYMBOLS.CANCELED, SESSION_SYMBOLS.TRANSMITTING]),
      canceled = results[SESSION_SYMBOLS.CANCELED],
      transmitting = results[SESSION_SYMBOLS.TRANSMITTING];

    if (fs.isDefined(canceled)) {
      if (this.canceled != canceled) {
        if (canceled) {
          /* pragma:DEBUG_START */
          console.log("sr: " + (window === window.top ? '' : '[frm] ') + "_monitorState says we have cancelled recording");
          /* pragma:DEBUG_END */
          this.cancelRecord();
          return;
        }
      }
    }

    if (fs.isDefined(transmitting)) {
      if (this.transmitting != transmitting) {
        if (transmitting) {
          this.setTransmitOK();
        } else {
          this.setTransmitNotOK();
        }
      }
    }
  };

  /**
   * Start heartbeat which keeps session open.
   */
  Logger.prototype.startHeartbeat = function () {
    if (!this.heartbeatTransmit) {
      this._ping();
      this.heartbeatTransmit = setInterval(function () {
        this._ping();
      }.bind(this), 45000);
    }
  };

  /**
   * Stop heartbeat which keeps session open.
   */
  Logger.prototype.stopHeartbeat = function () {
    if (this.heartbeatTransmit) {
      clearInterval(this.heartbeatTransmit);
      delete this.heartbeatTransmit;
    }
  };

  /**
   * Start heartbeat which keeps session open.
   */
  Logger.prototype.startStateMonitor = function () {
    if (!this.stateMonitor) {
      this._monitorState();
      this.stateMonitor = setInterval(function () {
        this._monitorState();
      }.bind(this), 2000);
    }
  };

  /**
   * Start heartbeat which keeps session open.
   */
  Logger.prototype.stopStateMonitor = function () {
    if (this.stateMonitor) {
      clearInterval(this.stateMonitor);
      delete this.stateMonitor;
    }
  };

  /**
   * Start heartbeat which keeps session open.
   */
  Logger.prototype.startStorageMonitor = function () {
    if (!this.storageMonitor) {
      this.storageMonitor = setInterval(function () {
        this.log(this.recorder, Logger.EVENT_TYPES.HEARTBEAT, {
          'ofs': (new Date()).getTimezoneOffset()
        }, -1);
        this._flushAndTransmit();
      }.bind(this), (this.browser.isMobile) ? 10000 : 20000);
    }
  };

  /**
   * Start heartbeat which keeps session open.
   */
  Logger.prototype.stopStorageMonitor = function () {
    if (this.storageMonitor) {
      clearInterval(this.storageMonitor);
      delete this.storageMonitor;
    }
  };

  /**
   * Clear logger instance of storage
   */
  Logger.prototype.clearState = function () {
    this._session = false;
    this._storage.kill();
    this._backup_storage.kill();
    this.commitData();
  };

  /**
   * Holds all the event types for use in logging
   */
  Logger.EVENT_TYPES = {
    /**
     * @constant A DOM was processed and inserted into the event stream
     * @memberOf Logger.EVENT_TYPES
     */

    DOM_SERIALIZE: 0,

    /**
     * @constant XPATH String was cached and assigned a number
     * @memberOf Logger.EVENT_TYPES
     */
    XPATH_CACHE: 1,

    /**
     * @constant A window size was stored
     * @memberOf Logger.EVENT_TYPES
     */
    FRAME_SIZE: 2,

    /**
     * @constant A window was scrolled
     * @memberOf Logger.EVENT_TYPES
     */
    FRAME_SCROLL: 3,

    /**
     * @constant The mouse moved
     * @memberOf Logger.EVENT_TYPES
     */
    MOUSE_MOVE: 4,

    /**
     * @constant The user moused out or into a window
     * @memberOf Logger.EVENT_TYPES
     */
    WINDOW_MOUSEOUT_MOUSEENTER: 5,

    /**
     * @constant An input element was serialized
     * @memberOf Logger.EVENT_TYPES
     */
    INPUT_SERIALIZE: 6,

    /**
     * @constant An input received or lost focus
     * @memberOf Logger.EVENT_TYPES
     */
    FOCUS_BLUR: 7,

    /**
     * @constant A key was typed into a text input
     * @memberOf Logger.EVENT_TYPES
     */
    KEY_PRESS: 8,

    /**
     * @constant The cursor position and selection was changed in a text box
     * @memberOf Logger.EVENT_TYPES
     */
    CARET_INFO: 9,

    /**
     * @constant A select box value changed
     * @memberOf Logger.EVENT_TYPES
     */
    VALUE_CHANGED: 10,

    /**
     * @constant The contents of a DOM node was changed
     * @memberOf Logger.EVENT_TYPES
     */
    DOM_MUTATION_NODE_MODIFIED: 11,

    /**
     * @constant A DOM node's attribute was changed
     * @memberOf Logger.EVENT_TYPES
     */
    DOM_MUTATION_NODE_ATTR_MODIFIED: 12,

    /**
     * @constant A JavaScript error occurred
     * @memberOf Logger.EVENT_TYPES
     */
    JAVASCRIPT_ERROR: 13,

    /**
     * @constant A mouse click occurred
     * @memberOf Logger.EVENT_TYPES
     */
    MOUSE_CLICK: 14,

    /**
     * @constant A mouse down occurred
     * @memberOf Logger.EVENT_TYPES
     */
    MOUSE_DOWN: 15,

    /**
     * @constant A mouse up event occurred
     * @memberOf Logger.EVENT_TYPES
     */
    MOUSE_UP: 16,

    /**
     * @constant A new page was encountered
     * @memberOf Logger.EVENT_TYPES
     */
    PAGE_MARKER: 17,

    /**
     * @constant The document size was measured
     * @memberOf Logger.EVENT_TYPES
     */
    DOC_SIZE: 18,

    /**
     * @constant An element was scrolled
     * @memberOf Logger.EVENT_TYPES
     */
    SCROLL_EL: 19,

    /**
     * @constant A page was not recorded
     * @memberOf Logger.EVENT_TYPES
     */
    NOT_RECORDED: 20,

    /**
     * @constant Serialize stylesheet contents
     * @memberOf Logger.EVENT_TYPES
     */
    CSS_SERIALIZE: 21,

    /**
     * @constant The exact orientation of the device
     * @memberOf Logger.EVENT_TYPES
     */
    ORIENTATION: 22,

    /**
     * @constant The device zooming
     * @memberOf Logger.EVENT_TYPES
     */
    ZOOM: 23,

    /**
     * @constant A touch was detected or ended
     * @memberOf Logger.EVENT_TYPES
     */
    TOUCH: 24,

    /**
     * @constant Call to 'updateNodeBindings' was aborted due to poor performance. May miss some input captures
     * @memberOf Logger.EVENT_TYPES
     */
    INCOMPLETE_INPUT_CAPTURE: 25,

    /**
     * @constant An Orientation Change was detected
     * @memberOf Logger.EVENT_TYPES
     */
    ORIENTATION_CHANGE: 26,

    /**
     * @constant A custom behavior event was trigger by a client
     * @memberOf Logger.EVENT_TYPES
     */
    CUSTOM_BEHAVIOR: 27,

    /**
     * @constant A custom error event was trigger by a client
     * @memberOf Logger.EVENT_TYPES
     */
    CUSTOM_ERROR: 28,

    /**
     * @constant A no-op event that serves as a signpost. Should be skipped during replay.
     * @memberOf Logger.EVENT_TYPES
     */
    HEARTBEAT: 29
  };

})();