/**
 * Expose a module to the world
 */
var extMod = {
  "supportsDomStorage": supportsDomStorage,
  "hasProp": hasProp,
  "fsCmd": fsCmd,
  "eachProp": eachProp,
  "isDefined": isDefined,
  "isFunction": isFunction,
  "isObject": isObject,
  "isArray": isArray,
  "isDate": isDate,
  "isString": isString,
  "isPlainObject": isPlainObject,
  "proxy": proxy,
  "dispose": dispose,
  "ext": ext,
  "diff": diff,
  "attr": attr,
  "makeURI": locator.normalizeUrl,
  "makeAssetURI": locator.normalizeAssetUrl,
  "home": locator.gatewayLocation,
  "isProduction": locator.isProduction,
  "getParam": getParam,
  "nextTick": nextTick,
  "toQueryString": toQueryString,
  "getQueryString": getQueryString,
  "isSelfHosted": locator.isSelfHosted,
  "hasSSL": locator.hasSSL,
  "compute": compute,
  "config": globalConfig,
  "productConfig": productConfig,
  "setFSRVisibility": setFSRVisibility,
  "gwConfigOverride": locator.productCfgOverride,
  "domReady": domReady,
  "winReady": winload,
  "tagVersion": "${versionTag}",
  "toLowerCase": toLowerCase,
  "enc": encodeURIComponent,
  "dec": decodeURIComponent,
  "assetLocation": locator.assetOverride,
  "codeLocation": locator.rootOverride,
  "startTS": !!(_W.performance && _W.performance.timing) ? _W.performance.timing.responseStart : (new Date()).getTime(),
  "API": API
};

define("fs", function () {
  return extMod;
});

// Backwards compatibility
define("_acs", function () {
  return extMod;
});