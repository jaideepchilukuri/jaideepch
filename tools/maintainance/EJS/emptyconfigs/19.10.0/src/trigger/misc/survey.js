/**
 * Generates survey URL's
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, enc } from "../../fs/index";
import { now as currentTime, hash } from "../../utils/utils";

/**
 * Helps build survey links
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
    let resurl;
    const tval = `${currentTime()}_${Math.round(Math.random() * 10000000000000)}`;
    const abDecision = this.decideModernSurvey();

    const parms = {
      sid: this.getMeasureId(),
      cid: this.globalConfig.customerId,
      pattern: this.cpps.get(this.def.pattern) || this.def.pattern,
      a: tval,
      b: hash(tval),
      c: 24 * 60 * 60 * 1000,
      mp: abDecision.modernPercentage,
    };

    if (abDecision.modernChosen) {
      resurl = this.globalConfig.modernSurveyUrl;
    } else {
      resurl = this.globalConfig.surveyUrl;
    }

    resurl += "?";

    for (const pm in parms) {
      resurl += `${enc(pm)}=${enc(parms[pm])}&`;
    }

    resurl += this.cpps.toQueryString(["browser", "os"]);

    return resurl;
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
