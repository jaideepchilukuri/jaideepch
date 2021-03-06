/**
 * PopUp Window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { compress, decompress } from "../compress/compress";
import { ext, getParam, isArray, isObject, nextTick, makeURI } from "../fs/index";
import { Survey } from "../survey/survey";
import {
  loadCSS,
  hasClass,
  Bind,
  FSEvent,
  Async,
  AjaxTransport,
  TemplateFetcher,
} from "../utils/utils";
import { $ } from "./dom/minidom";
import { Loader } from "./loader";
import { CPPS } from "./misc/cpps";
import { Replay } from "./replay";

/**
 * This is the JS file that gets included in a standalone window when the pop mode is set to a popup (ie: on mobile devices)
 * @param survey
 * @constructor
 */
class PopWindow {
  constructor(configs, browser, jrny, mid, cppo, namespace, isstandalone) {
    /* pragma:DEBUG_START */
    console.log("fbs: setting up PopWindow with ", configs);
    /* pragma:DEBUG_END */
    // The survey mid is ge
    let cfg;
    const ctx = this;

    this.isStandalone = isstandalone;
    // Get a CPPS instance
    this.cpps = new CPPS(namespace);
    this.cpps.config = configs.global;

    this.networkError = new FSEvent();
    if (cppo) {
      // if we are not using Stand Alone Survey
      if (!isObject(cppo) && cppo.length > 2) {
        // Carry over any CPPS that were in the query string
        cppo = JSON.parse(decompress(cppo));
      }
      for (const nk in cppo) {
        this.cpps.set(nk, cppo[nk]);
      }
    }

    // Keep track of the browser
    this.br = browser;

    // Did we submit the results?
    this.didSubmit = false;

    // tell the screen reader to announce changes to the content
    document.body.setAttribute("aria-live", "assertive");

    this.loader = new Loader();
    document.body.appendChild(this.loader.$el);

    if (configs && !!configs.instances && !!configs.instances.length) {
      // Find the config object for this survey
      for (let i = 0; i < configs.instances.length; i++) {
        if (configs.instances[i].mid == mid) {
          cfg = this.cfg = configs.instances[i];
          break;
        }
      }
    }

    if (typeof cfg === "undefined" && (configs.preview || namespace === "preview")) {
      const datauri = getParam("datauri");
      const tmpl = getParam("template") || "default";

      cfg = this.cfg = {
        mid,
        datauri,
        posturi: "",
        reporturi: "",
        surveytype: "popup",
        autowhitelist: true,
        preview: true,
        template: tmpl,
        replay: false,
      };
    }

    if (cfg) {
      // CC-3039 add IE10 class for customizations
      const ie10Class = browser.isIE && browser.browser.actualVersion == 10 ? " acsIE10" : "";
      document.title = this.cfg.label;
      // Keep track of journey
      this.jrny = jrny;

      this.sv = new Survey(this.cfg, this.cpps, this.br);

      this.sv.cfg.privacyuri = !this.sv.cfg.privacyuri
        ? "http://www.foresee.com/about-us/privacy-policy/"
        : this.sv.cfg.privacyuri;
      this.sv.cfg.privacytext = !this.sv.cfg.privacytext
        ? "Privacy policy"
        : this.sv.cfg.privacytext;

      // Set up the main content node
      this.$content = $(
        `<div id="acsMainContentDialog" class="acsMainContainerMobile--${
          cfg.template
        }${ie10Class}" role="dialog" aria-labelledby="acsFeedbackDialogTitle" aria-describedby="acsFeedbackDialogDesc" aria-live="assertive"></div>`
      );

      // Bind to the event that fires when a network error occurred
      this.networkError.subscribe(obj => {
        if (ctx.jrny) {
          if (obj && !!obj.type) {
            // Keeping this if the error is not covered in the code..
            ctx.jrny.addEventObj({
              name: `feedback_survey_${obj.type}`,
              properties: {
                mid: [ctx.cfg.mid],
              },
            });
          } else {
            ctx.jrny.addEventObj({
              name: "feedback_server_error",
              properties: {
                mid: [ctx.cfg.mid],
              },
            });
          }
        }
        this.renderError(obj.type);
      });

      this.initQ = new Async(
        true,
        () => {
          /* pragma:DEBUG_START */
          console.warn("fbs: fetched CSS and error template.");
          /* pragma:DEBUG_END */
          this._getTemplatesAndRender();
        },
        () => {
          /* pragma:DEBUG_START */
          console.warn("fbs: failed fetching CSS or error template.");
          /* pragma:DEBUG_END */
          window.close();
        }
      );

      this.initQ.enqueue(prom => {
        this._getCSS(prom);
      });

      this.initQ.enqueue(prom => {
        this._getTemplate("serviceunavailable", prom, template => {
          this.errTemplate = template;
        });
      });
    }

    // Before the window unloads, signal abandon
    Bind(window, "unload", () => {
      if (!ctx.didSubmit && ctx.jrny) {
        // Signal the event to the eventing server
        ctx.jrny.addEventObj({
          name: "feedback_abandoned",
          properties: {
            mid: [ctx.cfg.mid],
          },
        });
      }
    });
  }

