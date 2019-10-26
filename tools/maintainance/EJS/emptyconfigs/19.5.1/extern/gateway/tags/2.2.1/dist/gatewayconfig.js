"use strict";
/**
 * @preserve
 * ForeSee Gateway Script v2.2.1. Monday, October 16th, 2017, 3:10:02 PM
 * (c) Copyright 2016, ForeSee. http://www.foresee.com
 * Patents pending.
 **/
;
(function() {
    _fsDefine(["fs"], function(fs) {
        /**
         * Holds the global configuration
         * @type {{}}
         */
        var globalConfig = {
                "codeVer": "19.5.1",
                "products": {},
                "storage": "COOKIE",
                "recUrl": "https://rec.replay.answerscloud.com/rec/",
                "surveyUrl": "https://survey.foreseeresults.com/survey/display",
                "analyticsUrl": "https://analytics.foresee.com/ingest/events"
            },
            productConfig = {},
            staticCodeLocation = "${staticCodeLocation}",
            supportsDomStorage = false,
            _moduleLocationOverride;

        try {
            sessionStorage.set('a', 0);
            supportsDomStorage = true;
        } catch (e) {
            supportsDomStorage = false;
        }

        /**
         * @preserve
         * [GENERAL_CONFIG]
         */

        return {
            global: globalConfig,
            product: productConfig,
            static: staticCodeLocation
        };
    });

})();