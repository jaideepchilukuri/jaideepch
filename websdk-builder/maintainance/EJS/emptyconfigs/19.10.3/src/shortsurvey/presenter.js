/**
 * Presents a short-form survey in an iframe
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

import { API } from "../fs/index";
import { FSEvent, AjaxTransport } from "../utils/utils";
import Iframe from "./iframe";

class Presenter {
  constructor(config, surveydef, display, cpps, stg, urlgen) {
    this.stg = stg;
    this.config = config;
    this.surveydef = surveydef;
    this.display = display;
    this.cpps = cpps;
    this.locale = cpps.get("locale") || "en";

    this.shortSurveyConfig = (display && display.shortSurvey) || {};

    const pageView = this.getPageView();

    const midOverride = this.shortSurveyConfig.midOverride;
    let paginationType = null;

    switch (this.shortSurveyConfig.paginationType) {
      case "single":
      case "split":
        paginationType = this.shortSurveyConfig.paginationType;
        break;

      case "random":
        paginationType = [null, "split", "single"][~~(Math.random() * 3)];
        break;

      default:
        break;
    }

    // falsey paginationType will avoid it being added as a query parameter
    this.surveyUrl = urlgen.getShortSurveyUrl({ pageView, paginationType, midOverride });
    this.surveyOrigin = urlgen.getShortSurveyOrigin();
    this.surveyMID = urlgen.getMeasureId();

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
      failure: (text, code) => {
        /* pragma:DEBUG_START */
        console.error("Failed to download survey", code, this.surveyUrl);
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

    if (this.shortSurveyConfig.style) {
      this.iframe.updateStyle(this.shortSurveyConfig.style);
    }

    document.body.appendChild(this.iframe.el);

    // Detect when the user interact with the shortsurvey.
    // This is quite crude and may later be improved by adding
    // an API method called from the survey.
    setTimeout(
      // setTimeout is needed here. I assume it is because the DOM needs
      // the next tick after appendChild to be able to addEventListener.
      () => {
        this.iframe.el.contentDocument.addEventListener("click", () => {
          this.stg.set(`${this.surveyMID}li`, Date.now());
          clearTimeout(this.inactivityTimer);
        });
      },
      0
    );

    if (!this.stg.get(`${this.surveyMID}li`)) {
      // Setup the inactivity timer that will automatically abandon the
      // survey, if configured as such.
      const maxIdleTime = this.shortSurveyConfig.idleTimeBeforeAbandon || 0;
      if (maxIdleTime) {
        this.inactivityTimer = setTimeout(() => this.abandon(), maxIdleTime);
      }
    }

    this.setupAPI();
  }

  fixURLs(html) {
    return html.replace(/"\/static\//g, `"${this.surveyOrigin}/static/`);
  }

  abandon() {
    this.abandoned.fire();
    this.dispose();
  }

  getPageView() {
    return this.stg.get("pv");
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

      abandon: () => this.abandon(),

      complete: () => {
        this.completed.fire(true);
        this.dispose();
      },

      accept: () => {
        this.accepted.fire(this.display.inviteType);
      },

      getPageView: () => this.getPageView(),

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
