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
      /* pragma:DEBUG_START */
      console.warn("fbs: browser detected", browser);
      /* pragma:DEBUG_END */

      var headTag = document.getElementsByTagName('head')[0];
      var isStandalone = headTag.getAttribute('data-isstandalone') == 'true';

      // Set these variables depending on the current context
      if (isStandalone) {
        popWindowForStandalone();
      } else {
        popWindowNormal();
      }
    }, true, true);

    /**
     * Set up a pop window instance
     * @type {PopWindow}
    */
    function popWindowNormal() {
      // Arguments to construct a PopWindow:
      var config = {}; // from brain
      var cpps = null; // from brain
      var journey = null;
      var isStandalone = false;

      var mId = fs.getParam("mid");
      var siteKey = fs.getParam("ns");

      if (siteKey !== "preview") {
        var userId = fs.getParam("uid");
        var brainUrl = fs.getParam("brain");
        var brain = utils.getBrainStorage(browser, userId, siteKey, brainUrl);

        // Set up an update interval in case the config message isn't available at browser.ready
        brain.setUpdateInterval(500);

        brain.watchForChanges(["fscfg"], function (key, oldfscfg, fscfg) {
          // Stop the interval after we received the message
          brain.stopUpdateInterval();

          mId = fs.dec(fscfg.mid);
          cpps = JSON.parse(utils.Compress.decompress(fs.dec(fscfg.cpps)));

          // Parse the configuration
          var globalConfig = JSON.parse(fs.dec(utils.Compress.decompress(fs.dec(fscfg.gcfg))));
          popWindowWithConfig(globalConfig, mId, cpps, fscfg.cid);
        }, true, true);
      } else {
        // pull config from url
        var gcfgParam = fs.getParam("_gcfg_");
        var globalConfig = JSON.parse(fs.dec(utils.Compress.decompress(fs.dec(gcfgParam))));
        popWindowWithConfig(globalConfig, mId, null, null);
      }

      function popWindowWithConfig(globalConfig, mId, cpps, cid) {
        // Fill in the configuration with hardcoded default values
        globalConfig = fs.ext({ global: utils.defaultConfigs.global }, globalConfig);
        if (globalConfig.product && globalConfig.product.instances) {

          // Apply the hardcoded defaults to some nested properties
          globalConfig.product.instances = globalConfig.product.instances.map(
            function (instance) {
              return fs.ext({}, utils.defaultConfigs.survey, instance);
            }
          );

          /* pragma:DEBUG_START */
          console.log("fbs: normal mode", globalConfig);
          /* pragma:DEBUG_END */
        }
        /* pragma:DEBUG_START */
        else {
          console.log("fbs: the config does not include the product config!", globalConfig);
        }
        /* pragma:DEBUG_END */

        config = globalConfig.product || {};

        // Preview does not have to communicate with the backend so it does not need a Journey
        if (siteKey !== 'preview') {
          var appId = utils.APPID.FEEDBACK;

          journey = new utils.Journey(cid, appId, userId, browser);
        }

        return new PopWindow(config, browser, journey, mId, cpps, siteKey, isStandalone);
      }
    }

    /**
     * Set up a pop window instance
     * @type {PopWindow}
    */
    function popWindowForStandalone() {
      var headTag = document.getElementsByTagName('head')[0];

      // Arguments to construct a PopWindow:
      var config = {};
      var journey = null;
      var cpps = [];
      var isStandalone = true;

      //-- config
      var datauri = headTag.getAttribute('data-url');
      var posturi = headTag.getAttribute('data-post-url');
      var dataV = headTag.getAttribute('data-version');
      var mId = headTag.getAttribute('data-mid');
      var siteKey = 'fs';

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

      /* pragma:DEBUG_START */
      console.log("fbs: standalone mode", config);
      /* pragma:DEBUG_END */

      // Get CPPs from the url
      decodeURIComponent(location.search)
        .substring(1)
        .split('&')
        .forEach(function (currentValue, index, array) {
          var result = currentValue.match(/^cpp\[([\w\d\s]*)\]=(.*)$/i);
          if (result) {
            cpps[result[1]] = result[2];
          }
        });

      return new PopWindow(config, browser, journey, mId, cpps, siteKey, isStandalone);
    }
  });
})();
