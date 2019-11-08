/**
 * FullPage Survey Mode
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

import { makeURI } from "../fs/index";
import {
  AjaxTransport,
  FSEvent,
  getKeyCode,
  getScroll,
  getSize,
  Unbind,
  Bind,
} from "../utils/utils";
import { $ } from "./dom/minidom";
import { Loader } from "./loader";
import { Singletons } from "./top";

/**
 * Defines a FullPage Mode.
 * @param survey, browser, instconfig, errTemplate, svTemplate, epTemplate
 */
class FullPageSurvey {
  constructor(survey, browser, cfg, errTemplate, svTemplate, epTemplate) {
    this.sv = survey;
    this.br = browser;
    this.cfg = cfg;
    this.jrny = cfg.jrny;
    this.errTemplate = errTemplate;
    this.svTemplate = svTemplate;
    this.epTemplate = epTemplate;
    this.$domContent = [];
    this.$btns = [];
    this.networkError = new FSEvent();
    // Fires when a survey is submitted
    this.SurveySubmitted = new FSEvent();
    this.ajax = new AjaxTransport();
    const win = win || window;
    // Back up the dom
    const childrn = win.document.body.childNodes;

    for (let i = 0; i < childrn.length; i++) {
      if (childrn[i].nodeType === 1 && $(childrn[i]).hasClass("_acs")) {
        this.$btns.push(childrn[i]);
      } else {
        this.$domContent.push(childrn[i]);
      }
    }

    this.$el = $(`<div class="acsMainContainerFullPage--${this.sv.cfg.template}"></div>`);

    this.sv.cfg.privacyuri = !this.sv.cfg.privacyuri
      ? "http://www.foresee.com/about-us/privacy-policy/"
      : this.sv.cfg.privacyuri;
    this.sv.cfg.privacytext = this.sv.cfg.privacytext ? this.sv.cfg.privacytext : "Privacy policy";

    // Bind to the event that fires when a user begins submitting a survey
    this.sv.SubmitClicked.subscribe(() => {
      this.$content.removeClass("acsVisible");
      this._showWait();

      this._postSurveyData(() => {
        this.jrny.addEventObj({
          name: "feedback_submitted",
          properties: {
            mid: [cfg.mid],
          },
        });
        this.$content.addClass("acsVisible");
        this._showThankyou();
        this._removeWait();
        this.SurveySubmitted.fire();
      });
    });

    // Bind to the event that fires when a network error occurred
    this.networkError.subscribe(this.onNetworkError.bind(this));

    this._getSurveyData(data => {
      this.sv = data;
      this.show();
    });
  }

  onNetworkError(obj) {
    this._removeWait();
    // Signal the event to the eventing server
    if (obj && !!obj.type) {
      if (this.jrny) {
        this.jrny.addEventObj({
          name: `feedback_survey_${obj.type}`,
          properties: {
            mid: [this.sv.cfg.mid],
          },
        });
      }
    } else if (this.jrny) {
      // Keeping this if the error is not covered in the code..
      this.jrny.addEventObj({
        name: "feedback_server_error",
        properties: {
          mid: [this.sv.cfg.mid],
        },
      });
    }

    this.$content = $(`<div class="acsMainContainerMobile--${this.sv.cfg.template}"></div>`);
    this.$el = $(`<div class="acsMainContainerFullPage--${this.sv.cfg.template}"></div>`);
    this.$closebtn = $(
      `<span><img src="${makeURI(
        `$templates/feedback${this.sv.cfg.template || "default"}/closeBtn.svg`
      )}" class="acsModalCloseButton"></span>`
    );

    this.$content.innerHTML = this.errTemplate(this.sv);
    const msg = this.$content.$(".acs-serviceunavailable__message")[0];
    if (obj.type === "expired") {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      if (this.sv.cfg.fbexpiremessage) {
        msg.appendChild($(`<p>${this.sv.cfg.fbexpiremessage}</p>`));
      } else {
        msg.appendChild($("<p>This is an expired survey!</p>"));
      }
    } else {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      msg.appendChild(
        $("<p>Feedback isn't available right now.</p><p>Please check back later.</p>")
      );
    }
    Bind(this.$closebtn, "feedback:click", event => {
      this.hide(event, true);
    });

    this.$el.appendChild(this.$closebtn);
    this.$el.appendChild(this.$content);

    const okBtn = this.$el.$(".acs-close-button")[0];
    Bind(okBtn, "feedback:click", event => {
      this.hide(event, true);
    });

    this.$content.addClass("acsVisible");

    // Rebuild the DOM with n/w error template.
    window.document.body.innerHTML = "";
    window.document.body.appendChild(this.$el);
  }

