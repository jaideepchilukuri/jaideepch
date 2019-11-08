/**
 * Browser detection
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, ext, isDefined, toLowerCase, hasProp } from "../../fs/index";
import { hashCode } from "../misc/urls";
import { AjaxTransport } from "../network/ajax";
import { FSEvent } from "./event";

/**
 * The browser detection class.
 * @param usrAgt {string} (OPTIONAL) User agent string. If not set, we get the user agent string from navigator.userAgent
 * @returns {*}
 * @constructor
 */
const Browser = function(usrAgt) {
  // Create a reference to for compression benefits
  const ctx = this;
  const agent = usrAgt || navigator.userAgent;
  const agentLowerCase = toLowerCase(agent);

  // Initialize some variables
  ext(
    ctx,
    {
      agent,
      os: {
        name: "",
        version: 0,
      },
      browser: {
        name: "",
        version: 0,
        actualVersion: 0,
      },
      isMobile:
        /iphone|ipad|ipod|android|kindle|silk|bntv|nook|blackberry|playbook|mini|windows\sce|windows\sphone|palm|bb10/i.test(
          agent
        ) || !!window.orientation,
      isTablet: /ipad|playbook|nook|bntv/i.test(agent),
      isWinPhone: /Windows Phone/i.test(agent),
      supportsLocalStorage: false,
      supportsPostMessage: !!window.postMessage,
      isIE: false,
      isEdge: false,
      isZoomable: true,
      supportsSVG: document.implementation.hasFeature(
        "http://www.w3.org/TR/SVG11/feature#BasicStructure",
        "1.1"
      ),
      isReady: false,
      ready: new FSEvent(),
      _internalReady: new FSEvent(),
      isIos: false,
      servUrl: `${globalConfig.deviceDetectionUrl ||
        "https://device.4seeresults.com"}/detect?accessToken=`,
    },
    false
  );

  // Test to see if DOM storage works
  try {
    if (localStorage) {
      localStorage.setItem("a", "b");
      localStorage.removeItem("a");
      ctx.supportsLocalStorage = true;
    }
  } catch (e) {}

  // Test to see if DOM storage works
  try {
    if (sessionStorage) {
      sessionStorage.setItem("a", "b");
      sessionStorage.removeItem("a");
      ctx.supportsSessionStorage = true;
    }
  } catch (e) {}

  // Watch for the internal ready thing
  ctx._internalReady.subscribe(() => {
    ctx.ready.fire(ctx);
  });

  // Run some quick checks if we know this is mobile
  if (ctx.isMobile && /iphone|ipad|ipod/i.test(agent) && !ctx.isWinPhone) {
    ctx.isIos = true;
  }

  /**
   * Simple has function
   * @param str
   * @returns {boolean}
   */
  const has = str => agentLowerCase.indexOf(toLowerCase(str)) > -1;

  /**
   * Get the actual version, ctx function is used for IE to detect the real version regardless of the document mode used for excluding browsers
   * @param name
   * @param ver
   * @returns {*}
   */
  const getActualVersion = (name, ver) => {
    if (name !== "IE" || ver <= 6 || ver >= 10) {
      return ver;
    } else if (!has("Trident") && ver == 7) {
      return 7;
    } else if (has("Trident/6.0") && ver <= 10) {
      return 10;
    } else if (has("Trident/5.0") && ver <= 9) {
      return 9;
    } else if (has("Trident/4.0") && ver < 9) {
      // Trident/X.0 is supposed to be IE+ only, but it is sometime in IE7
      // IE8 in compatibility mode can look like an IE7 userAgent with the bonus Trident/X.0
      // the difference is IE8 compatibility contains 'WOW64'
      if (has("WOW64")) return 8;
      return ver == 7 ? ver : 8;
    } else {
      return ver;
    }
  };

  /**
   * Get the os name
   * @param agt {String} User agent
   * @param isMob {Boolean} Is this mobile?
   * @returns {*}
   */
  const getOsName = (agt, isMob) => {
    // Get the desktop os names
    if (!isMob) {
      if (has("Windows")) {
        return "Windows";
      } else if (has("OS X")) {
        return "Mac";
      } else if (has("Linux") || has("Googlebot")) {
        return "Linux";
      } else if (has("Mac")) {
        return "Mac";
      }
    } else if (has("Windows Phone")) {
      // Windows phone should be first since it impersonates all these other ones
      return "Winphone";
    } else if (has("iPod")) {
      return "iPod";
    } else if (has("iPad")) {
      return "iPad";
    } else if (has("iPhone")) {
      return "iPhone";
    } else if ((has("blackberry") || has("playbook") || has("BB10")) && has("applewebkit")) {
      return "Blackberry";
    } else if (has("Kindle") || has("Silk")) {
      return "Kindle";
    } else if (has("BNTV") || has("Nook")) {
      return "Nook";
    } else if (has("Android")) {
      return "Android";
    } else if (isDefined(window.orientation)) {
      return "Mobile";
    } else {
      return "Other";
    }
  };

  /**
   * Ensure a number is less than one
   * @param num
   */
  const makeLessThan = (num, maxval) => {
    while (num >= maxval) {
      num /= 10;
    }
    return num;
  };

  /**
   * Get the OS Version
   * @param agt {String} The user agent
   * @param isMob {Boolean} Is this mobile?
   * @returns {*}
   */
  const getOsVersion = agt => {
    let vermatch;
    let verb;
    let maj;
    let min;
    let minv;
    let micrv;

    if (!has("windows phone") && (has("ipad") || has("iphone"))) {
      vermatch = /OS ([0-9_]*) like/gi.exec(agt);
      verb = vermatch[1].split("_");
      maj = parseInt(verb[0], 10);
      minv = parseInt(verb[1], 10);
      return maj + makeLessThan(minv, 1);
    } else if (has("googlebot")) {
      return 1;
    } else if (has("mac os x")) {
      vermatch = /OS X ([0-9_]*)/gi.exec(agt);
      verb = vermatch[1].split("_");
      maj = parseInt(verb[0], 10);
      minv = parseInt(verb[1], 10);
      micrv = parseInt(verb[2], 10);
      minv += makeLessThan(micrv, 1);
      return maj + makeLessThan(minv, 1);
    } else if (has("Windows NT")) {
      vermatch = /Windows NT ([0-9.]*)/gi.exec(agt);
      verb = vermatch[1].split(".");
      maj = parseInt(verb[0], 10);
      minv = parseInt(verb[1], 10);
      return maj + makeLessThan(minv, 1);
    } else {
      vermatch =
        agt.match(/Windows Phone OS[/\s](\d+\.?\d+)/) ||
        agt.match(/Windows Phone[/\s](\d+\.?\d+)/) ||
        agt.match(/Android[/\s](\d+\.?\d+)/);
      maj = isDefined(vermatch) ? vermatch[1] : 1;
      min = parseFloat(maj);
      if (!isNaN(min) && min > 0) {
        return min;
      }
      return maj;
    }
  };

  /**
   * Is the device zoomable
   * @returns {boolean}
   */
  const isZoomable = () => {
    if (ctx.os.name != "Winphone") {
      // Get the meta viewport
      let metaViewportTags =
        document.querySelectorAll(
          "head meta[name=viewport],head meta[name=VIEWPORT],head meta[name=Viewport]"
        ) || [];

      if (!Array.isArray(metaViewportTags)) {
        metaViewportTags = [metaViewportTags];
      }

      // Do we have meta viewport tags?
      if (metaViewportTags.length > 0) {
        // Try to find at minimum one instance of user-scalable being disabled
        const getContentAttributes = (mViewContent, val) => {
          const rgx = new RegExp(`[\\w\\W]*${val}[\\s]*=[\\s]*([^\\s,;]*)[\\w\\W]*`, "i");
          return mViewContent ? mViewContent.match(rgx) : null;
        };

        for (let i = 0; i < metaViewportTags.length; i++) {
          // Get the user-scalable attribute
          const cnctx = metaViewportTags[i].content;
          const user_scalable = getContentAttributes(cnctx, "user-scalable");
          const initial_scale = getContentAttributes(cnctx, "initial-scale");
          const maximum_scale = getContentAttributes(cnctx, "maximum-scale");

          // Break the loop if it's being set to false using 0 or no for the boolean value
          if (
            user_scalable &&
            user_scalable.length > 1 &&
            (user_scalable[1] == "0" || toLowerCase(user_scalable[1]) == "no")
          )
            return false;
          else if (initial_scale && maximum_scale)
            return !(
              initial_scale.length > 1 &&
              maximum_scale.length > 1 &&
              parseFloat(initial_scale[1]) == 1 &&
              parseFloat(maximum_scale[1]) == 1
            );
        }
        return true;
      } else {
        return true;
      }
    } else {
      return false;
    }
  };

  // Basic detection using utils methods
  const browser_name_and_version = _getBrowserNameAndVersion(agent);

  /**
   * Run the actual detection script
   */
  const doJSDetection = () => {
    ctx.browser.name = browser_name_and_version.name;
    ctx.browser.version = browser_name_and_version.version;
    ctx.browser.actualVersion = getActualVersion(ctx.browser.name, ctx.browser.version);
    ctx.os.name = getOsName(agent, ctx.isMobile);
    ctx.os.version = getOsVersion(agent, ctx.isMobile);
  };

  /**
   * Zoom methods needs to be called on Dom ready, so we attach to fs.domReady();
   */
  const setZoomAndFire = () => {
    ctx.isZoomable = isZoomable();
    ctx.isReady = true;
    ctx._internalReady.fire();
  };

  /**
   * Mobile javascript detection using FSR methods
   */
  const doMobileJSDetection = () => {
    doJSDetection();
  };

  // Do desktop browser detection
  if (!ctx.isMobile) {
    doJSDetection();
    ctx.isReady = true;
    ctx.isIE = ctx.browser.name == "IE";
    ctx._internalReady.fire();
  }

  // For ios devices we don't need to send out a request to the server
  else if (ctx.isIos || ctx.servUrl === "" || ctx.isTablet || ctx.isWinPhone) {
    doMobileJSDetection();
    setZoomAndFire();
  }
  // For all other devices we might need to send a request to the server to determine the browser object
  else {
    // Sets up the browser object given a JSON string
    const setupBrowserObj = res => {
      const tempObj = JSON.parse(res);
      ctx.browser.name = tempObj.browser.name;
      ctx.browser.version = ctx.browser.actualVersion = tempObj.browser.version;
      ctx.os.name = tempObj.os.name;
      ctx.os.version = parseFloat(tempObj.os.version);
      ctx.isMobile = tempObj.isMobile;
      ctx.isTablet = tempObj.isTablet;
      // Fire the browser ready event
      setZoomAndFire();
    };

    // Initialize session storage
    let brs;
    const suppLocalStorage = this.supportsLocalStorage;

    // Setup session Storage
    if (suppLocalStorage && !usrAgt) {
      brs = sessionStorage.getItem("ACS_BROWSER");
    }

    if (brs) {
      // If we already have a brs string cached then do not send a request
      setupBrowserObj(brs);
    } else {
      // Success callback for request
      const successFunc = res => {
        if (suppLocalStorage) {
          sessionStorage.setItem("ACS_BROWSER", res);
        }
        setupBrowserObj(res);
      };
      // Failure callback for request
      const failureFunc = () => {
        doMobileJSDetection();
        setZoomAndFire();
      };
      // Get todays date in YYYYMMDDD format used to create unique token
      const getYyyymmdd = () => {
        const today = new Date();
        const yyyy = today.getFullYear().toString();
        const mm = (today.getMonth() + 1).toString();
        const dd = today.getDate().toString();
        return yyyy + (mm[1] ? mm : `0${mm[0]}`) + (dd[1] ? dd : `0${dd[0]}`);
      };
      // Creates a unique token for the request
      const createToken = () => {
        // Passes in "null" as the origin if there is no origin
        const mstr = `${getYyyymmdd()}ForeSee${location.origin || "null"}`;
        return hashCode(mstr);
      };
      // Set the options
      const opts = {
        method: "GET",
        url: `${ctx.servUrl + createToken()}&ua=${agent}`,
        type: "*" + "/" + "*", // eslint-disable-line no-useless-concat
        contentType: "application/x-www-form-urlencoded",
        success: successFunc,
        failure: failureFunc,
      };
      // send
      new AjaxTransport(opts, true).send();
    }
  }
  // Fire the ready event if the browser is ready
};

