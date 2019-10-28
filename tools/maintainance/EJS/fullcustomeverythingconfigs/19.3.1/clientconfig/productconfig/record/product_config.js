/**
 * Record Configuration *****************************************************
 */
var config = {
  /**
   * URL blacklist
   */
  blacklist: {
    active: true,
    text: ["*custom_blacklisttext*"]
  },

  /**
   * The replay_id
   */
  clientId: "${client.replayid}",

  /**
   * Other settings
   */
  advancedSettings: {
    /**
     * Tell us the general layout of the site's main column.
     * Valid options: 'LEFTFIXED', 'CENTERFIXED', 'LEFTSTRETCH', or 'CENTERSTRETCH'
     */
    layout: "LEFTSTRETCH",

    /**
     * Set up cxReplay pools, which apply before cxR is activated. This is a sticky state and once
     * you are out, you're out (unless you get re-pooled back in)
     */
    replay_pools: [
      {
        /**
         * Which path to apply this rule to
         */
        path: "custom_replay_poolspath",
        /**
         * This is a special pooling number (like a sampling percentage) that applies before
         * any sampling, loyalty factor, or anything else. It's used mainly only to reduce
         * capture when using cxReplay
         */
        sp: 99
      }
    ],

    /**
     * Global exclude. These supercede anything else. Once a user has been excluded, that's it.
     * They don't have another opportunity to be re-included until the repeat days pass.
     */
    exclude: {
      urls: ["*custom_excludeurl*", "*custom_excludeurl2*"],
      referrers: ["*custom_excludereferrers*", "*custom_excludereferrers2*"],
      userAgents: ["custom_excludeuseragent"],
      browsers: [
        {
          name: "AOL Shield Browser", // you can just have the browser name, or include the comparison stuff below
          comparison: "lt", // lt = less than, gt == greater than, eq == equals
          version: 3
        }
      ],
      cookies: [
        {
          name: "custom_excludecookiename",
          value: "custom_excludecookievalue" // omit 'value' altogether if you just want to check if a cookie exists or not
        }
      ],
      variables: [
        {
          name: "custom_excludevariablename",
          value: "custom_excludevariablevalue" // omit 'value' altogether if you want to check if the var exists or not
        }
      ]
    },

    /**
     * List of supported browsers
     * Note: IE 10 means we support 10 and above
     * Note: Firefox 14+ due to MutationObservers
     */
    browser_cutoff: {
      IE: 1,
      Safari: 1,
      Firefox: 1,
      Chrome: 1,
      "Chrome Mobile": 1,
      Opera: 1
    },

    /**
     * List of supported platforms
     * Note: Android 4 means we support 4 and above
     * Note: Android 4.4 because of MutationObserver
     */
    platform_cutoff: {
      Android: 1,
      Winphone: 1,
      iPod: 1,
      iPhone: 1,
      iPad: 1
    },

    /**
     * We can exclude some device types for record only here
     * If undefined, this will default to all devices true. cxRecord needs to be set to true in trigger_config.js
     */
    device_type_support: {
      desktop: false,
      phone: false,
      tablet: false
    },

    /**
     * Name of device and the token to look for in the user agent string. Not case sensitive
     */
    device_blacklist: ["custom_recorddevice_blacklist"],

    /**
     * @namespace The PII JSON that targets which elements should be masked/unmasked. Note that we now use
     * whitelisting syntax. EG: "*myURLFragment*". See utils.testAgainstSearch() for docs.
     *
     * @key staticBlockEls : Matches url wildcards with CSS selectors that targets which elements to block on
     *  that page. Only applied once to the elements when page loaded therefore it
     *  doesn't work for elements that are dynamically inserted into document. For that use case, use
     *  dynamicBlockEls.
     *
     * @key dynamicBlockEls : Identifies elements to block. Works even when elements are inserted into document.
     *  Only use this when necessary, it's not as efficient.
     *
     * @key staticVisibleEls : Matches url wildcards with CSS selectors that targets which elements to block on
     *  that page. Only applied once to the elements when page loaded therefore it
     *  doesn't work for elements that are dynamically inserted into document. For that use case, use
     *  dynamicBlockEls.
     *
     * @key dynamicVisibleEls : Identifies inputs, textareas and selects to unblock. Works even when elements are
     *  inserted into document. Only use this when necessary, it's not as efficient.
     *
     * @key assetBlockEls : Identifies assets to block. Most common asset asked to be blocked are images.
     *
     * @key removeVisibilityEls : Unblocks elements that were made visible by dynamicVisibleEls. Common use case is
     *  when we want to unblock all select tags but then block specific select tags (e.g.: credit card expiry)
     *
     *  @key obscureEls : Identifies elements to obscuring. Obscuring an element will result in a div being
     *      drawn over top of that element with a message reading that this item has been blocked by Foresee.
     */
    pii: {
      staticBlockEls: {
        "*custom_staticBlockElsurl*": "#custom_staticBlockElscssselector"
      },
      dynamicBlockEls: {
        "*custom_dynamicBlockElsurl*": "#custom_dynamicBlockElscssselector"
      },
      staticVisibleEls: {
        "*custom_staticVisibleElsurl*": "#custom_staticVisibleElscssselector"
      },
      dynamicVisibleEls: {
        "*custom_dynamicVisibleElsurl*": "#custom_dynamicVisibleElscssselector"
      },
      assetBlockEls: {
        "*custom_assetBlockElsurl*": "#custom_assetBlockElscssselector"
      },
      removeVisibilityEls: {
        "*custom_removeVisibilityElsurl*":
          "#custom_removeVisibilityElscssselector"
      },
      obscureEls: { "*custom_obscureElsurl*": "#custom_obscureElscssselector" },

      // Note: if you specify these, they override blacklisting and we become a whitelisting operation on this page
      // URL Matching for Whitelist uses utils.testAgainstSearch() - SESSIONREPLAY-1410
      staticWhiteListEls: {
        "*custom_staticWhiteListElsurl*":
          "#custom_staticWhiteListElscssselector"
      },
      dynamicWhiteListEls: {
        "*custom_dynamicWhiteListElsurl*":
          "#custom_dynamicWhiteListElscssselector"
      }
    },

    /**
     * Enable SVG capturing.
     */
    svgCaptureEnabled: true,

    /**
     * Elements to watch scroll on  (sample usage: scrollEls: "div,ul",)
     */
    scrollEls: "custom_scrollElsfakeelement",

    /**
     * Use element level DOM mutation method rewrites instead of prototype mutation method rewrites.
     * Default will run this on for IE8, but not IE9
     */
    useEleMutation:
      !!!document.addEventListener && navigator.userAgent.indexOf("MSIE")
        ? true
        : false, // let's just ignore this one

    /**
     * Custom regular expressions used in 'processHTML' function to get rid of content from the HTML
     */
    regexScrub: [], // let's just ignore this one

    /**
     * Set of rules for determining if page should be recorded in low fidelity mode. For a page to match one of
     * the rules it must match the url wildcard, the browser type and must be less than or equal to the
     * browser version number.
     */
    lowFidelity: [], // let's just ignore this one

    /**
     * Customize the CSS selector that targets the watchNodeList for IE. The watchNodeList is the list of HTML
     * nodes that Internet Explorer captures interactions with.
     */
    watchNodeList: "", // let's just ignore this one

    /**
     * Set Keep comments to true to stop the removal of html comment content during HTML serialization.
     */
    keepComments: false, // let's just ignore this one

    /**
     * Should we skip the tracking of iFrames
     */
    skipIframes: true,

    /**
     * Should we skip gZip compression
     */
    skipCompression: false // let's just ignore this one
  }
};
