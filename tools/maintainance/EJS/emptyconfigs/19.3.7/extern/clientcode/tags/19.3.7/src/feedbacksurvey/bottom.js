/**
 * Bottom file for standalone survey
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Bottom");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Misc.Misc");
fs.require("fs.Misc.SimpleTween");
fs.require("fs.Misc.Template");
fs.require("fs.Loader");
fs.require("fs.PopWindow");
fs.require("fs.Misc.CPPS");
fs.require("fs.Replay");

(function () {

  // Main entry point
  fs.winReady(function () {
    // The browser detector
    var browser = new utils.Browser();

    // Continue when things are ready
    browser.ready.subscribe(function () {
      // The main class to show the survey

      /* pragma:DEBUG_START */
      console.warn("fbs: browser detected", browser);
      /* pragma:DEBUG_END */

      var headTag = document.getElementsByTagName('head')[0],
        isStandalone = headTag.getAttribute('data-isstandalone') == 'true',
        customerId,
        appId,
        datauri,
        posturi,
        userId,
        config,
        pw,
        jrny,
        min;

      if (isStandalone) {
        /* pragma:DEBUG_START */
        console.log("fbs: standalone mode", config);
        /* pragma:DEBUG_END */

        customerId = headTag.getAttribute('data-cid');
        appId = headTag.getAttribute('data-mid');
        datauri = headTag.getAttribute('data-url');
        posturi = headTag.getAttribute('data-post-url');
        config = {
          cxReplay: false,
          instances: [{
            datauri: datauri,
            delay: 0,
            disabled: true,
            fbanimate: false,
            fbdirection: "horizontal",
            fbfixed: false,
            fblocation: "middleright",
            fbtype: "badge",
            icon: "aspark100.png",
            label: "Feedback",
            mid: appId,
            popup: true,
            posturi: posturi,
            reporturi: "https://voc.foresee.com/client/feedback-admin/summary",
            saved: null,
            template: "default",
            topics: [{
              answerId: "",
              id: "1",
              order: 1,
              topicText: "Default Topic",
              whitelistActive: false
            }],
            version: 1,
          }]
        };

        /**
         * Set up a pop window instance
         * @type {PopWindow}
         */
        pw = new PopWindow(config, browser, null, appId, null, 'fs', true);

      } else {
        customerId = fs.getParam("cid");
        appId = fs.getParam("mid");
        userId = fs.getParam("uid");
        jrny = new utils.Journey(customerId, appId, userId, browser);
        min = JSON.parse(utils.Compress.decompress(fs.gwConfigOverride));
        config = min.product;

        /* pragma:DEBUG_START */
        console.log("fbs: working with", min, config);
        /* pragma:DEBUG_END */

        /**
         * Set up a pop window instance
         * @type {PopWindow}
         */
        pw = new PopWindow(config, browser, jrny, config.mid || appId, fs.getParam("cpps"), fs.getParam("ns"), false);
      }

    }, true, true);
  });

})();