/**
 * Record Configuration *****************************************************
 */
var config = {
  /**
   * URL blacklisting, so you can disable record on pages you don't want it to
   * run on.
   */
  blacklist: {
    text: [],
    variables: [],
    cookies: []
  },
  whitelist: {
    text: [],
    variables: [],
    cookies: []
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
     * Set up cxReplay pools, which apply before cxR is activated. This is a
     * sticky state and once you are out, you're out (unless you get
     * re-pooled back in)
     */
    replay_pools: [
      {
        /**
         * Which path to apply this rule to
         */
        path: ".",
        /**
         * This is a special pooling number (like a sampling percentage)
         * that applies before any sampling, loyalty factor, or anything
         * else. It's used mainly only to reduce capture when using cxReplay
         */
        sp: 100
      }
    ],

    /**
     * Global exclude. These supercede anything else. Once a user has been
     * excluded, that's it. They don't have another opportunity to be
     * re-included until the repeat days pass.
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
     * List of supported browsers Note: IE 𝓍 means we support 𝓍 and above
     * Note: Firefox 14+ due to MutationObservers
     */
    browser_cutoff: {
      IE: 11,
      Edge: 1,
      Safari: 8,
      Firefox: 30,
      Chrome: 38,
      "Chrome Mobile": 38,
      Opera: 1000
    },

    /**
     * List of supported platforms Note: Android 4 means we support 4 and
     * above Note: Android 4.4 because of MutationObserver Note: No support
     * for Windows phone
     */
    platform_cutoff: {
      Android: 5.0,
      Winphone: 99,
      iPod: 8,
      iPhone: 8,
      iPad: 8
    },

    /**
     * We can exclude some device types for record only here If undefined,
     * this will default to all devices true. cxRecord needs to be set to
     * true in trigger_config.js
     */
    device_type_support: {
      desktop: true,
      phone: true,
      tablet: true
    },

    /**
     * Name of device and the token to look for in the user agent string.
     * Not case sensitive
     */
    device_blacklist: ["blackberry"],

    /**
     * @name pii The PII JSON that targets which elements should be
     *       masked/unmasked. Note that we now use masking syntax. EG:
     *       "*myURLFragment*". See utils.testAgainstSearch() for docs.
     *
     * Note: by default, all contents of all pages are masked, including all
     * text inputs. Everything that follows is about loosening that
     * restriction.
     *
     * Also Note: inputs are always masked by default (whitelisting mode),
     * even if the rest of the page is in the pagesToSelectiveMask list and
     * has selectiveMaskZones set up. This is to make really sure that
     * inputs cannot accidently leak PII. If a new field is added to a form,
     * it will always be masked unless configured otherwise with
     * visibleInputs
     *
     * UPGRADING: The code has a very simple algorithm to assist in
     * upgrading old configs. Simply run record with the old configs and it
     * will emit a helpful console message (even in production) with a crude
     * guess of what the config should be. It just copy-pastes some of the
     * old configs into the new fields. Just copy-paste that into the pii
     * block below and go from there. You may need to clean up some bad
     * guesses and properly configure pagesToSelectiveMask.
     *
     * @prop {Object} selectiveUnMaskZones this defines areas of pages to be
     *       UNMASKED on pages that would normally be completely masked
     *       (whitelisting).
     *
     * @prop {Array<String>} pagesToSelectiveMask This identifies page
     *       URL's (by wildcard) that switch from automatic mask-everything
     *       (whitelisting) to blacklisting. If a page falls into this
     *       category, we ignore all rules inside selectiveUnMaskZones and
     *       look instead at selectiveMaskZones.
     *
     * @prop {Object} selectiveMaskZones Identifies elements on pages to
     *       mask for pages that are in pagesToSelectiveMask. A page must
     *       already be in the pagesToSelectiveMask list to qualify for this
     *       type of masking.
     *
     * @prop {Object} visibleInputs Identifies inputs, textareas and selects
     *       to unblock. Works even when elements are inserted into
     *       document. Only use this when necessary, it's not as efficient.
     *
     * @prop {Object} redactZones Identifies elements to obscuring. This
     *       will result in everything inside it to be blacked out,
     *       including images and text. This still could reasult in the
     *       contents being transmitted to the server, but the viewer will
     *       not see it. Useful for profile images and the like.
     */
    pii: {
      selectiveUnMaskZones: {
        /*
         * "*": "div"
         */
      },
      pagesToSelectiveMask: [
        /*
         * "*"
         */
      ],
      selectiveMaskZones: {
        /*
         * "*": "div"
         */
      },
      visibleInputs: {
        /*
         * "*": "#myta2, #firstName2", "url2": ".css_selector3,
         * .css_selector4"
         */
      },
      redactZones: {
        /*
         * "*": "#manateeImg"
         */
      }
    },

    /**
     * Should we skip the tracking of iFrames
     */
    skipIframes: false
  }
};
