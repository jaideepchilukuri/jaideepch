/**
 * Manages the current session
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, ext, supportsDomStorage } from "../../fs/index";
import { SESSION_SYMBOLS } from "../top";
import {
  Bind,
  FSEvent,
  generateGUID,
  now as currentTime,
  DomStorage,
  SeshStorage,
  WindowStorage,
} from "../../utils/utils";

const SESSION_EXPIRY = 60 * 60 * 1000; // 1 hr

/**
 * Figures out sessions
 * @param {*} stg
 * @param {*} config
 */
class RecordSession {
  constructor(stg, config) {
    // Assign props
    ext(
      this,
      {
        config,
        stg,
        beginTransmitting: new FSEvent(),
        endSessionEvent: new FSEvent(),
        siteId: globalConfig.replayId || "unk",
      },
      false
    );

    // Grab some things from storage
    const results = stg.get([
      SESSION_SYMBOLS.GLOBALSESSIONID,
      SESSION_SYMBOLS.TRANSMITTING,
      SESSION_SYMBOLS.CANCELED,
      "pv",
      SESSION_SYMBOLS.DONOTRECORD,
    ]);

    let globalSessionID = results[SESSION_SYMBOLS.GLOBALSESSIONID];
    let transmitting = results[SESSION_SYMBOLS.TRANSMITTING] || false;
    const now = currentTime();

    if (results[SESSION_SYMBOLS.DONOTRECORD] === true) {
      this.DONOTRECORD = true;
      /* pragma:DEBUG_START */
      console.warn(
        `sr: ${window === window.top ? "" : "[frm] "}detected the DO NOT RECORD flag, stopping`
      );
      /* pragma:DEBUG_END */
      return;
    }

    // Note: new globalSessionIDs start with 'm', if it's old, regenerate it
    if (!globalSessionID) {
      globalSessionID = this._generateSID();
    }

    // Set up the storage type: Session storage if it is supported
    const backup_storage = (this._backup_storage = new DomStorage(this.siteId, false, false));

    // Determine storage amount. If undefined this will be 0 which is still false.
    const storageSize = Math.floor((config.advancedSettings.maxStorageMB || 0) * 1024 * 1024);

    // Set up the storage type: SessionStorage if configured for it, else window.name
    let storage;
    if (config.advancedSettings.useSessionStorage) {
      storage = this._storage = new SeshStorage(this.siteId, false, storageSize);
    } else {
      storage = this._storage = new WindowStorage(this.siteId, storageSize);
    }

    // Restore primary storage if needed
    if (storage.isNew() && !backup_storage.isNew()) {
      storage.set(SESSION_SYMBOLS.SESSION, backup_storage.get(SESSION_SYMBOLS.SESSION));
      storage.setBlob(backup_storage.getBlob());
    } else if (!storage.isNew() && backup_storage.isNew()) {
      // We've gone across domain boundary
      const seshinfo = storage.get(SESSION_SYMBOLS.SESSION);
      if (seshinfo) {
        globalSessionID = seshinfo[SESSION_SYMBOLS.GLOBALSESSIONID];
      }
      storage.setBlob(storage.getBlob());
    }

    // SESSION ID IS "rpid"
    // GLOBAL ID IS "mid"

    let existingSession = storage.get(SESSION_SYMBOLS.SESSION);

    let oldSession = false;
    if (
      globalSessionID[0] !== "m" ||
      (existingSession && existingSession[SESSION_SYMBOLS.SESSIONID][0] !== "m")
    ) {
      /* pragma:DEBUG_START */
      console.warn(
        `sr: ${
          window === window.top ? "" : "[frm] "
        }Resetting session because an old ID was discovered`
      );
      /* pragma:DEBUG_END */

      // New IDs start with 'm'... if we have an old id, cause a reset
      oldSession = true;
    }

    // Figure out our ID's and what-not
    // Kill the session id's if they are expired
    const refreshLastTime = parseInt(stg.get(SESSION_SYMBOLS.GLOBALREFRESHTIME), 10);
    if (!isNaN(refreshLastTime) || oldSession) {
      // Session expiration 1 hour of inactivity
      if (now - refreshLastTime > SESSION_EXPIRY || oldSession) {
        /* pragma:DEBUG_START */
        console.warn(
          `sr: ${
            window === window.top ? "" : "[frm] "
          }this session was last observed more than ${SESSION_EXPIRY}ms ago - resetting id's`
        );
        /* pragma:DEBUG_END */
        // Stale global ID. Make new one
        globalSessionID = this._generateSID();
        existingSession = null;
        transmitting = false;

        // dump previously stored data
        storage.eraseAll();

        stg.erase(SESSION_SYMBOLS.GLOBALSESSIONID);
        if (supportsDomStorage) {
          try {
            // Get rid of the transmit flag
            localStorage.removeItem(SESSION_SYMBOLS.TRANSMITTING);
            localStorage.removeItem(SESSION_SYMBOLS.DONOTRECORD);
          } catch (e) {}
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
      existingSession[SESSION_SYMBOLS.PAGENUM] = 0;
    } else {
      // Read whether we are transmitting or not
      transmitting = existingSession[SESSION_SYMBOLS.TRANSMITTING];
      existingSession[SESSION_SYMBOLS.PAGENUM] =
        (existingSession[SESSION_SYMBOLS.PAGENUM] || 0) + 1;
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
      Bind(window, "beforeunload", () => {
        backup_storage.set(SESSION_SYMBOLS.SESSION, storage.get(SESSION_SYMBOLS.SESSION));
        backup_storage.commit();
      });
    }

    /* pragma:DEBUG_START */
    console.warn(
      `sr: ${window === window.top ? "" : "[frm] "}Session Info - global:`,
      globalSessionID,
      "session:",
      existingSession[SESSION_SYMBOLS.SESSIONID]
    );
    const baseReplayUrl = globalConfig.recUrl.replace(/record/, "replay").replace(/\/rec\//, "");
    const processUrl = `${globalConfig.recUrl}/process/${globalSessionID}`;
    const browserPlaybackUrl = `${baseReplayUrl}/replay/replay?gsession_id=${globalSessionID}&session_id=${
      existingSession[SESSION_SYMBOLS.SESSIONID]
    }`;
    console.log(
      "sr: gid/sid: ",
      `${globalSessionID}/${existingSession[SESSION_SYMBOLS.SESSIONID]}`
    );
    console.log("sr: Process URL: ", processUrl);
    console.log("sr: Browser Playback: ", browserPlaybackUrl);
    /* pragma:DEBUG_END */

    // Monitor isTransmitting
    if (!transmitting) {
      this._stateCheckInterval = setInterval(this._checkTransmittingState.bind(this), 5000);
    } else {
      this.beginTransmitting.fire();
    }
  }

  /**
   * Make an SID
   */
  _generateSID() {
    const sid = generateGUID();
    return `m${sid.substr(1)}`;
  }

  /**
   * See if the transmitting state changes
   */
  _checkTransmittingState() {
    let isTransmitting = false;
    if (supportsDomStorage) {
      try {
        isTransmitting = localStorage.getItem(SESSION_SYMBOLS.TRANSMITTING) == "yes";
      } catch (e) {}
    }
    if (!isTransmitting) {
      isTransmitting = this.isTransmitting();
    }
    if (isTransmitting) {
      clearInterval(this._stateCheckInterval);
      this.beginTransmitting.fire();
    }
  }

  /**
   * Are we transmitting?
   */
  isTransmitting() {
    return !!this.sessionInfo[SESSION_SYMBOLS.TRANSMITTING];
  }

  getPageNum() {
    const existingSession = this._storage.get(SESSION_SYMBOLS.SESSION);
    return (existingSession && existingSession[SESSION_SYMBOLS.PAGENUM]) || 0;
  }

  /**
   * Set the transmitting flag to true
   */
  setTransmitting() {
    if (supportsDomStorage) {
      try {
        localStorage.setItem(SESSION_SYMBOLS.TRANSMITTING, "yes");
      } catch (e) {}
    }
    clearInterval(this._stateCheckInterval);
    this.stg.set(SESSION_SYMBOLS.TRANSMITTING, true);
    this.sessionInfo[SESSION_SYMBOLS.TRANSMITTING] = true;
    this._storage.set(SESSION_SYMBOLS.SESSION, this.sessionInfo);
    this._storage.commit();
    this.beginTransmitting.fire();
  }

  /**
   * Clear any data
   */
  clear() {
    const stg = this.stg;
    clearInterval(this._stateCheckInterval);
    stg.erase(SESSION_SYMBOLS.TRANSMITTING);
    stg.erase(SESSION_SYMBOLS.GLOBALSESSIONID);
    stg.erase(SESSION_SYMBOLS.GLOBALREFRESHTIME);
    if (supportsDomStorage) {
      try {
        localStorage.removeItem(SESSION_SYMBOLS.TRANSMITTING);
        localStorage.removeItem(SESSION_SYMBOLS.DONOTRECORD);
      } catch (e) {}
    }
    this._storage.eraseAll();
    this._backup_storage.eraseAll();

    // this will signal things not to dump state to storage
    this.DONOTRECORD = true;
  }

  /**
   * Permanently stops recording
   */
  endSession() {
    this.clear();

    // Then set the flag to stop recording for an hour
    this.stg.set(SESSION_SYMBOLS.DONOTRECORD, true, SESSION_EXPIRY);

    if (supportsDomStorage) {
      try {
        localStorage.setItem(SESSION_SYMBOLS.DONOTRECORD, "yes");
      } catch (e) {}
    }

    // Signal
    this.endSessionEvent.fire();
  }

  /**
   * Return the GID or gsessionid
   */
  getGlobalId() {
    return this.sessionInfo[SESSION_SYMBOLS.GLOBALSESSIONID];
  }

  /**
   * Return the SID or sessionid
   */
  getSessionId() {
    return this.sessionInfo[SESSION_SYMBOLS.SESSIONID];
  }

  /**
   * Shut down the session for the page
   */
  dispose() {
    clearInterval(this._stateCheckInterval);
  }
}

export { RecordSession };
