/**
 * ForeSee Trigger Configuration *****************************************************
 */
var triggerconfig = {
  /**
   * These are specified in client_properties.js. (DO NOT MODIFY)
   */
  id: '${client.id}',
  site_id: '${client.siteid}',

  /**
   * Where the survey is located
   */
  surveyAsyncCurl: '${client.surveyasynccurl}',

  /**
   * Is recording turned on? THIS IS AUTO-POPULATED.
   */
  hasReplay: '${hasreplay}',

  /**
   * How many milliseconds (1000/sec) to wait after the page first appears to initiate trigger
   */
  triggerDelay: 0,

  /**
   * How many milliseconds (1000/sec) to wait after the page first appears to show the invite
   */
  inviteDelay: 0,

  /**
   * We are free to re-invite someone after this length of days after they decline OR accept
   */
  repeatDays: {
    decline: 90,
    accept: 90
  },

  /**
   * How many milliseconds (1000/sec) to wait before converting the tracker
   */
  trackerConvertsAfter: 1000 * 10,

  /**
   * When to convert the tracker to a survey (in milliseconds) under normal circumstances
   */
  trackerHeartbeatTimeout: 1000 * 10,

  /**
   * When to convert the tracker to a survey (in milliseconds) when we think we're going between
   * pages.
   */
  trackerHeartbeatLongTimeout: 1000 * 12,

  /**
   * For SMS and email on-exit measures, how long do we delay between heartbeats?
   */
  onExitMobileHeartbeatInterval: 1000 * 60,

  /**
   * How many milliseconds to wait before possibly re-inviting someone after abandoning the invite
   */
  reinviteDelayAfterInviteAbandon: 1000 * 60 * 60 * 24 * 90,

  /**
   * Do we allow things to run if we're not in the top frame? Default: 'dontRunOtherIframes'
   * Three options:
   *  - 'runAllIframes': Allow ability to Trigger and Record on all iFrames.
   *  - 'runRecordOnly': won't run Trigger but runs Record on Iframes.
   *  - 'dontRunOtherIframes': Won't allow Trigger or Record to work in other iFrames.
   */
  workInIframes: 'dontRunOtherIframes',

  /**
   * Should we ignore HTML5 navigation events? Default: false
   */
  ignoreNavigationEvents: false,

  /**
   * Public API name override. If undefined, defaults to "FSR"
   */
  publicApiName: "FSR",

  /**
   * Global exclude. These override anything else. Once a user has been excluded, that's it.
   * They don't have another opportunity to be re-included until the repeat days pass.
   */
  globalExclude: {
    urls: [],
    referrers: [],
    userAgents: [],
    browsers: [],
    cookies: [],
    variables: []
  },

  /**
   * These items exclude inviting on a page. They don't prevent a definition from being selected,
   * but we won't actually invite if they meet these conditions.
   */
  inviteExclude: {
    urls: [],
    referrers: [],
    userAgents: [],
    browsers: [],
    cookies: [],
    variables: []
  },

  /**
   * The list of sites
   */
  sites: [
    {
      path: /\w+-?\w+\.(com|org|edu|gov|net|co\.uk)/
    },
    {
      path: '.',
      domain: 'default'
    }
  ],

  /**
   * Trigger events
   */
  events: {
    // Fires when the trigger code has been downloaded and has begun to execute
    loaded: function () {
    },
    // Fires when the trigger has been created but the user has not been qualified or anything
    initialized: function (cpps) {
    },
    // Fires after the invite has shown
    inviteShown: function (currentDef, storage, config, cpps) {
    },
    // Fires when the user accepts the invite
    inviteAccepted: function (currentDef, storage, config, cpps) {
    },
    // Fires when the user declines the invite (not cancels)
    inviteDeclined: function (currentDef, storage, config, cpps) {
    },
    // Fires when the tracker is shown
    trackerShown: function (currentDef, storage, config, cpps) {
    }
  },

  /**
   * List of unsupported browsers and platforms supported
   * Note: IE 8 means we support 8 and above
   */
  browser_cutoff: {
    IE: 10,
    Safari: 5.1,
    Firefox: 25,
    Chrome: 30,
    Opera: 1000
  },

  /**
   * List of unsupported platforms
   * Note: Android 4 means we support 4 and above
   */
  platform_cutoff: {
    Android: 4.4,
    Winphone: 9,
    iPod: 9,
    iPhone: 9,
    iPad: 9
  },

  /**
   * Name of device and the token to look for in the user agent string. Not case sensitive
   */
  device_blacklist: ['HTC_Rezound', 'blackberry'],

  /**
   * Replay pools. This is the random dice throw that occurs on the first page. If it passes (and replay
   * is turned on) then we proceed normally. If it does not pass then we will not record AND we will not trigger
   * invitations for anybody either.
   *
   * This is an array of objects. Each object contains a URL path match and an "sp" value which is the sampling
   * percentage. 100 is always-in, and 0 is always-out.
   */
  replay_pools: [{
    path: '.',
    sp: 100
  }],

  /**
   * Re-pools are parts of the site where we might want to undo to cxReplay pooling result
   * and potentially re-include someone into cxReplay recording.
   */
  replay_repools: [],

  /**
   * default CPPs are:
   * terms, browser, os, referrer, site, code, GA_ID, OTR_VID, OMTR_BEACON
   *
   * If commented out or empty, nothing will be disabled
   */
  disable_cpps: [/*"code", "referrer"*/],

  /**
   * The list of CPPS that the customer may want to set
   */
  cpps: {
    /*"mytestcpp": "hello",
     "userid": {
     // Valid sources: param, cookie, variable
     source: "param",
     val: "uid"
     }
     "mycpp": {
     source: 'cookie',
     init: 'Y',
     name: 'IsFirstTimeVisitor'
     },
     url_cpp : {
     source : 'url',
     init : 'n',
     patterns : [{
     regex : 'checkout/shipping',
     value : 'y'
     }]
     }
     function_cpp : {
     source: "function",
     value: function(){
     //some logic
     return "cppValue";
     }
     }*/
  }

  /**
   * Optional true conversion. To turn this off, simply erase this section or set 'enabled' to false.
   */
  /*, trueconversion: {
   enabled: true,
   pd: 7,
   codes: {
   items: {
   code: 801,
   repeat: false,
   source: 'variable',
   name: 'howmanyitems'
   },
   information: {
   code: 804,
   repeat: false,
   source: 'url',
   patterns: ['tc/browse.html']
   }
   }
   }*/

};

/**
 * The Survey Definition(s) *****************************************************
 * Note: you do not have to re-specify all parameters in each subsequent definition,
 * only the ones that have changed. Properties are copied from earlier definitions down
 * to later ones when they haven't been specified.
 */
/**
 * @preserve
 * @@SVCONFIG_GOES_HERE@@
 */

/**
 * A generic configuration module that other modules may include
 */
_fsDefine('triggerconfig', function () {
  /**
   * Export all the config
   */
  return {config: triggerconfig, surveydefs: surveydefs};
});