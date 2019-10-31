/**
 * Locating self
 * @type {{}}
 */
var locator = {};

/**
 * What environment are we in?
 * @type {string}
 */
locator.environment = 'production';

/**
 * Holds all the attributes on the gateway tag
 */
locator.tagAttrs = {};

/**
 * Where these files are found
 */
locator.gatewayLocation = (function () {
  var scrs = _D.getElementsByTagName("script"),
    gwScr,
    pgwScr,
    g = "gateway",
    src,
    tm,
    s = '/',
    gwl,
    cv,
    au,
    svu,
    asso,
    rovr,
    prodcfg,
    isself,
    hasssl;

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
      locator.isSelfHosted = (getParam(isself) == 'true');
    }
    locator.hasSSL = true;
    if (hasssl) {
      locator.hasSSL = (getParam(hasssl) != 'true');
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
      if (typeof globalConfig !== "undefined") {
        globalConfig.codeVer = getParam(cv);
      } else {
        globalConfig = {
          codeVer: getParam(cv)
        };
      }
    }

    if (au) {
      if (typeof globalConfig !== "undefined") {
        globalConfig.analyticsUrl = getParam(au);
      } else {
        globalConfig = {
          analyticsUrl: getParam(au)
        };
      }
    }
    if (svu) {
      if (typeof globalConfig !== "undefined") {
        globalConfig.surveyUrl = getParam(svu);
      } else {
        globalConfig = {
          surveyUrl: getParam(svu)
        };
      }
    }
  }

  // if not yet present, get the site key from the URL (case: Tracker window)
  if (!globalConfig) {
    globalConfig = {};
  }
  if (typeof globalConfig.siteKey !== "string" || globalConfig.siteKey.length < 1) {
    globalConfig.siteKey = getParam("sitekey");
  }

  // Note: document.currentScript may be used instead of all these shenanigans for non-IE browsers
  eachProp(scrs, function (scr, prop) {
    if (prop !== "length") {
      src = attr(scr, "src") || '';
      var dv = attr(scr, "data-vendor");
      if ((dv == "fs" || dv == "acs") && attr(scr, "data-role") == g) {
        // This is definitely the gateway script
        gwScr = scr;
        tm = attr(scr, 'timing');
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
    console.error('gw: No valid gateway script found:', scrs);
    /* pragma:DEBUG_END */
    throw new Error('FSR: No script tag has been found. Expected is a script tag with the following attributes:  data-vendor="fs"  data-role="gateway"  src="[a_path_leading_to]/gateway[.min].js". Aborting loading.');
  }

  for (var i = 0; i < gwScr.attributes.length; i++) {
    var tr = gwScr.attributes[i];
    locator.tagAttrs[tr.name] = tr.value;
  }
  locator.gwScript = gwScr;
  src = gwl || attr(gwScr, "src");
  locator.environment = attr(gwScr, "data-environment") || locator.environment;
  locator.rootOverride = attr(gwScr, "data-codelocation") || locator.rootOverride;
  locator.assetOverride = attr(gwScr, "data-product-assets") || locator.assetOverride;
  locator.isSelfHosted = attr(gwScr, "data-isselfhosted") || locator.isSelfHosted;
  locator.hasSSL = attr(gwScr, "data-hasssl") || locator.hasSSL;
  if (src.indexOf(':/') == -1 && src.substr(0, 1) != s) {
    scrs = (_W.location.href + '').split(s);
    if (scrs[scrs.length - 1].indexOf('.') > -1 && scrs[scrs.length - 1].toLowerCase() != _W.location.hostname.toLowerCase()) {
      scrs.pop();
    }
    src = scrs.join(s) + (src.substr(0, 1) == s ? '' : s) + src;
  }
  src = src.split(s);
  src.pop();
  trimDots(src);
  return src.join(s) + s;

})();

/**
 * Specifies the environment that this has been deployed to
 * @type {boolean}
 */
locator.isProduction = (locator.gatewayLocation.toLowerCase().indexOf('production') > -1);

/**
 * Subtract from parts of a url
 * @param base
 * @param notches
 * @returns {*}
 */
function subtractFromURL(base, notches) {
  var pref = base.substr(0, base.indexOf('//')) + '//',
    suff = base.substr(pref.length),
    dom = suff.substr(suff.indexOf('/') + 1),
    tail = dom.substr(dom.lastIndexOf('/') + 1);

  dom = dom.substr(0, dom.length - tail.length - 1);
  suff = suff.substr(0, suff.indexOf('/'));

  var bits = dom.split('/');
  bits.length -= Math.min(bits.length, notches);

  return (pref + suff + '/' + bits.join('/') + tail).replace(/\/\/\//g, '//');
}

/**
 * Take any url and product a correct absolute url from it
 */
locator.normalizeUrl = function (url) {
  // This is needed for OLD trigger code

  url = url.replace("foresee/", "trigger/");
  var rooturl = locator.gatewayLocation || '',
    suff;

  if (url.indexOf('v=') > -1) {
    return url;
  }
  // First, fix the URL
  if (url.substr(0, 1) == '$') {
    if (locator.rootOverride) {
      return url.replace('$', locator.rootOverride);
    } else {
      suff = (_moduleLocationOverride || ('code/' + globalConfig.codeVer + '/')) + url.replace('$', '');
      return rooturl == '/' ? rooturl + suff : subtractFromURL(rooturl, 3) + suff;
    }
  }

  if (url.indexOf('//') == -1) {
    url = rooturl.substr(rooturl.length - 1, 1) == '/' && url.substr(0, 1) == '/' ? rooturl + url.substr(1) : rooturl + url;
  }

  return url;
};

/**
 * Point a url at an asset
 * @param url
 */
locator.normalizeAssetUrl = function (url) {
  return !!locator.assetOverride ? locator.assetOverride + url : locator.normalizeUrl(url);
};

// Expose the locator to the world
_W["_fsNormalizeUrl"] = _W["_acsNormalizeUrl"] = locator.normalizeUrl;
_W["_fsNormalizeAssetUrl"] = locator.normalizeAssetUrl;