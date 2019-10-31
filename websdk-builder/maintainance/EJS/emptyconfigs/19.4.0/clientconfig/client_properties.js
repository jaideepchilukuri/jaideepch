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
    transporturl: "https://rec.replay.answerscloud.com/rec/",
    brainurl: "https://brain.foresee.com",
    surveyurl: "https://survey.foreseeresults.com/survey/display",
    events: "https://analytics.foresee.com/ingest/events",
    surveyasynccurl: "i.4see.mobi",
    static: "https://static.foresee.com",

    /**
     * Products to build. Used mostly for testing
     * trigger, feedback, record
     */
    productsToBuild: [
      "trigger",
      "record"
      // , "feedback"
    ],

    /**
     * Tells us what type of persistent storage to use for state. In order of preference:
     *  1. 'COOKIE': Traditional. No server-side tracking. 1st and 3rd party cookies only.
     *  2. 'MICROCOOKIE': Preferred. A very small cookie is set (~38 bytes). Server tracking keeps most of the state.
     *  3. 'COOKIELESS': Works similar to MICROCOOKIE but relies on browser fingerprinting. Could cause slightly lower collection rates and accidental re-invites over time.
     *  4. 'DOMSTORAGE': Should rarely be used. Only use this if: No cross-subdomain changes, No http->https changes, No inPrivate browsing.
     */
    persistence: "COOKIE"
  }
};
