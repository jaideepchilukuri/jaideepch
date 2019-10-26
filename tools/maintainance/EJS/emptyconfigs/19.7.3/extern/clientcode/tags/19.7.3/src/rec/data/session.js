/**
 * Manages the current session
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Data.Session");

fs.require("rec.Top");

(function () {

  /**
   * Figures out sessions
   * @param {*} stg
   * @param {*} config
   */
  var RecordSession = function (stg, config) {
    // Assign props
    fs.ext(this, {
      config: config,
      stg: stg,
      beginTransmitting: new utils.FSEvent(),
      endSessionEvent: new utils.FSEvent(),
      siteId: config.clientId || 'unk'
    }, false);

    // Grab some things from storage
    var results = stg.get([SESSION_SYMBOLS.GLOBALSESSIONID, SESSION_SYMBOLS.TRANSMITTING, SESSION_SYMBOLS.CANCELED, 'pv', SESSION_SYMBOLS.DONOTRECORD]),
      globalSessionID = results[SESSION_SYMBOLS.GLOBALSESSIONID],
      transmitting = results[SESSION_SYMBOLS.TRANSMITTING] || false,
      now = utils.now();

    if (results[SESSION_SYMBOLS.DONOTRECORD] === true) {
      this.DONOTRECORD = true;
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "detected the DO NOT RECORD flag, stopping");
      /* pragma:DEBUG_END */
      return;
    }

    // Note: new globalSessionIDs start with 'm', if it's old, regenerate it
    if (!globalSessionID) {
      globalSessionID = this._generateSID();
    }

    // Set up the storage type: Session storage if it is supported
    var backup_storage = this._backup_storage = new utils.DomStorage(this.siteId, false, false);

    // Set up the storage type: SessionStorage if configured for it, else window.name
    var storage;
    if (config.advancedSettings.useSessionStorage) {
      storage = this._storage = new utils.SeshStorage(this.siteId, false);
    } else {
      storage = this._storage = new utils.WindowStorage(this.siteId);
    }

    // Restore primary storage if needed
    if (storage.isNew() && !backup_storage.isNew()) {
      storage.set(SESSION_SYMBOLS.SESSION, backup_storage.get(SESSION_SYMBOLS.SESSION));
      storage.setBlob(backup_storage.getBlob());
    } else if (!storage.isNew() && backup_storage.isNew()) {
      // We've gone across domain boundary
      var seshinfo = storage.get(SESSION_SYMBOLS.SESSION);
      if (seshinfo) {
        globalSessionID = seshinfo[SESSION_SYMBOLS.GLOBALSESSIONID];
      }
      storage.setBlob(storage.getBlob());
    }

    // SESSION ID IS "rpid"
    // GLOBAL ID IS "mid"

    var existingSession = storage.get(SESSION_SYMBOLS.SESSION);

    var oldSession = false;
    if (
      globalSessionID[0] !== 'm' ||
      (existingSession && existingSession[SESSION_SYMBOLS.SESSIONID][0] !== 'm')
    ) {
      /* pragma:DEBUG_START */
      console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "Resetting session because an old ID was discovered");
      /* pragma:DEBUG_END */

      // New IDs start with 'm'... if we have an old id, cause a reset
      oldSession = true;
    }

    // Figure out our ID's and what-not
    // Kill the session id's if they are expired
    var refreshLastTime = parseInt(stg.get(SESSION_SYMBOLS.GLOBALREFRESHTIME));
    if (!isNaN(refreshLastTime) || oldSession) {
      // Session expiration 1 hour of inactivity
      if ((now - refreshLastTime) > (1000 * 60 * 60) || oldSession) {
        /* pragma:DEBUG_START */
        console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "this session was last observed more than " + (1000 * 60 * 60) + "ms ago - resetting id's");
        /* pragma:DEBUG_END */
        // Stale global ID. Make new one
        globalSessionID = this._generateSID();
        existingSession = null;
        transmitting = false;
        storage.erase(SESSION_SYMBOLS.SESSION);
        stg.erase(SESSION_SYMBOLS.GLOBALSESSIONID);
        if (fs.supportsDomStorage) {
          // Get rid of the transmit flag
          localStorage.removeItem(SESSION_SYMBOLS.TRANSMITTING);
          localStorage.removeItem(SESSION_SYMBOLS.DONOTRECORD);
        }
      }
    }

    // Now check for a session
    if (!existingSession) {
      // No session - let's make one
      existingSession = {};
      transmitting = false;
      existingSession[SESSION_SYMBOLS.SESSIONID] = this._generateSID();
      existingSession[SESSION_SYMBOLS.GLOBALSESSIONID] = globalSessionID;
      existingSession[SESSION_SYMBOLS.TRANSMITTING] = transmitting;
    } else {
      // Read whether we are transmitting or not
      transmitting = existingSession[SESSION_SYMBOLS.TRANSMITTING];
    }

    // Commit to memory
    stg.set(SESSION_SYMBOLS.TRANSMITTING, transmitting);
    stg.set(SESSION_SYMBOLS.GLOBALSESSIONID, globalSessionID);
    stg.set(SESSION_SYMBOLS.GLOBALREFRESHTIME, now);
    storage.set(SESSION_SYMBOLS.SESSION, existingSession);
    this.sessionInfo = existingSession;

    // Save it real quick
    storage.commit();

    // Back up the main storage on unload
    if (backup_storage) {
      utils.Bind(window, 'beforeunload', function () {
        backup_storage.set(SESSION_SYMBOLS.SESSION, storage.get(SESSION_SYMBOLS.SESSION));
        backup_storage.commit();
      }.bind(this));
    }

    /* pragma:DEBUG_START */
    console.warn("sr: " + (window === window.top ? '' : '[frm] ') + "Session Info - global:", globalSessionID, "session:", existingSession[SESSION_SYMBOLS.SESSIONID]);
    var baseReplayUrl = fs.config.recUrl.replace(/record/, 'replay').replace(/\/rec\//, ''),
      processUrl = fs.config.recUrl + '/process/' + globalSessionID,
      browserPlaybackUrl = baseReplayUrl + '/replay/replay?gsession_id=' + globalSessionID + '&session_id=' + existingSession[SESSION_SYMBOLS.SESSIONID];
    console.log("sr: gid/sid: ", globalSessionID + "/" + existingSession[SESSION_SYMBOLS.SESSIONID]);
    console.log("sr: Process URL: ", processUrl);
    console.log("sr: Browser Playback: ", browserPlaybackUrl);
    /* pragma:DEBUG_END */


    // Monitor isTransmitting
    if (!transmitting) {
      this._stateCheckInterval = setInterval(this._checkTransmittingState.bind(this), 5000);
    } else {
      this.beginTransmitting.fire();
    }
  };

  /**
   * Make an SID
   */
  RecordSession.prototype._generateSID = function () {
    var sid = utils.generateGUID();
    return 'm' + sid.substr(1);
  };

  /**
   * See if the transmitting state changes
   */
  RecordSession.prototype._checkTransmittingState = function () {
    var isTransmitting = false,
      endSession = false;
    if (fs.supportsDomStorage) {
      isTransmitting = (localStorage.getItem(SESSION_SYMBOLS.TRANSMITTING) == "yes");
      endSession = (localStorage.getItem(SESSION_SYMBOLS.DONOTRECORD) == "yes");
    }
    if (!isTransmitting) {
      isTransmitting = this.isTransmitting();
    }
    if (isTransmitting) {
      clearInterval(this._stateCheckInterval);
      this.beginTransmitting.fire();
    }
  };

  /**
   * Are we transmitting?
   */
  RecordSession.prototype.isTransmitting = function () {
    return !!this.sessionInfo[SESSION_SYMBOLS.TRANSMITTING];
  };

  /**
   * Set the transmitting flag to true
   */
  RecordSession.prototype.setTransmitting = function () {
    if (fs.supportsDomStorage) {
      localStorage.setItem(SESSION_SYMBOLS.TRANSMITTING, "yes");
    }
    clearInterval(this._stateCheckInterval);
    this.stg.set(SESSION_SYMBOLS.TRANSMITTING, true);
    this.sessionInfo[SESSION_SYMBOLS.TRANSMITTING] = true;
    this._storage.set(SESSION_SYMBOLS.SESSION, this.sessionInfo);
    this._storage.commit();
    this.beginTransmitting.fire();
  };

  /**
   * Clear any data
   */
  RecordSession.prototype.clear = function () {
    var stg = this.stg;
    clearInterval(this._stateCheckInterval);
    stg.erase(SESSION_SYMBOLS.TRANSMITTING);
    stg.erase(SESSION_SYMBOLS.GLOBALSESSIONID);
    stg.erase(SESSION_SYMBOLS.GLOBALREFRESHTIME);
    if (fs.supportsDomStorage) {
      localStorage.removeItem(SESSION_SYMBOLS.TRANSMITTING);
      localStorage.removeItem(SESSION_SYMBOLS.DONOTRECORD);
    }
    this._storage.eraseAll();
    this._backup_storage.eraseAll();
  };

  /**
   * Permanently stops recording
   */
  RecordSession.prototype.endSession = function () {
    this.clear();

    // Then set the flag to stop recording for an hour
    this.stg.set(SESSION_SYMBOLS.DONOTRECORD, true, 1000 * 60 * 60);
    this.DONOTRECORD = true;

    if (fs.supportsDomStorage) {
      localStorage.setItem(SESSION_SYMBOLS.DONOTRECORD, "yes");
    }

    // Signal
    this.endSessionEvent.fire();
  };

  /**
   * Return the GID or gsessionid
   */
  RecordSession.prototype.getGlobalId = function () {
    return this.sessionInfo[SESSION_SYMBOLS.GLOBALSESSIONID];
  };

  /**
   * Return the SID or sessionid
   */
  RecordSession.prototype.getSessionId = function () {
    return this.sessionInfo[SESSION_SYMBOLS.SESSIONID];
  };

  /**
   * Shut down the session for the page
   */
  RecordSession.prototype.dispose = function () {
    clearInterval(this._stateCheckInterval);
  };

})();