/**
 * Check to see if we have an instance of the browser and if so return it.
 * @returns BrowserInstance
 */

const getBrowserInstance = (() => {
  let browserInstance;

  function returnBrowser() {
    if (!browserInstance) {
      browserInstance = new Browser();
      return browserInstance;
    }

    return browserInstance;
  }

  return returnBrowser;
})();

/**
 * Get a Javascript object that returns a the name and version of a browser
 * @param agent {string} User-agent string
 * @returns {{name: string, version: *}}
 * @private
 */
function _getBrowserNameAndVersion(agent) {
  let name = "Unknown";
  let version;
  let regex_match;

  // Look for a Regex Match (match the browser name as well as the version)
  if ((regex_match = agent.match(/Opera[/\s](\d+\.\d+)/)) !== null) {
    name = "Opera";
  } else if ((regex_match = agent.match(/Edge\/([0-9.]*)/)) !== null) {
    name = "Edge";
  } else if ((regex_match = agent.match(/opr[/\s](\d+\.\d+)/i)) !== null) {
    name = "Opera";
  } else if ((regex_match = agent.match(/Windows Phone[/\s](\d+\.\d+)/)) !== null) {
    name = "IEMobile";
  } else if ((regex_match = agent.match(/Trident\/7.0/)) !== null) {
    name = "IE";
    version = 11;
  } else if ((regex_match = agent.match(/MSIE (\d+\.\d+)/)) !== null) {
    name = "IE";
  } else if ((regex_match = agent.match(/Navigator[/\s](\d+\.\d+)/)) !== null) {
    name = "Netscape";
  } else if ((regex_match = agent.match(/Chrome[/\s](\d+\.\d+)/)) !== null) {
    name = "Chrome";
  } else if ((regex_match = agent.match(/CriOS[/\s](\d+\.\d+)/)) !== null) {
    name = "Chrome";
  } else if ((regex_match = agent.match(/Version\/([0-9.]*)[\w\W]*Safari/i)) !== null) {
    name = "Safari";
  } else if ((regex_match = agent.match(/Firefox[/\s](\d+\.\d+)/)) !== null) {
    name = "Firefox";
  } else if ((regex_match = agent.match(/googlebot/gi)) !== null) {
    name = "Chrome";
    version = 44;
  } else if (hasProp(window, "ActiveXObject") && !window.ActiveXObject) {
    name = "IE";
    version = 11;
  }

  return {
    name,
    version: version || (regex_match !== null ? parseFloat(regex_match[1]) : undefined),
  };
}

export { getBrowserInstance, Browser };
