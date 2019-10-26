/**
 * Presents a short-form survey in an iframe
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

import { API, globalConfig } from "../fs/index";
import { FSEvent, AjaxTransport } from "../utils/utils";
import Iframe from "./iframe";

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
      this.html = this.fixURLs(text)
        // Temporary override for an animation that was written in the survey HTML
        // but that is now implemented here (iframe.updateStyle)
        // This hack should be removed in CC-5140
        .replace(
          /(<head.*?>)/,
          `$1
            <style>
              main.fsrSurvey__content > section.fsrPage__context--container {
                animation: none !important;
              }
            </style>`
        );
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
      },
    });
  }

  present() {
    /* pragma:DEBUG_START */
    console.log("ctxsurvey: is presenting...", this);
    /* pragma:DEBUG_END */

    this.iframe = new Iframe(this.html);

    this.iframe.updateSize({ width: 480, height: 300 });

    if (this.display && this.display.shortSurvey && this.display.shortSurvey.style) {
      this.iframe.updateStyle(this.display.shortSurvey.style);
    }

    document.body.appendChild(this.iframe.el);

    this.setupAPI();
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
        this.dispose();
      },

      decline: () => {
        this.declined.fire("INVITE_DECLINED_BTN");
        this.dispose();
      },

      abandon: () => {
        this.abandoned.fire();
        this.dispose();
      },

      complete: () => {
        this.completed.fire(true);
        this.dispose();
      },

      accept: () => {
        this.accepted.fire(this.display.inviteType);
      },

      getPageView: () => this.stg.get("pv"),

      updateSize: (width, height) => {
        this.iframe.updateSize({ width, height });
      },
    });
  }

  dispose() {
    document.body.removeChild(this.iframe.el);
    this.iframe = null;
  }
}

export default Presenter;
