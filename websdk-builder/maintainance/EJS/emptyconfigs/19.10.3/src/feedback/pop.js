/**
 * Pops the survey in a new window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { _recordController } from "./replay";
import { Singletons } from "./top";
import {
  assetLocation,
  codeLocation,
  globalConfig,
  enc,
  ext,
  getParam,
  home,
  isSelfHosted,
  makeURI,
  tagVersion,
  getProductConfig,
} from "../fs/index";
import { FSEvent, getBrainStorage } from "../utils/utils";
import { compress, decompress } from "../compress/compress";

/**
 * Pops a survey in a new window
 * @param survey
 * @constructor
 */
class Pop {
  constructor(survey, cfg, browser) {
    this.height = 600;
    this.width = 400;
    this.survey = survey;
    this.cfg = cfg;
    this.cpps = survey.cpps;
    this.SurveySubmitted = new FSEvent();
    this.br = browser;
    this.jrny = cfg.jrny;
    this.networkError = FSEvent();
  }

  /**
   * Pass along any relevant CxReplay parameters
   * @private
   */
  _getCXRParams() {
    let fstr = "";
    // Do cxReplay session ID's only if we're not in blacklist mode
    if (this.cfg.replay === true && typeof _recordController !== "undefined") {
      fstr += `cxrid=${enc(_recordController.getGlobalId())}&cxrurl=${enc(globalConfig.recUrl)}`;
    }
    return fstr;
  }

  /**
   * Start a new window
   */
  show() {
    if (!this.winRef) {
      // Since instances are attached to the url we want to minimize the number of instances
      // we are doing this with getBadgeConfig
      const _getBadgeConfig = (btnMid, configObj) => {
        const configObjCopy = ext({}, configObj);
        for (let i = 0; i < configObjCopy.instances.length; i++) {
          if (btnMid === configObjCopy.instances[i].mid) {
            // make a copy since ext doesn't copy inside arrays
            configObjCopy.instances = [ext({}, configObjCopy.instances[i], false)];

            // delete the global polution so JSON.stringify doesn't barf
            // TODO in CC-4982: should fix this properly by not storing junk in the config
            const inst = configObjCopy.instances[0];
            delete inst.badge;
            delete inst.jrny;
            delete inst.record;
            delete inst.stg;
            break;
          }
        }
        return configObjCopy;
      };

      const cppo = this.cfg.preview ? null : JSON.stringify(this.cpps.all());
      const ctx = this;
      const wref = window;
      // A survey can be opened from a badge or a call to FSR.launchFeedback()
      const mid =
        this.cfg.badge && this.cfg.badge.btncfg && this.cfg.badge.btncfg.mid
          ? this.cfg.badge.btncfg.mid
          : this.cfg.mid;
      const generalConfig = {
        global: globalConfig,
        product: this.cfg.preview ? null : _getBadgeConfig(mid, getProductConfig("feedback")),
      };

      // Preparing the URL for the survey

      // Survey's information used for both the preview and the normal mode
      const inf = [
        "&mid=",
        enc(mid),
        "&_gwl_=",
        enc(home),
        "&_cv_=",
        enc(globalConfig.codeVer),
        "&_au_=",
        enc(globalConfig.analyticsUrl),
        "&_vt_=",
        enc(tagVersion),
        "&_issh_=",
        enc(isSelfHosted),
        "&_pa_=",
        enc(assetLocation),
        codeLocation ? `&_cl_=${enc(codeLocation)}` : "",
      ].join("");

      let url;

      if (this.cfg.preview) {
        // Survey's information specific to the preview mode
        url = makeURI(
          [
            "$fs.feedbacksurvey.html?mid=",
            enc(this.survey.cfg.mid),
            "&t=",
            enc(this.cfg.template || "default"),
            "&datauri=",
            getParam("datauri"),
            "&ns=",
            enc("preview"),
            "&_gcfg_=",
            enc(
              compress(
                // Extra fs.enc to make UTF8 survives compression
                enc(JSON.stringify(generalConfig))
              )
            ),
            inf,
          ].join("")
        );
      } else {
        // Survey's information specific to the normal mode
        url = makeURI(
          [
            "$fs.feedbacksurvey.html?",
            "&t=",
            enc(this.cfg.template || "default"),
            "&fsUrl=",
            enc(wref.location.href),
            "&uid=",
            enc(Singletons.stg.uid),
            "&ns=",
            enc(globalConfig.siteKey),
            "&brain=",
            enc(globalConfig.brainUrl),
            inf,
          ].join("")
        );

        if (globalConfig.products.record === true) {
          url += `&${this._getCXRParams()}`;
        }

        // To keep the URL as short as possible, some information is passed to the brain.
        const brain = getBrainStorage(
          this.br,
          Singletons.stg.uid,
          this.cfg.preview ? "preview" : globalConfig.siteKey
        );

        brain.set("fscfg", {
          gcfg: enc(
            compress(
              // extra fs.enc to make UTF8 survives compression
              enc(JSON.stringify(generalConfig))
            )
          ),
          cid: enc(globalConfig.customerId),
          cpps: enc(compress(cppo)),
        });
      }

      if (this.br.isIE && this.br.browser.actualVersion <= 11) {
        // FORCE https (needed for ie and mob)
        if (url.substr(0, 2) == "//") {
          url = `https:${url}`;
        }
        if (url.substr(0, 4) == "http") {
          url.replace("http", "https");
        }
      }

      /* pragma:DEBUG_START */
      if (url.length > 2083) {
        console.error("This URL is too long for IE11 !", url);
      }
      /* pragma:DEBUG_END */

      // If this is preview and we're in an iFrame..
      if (
        !!this.cfg.preview &&
        (wref !== wref.top || wref.location.toString().indexOf("fscommand=feedbackpreview") > -1)
      ) {
        wref.location.href = url;
      } else {
        this.winRef = wref.open(url, "_system");
        this._checkerFailsAllowed = 20; // *500ms
        this._checker = setInterval(() => {
          try {
            if (ctx.winRef.closed === true) {
              return clearInterval(ctx._checker);
            }

            const hsh = `${ctx.winRef.location}`;
            const locm = "fsSurveyComplete=";

            if (hsh.indexOf(locm) > -1) {
              clearInterval(ctx._checker);
              const fsData = decompress(
                decodeURIComponent(hsh.substr(hsh.indexOf(locm) + locm.length))
              );
              Singletons.onFeedbackSubmitted.fire(JSON.parse(fsData));
              ctx.SurveySubmitted.fire(JSON.parse(fsData));
            }
          } catch (e) {
            // While the popup is open & loading, the browser may throw CORS error
            // upon accessing winRef.location.
            // This gives it some chances to succeeded.
            if (ctx._checkerFailsAllowed > 0) {
              ctx._checkerFailsAllowed--;
              return;
            }
            clearInterval(ctx._checker);
            ctx.SurveySubmitted.fire();
          }
        }, 500);
      }
    }
    Singletons.onFeedbackShown.fire(this.winRef);
  }
}

export { Pop };
