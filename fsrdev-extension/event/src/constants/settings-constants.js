// REDIRECTION constants
export const SETTINGS_REDIRECTION_TOGGLE = "SETTINGS_REDIRECTION_TOGGLE";
export const SETTINGS_REDIRECTION_TAGET_SET = "SETTINGS_REDIRECTION_TAGET_SET";
export const SETTINGS_REDIRECTION_VERSION_SET = "SETTINGS_REDIRECTION_VERSION_SET";
export const SETTINGS_REDIRECTION_ENV_SET = "SETTINGS_REDIRECTION_ENV_SET";
export const SETTINGS_REDIRECTION_CONFIG_SET = "SETTING_REDIRECTION_CONFIG_SET";

export const TARGET_MENU = [
  { env: "prod", urlTarget: "gateway.answerscloud.com", display: "Production", urlVersionList: "" },
  { env: "dev", urlTarget: "dev-gateway-elb.foresee.com", display: "Development (VPN only)", urlVersionList: "dev-" },
  { env: "qa", urlTarget: "qa-gateway-elb.foresee.com", display: "Quality Assurance", urlVersionList: "qa-" },
  { env: "qa2", urlTarget: "qa2-gateway-elb.foresee.com", display: "Quality Assurance-2", urlVersionList: "qa2-" },
  { env: "stg", urlTarget: "stg-gateway-elb.foresee.com", display: "Staging", urlVersionList: "stg-" }
];

export const PROCESS_ENVIORNMENTS = [
  {
    "label": "QA",
    "urlEnv": "qa-",
    "value": 1
  },
  {
    "label": "Dev",
    "urlEnv": "dev-",
    "value": 2
  },
  {
    "label": "Prod",
    "urlEnv": "",
    "value": 3
  }
];

//CONFIG SWAP constants
export const SETTINGS_CONFIGSWAP_TOGGLE = "SETTINGS_CONFIGSWAP_TOGGLE";

export const CONFIG_MENU = [
  { value: "production", display: "Production" },
  { value: "staging", display: "Staging" },
  { value: "development", display: "Development" },
];

//INJECTION CONSTANTS
export const SETTINGS_INJECTION_TOGGLE = "SETTINGS_INJECTION_TOGGLE";
export const SETTINGS_INJECTION_CONFIG_SET = "SETTINGS_INJECTION_CONFIG_SET";
export const SETTINGS_INJECTION_KEY_SET = "SETTINGS_INJECTION_KEY_SET";

export const INJECT_CONFIG = {
  staging: "stg-gateway-elb.foresee.com",
  production: "gateway.foresee.com"
};

//SUPPRESSION CONSTANTS
export const SETTINGS_SUPPRESSION_TOGGLE = "SETTINGS_SUPPRESSION_TOGGLE";
