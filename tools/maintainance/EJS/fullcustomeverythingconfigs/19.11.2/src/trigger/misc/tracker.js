/**
 * Manages a tracker window.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import {
  assetLocation,
  codeLocation,
  globalConfig,
  enc as fsEnc,
  ext,
  isSelfHosted,
  makeURI,
  tagVersion,
} from "../../fs/index";
import {
  Bind,
  now as currentTime,
  getRootDomain,
  storageTypes,
  getGeneralStorage,
} from "../../utils/utils";
import { Singletons, _W } from "../top";
import { popup } from "./popup";
import { Survey } from "./survey";

/**
 * Creates a new tracker window
 * @param template
 * @param def
 * @param cfg
 * @param stg
 * @param framecontroller
 * @param events
 * @param cpps
 * @param display
 * @constructor
 */
class Tracker {
  constructor(template, def, cfg, stg, cpps, display, browser) {
    /**
     * Force only one instance at a time
     */
    if (Singletons.tracker) {
      Singletons.tracker.dispose();
      Singletons.tracker = null;
    }

    Singletons.tracker = this;

    ext(
      this,
      {
        template,
        def,
        cfg,
        disp: display,
        _fcBindings: [],
      },
      false
    );

    // Set up the tracker and some other stuff
    this.cpps = cpps;
    this.br = browser;
    this.stg = stg;

    // page heartbeat interval value
    let loadTime = 0;
    if (window.performance && window.performance.timing) {
      loadTime = window.performance.timing.domComplete - window.performance.timing.navigationStart;
    }
    this.hbi = Math.max(cfg.config.trackerHeartbeatTimeout, Singletons.pageLoadTime, loadTime) * 3;
    /* pragma:DEBUG_START */
    console.log("Setting hb_i to", this.hbi, loadTime);
    /* pragma:DEBUG_END */

    // If we have a template, then this is a new tracker window
    if (template) {
      // Fire tracker shown event handler
      Singletons.trackerShownEmitter.fire(def, stg, cfg, cpps);
    }

    // if the Brain server is only use for Tracker communication...
    if (globalConfig.storage !== storageTypes.MC) {
      // ... then check if server errors occur and save a flag to prevent invites
      // to show up for a while
      this.stg._readyState.subscribe(
        () => {
          if (stg._serverFails > 0) {
            /* pragma:DEBUG_START */
            console.warn(
              "trigger: brain server is having issues. Invite will be blocked for some time"
            );
            /* pragma:DEBUG_END */
            const generalStorage = getGeneralStorage(browser);
            generalStorage.set("i", "f");
            Singletons.state.inviteSituation = "BRAINFAILED";
            // set the brain fail waiting time before another invite is allowed to be presented
            generalStorage.set("fw", currentTime() + 12 * 60 * 60 * 1000);
          }
        },
        true,
        false
      );
    }

    this.stg.ready.subscribe(
      () => {
        // Cheating: Init the tracker_hb c/o the Tracker. That's to cover the case
        // where the page closes/dies/implodes/rots before receiving the first
        // real one..
        this.stg.set("tracker_hb", currentTime(), this.hbi, false);

        // Start the tracker heartbeat
        const hbf = emergency => {
          this.stg.set("page_hb", currentTime(), this.hbi, !!emergency);
        };

        // on each commit, check for the tracker heartbeat value
        const onStorageCommit = this.stg.onCommit.subscribe(
          () => {
            if (stg.get("tracker_hb") === null) {
              if (
                currentTime() - this.lastTimeSeenTracker >
                this.cfg.config.trackerHeartbeatTimeout
              ) {
                onStorageCommit.unsubscribe();
                /* pragma:DEBUG_START */
                console.warn(
                  "trigger: The tracker must be closed now, there's no tracker_hb ",
                  stg._data
                );
                /* pragma:DEBUG_END */
                delete this.lastTimeSeenTracker;
                this.dispose();
              }
            } else {
              this.lastTimeSeenTracker = currentTime();
            }
          },
          false,
          false
        );

        this._heartbeat = setInterval(
          hbf,
          Math.round(this.cfg.config.trackerHeartbeatTimeout * 0.5)
        );
        // Call it right away
        hbf(true);
      },
      true,
      true
    );

    // Send an emergency message on unload to give us extra time
    Bind(_W, "unload", () => {
      this.hbi = this.cfg.config.trackerHeartbeatLongTimeout;
      this.stg.set("page_hb", currentTime(), this.hbi, true);
    });

    // Set the URL
    const enc = fsEnc;
    this._url = makeURI(
      [
        "$fs.tracker.html?uid=",
        enc(stg.uid || ""),
        "&sitekey=",
        enc(globalConfig.siteKey),
        "&domain=",
        enc(getRootDomain()),
        "&gw=",
        enc(makeURI("trigger/__gwtest__")),
        "&brain_url=",
        enc(globalConfig.brainUrl),
        "&fsrlocale=",
        enc(cpps.get("locale") || "en"),
        "&_svu_=",
        enc(globalConfig.surveyUrl),
        "&_cv_=",
        enc(globalConfig.codeVer),
        "&_issh_=",
        enc(isSelfHosted),
        "&_vt_=",
        enc(tagVersion),
        "&_au_=",
        enc(globalConfig.analyticsUrl),
        "&_pa_=",
        enc(assetLocation),
        codeLocation ? `&_cl_=${enc(codeLocation)}` : "",
      ].join("")
    );

    /* pragma:DEBUG_START */
    console.log("trigger: This is the tracker url ", this._url);
    console.log(
      `trigger: current mid "${new Survey(this.cfg, this.cpps, this.def).getMeasureId()}"`
    );
    /* pragma:DEBUG_END */

    this.cpps.onSet.subscribe((key, value) => {
      /* pragma:DEBUG_START */
      console.warn("trigger: sending CPP's to the tracker window: ", key, value);
      /* pragma:DEBUG_END */
      const nobj = {};
      nobj[key] = value;
      this.stg.set("ckcpps", nobj, 200000, false);
    });

    this.stg.set("ckcpps", this.cpps.all(), 200000, false);

    // Send the definition when ready
    this._sendDefinition();
  }

