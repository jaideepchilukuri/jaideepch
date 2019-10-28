/**
 * PopUp Handler
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Popup } from "./popup";
import { Singletons } from "./top";
import { FSEvent, getSize } from "../utils/utils";

/**
 * Popup Handler
 * @type {{}}
 */
const PopupHandler = {
  Current: null,
};

/**
 * Get a popup from the array given the mid if it exists
 * @param mid
 * @returns {*}
 */
PopupHandler.getPopup = mid => {
  const wni = getSize(window);
  // If the window has been resized to be smaller than 500px width, don't serve the hidden version.
  if (wni.w <= 500) {
    return false;
  }

  return PopupHandler.Current && PopupHandler.Current.cfg.mid == mid ? PopupHandler.Current : false;
};

/**
 * Removes all popups and clean-up.
 */
PopupHandler.disposePopups = () => {
  if (PopupHandler.Current) {
    PopupHandler.Current.remove();
  }
  PopupHandler.Current = null;
};

/**
 * Removes a popup from the list of cached popups based on mid
 * @param mid {String} Measure ID
 */
PopupHandler.removePopup = mid => {
  if (PopupHandler.Current && PopupHandler.Current.cfg.mid == mid) {
    PopupHandler.Current.remove();
    PopupHandler.Current = null;
  }
};

/**
 * Initialize a feedback popup
 * @param cfg
 */
PopupHandler.initialize = (cfg, browser, cpps, errortemplate, modaltemplate, eptemplate) => {
  PopupHandler.disposePopups();
  // Backward compatibility..
  if (!cfg.surveytype && typeof cfg.popup !== "undefined") {
    cfg.surveytype = cfg.popup ? "popup" : "modal";
  }

  // Current environment may change the actual surveytype used
  cfg.surveytype = PopupHandler.computeSurveyType(cfg.surveytype);

  // If it's already been initialized then just call it
  let pu = PopupHandler.getPopup(cfg.mid);
  if (!!pu && !pu.cfg.popup) {
    pu.show();
  } else {
    pu = new Popup(cfg, browser, cpps, errortemplate, modaltemplate, eptemplate);
    PopupHandler.Current = pu;
    pu.SurveySubmitted.subscribe(
      (cg => () => {
        PopupHandler.SurveySubmitted.fire(cg);
      })(cfg)
    );
    pu.NetworkError.subscribe(() => {
      PopupHandler.NetworkError.fire();
    });
  }
  return pu;
};

PopupHandler.computeSurveyType = configuredSurveyType => {
  // If it's a mobile device.. or if the screen width is less than 500 ..
  if (
    configuredSurveyType !== "fullpage" &&
    (Singletons.browser.isMobile || getSize(window).w <= 500)
  ) {
    return "popup";
  }

  return configuredSurveyType;
};

/**
 * An event that fires when a survey is submitted
 * @type {acsEvent.FSEvent}
 */
PopupHandler.SurveySubmitted = new FSEvent();

/**
 * An event that fires when there is a network error
 * @type {utils.FSEvent}
 */
PopupHandler.NetworkError = new FSEvent();

export { PopupHandler };
