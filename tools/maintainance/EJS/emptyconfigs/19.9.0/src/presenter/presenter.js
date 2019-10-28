/**
 * Presents a short-form survey in an iframe
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

import { API, globalConfig } from "../fs/index";
import { FSEvent, AjaxTransport } from "../utils/utils";

// TODO: move these into the presenter constructor because configs can change before class init
const modernSurveyUrl = globalConfig.modernSurveyUrl;
// TODO: fix this regex ugliness
const modernSurveyUrlOrigin = /^((?:https?:\/\/)?[\w.-]+(?::\d+)?)\//.exec(modernSurveyUrl)[1];

class Presenter {
  constructor(config, surveydef, display, cpps, stg) {
    this.stg = stg;
    const pageView = this.stg.get("pv");

    // TODO: figure out a better way to configure this
    // Having the setting on the display is just temporary
    let shortSurveyURL = `${modernSurveyUrl}?mid=VA8Z4EEwtwJggUlhEItxJQ4C&template=contextual&pv=${pageView}`;

    if (pageView === 1) {
      sessionStorage.removeItem("FSR_SSURL");
    }
    if (pageView > 1) {
      const storedURL = sessionStorage.getItem("FSR_SSURL");
      if (storedURL) {
        shortSurveyURL = storedURL;
      }
    }

    this.surveyUrl = shortSurveyURL;

    this.config = config;
    this.surveydef = surveydef;
    this.display = display;
    this.locale = cpps.get("locale") || "en";

    this.declined = new FSEvent();
    this.abandoned = new FSEvent();
    this.accepted = new FSEvent();
    this.completed = new FSEvent();
  }

  loadResources(readyEvent) {
    /* pragma:DEBUG_START */
    console.log("presenter: load resources");
    /* pragma:DEBUG_END */

    const done = text => {
      this.html = this.fixURLs(text);
      readyEvent.fire();
    };

    new AjaxTransport().send({
      url: this.surveyUrl,
      method: "GET",
      success: done,
      failure(text, code) {
        /* pragma:DEBUG_START */
        console.error("Failed to download survey:", code);
        /* pragma:DEBUG_END */
        done(text);
      },
    });
  }

  present(browser) {
    this.browser = browser;
    this.browserName = this.browser.browser.name;
    /* pragma:DEBUG_START */
    console.log("presenter: >>>> POP! <<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    /* pragma:DEBUG_END */

    this.setupAPI();
    const iframe = document.createElement("iframe");
    iframe.width = 480;
    iframe.height = 500;
    iframe.style.position = "fixed";
    iframe.style.bottom = 0;
    iframe.style.right = 0;
    iframe.style.border = 0;
    iframe.style.background = "transparent";
    iframe.style.zIndex = 99999999;
    iframe.setAttribute("srcdoc", this.html);

    document.body.appendChild(iframe);

    if (this.browserName === "Edge" || this.browser.isIE) {
      // https://github.com/jugglinmike/srcdoc-polyfill/blob/master/srcdoc-polyfill.js
      // eslint-disable-next-line no-script-url
      const jsUrl = "javascript: window.frameElement.getAttribute('srcdoc');";

      // Explicitly set the iFrame's window.location for
      // compatability with IE9, which does not react to changes in
      // the `src` attribute when it is a `javascript:` URL, for
      // some reason
      if (iframe.contentWindow) {
        iframe.contentWindow.location = jsUrl;
      }
      iframe.setAttribute("src", jsUrl);
    }

    this.iframe = iframe;
  }

  // todo: get this from configs?
  fixURLs(html) {
    return html.replace(/"\/static\//g, `"${modernSurveyUrlOrigin}/static/`);
  }

  /**
   * API for the contextual survey to iteract with the SDK.
   */
  setupAPI() {
    API.expose("Survey", {
      close: () => {
        this.declined.fire("INVITE_DECLINED_BTN");
        this.dispose();
      },

      complete: () => {
        this.completed.fire(true);
        this.dispose();
      },

      accepted: () => {
        this.accepted.fire(this.display.inviteType);
      },

      updateSize: (width, height) => {
        if (!this.iframe) return;

        if (width != null) {
          this.iframe.width = width;
        }

        if (height != null) {
          this.iframe.height = height;
        }
      },
    });
  }

  dispose() {
    document.body.removeChild(this.iframe);
    this.iframe = null;
  }
}

export default Presenter;
