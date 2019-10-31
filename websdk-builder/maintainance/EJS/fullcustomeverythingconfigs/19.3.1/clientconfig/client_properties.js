module.exports = {
	/**
	 * Variables that go into the build that apply to this client in particular
	 */
	client: {
		/**
		 * Most commonly edited values
		 */
		id: "custom_customerid",

		/**
		 * FCP info
		 */
		clientid: 1,
		sitekey: "fullcustomeverythingconfigs",

		replayid: "custom_replayid",
		siteid: "custom_siteid",
		transporturl: "custom_transporturl",
		brainurl: "custom_brainurl",
		surveyurl: "custom_surveyurl",
		events: "custom_events",
		surveyasynccurl: "custom_surveyasynccurl",
		static: "custom_static",

		/**
		 * Products to build. Used mostly for testing
		 * trigger, feedback, record
		 */
		productsToBuild: ["trigger", "record"],

		/**
		 * Tells us what type of persistent storage to use for state. In order of preference:
		 *  1. 'COOKIE': Traditional. No server-side tracking. 1st and 3rd party cookies only.
		 *  2. 'MICROCOOKIE': Preferred. A very small cookie is set (~38 bytes). Server tracking keeps most of the state.
		 *  3. 'COOKIELESS': Works similar to MICROCOOKIE but relies on browser fingerprinting. Could cause slightly lower collection rates and accidental re-invites over time.
		 *  4. 'DOMSTORAGE' : Should rarely be used. Only use this if: No cross-subdomain changes, No http->https changes, No inPrivate browsing.
		 */
		persistence: "MICROCOOKIE",
	},
};
