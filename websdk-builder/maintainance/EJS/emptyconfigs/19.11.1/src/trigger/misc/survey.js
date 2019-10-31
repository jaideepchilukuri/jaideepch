/**
 * Generates survey URL's
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, enc, ext } from "../../fs/index";
import { now as currentTime, hash } from "../../utils/utils";

/**
 * Helps build survey urls
 * @param config
 * @param cpps
 * @param def
 * @constructor
 */
class Survey {
  constructor(config, cpps, def, qual) {
    this.cfg = config;

    // tracker window gets config.globalConfig, main window gets fs.config
    this.globalConfig = config.globalConfig || globalConfig;

    this.cpps = cpps;
    this.def = def;
    this.locale = cpps.get("locale") || "en";
    this.qual = qual;
  }

  /**
   * Makes the decision about whether to show the modern survey or not.
   *
   * @returns {{modernChosen: boolean, modernPercentage: number}} decision information
   */
  decideModernSurvey() {
    const abSurveyType = this.cfg.config.abSurveyType;
    const shouldABTest =
      abSurveyType && abSurveyType.shouldTest && this.globalConfig.modernSurveyUrl;
    const abConfig = shouldABTest && findABConfig(abSurveyType, this.def);

    if (this.cfg.config.onlyModernSurvey) {
      return { modernChosen: true, modernPercentage: 100 };
    }

    if (abConfig) {
      return {
        modernChosen: abConfig.modernPercentage >= Math.floor(Math.random() * 100),
        modernPercentage: abConfig.modernPercentage,
      };
    }

    return { modernChosen: false, modernPercentage: 0 };
  }

  /**
   * Get the measure name for the survey (alias: mid, sid)
   */
  getMeasureId() {
    const measureNameComponents = [
      this.def.name,
      this.def.site,
      this.def.section,
      this.locale,
      this.qual ? this.qual.qualifiesValue : null,
    ]
      // Only keep the defined components
      .filter(i => i);

    return measureNameComponents.join("-");
  }

  /**
   * Get the URL for the survey
   */
  getUrl() {
    const abDecision = this.decideModernSurvey();

    if (abDecision.modernChosen) {
      return this._buildUrl(this.globalConfig.modernSurveyUrl, this._getParams({}));
    } else {
      const tval = `${currentTime()}_${Math.round(Math.random() * 10000000000000)}`;
      const parms = this._getParams({
        a: tval,
        b: hash(tval),
        c: 24 * 60 * 60 * 1000,
        mp: abDecision.modernPercentage,
      });
      return this._buildUrl(this.globalConfig.surveyUrl, parms);
    }
  }

  _getParams(moreParams) {
    return ext(
      {
        sid: this.getMeasureId(),
        cid: this.globalConfig.customerId,
        pattern: this.cpps.get(this.def.pattern) || this.def.pattern,
      },
      moreParams || {},
      false
    );
  }

  _buildUrl(baseurl, parms) {
    let resurl = `${baseurl}?`;

    for (const pm in parms) {
      resurl += `${enc(pm)}=${enc(parms[pm])}&`;
    }

    resurl += this.cpps.toQueryString(["browser", "os"]);

    return resurl;
  }

  /**
   * Get the url for short survey
   */
  getShortSurveyUrl({ pageView, paginationType, midOverride }) {
    // if session storage is available, reuse the same url for each display
    // of the short survey
    try {
      if (pageView === 1) {
        sessionStorage.removeItem("FSR_SSURL");
      }
      if (pageView > 1) {
        const storedURL = sessionStorage.getItem("FSR_SSURL");
        if (storedURL) {
          return storedURL;
        }
      }
    } catch (e) {
      /* ignore */
    }

    const baseurl = this.globalConfig.modernSurveyUrl;

    const parms = this._getParams({
      template: "contextual",
      pv: pageView,
      paginationType,
    });

    if (midOverride) {
      delete parms.cid;
      delete parms.sid;
      parms.mid = midOverride;

      /* pragma:DEBUG_START */
      console.error(`short survey: overriding mid with ${midOverride}`);
      /* pragma:DEBUG_END */
    }

    if (!parms.paginationType) delete parms.paginationType;

    return this._buildUrl(baseurl, parms);
  }

  getShortSurveyOrigin() {
    // Remove the ending /sv path
    return globalConfig.modernSurveyUrl.replace(/\/sv$/, "");
  }
}

const findABConfig = (abSurveyType, activeDef) => {
  let k;
  let abName;
  let config;
  let defName = activeDef.name || "";
  defName += `-${activeDef.section || ""}`;
  defName += `-${activeDef.site || ""}`;

  for (k = 0; k < abSurveyType.defs.length; k++) {
    config = abSurveyType.defs[k];
    abName = config.name || "";
    abName += `-${config.section || ""}`;
    abName += `-${config.site || ""}`;

    if (abName === defName) {
      return config;
    }
  }
  return null;
};

export { Survey };