  /**
   * Transmit the definition
   * @private
   */
  _sendDefinition() {
    // Now tell the tracker window about config and display values
    const jobj = {
      method: "init",
      cfg: ext({ active_surveydef: null }, this.cfg, { globalConfig }),
      hb_i: this.hbi,
      cpps: this.cpps.all(),
    };

    if (this.disp) {
      jobj.display = this.disp;
    }
    if (this.template) {
      jobj.template = this.template;
    }

    // Tell the tracker about the whole state. Make this expire after 60 seconds.
    this.stg.set("page_hb", currentTime(), this.cfg.config.trackerHeartbeatTimeout, false);
    this.stg.set("trackerinfo", jobj, 60000, false);

    const generalStorage = getGeneralStorage(this.br);
    const invitePresentedTime = generalStorage.get("ipt");
    this.stg.set("ipt", invitePresentedTime);

    /* pragma:DEBUG_START */
    console.warn("trigger: sending CPP's to the tracker window: ", this.cpps.all());
    /* pragma:DEBUG_END */
    this.stg.set("ckcpps", this.cpps.all(), 200000, false);
  }

  /**
   * Shows the window
   */
  show(browser) {
    /* pragma:DEBUG_START */
    console.warn("trigger: showing tracker: ", this._url, this.cfg);
    /* pragma:DEBUG_END */
    this.wref = popup(
      this._url,
      "fsTracker",
      {
        width: 700,
        height: 450,
      },
      browser,
      true,
      this.cfg.config.centerTrackerPopup
    );
  }

  /**
   * Applies the URL to an exiting window
   */
  applyExisting(browser, winref) {
    /* pragma:DEBUG_START */
    console.warn("trigger: apply URL to existing tracker pop up");
    /* pragma:DEBUG_END */
    this.wref = winref;
    winref.location = this._url;
  }

  /**
   * Shut down this tracker instance
   */
  dispose() {
    for (let i = 0; i < this._fcBindings.length; i++) {
      this._fcBindings[i].unsubscribe();
    }
    // If this storage was only used for communication, it is not useful anymore
    if (getGeneralStorage(this.br) === this.stg) {
      this.stg.dispose();
    }
    this.stg = null;
    clearInterval(this._heartbeat);
  }
}

export { Tracker };