  /**
   * Replace all the dom and add the new dom (a loader to start with.)
   * Renders the survey in full page mode.
   * @private
   */
  _renderSurvey() {
    // Get a reference to the window object
    const win = win || window;
    const ctx = this;
    const topContainer = win.document.body;

    if (!this.sv.cfg.preview) {
      // Close on esc
      const escClbk = event => {
        if (getKeyCode(event) == "escape") {
          // Signal the event to the eventing server
          ctx.jrny.addEventObj({
            name: "feedback_abandoned",
            properties: {
              mid: [ctx.cfg.mid],
            },
          });
          ctx.hide(event, false);
        }
        Unbind(document.body, "feedback:keyup", escClbk);
      };
      Bind(document.body, "feedback:keyup", escClbk);
    }

    // Hide everything and just show the survey.
    topContainer.innerHTML = "";
    // Only Append if they were not already appended.
    if (this.$el.children.length === 0) {
      // Create the content holder and header
      this.$closebtn = $(
        `<span><img src="${makeURI(
          `$templates/feedback/${this.sv.cfg.template || "default"}/closeBtn.svg`
        )}" class="acsModalCloseButton"></span>`
      );

      // Create inner content
      this.$content = $(`<div class="acsMainContainerMobile--${this.sv.cfg.template}"></div>`);

      this.$el.appendChild(this.$closebtn);
      this.$el.appendChild(this.$content);
    }
    topContainer.appendChild(this.$el);

    if (!this.sv.cfg.preview) {
      Bind(this.$closebtn, "feedback:click", event => {
        this.hide(event, false);
      });
    }

    this._showWait();
  }

  /**
   * Show the wait image
   * @private
   */
  _showWait() {
    this._removeWait();
    this._wait = new Loader();
    this.$el.appendChild(this._wait.$el);
    this._wait.center();
    const scroll = getScroll(window);
    const sz = getSize(window);
    // Absolutely position the loader as this is going to be all over the page.
    this._wait.$el.css({
      position: "absolute",
      top: `${scroll.y + (sz.h - this._wait.$el.offsetHeight) / 2}px`,
      left: `${scroll.x + (sz.w - this._wait.$el.offsetWidth) / 2}px`,
    });
  }

  /**
   * Remove the wait image
   * @private
   */
  _removeWait() {
    if (this._wait) {
      this._wait.remove();
      this._wait = null;
    }
  }

  /**
   * Hides the survey and replaces the domcontent.
   * @param event object - basically the caller.
   * @param showbtn boolean - whether to show btns or not.
   */
  hide(event, noBtns) {
    window.document.body.innerHTML = "";
    for (let i = 0; i < this.$domContent.length; i++) {
      window.document.body.appendChild(this.$domContent[i]);
    }

    Singletons.onFeedbackClosed.fire();

    // Exit feedback prompt
    if (this.jrny) {
      if (
        event &&
        event.target &&
        !event.target.classList.contains("acs-feedback__button--epilogue")
      ) {
        this.jrny.addEventObj({
          name: "feedback_abandoned",
          properties: {
            mid: [this.cfg.mid],
          },
        });
      }
    }

    if (!noBtns) {
      this._showBtns();
    }
  }

  remove(noBtns) {
    return this.hide(null, noBtns);
  }

  /**
   * Shows Buttons back.
   * @private
   */
  _showBtns() {
    for (let j = 0; j < this.$btns.length; j++) {
      window.document.body.appendChild(this.$btns[j]);
    }
  }

  /**
   * Renders and shows survey
   *
   */
  show() {
    this._renderSurvey();
    this._removeWait();
    // Add in the answers logo url
    this.sv.ansLogoSrc = makeURI("$p_b_foresee.svg");
    if (this.$content.children.length === 0) {
      const res = this.svTemplate(this.sv);
      this.$content.innerHTML = res;
      this.sv.bind(this.$content);
    }
    this.$content.addClass("acsVisible");
    this.$el.addClass("acsVisible");
    this.sv.SurveyUIUpdated.fire();

    Singletons.onFeedbackShown.fire(this.$el);

    // Signal the event to the eventing server
    if (this.jrny) {
      this.jrny.addEventObj({
        name: "feedback_survey_shown",
        properties: {
          mid: [this.sv.cfg.mid],
        },
      });
    }
  }