  /**
   * Gets Survey, error and thank you templates.
   */
  _getTemplatesAndRender() {
    /* pragma:DEBUG_START */
    console.warn("fbs: getting templates.");
    /* pragma:DEBUG_END */
    const queue = new Async(
      true,
      () => {
        /* pragma:DEBUG_START */
        console.warn("fbs: fetched ", this.sv.cfg.template, " templates.");
        /* pragma:DEBUG_END */
        this.renderSurvey();
      },
      () => {
        /* pragma:DEBUG_START */
        console.warn("fbs: failed fetching ", this.sv.cfg.template, " templates.");
        /* pragma:DEBUG_END */
        this.renderError();
      }
    );

    queue.enqueue(prom => {
      // Go get the survey data
      this._getSurveyData(data => {
        this.survey = data;
        /* pragma:DEBUG_START */
        console.warn("fbs: fetched survey data.");
        /* pragma:DEBUG_END */

        prom.resolve();
      });
    });

    queue.enqueue(prom => {
      this._getTemplate("epilogue", prom, template => {
        this.epTemplate = template;
      });
    });

    queue.enqueue(prom => {
      this._getTemplate("surveycontents", prom, template => {
        this.svContentsTemplate = template;
      });
    });
  }

  /**
   * Get the css for the templates
   */
  _getCSS(prom) {
    /* pragma:DEBUG_START */
    console.log("fbs: getting css");
    /* pragma:DEBUG_END */
    loadCSS(
      makeURI(`$templates/feedback/${this.sv.cfg.template || "default"}/main.css`),
      link => {
        if (link) {
          /* pragma:DEBUG_START */
          console.log("fbs: css loaded");
          /* pragma:DEBUG_END */
          prom.resolve();
        } else {
          prom.error();
        }
      },
      null,
      this.br
    );
  }

  /**
   * Grabs a template by making a TemplateFetcher call.
   * @private
   * @return Object
   * @param type what kind of template
   * @param prom promise to be resolved to signal the caller
   */
  _getTemplate(type, prom, cb) {
    const tmp = this.cfg.template || "default";
    const url = makeURI(`$templates/feedback/${tmp}/${type}.html`);

    // Make a call to get the error template
    const jp = new TemplateFetcher({
      success(res) {
        if (prom) {
          prom.resolve();
        }
        return cb(res);
      },
      failure() {
        if (prom) {
          /* pragma:DEBUG_START */
          console.warn(`fbs: failed to fetch ${url}`);
          /* pragma:DEBUG_END */
          prom.error();
        }
      },
    });
    jp.get(url);
  }

