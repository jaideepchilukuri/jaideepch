module.exports = {
  /**
   * Variables that go into the build that apply to this client in particular
   */
  client: {
    /**
     * Most commonly edited values
     */
    id: null, //"FSRTESTINGCODECID12345==",

    /**
     * FCP info
     */
    clientid: 1, //null,//919191,
    sitekey: "emptyconfigs", //null,//"htest",

    replayid: "", //"somesite",
    siteid: "", //"somesite",
    transporturl: "https://record.foresee.com/rec/",
    // "http://localhost:3000/rec/",
    // "https://dev-record.foresee.com/rec/",
    // "https://qa-record.foresee.com/rec/",
    brainurl: "https://brain.foresee.com",
    surveyurl: "https://survey.foreseeresults.com/survey/display",
    events: "https://analytics.foresee.com/ingest/events",
    modernSurveyUrl: "https://cxsurvey.foresee.com/sv",
    surveyasynccurl: "i.4see.mobi",
    static: "https://static.foresee.com",
    deviceDetectionUrl:
      // 'http://localhost:3000',
      "https://device.4seeresults.com",

    /**
     * Products to build. Used mostly for testing trigger, feedback, record
     */
    productsToBuild: [
      "trigger",
      "record"
      // , "feedback"
    ],

    /**
     * Turn on the new 19.7+ record code. Otherwise the old pre-19.7 record
     * runs.
     */
    modernRecord: true,

    /**
     * Omniture ID provided by client to capture OMTR_VID CPP. If undefined, the
     * CPP will not be captured.
     */
    adobersid: null, //'fsekevin.reportsuite',

    /**
     * Tells us what type of persistent storage to use for state. In order of
     * preference: 1. 'COOKIE': Traditional. No server-side tracking. 1st and
     * 3rd party cookies only. 2. 'MICROCOOKIE': Preferred. A very small cookie
     * is set (~38 bytes). Server tracking keeps most of the state. 3.
     * 'COOKIELESS': Works similar to MICROCOOKIE but relies on browser
     * fingerprinting. Could cause slightly lower collection rates and
     * accidental re-invites over time. 4. 'DOMSTORAGE': Should rarely be used.
     * Only use this if: No cross-subdomain changes, No http->https changes, No
     * inPrivate browsing.
     */
    persistence: "COOKIE",

    /**
     * true to create the cookie with the secure flag (HTTPS). /!\ A secure
     * cookie will only be created if the website is itself on HTTPS.
     */
    cookieSecure: false,

    /**
     * Cookies' domain. Set our cookie on a specific domain for certain URLs.
     * Note: keep this commented or delete it to have the same behavior as pre
     * 19.5.0 (e.g. the domain used will always be the root domain) Note: the
     * URL (path) can use wildcards. Note: the first match will be used,
     * starting from the top.
     */
    cookieDomain: [
      // {
      // path: "https://m.*",
      // domain: "m.macys.com"
      // },
      // {
      // path: "*",
      // domain: ".macys.com"
      // }
    ]
  }
};
