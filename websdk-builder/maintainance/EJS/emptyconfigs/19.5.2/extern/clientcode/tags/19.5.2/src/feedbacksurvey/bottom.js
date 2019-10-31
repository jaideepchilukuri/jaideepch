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
        mId,
        datauri,
        dataV,
        posturi,
        userId,
        config,
        pw,
        jrny,
        min;

      if (isStandalone) {

        // CC-3350 get CPPs from url parameters for Feedback Stand Alone Survey
        var cpps = {},
          result;
        location.search.substring(1).split('&').forEach(function (currentValue, index, array) {
          result = currentValue.match(/cpp\[([\d\w]*)\]=([\d\w\'\"]*)/i);
          if (result) {
            cpps[result[1]] = result[2];
          }
        });

        /* pragma:DEBUG_START */
        console.log("fbs: standalone mode", config);
        /* pragma:DEBUG_END */

        customerId = headTag.getAttribute('data-cid');
        mId = headTag.getAttribute('data-mid');
        datauri = headTag.getAttribute('data-url');
        posturi = headTag.getAttribute('data-post-url');
        dataV = headTag.getAttribute('data-version');
        config = {
          cxReplay: false,
          instances: [{
            autowhitelist: true,
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
            mid: mId,
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
            version: dataV || 1
          }]
        };

        /**
         * Set up a pop window instance
         * @type {PopWindow}
         */
        pw = new PopWindow(config, browser, null, mId, cpps, 'fs', true);

      } else {
        customerId = fs.getParam("cid");
        appId = utils.APPID.FEEDBACK;
        userId = fs.getParam("uid");
        // preview does not have to communicate with the backend
        jrny = fs.getParam("ns") === 'preview' ? null : new utils.Journey(customerId, appId, userId, browser);
        min = JSON.parse(fs.dec(utils.Compress.decompress(fs.gwConfigOverride)));

        // fill in the configuration objects with the default values
        min = fs.ext({ global: utils.defaultConfigs.global }, min);
        if (min.product && min.product.instances) {
          min.product.instances = min.product.instances.map(function (instance) {
            return fs.ext({}, utils.defaultConfigs.survey, instance);
          });
        }

        config = min.product || {};

        /* pragma:DEBUG_START */
        console.log("fbs: working with", min, config);
        /* pragma:DEBUG_END */

        /**
         * Set up a pop window instance
         * @type {PopWindow}
         */
        pw = new PopWindow(config, browser, jrny, fs.getParam("mid"), fs.getParam("cpps"), fs.getParam("ns"), false);
      }

    }, true, true);
  });

})();