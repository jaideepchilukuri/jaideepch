/**
 * Browser detection
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Dom.Browser");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Basic");
fs.require("fs.Utils.Misc.Urls");
fs.require("fs.Utils.Network.Ajax");
fs.require("fs.Misc.Fingerprint");

(function (utils) {
  /**
   * The browser detection class.
   * @param usrAgt {string} (OPTIONAL) User agent string. If not set, we get the user agent string from navigator.userAgent
   * @returns {*}
   * @constructor
   */
  utils.Browser = function (usrAgt) {
    // Create a reference to for compression benefits
    var ctx = this,
      agent = (usrAgt || navigator.userAgent),
      agentLowerCase = fs.toLowerCase(agent);

    // Initialize some variables
    fs.ext(ctx, {
      agent: agent,
      os: {
        name: '',
        version: 0
      },
      browser: {
        name: '',
        version: 0,
        actualVersion: 0
      },
      isMobile: (/iphone|ipad|ipod|android|kindle|silk|bntv|nook|blackberry|playbook|mini|windows\sce|windows\sphone|palm|bb10/i.test(agent) || !!window.orientation),
      isTablet: /ipad|playbook|nook|bntv/i.test(agent),
      isWinPhone: /Windows Phone/i.test(agent),
      fp: '',
      supportsLocalStorage: false,
      supportsPostMessage: !!window.postMessage,
      isIE: false,
      isZoomable: true,
      supportsSVG: document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"),
      isReady: false,
      ready: new utils.FSEvent(),
      _internalReady: new utils.FSEvent(),
      isIos: false,
      servUrl: location.protocol + '/' + '/device.4seeresults.com/detect?accessToken='
    });

    // Test to see if DOM storage works
    try {
      if (localStorage) {
        localStorage.setItem('a', 'b');
        ctx.supportsLocalStorage = true;
      }
    } catch (e) {
    }

    // Watch for the internal ready thing
    ctx._internalReady.subscribe(function () {
      // Set up the fingerprint
      ctx.fp = new Fingerprint(ctx);
      ctx.fp.ready.subscribe(function () {
        // Reassign the sig string to the fp var
        ctx.fp = ctx.fp.sig;
        ctx.ready.fire(ctx);
      }, true, true);
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
    var has = function (str) {
      return (agentLowerCase.indexOf(fs.toLowerCase(str)) > -1);
    };

    /**
     * Get the actual version, ctx function is used for IE to detect the real version regardless of the document mode used for excluding browsers
     * @param name
     * @param ver
     * @returns {*}
     */
    var getActualVersion = function (name, ver) {
      if (name != 'IE') {
        return ver;
      } else {
        if (ver > 6 && ver < 10) {
          if (!has("Trident") && ver == 7) {
            return 7;
          } else if (has("Trident/5.0") && ver <= 9) {
            return 9;
          } else if (has("Trident/4.0") && ver < 9) {
            // Trident/X.0 is supposed to be IE+ only, but it is sometime in IE7
            // IE8 in compatibility mode can look like an IE7 userAgent with the bonus Trident/X.0
            // the difference is IE8 compatibility contains 'WOW64'
            if (has("WOW64"))
              return 8;
            return (ver == 7 ? ver : 8);
          } else {
            return ver;
          }
        } else {
          return ver;
        }
      }
    };

    /**
     * Get the os name
     * @param agt {String} User agent
     * @param isMob {Boolean} Is this mobile?
     * @returns {*}
     */
    var getOsName = function (agt, isMob) {
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
      }
      // Mobile device
      else {
        // Windows phone should be first since it impersonates all these other ones
        if (has("Windows Phone")) {
          return "Winphone";
        } else if (has("iPod")) {
          return "iPod";
        } else if (has("iPad")) {
          return "iPad";
        } else if (has("iPhone")) {
          return "iPhone";
        } else if ((has("blackberry") || has("playbook") || has("BB10")) && has('applewebkit')) {
          return "Blackberry";
        } else if (has("Kindle") || has("Silk")) {
          return "Kindle";
        } else if (has("BNTV") || has("Nook")) {
          return "Nook";
        } else if (has("Android")) {
          return "Android";
        } else if (fs.isDefined(window.orientation)) {
          return "Mobile";
        } else {
          return "Other";
        }
      }
    };

    /**
     * Ensure a number is less than one
     * @param num
     */
    var makeLessThan = function (num, maxval) {
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
    var getOsVersion = function (agt, isMob) {
      var vermatch,
        verb,
        maj,
        min,
        minv,
        micrv;

      if (!has('windows phone') && (has('ipad') || has('iphone'))) {
        vermatch = (/OS ([0-9_]*) like/gi).exec(agt);
        verb = vermatch[1].split('_');
        maj = parseInt(verb[0]);
        minv = parseInt(verb[1]);
        return maj + makeLessThan(minv, 1);
      } else if (has('googlebot')) {
        return 1;
      } else if (has('mac os x')) {
        vermatch = (/OS X ([0-9_]*)/gi).exec(agt);
        verb = vermatch[1].split('_');
        maj = parseInt(verb[0]);
        minv = parseInt(verb[1]);
        micrv = parseInt(verb[2]);
        minv = minv + makeLessThan(micrv, 1);
        return maj + makeLessThan(minv, 1);
      } else if (has('Windows NT')) {
        vermatch = (/Windows NT ([0-9\.]*)/gi).exec(agt);
        verb = vermatch[1].split('.');
        maj = parseInt(verb[0]);
        minv = parseInt(verb[1]);
        return maj + makeLessThan(minv, 1);
      } else {
        vermatch = agt.match(/Windows Phone OS[\/\s](\d+\.?\d+)/) || agt.match(/Windows Phone[\/\s](\d+\.?\d+)/) || agt.match(/Android[\/\s](\d+\.?\d+)/);
        maj = fs.isDefined(vermatch) ? vermatch[1] : 1;
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
    var isZoomable = function () {
      if (ctx.os.name != "Winphone") {
        // Get the meta viewport
        var metaViewportTags = document.querySelectorAll("head meta[name=viewport],head meta[name=VIEWPORT],head meta[name=Viewport]") || [];

        if (!fs.isArray(metaViewportTags)) {
          metaViewportTags = [metaViewportTags];
        }

        // Do we have meta viewport tags?
        if (metaViewportTags.length > 0) {
          // Try to find at minimum one instance of user-scalable being disabled
          var getContentAttributes = function (mViewContent, val) {
            var rgx = new RegExp("[\\w\\W]*" + val + "[\\s]*=[\\s]*([^\\s,;]*)[\\w\\W]*", "i");
            return !!mViewContent ? (mViewContent).match(rgx) : null;
          };

          for (var i = 0; i < metaViewportTags.length; i++) {
            // Get the user-scalable attribute
            var cnctx = (metaViewportTags[i].content),
              user_scalable = getContentAttributes(cnctx, "user-scalable"),
              initial_scale = getContentAttributes(cnctx, "initial-scale"),
              maximum_scale = getContentAttributes(cnctx, "maximum-scale");

            // Break the loop if it's being set to false using 0 or no for the boolean value
            if ((user_scalable && user_scalable.length > 1) && (user_scalable[1] == "0" || fs.toLowerCase(user_scalable[1]) == "no"))
              return false;
            else if (initial_scale && maximum_scale)
              return !(initial_scale.length > 1 && maximum_scale.length > 1 && parseFloat(initial_scale[1]) == 1 && parseFloat(maximum_scale[1]) == 1);
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
    var browser_name_and_version = utils._getBrowserNameAndVersion(agent);

    /**
     * Run the actual detection script
     */
    var doJSDetection = function () {
      ctx.browser.name = browser_name_and_version.name;
      ctx.browser.version = browser_name_and_version.version;
      ctx.browser.actualVersion = getActualVersion(ctx.browser.name, ctx.browser.version);
      ctx.os.name = getOsName(agent, ctx.isMobile);
      ctx.os.version = getOsVersion(agent, ctx.isMobile);
    };

    /**
     * Zoom methods needs to be called on Dom ready, so we attach to fs.domReady();
     */
    var setZoomAndFire = function () {
      ctx.isZoomable = isZoomable();
      ctx.isReady = true;
      ctx._internalReady.fire();
    };

    /**
     * Mobile javascript detection using FSR methods
     */
    var doMobileJSDetection = function () {
      doJSDetection();
    };

    // Do desktop browser detection
    if (!ctx.isMobile) {
      doJSDetection();
      ctx.isReady = true;
      ctx.isIE = ctx.browser.name == 'IE';
      ctx._internalReady.fire();
    }

    // For ios devices we don't need to send out a request to the server
    else if (ctx.isIos || ctx.servUrl === '' || ctx.isTablet || ctx.isWinPhone) {
      doMobileJSDetection();
      setZoomAndFire();
    }
    // For all other devices we might need to send a request to the server to determine the browser object
    else {
      // Sets up the browser object given a JSON string
      var setupBrowserObj = function (res) {
        var tempObj = JSON.parse(res);
        ctx.browser.name = tempObj.browser.name;
        ctx.browser.version = ctx.browser.actualVersion = tempObj.browser.version;
        ctx.os.name = tempObj.os.name;
        ctx.os.version = tempObj.os.version;
        ctx.isMobile = tempObj.isMobile;
        ctx.isTablet = tempObj.isTablet;

        // Fire the browser ready event
        setZoomAndFire();
      };
      // Initialize session storage
      var brs,
        suppLocalStorage = this.supportsLocalStorage;

      // Setup session Storage
      if (suppLocalStorage && !usrAgt) {
        brs = sessionStorage.getItem("ACS_BROWSER");
      }

      if (brs) {
        // If we already have a brs string cached then do not send a request
        setupBrowserObj(brs);
      } else {
        // Success callback for request
        var successFunc = function (res) {
          if (suppLocalStorage) {
            sessionStorage.setItem("ACS_BROWSER", res);
          }
          setupBrowserObj(res);
        };
        // Failure callback for request
        var failureFunc = function () {
          doMobileJSDetection();
          setZoomAndFire();
        };
        // Get todays date in YYYYMMDDD format used to create unique token
        var getYyyymmdd = function () {
          var today = new Date(),
            yyyy = today.getFullYear().toString(),
            mm = (today.getMonth() + 1).toString(),
            dd = today.getDate().toString();
          return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]);
        };
        // Creates a unique token for the request
        var createToken = function () {
          // Passes in "null" as the origin if there is no origin
          var mstr = getYyyymmdd() + "ForeSee" + (location.origin || "null");
          return utils.hashCode(mstr);
        };
        // Set the options
        var opts = {
          method: "GET",
          url: ctx.servUrl + createToken() + "&ua=" + agent,
          type: '*' + '/' + '*',
          contentType: "application/x-www-form-urlencoded",
          success: successFunc,
          failure: failureFunc
        };
        // send
        new utils.AjaxTransport(opts, true).send();
      }
    }
    // Fire the ready event if the browser is ready
  };


  /**
   * Check to see if we have an instance of the browser and if so return it.
   * @returns BrowserInstance
   */

  utils.getBrowserInstance = (function () {
    var browserInstance;

    function returnBrowser() {
      if (!browserInstance) {
        browserInstance = new utils.Browser();
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
  utils._getBrowserNameAndVersion = function (agent) {
    var name = "Unknown",
      version,
      regex_match;

    // Look for a Regex Match (match the browser name as well as the version)
    if ((regex_match = agent.match(/Opera[\/\s](\d+\.\d+)/)) !== null) {
      name = 'Opera';
    } else if ((regex_match = agent.match(/Edge\/([0-9\.]*)/)) !== null) {
      name = "IE";
    } else if ((regex_match = agent.match(/opr[\/\s](\d+\.\d+)/i)) !== null) {
      name = 'Opera';
    } else if ((regex_match = agent.match(/Windows Phone[\/\s](\d+\.\d+)/)) !== null) {
      name = 'IEMobile';
    } else if ((regex_match = agent.match(/MSIE (\d+\.\d+)/)) !== null) {
      name = 'IE';
    } else if ((regex_match = agent.match(/Navigator[\/\s](\d+\.\d+)/)) !== null) {
      name = 'Netscape';
    } else if ((regex_match = agent.match(/Chrome[\/\s](\d+\.\d+)/)) !== null) {
      name = 'Chrome';
    } else if ((regex_match = agent.match(/CriOS[\/\s](\d+\.\d+)/)) !== null) {
      name = 'Chrome';
    } else if ((regex_match = agent.match(/Version\/([0-9\.]*)[\w\W]*Safari/i)) !== null) {
      name = 'Safari';
    } else if ((regex_match = agent.match(/Firefox[\/\s](\d+\.\d+)/)) !== null) {
      name = 'Firefox';
    } else if ((regex_match = agent.match(/googlebot/gi)) !== null) {
      name = "Chrome";
      version = 44;
    } else if (Object.hasOwnProperty.call(window, "ActiveXObject") && !window.ActiveXObject) {
      name = "IE";
      version = 11;
    }
    return {
      "name": name,
      "version": version || (regex_match !== null ? parseFloat(regex_match[1]) : undefined)
    };
  };

})(utils);
