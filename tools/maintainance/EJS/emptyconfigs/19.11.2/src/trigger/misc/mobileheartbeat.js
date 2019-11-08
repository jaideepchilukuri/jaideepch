/**
 * Mobile Heartbeat
 *
 * Helps the server know when to send on-exit messages
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext, isDefined, globalConfig } from "../../fs/index";
import { now as currentTime, hash } from "../../utils/utils";
import { Services } from "./services";
import { Survey } from "./survey";

/**
 * Handles mobile heartbeats
 * @param invitetype
 * @param modality
 * @param cfg
 * @param def
 * @param cpps
 * @constructor
 */
class MobileHeartbeat {
  constructor(invitetype, cfg, def, cpps, rid, locale) {
    this.itype = invitetype;
    this.cfg = cfg;
    this.def = def;
    this.cpps = cpps;
    this.rid = rid;
    this._measureName = `${this.def.name}-${isDefined(this.def.site) ? `${this.def.site}-` : ""}${
      isDefined(this.def.section) ? `${this.def.section}-` : ""
    }${locale || this.def.language.locale}`;
  }

  /**
   * Send the init event
   * @param usercontactinfo (String) Email or SMS phone number
   * @param callback (Function) Success callback
   */
  init(usercontactinfo, callback) {
    callback = callback || (() => {});
    const survey = new Survey(this.cfg, this.cpps, this.def, null);
    const decision = survey.decideModernSurvey();
    const a = `${currentTime()}_${Math.round(Math.random() * 10000000000000)}`;
    let params = {
      a,
      notify: usercontactinfo,
      b: hash(a),
      c: 24 * 60 * 60 * 1000,
      cid: globalConfig.customerId,
      sid: this._measureName,
      rid: this.rid,
      uid: currentTime(),
      support: this.itype == "SMSEMAIL" ? "b" : this.itype == "EMAIL" ? "e" : "s",
      cpps: `version=${encodeURIComponent(globalConfig.codeVer)}&${this.cpps.toQueryString()}`,
    };
    if (decision.modernChosen) {
      /* pragma:DEBUG_START */
      console.log("trigger: asking for modern survey on-exit mobile!");
      /* pragma:DEBUG_END */
      params = ext({ fs_renderer: "modern" }, params);
    } else {
      /* pragma:DEBUG_START */
      console.log("trigger: asking for legacy survey on-exit mobile!");
      /* pragma:DEBUG_END */
    }
    Services.ping(Services.SERVICE_TYPES.mobileOnExitInitialize, params, callback, callback);
  }

  /**
   * Start up the heartbeat
   */
  beginHeartbeat() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    /* pragma:DEBUG_START */
    console.log(
      "trigger: starting mobile heartbeat on interval: ",
      this.cfg.config.onExitMobileHeartbeatInterval
    );
    /* pragma:DEBUG_END */
    const hb = () => {
      Services.ping(
        Services.SERVICE_TYPES.mobileOnExitHeartbeat,
        {
          cid: globalConfig.customerId,
          sid: this._measureName,
          rid: this.rid,
          uid: currentTime(),
        },
        () => {
          // No-op success
        },
        () => {
          // No-op failure
        }
      );
    };
    this._timer = setInterval(hb, this.cfg.config.onExitMobileHeartbeatInterval);
    hb();
  }
}

export { MobileHeartbeat };
