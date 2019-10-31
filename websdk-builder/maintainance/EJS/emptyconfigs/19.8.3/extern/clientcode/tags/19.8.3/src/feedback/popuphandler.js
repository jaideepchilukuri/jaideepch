/**
 * PopUp Handler
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Popup Handler
 * @type {{}}
 */
var PopupHandler = {
  Current: null,
};

/**
 * Get a popup from the array given the mid if it exists
 * @param mid
 * @returns {*}
 */
PopupHandler.getPopup = function(mid) {
  var wni = utils.getSize(window);
  // If the window has been resized to be smaller than 500px width, don't serve the hidden version.
  if (wni.w <= 500) {
    return false;
  }

  return !!(PopupHandler.Current && PopupHandler.Current.cfg.mid == mid)
    ? PopupHandler.Current
    : false;
};

/**
 * Removes all popups and clean-up.
 */
PopupHandler.disposePopups = function() {
  if (PopupHandler.Current) {
    PopupHandler.Current.remove();
  }
  PopupHandler.Current = null;
};

/**
 * Removes a popup from the list of cached popups based on mid
 * @param mid {String} Measure ID
 */
PopupHandler.removePopup = function(mid) {
  if (PopupHandler.Current && PopupHandler.Current.cfg.mid == mid) {
    PopupHandler.Current.remove();
    PopupHandler.Current = null;
  }
};

/**
 * Initialize a feedback popup
 * @param cfg
 */
PopupHandler.initialize = function(cfg, browser, cpps, errortemplate, modaltemplate, eptemplate) {
  PopupHandler.disposePopups();
  // Backward compatibility..
  if (!cfg.surveytype && typeof cfg.popup !== "undefined") {
    cfg.surveytype = !!cfg.popup ? "popup" : "modal";
  }

  // If it's already been initialized then just call it
  var pu = PopupHandler.getPopup(cfg.mid);
  if (!!pu && !pu.cfg.popup) {
    pu.show();
  } else {
    pu = new Popup(cfg, browser, cpps, errortemplate, modaltemplate, eptemplate);
    PopupHandler.Current = pu;
    pu.SurveySubmitted.subscribe(
      (function(cg) {
        return function() {
          PopupHandler.SurveySubmitted.fire(cg);
        };
      })(cfg)
    );
    pu.NetworkError.subscribe(function() {
      PopupHandler.NetworkError.fire();
    });
  }
  return pu;
};

PopupHandler.computeSurveyType = function(configuredSurveyType) {
  // If it's a mobile device.. or if the screen width is less than 500 ..
  if (
    configuredSurveyType !== "fullpage" &&
    (Singletons.browser.isMobile || utils.getSize(window).w <= 500)
  ) {
    return "popup";
  }

  return configuredSurveyType;
};

/**
 * An event that fires when a survey is submitted
 * @type {acsEvent.FSEvent}
 */
PopupHandler.SurveySubmitted = new utils.FSEvent();

/**
 * An event that fires when there is a network error
 * @type {utils.FSEvent}
 */
PopupHandler.NetworkError = new utils.FSEvent();
