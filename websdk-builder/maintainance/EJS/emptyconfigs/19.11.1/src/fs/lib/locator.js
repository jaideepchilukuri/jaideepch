import { _W } from "../util/quickrefs";
import { globalConfig } from "./configdefs";

let assetLocation = null;
let codeLocation = null;
let embedAttrs = null;
let gwConfigOverride = null;
let hasSSL = null;
let home = null;
let isProduction = null;
let isSelfHosted = null;
let makeAssetURI = null;
let makeURI = null;
let startTS =
  _W.performance && _W.performance.timing
    ? _W.performance.timing.responseStart
    : new Date().getTime();
let tagVersion = globalConfig.codeVer || "";

/**
 * This is called when locator.locateGW() is called. We need
 * to update a few API variables in that case to ensure the API
 * is up to date. This also makes the locator script more testable.
 */
function locatorUpdate(locator) {
  assetLocation = locator.assetOverride;
  codeLocation = locator.rootOverride;
  embedAttrs = locator.tagAttrs;
  gwConfigOverride = locator.productCfgOverride;
  hasSSL = locator.hasSSL;
  home = locator.gatewayLocation;
  isProduction = locator.isProduction;
  isSelfHosted = locator.isSelfHosted;
  makeAssetURI = locator.normalizeAssetUrl;
  makeURI = locator.normalizeUrl;

  tagVersion = globalConfig.codeVer || "";
}

function resetStartTS() {
  startTS = new Date().getTime();
}

export {
  assetLocation,
  codeLocation,
  embedAttrs,
  gwConfigOverride,
  hasSSL,
  home,
  isProduction,
  isSelfHosted,
  locatorUpdate,
  makeAssetURI,
  makeURI,
  resetStartTS,
  startTS,
  tagVersion,
};
