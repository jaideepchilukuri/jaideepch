/**
 * Bottom file for standalone survey
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { decompress } from "../compress/compress";
import { globalConfig, dec, getParam, winReady } from "../fs/index";
import { Browser, Journey, getBrainStorage, APPID } from "../utils/utils";
import { PopWindow } from "./popwindow";

// Main entry point
function onWinReady() {
  // The browser detector
  const browser = new Browser();

  // Continue when things are ready
  browser.ready.subscribe(
    () => {
      /* pragma:DEBUG_START */
      console.warn("fbs: browser detected", browser);
      /* pragma:DEBUG_END */

      const headTag = document.getElementsByTagName("head")[0];
      const isStandalone = headTag.getAttribute("data-isstandalone") == "true";

      // Set these variables depending on the current context
      if (isStandalone) {
        popWindowForStandalone();
      } else {
        popWindowNormal();
      }
    },
    true,
    true
  );

  /**
   * Set up a pop window instance
   * @type {PopWindow}
   */
  function popWindowNormal() {
    // Arguments to construct a PopWindow:
    let config = {}; // from brain
    let cpps = null; // from brain
    let journey = null;
    const isStandalone = false;

    const mId = getParam("mid");
    const siteKey = getParam("ns");
    const userId = getParam("uid");

    if (siteKey !== "preview") {
      const brainUrl = getParam("brain");
      const brain = getBrainStorage(browser, userId, siteKey, brainUrl);

      // Set up an update interval in case the config message isn't available at browser.ready
      brain.setUpdateInterval(500);

      brain.watchForChanges(
        ["fscfg"],
        (key, oldfscfg, fscfg) => {
          // Parse the configuration
          const configs = JSON.parse(dec(decompress(dec(fscfg.gcfg))));

          // make sure there's an instance for this mid in the configs. If not
          // this is a race between another pop of feedback
          if (configs.product && configs.product.instances) {
            let found = false;
            for (let i = 0; i < configs.product.instances.length; i++) {
              const inst = configs.product.instances[i];
              if (inst.mid === mId) {
                found = true;
              }
            }
            if (!found) {
              // Config not ready yet, still has config for a previous feedback popup
              return;
            }
          }

          // Stop the interval after we received the message
          brain.stopUpdateInterval();

          cpps = JSON.parse(decompress(dec(fscfg.cpps)));

          popWindowWithConfig(configs, mId, cpps, fscfg.cid);
        },
        // can't be true because it might take a couple tries to find the config
        false,
        true
      );
    } else {
      // pull config from url
      const gcfgParam = getParam("_gcfg_");
      const configs = JSON.parse(dec(decompress(dec(gcfgParam))));
      popWindowWithConfig(configs, mId, null, null);
    }

    function popWindowWithConfig(configs, mId, cpps, cid) {
      if (configs.product && configs.product.instances) {
        /* pragma:DEBUG_START */
        console.log("fbs: normal mode", configs);
        /* pragma:DEBUG_END */
      } else {
        /* pragma:DEBUG_START */
        console.log("fbs: the config does not include the product config!", configs);
        /* pragma:DEBUG_END */
      }

      config = configs.product || {};
      config.global = configs.global;

      // make sure other parts of the system have the global
      // config settings from the main window.
      for (const key in config.global) {
        globalConfig[key] = config.global[key];
      }

      // Preview does not have to communicate with the backend so it does not need a Journey
      if (siteKey !== "preview") {
        const appId = APPID.FEEDBACK;

        journey = new Journey({
          customerId: cid,
          appId,
          stg: getBrainStorage(browser, userId, globalConfig.siteKey),
          browser,
          useSessionId: false,
          usePopupId: true,
        });
        journey.config = configs.global;
      }

      return new PopWindow(config, browser, journey, mId, cpps, siteKey, isStandalone);
    }
  }

  /**
   * Set up a pop window instance
   * @type {PopWindow}
   */
  function popWindowForStandalone() {
    const headTag = document.getElementsByTagName("head")[0];

    // Arguments to construct a PopWindow:
    let config = {};
    const journey = null;
    const cpps = [];
    const isStandalone = true;

    //-- config
    const datauri = headTag.getAttribute("data-url");
    const posturi = headTag.getAttribute("data-post-url");
    const dataV = headTag.getAttribute("data-version");
    const mId = headTag.getAttribute("data-mid");
    const siteKey = "fs";

    config = {
      cxReplay: false,
      global: {},
      instances: [
        {
          autowhitelist: true,
          datauri,
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
          posturi,
          reporturi: "https://voc.foresee.com/client/feedback-admin/summary",
          saved: null,
          template: "default",
          topics: [
            {
              answerId: "",
              id: "1",
              order: 1,
              topicText: "Default Topic",
              whitelistActive: false,
            },
          ],
          version: dataV || 1,
        },
      ],
    };

    /* pragma:DEBUG_START */
    console.log("fbs: standalone mode", config);
    /* pragma:DEBUG_END */

    // Get CPPs from the url
    decodeURIComponent(location.search)
      .substring(1)
      .split("&")
      .forEach(currentValue => {
        const result = currentValue.match(/^cpp\[([\w\d\s]*)\]=(.*)$/i);
        if (result) {
          cpps[result[1]] = result[2];
        }
      });

    return new PopWindow(config, browser, journey, mId, cpps, siteKey, isStandalone);
  }
}

function startup() {
  winReady(onWinReady);
}

export { startup };