  /**
   * Shows the Thank you page..
   * @private
   */
  _showThankyou() {
    this._removeWait();
    const res = this.epTemplate(this.sv);

    this.$closebtn = $(
      `<span><img src="${makeURI(
        `$templates/feedback/${this.sv.cfg.template || "default"}/closeBtn.svg`
      )}" class="acsModalCloseButton"></span>`
    );

    if (!this.sv.cfg.preview) {
      Bind(
        this.$closebtn,
        "feedback:click",
        event => {
          this.hide(event, true);
        },
        true
      );
    }

    this.$content.innerHTML = res;

    if (this.jrny) {
      this.jrny.addEventObj({
        name: "feedback_thankyou_shown",
        properties: {
          mid: [this.cfg.mid],
        },
      });
    }

    // Remove the closebtn and content.
    this.$el.removeChild(this.$el.childNodes[0]);
    this.$el.removeChild(this.$el.childNodes[0]); // Yes, it's 0, not 1.

    // Add the closebtn and content.
    this.$el.appendChild(this.$closebtn);
    this.$el.appendChild(this.$content);

    const okBtn = this.$el.$(".acs-close-button")[0];
    const h1s = this.$el.$("h1");

    for (let p = 0; p < h1s.length; p++) {
      $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    if (!this.sv.cfg.preview) {
      Bind(okBtn, "feedback:click", event => {
        this.hide(event, true);
      });
    }
  }

  /**
   * Make a request to GET Survey data
   * @private
   */
  _getSurveyData() {
    if (!this.sv.isExpired()) {
      /* pragma:DEBUG_START */
      console.warn("fb: using AJAX to get survey data");
      /* pragma:DEBUG_END */

      const cfobj = {
        mid: this.sv.cfg.mid,
        cachebust: new Date().getTime(),
      };

      if (this.sv.cfg.version) {
        cfobj.version = this.sv.cfg.version;
      }

      // Set a timer to simulate a timeout on the AJAX request
      this._surveyTimer = setTimeout(() => {
        /* pragma:DEBUG_START */
        console.warn("fb: timed out requesting data from the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: "timedout" });
      }, 10000);

      this.ajax.send({
        method: "GET",
        url: this.cfg.datauri,
        data: cfobj,
        success: res => {
          clearTimeout(this._surveyTimer);
          this.sv.SurveyData.fire(res, data => {
            this.sv = data;
            this.show();
          });
        },
        failure: () => {
          this.networkError.fire({ type: "getdata_failed" });
        },
      });
    } else {
      /* pragma:DEBUG_START */
      console.warn("fb: Survey is expired..");
      /* pragma:DEBUG_END */
      this.networkError.fire({ type: "expired" });
    }
  }

  /**
   * Make a request to POST Survey data
   * @private
   * @param function callback to be called when POST is successful.
   */
  _postSurveyData(cb) {
    // Don't do anything if we are in preview mode
    if (this.sv.cfg.preview) {
      setTimeout(() => {
        if (cb) {
          return cb();
        }
      }, 100);
      // Bomb out
      return;
    }

    this._surveyTimer = setTimeout(() => {
      /* pragma:DEBUG_START */
      console.warn("fb: timed out posting data to the server");
      /* pragma:DEBUG_END */
      this.networkError.fire({ type: "timedout" });
    }, 10000);

    const data = JSON.parse(this.sv._serialize());
    if (
      this.jrny &&
      this.jrny.config &&
      this.jrny.config.disable_cpps &&
      this.jrny.config.disable_cpps.indexOf("url") > -1
    ) {
      // censor this
      data.url = "";
    }

    // Post the data
    this.ajax.send({
      method: "POST",
      url: this.cfg.posturi,
      data,
      contentType: "application/json",
      success: () => {
        clearTimeout(this._surveyTimer);
        if (cb) {
          return cb();
        }
      },
      failure: () => {
        // Failure
        clearTimeout(this._surveyTimer);
        // Set a persistent value
        sessionStorage.setItem("acsFeedbackSubmitted", "true");
        // Fire the network error event
        this.networkError.fire({ type: "postdata_failed" });
      },
    });
  }
}

export { FullPageSurvey };
