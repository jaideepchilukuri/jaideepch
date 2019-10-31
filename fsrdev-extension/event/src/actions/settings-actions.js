import * as constants from "../constants/settings-constants";

// REDIRECTION ACTIONS
export const settingsRedirectionToggle = (redirection) => ({
  type: constants.SETTINGS_REDIRECTION_TOGGLE, payload: { redirection }
});
export const settingsRedirectionTargetSet = (target) => ({
  type: constants.SETTINGS_REDIRECTION_TAGET_SET, payload: { redirectionTarget: target }
});
export const settingsRedirectionVersionSet = (version) => ({
  type: constants.SETTINGS_REDIRECTION_VERSION_SET, payload: { redirectionVersion: version }
});

export const settingsRedirectionConfigSet = (config) => ({
  type: constants.SETTINGS_REDIRECTION_CONFIG_SET, payload: { redirectionConfig: config }
});

// CONFIG SWAP ACTIONS
export const settingsConfigSwapToggle = (configSwap) => ({
  type: constants.SETTINGS_CONFIGSWAP_TOGGLE, payload: { configSwap }
});

//INJECTION ACTIONS
export const settingsInjectionToggle = (injection) => ({
  type: constants.SETTINGS_INJECTION_TOGGLE, payload: { injection }
});

export const settingsInjectionConfigSet = (config) => ({
  type: constants.SETTINGS_INJECTION_CONFIG_SET, payload: { injectionConfig: config }
});

export const settingsInjectionKeySet = (key) => ({
  type: constants.SETTINGS_INJECTION_KEY_SET, payload: { injectionKey: key }
});

//SUPPRESSION ACTIONS
export const settingsSuppressionToggle = (suppression) => ({
  type: constants.SETTINGS_SUPPRESSION_TOGGLE, payload: { suppression }
});
