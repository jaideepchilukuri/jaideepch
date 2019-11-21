/**
 * ForeSee Trigger Configuration *****************************************************
 */
module.exports = {
  /**
   * These configs have been removed from this config file:
   *  * `id` is `client.id` in client_properties
   *  * `site_id` is `client.siteid` in client_properties
   *  * `site_key` is `client.sitekey` in client_properties
   *  * `surveyAsyncCurl` is `client.surveyasynccurl` in client_properties
   *  * `hasReplay` is removed
   */

  /**
   * How many milliseconds (1000/sec) to wait after the page first appears to initiate trigger
   */
  triggerDelay: 1,

  /**
   * How many milliseconds (1000/sec) to wait after the page first appears to show the invite
   */
  inviteDelay: 1,

  /**
   * If the page changes the URL programmatically within this many milliseconds of initial
   * page load, then ignore the URL change and do not restart the SDK.
   */
  pageLoadUrlChangeBlackout: 1,

  /**
   * This is the number of times the invite will appear on mobile (Comment out unless client says otherwise)
   * example: If 3 it will apear the intial time and then two more times
   */
  pagesInviteAvailable: 1,

  /**
   * We only show the invite
   */
  repeatDays: {
    decline: 1,
    accept: 1,
  },

  /**
   * Time in milliseconds to reset page views in storage. If undefined, defaults to 24 hours
   */
  pageViewsResetTimeout: 1,

  /**
   * Time in milliseconds to reset CPPS. If undefined, defaults to 24 hours
   */
  cppsResetTimeout: 1,

  /**
   * Time in milliseconds to reset surveyDef expiration. If undefined, defaults to 24 hours
   */
  surveyDefResetTimeout: 1,

  /**
   * How many milliseconds (1000/sec) to wait before converting the tracker
   */
  trackerConvertsAfter: 1,

  /**
   * Ping time between the main window and the tracker window. (in milliseconds)
   * It is used as a base to detect when to convert the tracker to a survey under normal circumstances
   */
  trackerHeartbeatTimeout: 1,

  /**
   * Ping time between the main window and the tracker window. (in milliseconds)
   * Applied right before the main window "unloads" (closes, navigate to another URL)  so the Tracker will know to wait longer than a normal heartbeat before assuming the window is closed for real.
   */
  trackerHeartbeatLongTimeout: 1,

  /**
   * For SMS and email on-exit measures, how long do we delay between heartbeats?
   */
  onExitMobileHeartbeatInterval: 1,

  /**
   * How many milliseconds to wait before possibly re-inviting someone after abandoning the invite
   */
  reinviteDelayAfterInviteAbandon: 1,

  /**
   * Center the tracker popup window on the browser window. Otherwise the tracker
   * pops near 50,50. Note that this is just a suggestion and the OS/Browser may
   * ignore it. Not all browsers implement this feature.
   */
  centerTrackerPopup: true,

  /**
   * Do we allow things to run if we're not in the top frame? Default: 'dontRunOtherIframes'
   * Three options:
   *  - 'runAllIframes': Allow ability to Trigger and Record on all iFrames.
   *  - 'runRecordOnly': won't run Trigger but runs Record on Iframes.
   *  - 'dontRunOtherIframes': Won't allow Trigger or Record to work in other iFrames.
   */
  workInIframes: "runAllIframes",

  /**
   * A/B Test the Survey Type (modern vs legacy)
   */
  abSurveyType: {
    /**
     * Specify the percentage of modern surveys presented for each survey def.
     */
    defs: [
      {
        name: "custom_abSurveyTypedefsname",
        section: "custom_abSurveyTypedefssection",
        site: "custom_abSurveyTypedefssite",
        modernPercentage: 1,
      },
    ],

    /**
     * Enable A/B testing with above percentages.
     */
    shouldTest: true,
  },

  /**
   * Turn on Modern Survey Only. This will override A/B testing.
   */
  onlyModernSurvey: true,

  /**
   * Should we ignore HTML5 navigation events? Default: false
   */
  ignoreNavigationEvents: true,

  /**
   * Public API name override. If undefined, defaults to "FSR"
   */
  publicApiName: "custom_publicapiname",

  /**
   * Global exclude. These override anything else. Once a user has been excluded, that's it.
   * They don't have another opportunity to be re-included until the repeat days pass.
   */
  globalExclude: {
    urls: ["*custom_globalexcludeurl*", "*custom_globalexcludeurl2*"],
    referrers: ["*custom_globalexcludereferrers*", "*custom_globalexcludereferrers2*"],
    userAgents: ["custom_globalexcludeuseragent"],
    browsers: [{ name: "AOL Shield Browser", comparison: "lt", version: 3 }],
    cookies: [{ name: "custom_globalexcludecookiename", value: "custom_globalexcludecookievalue" }],
    variables: [
      { name: "custom_globalexcludevariablename", value: "custom_globalexcludevariablevalue" },
    ],
    cpps: [{ name: "custom_globalexcludecppname", value: "custom_globalexcludecppvalue" }],
  },

  /**
   * These items exclude inviting on a page. They don't prevent a definition from being selected,
   * but we won't actually invite if they meet these conditions.
   */
  inviteExclude: {
    urls: ["*custom_inviteexcludeurl*", "*custom_inviteexcludeurl2*"],
    referrers: ["*custom_inviteexcludereferrers*", "*custom_inviteexcludereferrers2*"],
    userAgents: ["custom_inviteexcludeuseragent"],
    browsers: [{ name: "AOL Shield Browser", comparison: "lt", version: 3 }],
    cookies: [{ name: "custom_inviteexcludecookiename", value: "custom_inviteexcludecookievalue" }],
    variables: [
      { name: "custom_inviteexcludevariablename", value: "custom_inviteexcludevariablevalue" },
    ],
    cpps: [{ name: "custom_inviteexcludecppname", value: "custom_inviteexcludecppvalue" }],
  },

  /**
   * List of unsupported browsers and platforms supported
   * Note: IE 𝓍 means we support 𝓍 and above
   */
  browser_cutoff: {
    Edge: 0,
    IE: 1,
    Safari: 1,
    Firefox: 1,
    Chrome: 1,
    Opera: 1,
  },

  /**
   * List of unsupported platforms
   * Note: Android 4 means we support 4 and above
   */
  platform_cutoff: {
    Android: 1,
    Winphone: 1,
    iPod: 1,
    iPhone: 1,
    iPad: 1,
  },

  /**
   * Name of device and the token to look for in the user agent string. Not case sensitive
   */
  device_blacklist: ["custom_triggerdevice_blacklist"],

  /**
   * Replay pools. This is the random dice throw that occurs on the first page. If it passes (and replay
   * is turned on) then we proceed normally. If it does not pass then we will not record AND we will not trigger
   * invitations for anybody either.
   *
   * This is an array of objects. Each object contains a URL path match and an "sp" value which is the sampling
   * percentage. 100 is always-in, and 0 is always-out.
   */
  replay_pools: [
    {
      path: "custom_replay_poolspath",
      sp: 99,
    },
  ],

  /**
   * Re-pools are parts of the site where we might want to undo to cxReplay pooling result
   * and potentially re-include someone into cxReplay recording.
   */
  replay_repools: ["custom_replay_repools"],

  /**
   * The list of CPPS that the customer may want to set
   *
   * NOTE: CPPs with source "function" are no longer possible
   */
  cpps: {
    custom_static_cpp_key: "custom_static_cpp_value",
    custom_param_cpp_key: { source: "param", val: "custom_param_cpp_value", mode: "append" },
    custom_cookie_cpp_key: {
      source: "cookie",
      init: "custom_cookie_init",
      val: "custom_cookie_cpp_value",
      exists: {
        init: "custom_cookie_existsinit",
        success: "custom_cookie_existssuccess",
      },
    },
    custom_variable_cpp_key: {
      source: "variable",
      init: "custom_variable_init",
      name: "custom_variable_cpp_value",
      exists: {
        init: "custom_cookie_existsinit",
        success: "custom_cookie_existssuccess",
      },
    },
    custom_url_cpp_key: {
      source: "url",
      init: "custom_url_init",
      patterns: [
        {
          regex: "custom_url_cpp_value",
          value: "custom_url_value",
        },
      ],
    },
    /*
    base_cpp: 'hello',
    param_cpp: {
      // Valid sources: param, cookie, variable
      source: 'param',
      val: 'uid',
      // optional append mode to append different params that appear on different pages
      //mode: 'append'
    },
    cookie_cpp: {
      source: 'cookie',
      val: 'IsFirstTimeVisitor',
      // optional default value
      // init: 'N',
      // optional (overrides default behavior)
      // exists: {
      //   init: 'N',
      //   success: 'Y'
      // }
    },
    variable_cpp: {
      source: 'variable',
      name: 'var1',
      // optional default value
      // init: 'N',
      // optional (overrides default behavior)
      // exists: {
      //   init: 'N',
      //   success: 'Y'
      // }
    },
    url_cpp : {
      source : 'url',
      patterns : [{
        regex : 'checkout/shipping',
        value : 'y'
      }],
      //optional default value
      //init: 'n'
    },
    */
  },
};