  /**
   * Show the thankyou page
   * @private
   */
  _showThankyou() {
    const ctx = this;
    const res = this.epTemplate(this.survey);

    ctx.didSubmit = true;
    this.$content.innerHTML = res;
    const h1s = this.$content.$("h1");
    for (let p = 0; p < h1s.length; p++) {
      $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    const cbut = this.$content.$(".acs-close-button")[0];

    if (`${getParam("ok")}`.indexOf("false") === 0) {
      // this is for mobile because the OK button does nothing
      cbut.style.display = "none";

      // and because the ok button had the margin, it looks funny
      // with the privacy links crammed against the status text
      // and you don't have any time to click on them anyway
      // so we are hiding them.
      this.$content.$(".acs-footer")[0].style.display = "none";
    } else if (!this.cfg.preview) {
      Bind(cbut, "click", () => {
        window.close();
      });
    }

    // Hide the loader
    this.hideLoad();
  }

  /**
   * Hide the content and show the loading indicator
   */
  showLoad() {
    // announce when loading is finished
    document.body.setAttribute("aria-live", "assertive");
    document.getElementById("acsMainContentDialog").setAttribute("aria-live", "assertive");
    this.$content.css({ display: "none" });
    this.loader.center();
  }

  /**
   * Show the content and hide the loading indicator
   */
  hideLoad() {
    this.loader.moveOffScreen();
    if (hasClass(this.loader.$el, "acs-loader")) {
      this.loader.$el.setAttribute("aria-hidden", true);
    }
    this.$content.css({ display: "block" });
    setTimeout(() => {
      // stop announcing changes because this causes issues when topics are selected,
      // and when typing in boxes. We only need this to announce the content when loading
      // finishes.
      document.body.removeAttribute("aria-live");
      document.getElementById("acsMainContentDialog").setAttribute("aria-live", "off");
    }, 1000);
  }

  /**
   * Add/Update content
   * @param $el
   */
  renderSurvey() {
    const ctx = this;
    // Signal the event to the eventing server

    // Remove the table
    const oldtb = $("#acsPleaseWaitTable")[0];
    oldtb.parentNode.removeChild(oldtb);

    // Make sure the role="dialog" points to the label and description of the modal properly
    this.survey.meta.prologuetext = this._addTitleDescIds(this.survey.meta.prologuetext);
    this.survey.meta.epiloguetext = this._addTitleDescIds(this.survey.meta.epiloguetext);

    // Add the logo src
    this.survey.ansLogoSrc = makeURI("$p_b_foresee.svg");
    const res = this.svContentsTemplate(this.survey);
    this.$content.innerHTML = res;
    window.document.body.appendChild(this.$content);
    this.sv.bind(this.$content);

    if (ctx.jrny) {
      ctx.jrny.addEventObj({
        name: "feedback_survey_shown",
        properties: {
          mid: [ctx.cfg.mid],
        },
      });
    }

    // Bind to when we start submitting
    this.sv.SubmitClicked.subscribe(() => {
      this.showLoad();
      // Signal the event to the eventing server
      if (ctx.jrny) {
        ctx.jrny.addEventObj({
          name: "feedback_submitted",
          properties: {
            mid: [ctx.cfg.mid],
          },
        });
      }

      this._postSurveyData(success => {
        if (success) {
          if (!this.cfg.preview) {
            // Call processImmediate if required
            Replay.processImmediate();
          }
          // Show thankyou UI
          this._showThankyou();
        } else {
          this.networkError.fire({ type: "postdata_failed" });
        }

        // for communicating with the mobile app
        window.surveycomplete = true;
        if (typeof fsrTracker != "undefined") {
          // this is to call a function attached to the webview in the mobile app
          // eslint-disable-next-line no-undef
          fsrTracker.completeSurvey();
        }
      });
    });

    // Hide the loader
    this.hideLoad();
  }

  /**
   * This adds the acsFeedbackDialogTitle id to the first tag in the text,
   * and the acsFeedbackDialogDesc id to the remaining tags. This is to
   * allow the screen reader to announce what the role="dialog" is (label) and
   * why it's being presented (description) to the user separately.
   * @param {string} html
   */
  _addTitleDescIds(html) {
    // parse the html
    const el = document.createElement("div");
    el.innerHTML = html;
    const titleTag = el.childNodes[0];
    let descTag = el.childNodes[1];
    let returnHTML = "";

    if (el.childNodes.length > 2) {
      el.removeChild(el.childNodes[0]);

      // we need to wrap the remaining nodes in a div
      descTag = document.createElement("div");
      descTag.setAttribute("style", "padding: 0; margin: 0;");
      while (el.hasChildNodes()) {
        const child = el.firstChild;
        el.removeChild(child);
        descTag.appendChild(child);
      }
    }

    titleTag.setAttribute("id", "acsFeedbackDialogTitle");
    returnHTML = titleTag.outerHTML;

    if (descTag) {
      descTag.setAttribute("id", "acsFeedbackDialogDesc");
      returnHTML += descTag.outerHTML;
    }

    return returnHTML;
  }

  /**
   * Show Error template
   * @param String type of error
   */
  renderError(type) {
    this.$content.innerHTML = this.errTemplate(this.sv);
    const msg = this.$content.$(".acs-serviceunavailable__message")[0];
    if (type === "expired") {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      if (this.sv.cfg.fbexpiremessage) {
        msg.appendChild($(`<p>${this.sv.cfg.fbexpiremessage}</p>`));
      } else {
        msg.appendChild($(this._unencodeHTML(this.sv.defaultCfg.expired)));
      }
    } else {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      msg.appendChild($(this._unencodeHTML(this.sv.defaultCfg.unavailable)));
    }
    document.body.appendChild(this.$content);
    const h3s = this.$content.$("h3");
    for (let p = 0; p < h3s.length; p++) {
      $(h3s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    const cbut = this.$content.$(".acs-close-button")[0];

    if (!this.cfg.preview) {
      Bind(cbut, "click", () => {
        window.close();
      });
    }

    this.hideLoad();
    const oldtb = $("#acsPleaseWaitTable")[0];
    if (oldtb) {
      oldtb.parentNode.removeChild(oldtb);
    }
  }

  /**
   * unencodes html when necessary.
   * @private
   */
  _unencodeHTML(str) {
    const lt = /&lt;/gi;
    const gt = /&gt;/gi;
    return str.replace(lt, "<").replace(gt, ">");
  }

  /**
   * GET the survey data.
   * @param function callback to be called when it's successful.
   * @private
   */
  _getSurveyData(cb) {
    if (!this.sv.isExpired()) {
      // Set a timer to simulate a timeout on the ajax request
      this._surveyTimer = setTimeout(() => {
        /* pragma:DEBUG_START */
        console.warn("fbs: timed out requesting data from the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: "timedout" });
      }, 10000);
      // Make a call to get the data
      const SurveyDataRequest = new AjaxTransport({
        url: this.cfg.datauri,
        method: "GET",
        success: res => {
          if (!this.networkError.didFire) {
            clearTimeout(this._surveyTimer);
            this.sv.SurveyData.fire(res, data => {
              if (cb) {
                return cb(data);
              }
            });
          }
        },
        failure: () => {
          clearTimeout(this._surveyTimer);
          // Fire the network error event
          this.networkError.fire({ type: "getdata_failed" });
        },
      });

      SurveyDataRequest.send({
        data: {
          mid: this.cfg.mid,
          cachebust: new Date().getTime(),
          version: this.cfg.version,
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
    if (this.cfg.preview) {
      nextTick(() => {
        if (cb) {
          return cb(true);
        }
      });
      // Bomb out
      return;
    } else {
      this._surveyTimer = setTimeout(() => {
        /* pragma:DEBUG_START */
        console.warn("fb: timed out posting data to the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: "timedout" });
      }, 10000);
      const SurveyDataRequest = new AjaxTransport({
        url: this.sv.cfg.posturi,
        method: "POST",
        success: () => {
          clearTimeout(this._surveyTimer);
          if (cb) {
            return cb(true);
          }
        },
        failure: () => {
          clearTimeout(this._surveyTimer);
          // Set a persistent value
          sessionStorage.setItem("acsFeedbackSubmitted", "true");
          if (cb) {
            return cb(false);
          }
        },
      });

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

      // Push a CPP. Doing it this way won't add anything to storage
      if (isArray(data.responses)) {
        data.responses.push({
          questionId: "deployment_type",
          answerText: this.isStandalone ? "URL" : "BADGE",
        });
      }

      const tdata = compress(JSON.stringify(ext({ rating: this.sv._getScore() }, data)));

      if (!this.isStandalone) {
        // Set the window hash
        window.location.hash = `fsSurveyComplete=${encodeURIComponent(tdata)}`;
      }

      // Post the data
      SurveyDataRequest.send({
        data,
        skipEncode: true,
        contentType: "application/json",
      });
    }
  }
}

export { PopWindow };
