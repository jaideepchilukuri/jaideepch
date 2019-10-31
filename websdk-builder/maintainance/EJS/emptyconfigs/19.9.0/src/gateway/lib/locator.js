import { _W, _D, _HD, _moduleLocationOverride } from "../../fs/util/quickrefs";
import { globalConfig } from "../../fs/lib/configdefs";
import { eachProp, getParam, attr, trimDots } from "../../fs/util/utils";
import { locatorUpdate } from "../../fs/lib/locator";

/**
 * Locating self
 * @type {{}}
 */
const locator = {};

let skipInit = false;

function reset() {
  skipInit = false;

  /**
   * What environment are we in?
   * @type {string}
   */
  locator.environment = "production";

  locator.isSelfHosted = false;
  locator.hasSSL = true;
  locator.assetOverride = undefined;
  locator.rootOverride = undefined;

  /**
   * Holds all the attributes on the gateway tag
   */
  locator.tagAttrs = {};

  /**
   * Where these files are found
   */
  locator.gatewayLocation = "";

  /**
   * Specifies the environment that this has been deployed to
   * @type {boolean}
   */
  locator.isProduction = false;

  locator.productCfgOverride = null;
  locator.gwScript = null;

  locatorUpdate(locator);
}

/**
 * Subtract from parts of a url
 * @param base
 * @param notches
 * @returns {*}
 */
