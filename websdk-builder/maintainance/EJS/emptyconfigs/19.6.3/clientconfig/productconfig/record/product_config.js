/**
 * Record Configuration *****************************************************
 */
var config = {
  /**
   * URL blacklist
   */
  blacklist: {
    active: false,
    text: [],
    variables: [],
    cookies: []
  },
  whitelist: {
    active: false,
    text: [],
    variables: [],
    cookies: []
  },

  /**
   * The replay_id
   */
  clientId: "${client.replayid}",

  /**
   * customerId
   */
  id: "${client.id}",

  /**
   * Other settings
   */
  advancedSettings: {
    /**
     * Tell us the general layout of the site's main column.
     * Valid options: 'LEFTFIXED', 'CENTERFIXED', 'LEFTSTRETCH', or 'CENTERSTRETCH'
     */
    layout: "CENTERFIXED",

    /**
     * Set up cxReplay pools, which apply before cxR is activated. This is a sticky state and once
     * you are out, you're out (unless you get re-pooled back in)
     */
    replay_pools: [
      {
        /**
         * Which path to apply this rule to
         */
        path: ".",
        /**
         * This is a special pooling number (like a sampling percentage) that applies before
         * any sampling, loyalty factor, or anything else. It's used mainly only to reduce
         * capture when using cxReplay
         */
        sp: 100
      }
    ],

    /**
     * Global exclude. These supercede anything else. Once a user has been excluded, that's it.
     * They don't have another opportunity to be re-included until the repeat days pass.
     */
    exclude: {
      urls: [],
      referrers: [],
      userAgents: [],
      browsers: [],
      cookies: [],
      variables: []
    },

    /**
     * List of supported browsers
     * Note: IE 𝓍 means we support 𝓍 and above
     * Note: Firefox 14+ due to MutationObservers
     */
    browser_cutoff: {
      IE: 11,
      Safari: 5.1,
      Firefox: 14,
      Chrome: 20,
      "Chrome Mobile": 20,
      Opera: 1000
    },

    /**
     * List of supported platforms
     * Note: Android 4 means we support 4 and above
     * Note: Android 4.4 because of MutationObserver
     */
    platform_cutoff: {
      Android: 5.0,
      Winphone: 8,
      iPod: 7,
      iPhone: 7,
      iPad: 7
    },

    /**
     * We can exclude some device types for record only here
     * If undefined, this will default to all devices true. cxRecord needs to be set to true in trigger_config.js
     */
    device_type_support: {
      desktop: true,
      phone: true,
      tablet: true
    },

    /**
     * Name of device and the token to look for in the user agent string. Not case sensitive
     */
    device_blacklist: ["HTC_Rezound", "blackberry"],

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
      staticBlockEls: {},
      dynamicBlockEls: {
        /*
         "url1" : (BROWSER.browser.name == "IE" && BROWSER.browser.version == 8) ? ".css_selector1" : ".css_selector2"
         , "url2" : ".css_selector3, .css_selector4"
         */
      },
      staticVisibleEls: {},
      dynamicVisibleEls: {
        /*
         "url1" : (BROWSER.browser.name == "IE" && BROWSER.browser.version == 8) ? ".css_selector1" : ".css_selector2"
         , "url2" : ".css_selector3, .css_selector4"
         */
      },
      assetBlockEls: {},
      removeVisibilityEls: {},
      obscureEls: {},

      // Note: if you specify these, they override blacklisting and we become a whitelisting operation on this page
      // URL Matching for Whitelist uses utils.testAgainstSearch() - SESSIONREPLAY-1410
      staticWhiteListEls: {},
      dynamicWhiteListEls: {
        /*
         "*url3*" : ".css_selector5, .css_selector6"
         , "*url4" : ".css_selector7, ".css_selector8"
         */
      }
    },

    /**
     * Enable SVG capturing.
     */
    svgCaptureEnabled: false,

    /**
     * Elements to watch scroll on  (sample usage: scrollEls: "div,ul",)
     */
    scrollEls: null,

    /**
     * Use element level DOM mutation method rewrites instead of prototype mutation method rewrites.
     * Default will run this on for IE8, but not IE9
     */
    useEleMutation: false,

    /**
     * Custom regular expressions used in 'processHTML' function to get rid of content from the HTML
     */
    regexScrub: [],

    /**
     * Set of rules for determining if page should be recorded in low fidelity mode. For a page to match one of
     * the rules it must match the url wildcard, the browser type and must be less than or equal to the
     * browser version number.
     */
    lowFidelity: [],

    /**
     * Customize the CSS selector that targets the watchNodeList for IE. The watchNodeList is the list of HTML
     * nodes that Internet Explorer captures interactions with.
     */
    watchNodeList: "",

    /**
     * Set Keep comments to true to stop the removal of html comment content during HTML serialization.
     */
    keepComments: false,

    /**
     * Should we skip the tracking of iFrames
     */
    skipIframes: false,

    /**
     * Should we skip gZip compression
     */
    skipCompression: false
  }
};
