import * as constants from "../constants/settings-constants";

const initialState = {
  redirection: false,
  redirectionTarget: constants.TARGET_MENU[0].urlTarget,
  redirectionVersion: "19.6.0",
  configSwap: false,
  redirectionConfig: constants.CONFIG_MENU[0].value,
  injection: false,
  injectionConfig: "staging",
  injectionKey: "",
  suppression: false
};

export default (state = initialState, action) => {
  switch (action.type) {
  //REDIRECTION ACTIONS
  case (constants.SETTINGS_REDIRECTION_TOGGLE):
    return Object.assign({}, state, { redirection: action.payload.redirection });
  case (constants.SETTINGS_REDIRECTION_TAGET_SET):
    return Object.assign({}, state, { redirectionTarget: action.payload.redirectionTarget });
  case (constants.SETTINGS_REDIRECTION_VERSION_SET):
    return Object.assign({}, state, { redirectionVersion: action.payload.redirectionVersion });

  //CONFIG SWAP ACTIONS
  case (constants.SETTINGS_CONFIGSWAP_TOGGLE):
    return Object.assign({}, state, { configSwap: action.payload.configSwap });
  case (constants.SETTINGS_REDIRECTION_CONFIG_SET):
    return Object.assign({}, state, { redirectionConfig: action.payload.redirectionConfig });
  //INJECTION ACTIONS
  case (constants.SETTINGS_INJECTION_TOGGLE):
    return Object.assign({}, state, { injection: action.payload.injection });
  case (constants.SETTINGS_INJECTION_CONFIG_SET):
    return Object.assign({}, state, { injectionConfig: action.payload.injectionConfig });
  case (constants.SETTINGS_INJECTION_KEY_SET):
    return Object.assign({}, state, { injectionKey: action.payload.injectionKey });
  //SUPPRESSION ACTIONS
  case (constants.SETTINGS_SUPPRESSION_TOGGLE):
    return Object.assign({}, state, { suppression: action.payload.suppression });
  default:
    return state;
  }
};