function subtractFromURL(base, notches) {
  const pref = `${base.substr(0, base.indexOf("//"))}//`;
  let suff = base.substr(pref.length);
  let dom = suff.substr(suff.indexOf("/") + 1);
  const tail = dom.substr(dom.lastIndexOf("/") + 1);

  dom = dom.substr(0, dom.length - tail.length - 1);
  suff = suff.substr(0, suff.indexOf("/"));

  const bits = dom.split("/");
  bits.length -= Math.min(bits.length, notches);

  return `${pref + suff}/${bits.join("/")}${tail}`.replace(/\/\/\//g, "//");
}

/**
 * Take any url and product a correct absolute url from it
 */
locator.normalizeUrl = url => {
  // This is needed for OLD trigger code
  url = url.replace("foresee/", "trigger/");

  const rooturl = locator.gatewayLocation || "";
  let suff;

  if (url.indexOf("v=") > -1) {
    return url;
  }
  // First, fix the URL
  if (url.substr(0, 1) == "$") {
    if (locator.rootOverride) {
      let sl = "/";
      if (locator.rootOverride[locator.rootOverride.length - 1] === "/") {
        sl = "";
      }
      return url.replace("$", `${locator.rootOverride}${sl}`);
    } else {
      suff = (_moduleLocationOverride || `code/${globalConfig.codeVer}/`) + url.replace("$", "");
      return rooturl == "/" ? rooturl + suff : subtractFromURL(rooturl, 3) + suff;
    }
  }

  if (url.indexOf("//") == -1) {
    url =
      rooturl.substr(rooturl.length - 1, 1) == "/" && url.substr(0, 1) == "/"
        ? rooturl + url.substr(1)
        : rooturl + url;
  }

  return url;
};

/**
 * Point a url at an asset
 * @param url
 */
locator.normalizeAssetUrl = url =>
  locator.assetOverride ? locator.assetOverride + url : locator.normalizeUrl(url);

locator.locateGW = () => {
  let scrs = _D.getElementsByTagName("script");
  let gwScr;
  let pgwScr;
  const g = "gateway";
  let src;
  const s = "/";
  let gwl;
  let cv;
  let au;
  let svu;
  let asso;
  let rovr;
  let prodcfg;
  let isself;
  let hasssl;

  if (_HD) {
    skipInit = attr(_HD, "data-skipfsinit") == "true";
    gwl = attr(_HD, "data-fsgatewaylocparam");
    cv = attr(_HD, "data-codeversion");
    au = attr(_HD, "data-analyticsurl");
    svu = attr(_HD, "data-surveyurl");
    asso = attr(_HD, "data-product-assets");
    rovr = attr(_HD, "data-codelocation");
    prodcfg = attr(_HD, "data-productconfig");
    isself = attr(_HD, "data-isselfhosted");
    // whether or not the host has SSL
    hasssl = attr(_HD, "data-hasssl");

    if (gwl) {
      gwl = getParam(gwl);
    }
    locator.isSelfHosted = false;
    if (isself) {
      locator.isSelfHosted = getParam(isself) == "true";
    }
    locator.hasSSL = true;
    if (hasssl) {
      locator.hasSSL = getParam(hasssl) == "true" || "false";
    }
    if (rovr) {
      locator.rootOverride = getParam(rovr);
    }
    if (asso) {
      locator.assetOverride = getParam(asso);
    }
    if (prodcfg) {
      locator.productCfgOverride = getParam(prodcfg);
    }
    if (cv) {
      globalConfig.codeVer = getParam(cv);
    }

    if (au) {
      globalConfig.analyticsUrl = getParam(au);
    }
    if (svu) {
      globalConfig.surveyUrl = getParam(svu);
    }
  }

  // if not yet present, get the site key from the URL (case: Tracker window)
  if (typeof globalConfig.siteKey !== "string" || globalConfig.siteKey.length < 1) {
    globalConfig.siteKey = getParam("sitekey");
  }

  // Note: document.currentScript may be used instead of all these shenanigans for non-IE browsers
  eachProp(scrs, (scr, prop) => {
    if (prop !== "length") {
      src = attr(scr, "src") || "";
      const dv = attr(scr, "data-vendor");
      if ((dv == "fs" || dv == "acs") && attr(scr, "data-role") == g) {
        // This is definitely the gateway script
        gwScr = scr;
      } else if (src.indexOf(g) > -1) {
        // This is potentially the gateway script
        pgwScr = scr;
      }
    }
  });
  // If we didn't get a definite match, then maybe we found a potential match
  if (!gwScr) {
    gwScr = pgwScr;
  }

  if (!gwScr) {
    /* pragma:DEBUG_START */
    console.error("gw: No valid gateway script found:", scrs);
    /* pragma:DEBUG_END */
    throw new Error(
      'FSR: No script tag has been found. Expected is a script tag with the following attributes:  data-vendor="fs"  data-role="gateway"  src="[a_path_leading_to]/gateway[.min].js". Aborting loading.'
    );
  }

  for (let i = 0; i < gwScr.attributes.length; i++) {
    const tr = gwScr.attributes[i];
    locator.tagAttrs[tr.name] = tr.value;
  }
  locator.gwScript = gwScr;
  src = gwl || attr(gwScr, "src");
  locator.environment = attr(gwScr, "data-environment") || locator.environment;
  locator.rootOverride = attr(gwScr, "data-codelocation") || locator.rootOverride;
  locator.assetOverride = attr(gwScr, "data-product-assets") || locator.assetOverride;
  locator.isSelfHosted = attr(gwScr, "data-isselfhosted")
    ? attr(gwScr, "data-isselfhosted") == "true"
    : locator.isSelfHosted;
  locator.hasSSL = attr(gwScr, "data-hasssl") || locator.hasSSL;
  if (src.indexOf(":/") == -1 && src.substr(0, 1) != s) {
    scrs = `${_W.location.href}`.split(s);
    if (
      scrs[scrs.length - 1].indexOf(".") > -1 &&
      scrs[scrs.length - 1].toLowerCase() != _W.location.hostname.toLowerCase()
    ) {
      scrs.pop();
    }
    src = scrs.join(s) + (src.substr(0, 1) == s ? "" : s) + src;
  }
  src = src.split(s);
  src.pop();
  trimDots(src);
  locator.gatewayLocation = src.join(s) + s;
  locator.isProduction = locator.gatewayLocation.toLowerCase().indexOf("production") > -1;
  locatorUpdate(locator);
};

// reset function for tests
reset();

const _fsNormalizeUrl = locator.normalizeUrl;
const _fsNormalizeAssetUrl = locator.normalizeAssetUrl;

// Expose the locator to the world
_W["_fsNormalizeUrl"] = _W["_acsNormalizeUrl"] = locator.normalizeUrl;
_W["_fsNormalizeAssetUrl"] = locator.normalizeAssetUrl;

export { locator, _fsNormalizeUrl, _fsNormalizeAssetUrl, skipInit, reset };
