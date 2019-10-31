/**
 * FS module for shared common code.
 */

import { globalConfig, getProductConfig } from "./lib/configdefs";

const config = globalConfig; // depricated do not use
const dec = decodeURIComponent;
const enc = encodeURIComponent;

export {
  config, // deprecated, do not use
  dec,
  enc,
  getProductConfig,
  globalConfig,
};

export { API } from "./lib/api";
export { domReady } from "./util/domready";
export { featureFlag } from "./util/featureFlag";
export { fsCmd } from "./util/fscmd";
export { Promise } from "./polyfills/promise";
export { supportsDomStorage } from "./util/quickrefs";
export { winload as winReady } from "./util/winload";

export {
  assetLocation,
  codeLocation,
  embedAttrs,
  gwConfigOverride,
  hasSSL,
  home,
  isProduction,
  isSelfHosted,
  makeAssetURI,
  makeURI,
  resetStartTS,
  startTS,
  tagVersion,
} from "./lib/locator";

export {
  attr,
  compute,
  diff,
  dispose,
  eachProp,
  ext,
  getParam,
  getQueryString,
  hasProp,
  isArray,
  isDate,
  isDefined,
  isElement,
  isFunction,
  isNodeList,
  isObject,
  isPlainObject,
  isString,
  nextTick,
  proxy,
  setFSRVisibility,
  toLowerCase,
  toQueryString,
} from "./util/utils";

export { getNested } from "./util/getnested";
