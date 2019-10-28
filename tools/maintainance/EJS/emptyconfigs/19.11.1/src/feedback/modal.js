/**
 * Modal Dialog
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ACS_OVERRIDES } from "./customerhacks";
import { $ } from "./dom/minidom";
import { Loader } from "./loader";
import { Singletons } from "./top";
import { ext, isArray, makeURI, nextTick } from "../fs/index";
import {
  addClass,
  AjaxTransport,
  Bind,
  DOMContains,
  FSEvent,
  getKeyCode,
  getScroll,
  getSize,
  Unbind,
} from "../utils/utils";

/**
 * Defines a modal dialog
 * @param survey
 */
class Modal {
  constructor(survey, browser, instconfig, errortemplate, modaltemplate, eptemplate) {
    this.sv = survey;
    this.cfg = survey.cfg;
    this.instcfg = instconfig;
    this.browser = browser;
    this.em = errortemplate;
    this.noserv = errortemplate;
    this.eptemplate = eptemplate;
    this.jrny = survey.cfg.jrny;
    this.add();
    this.modaltemplate = modaltemplate;
    this.ajax = new AjaxTransport();
    this.sv.cfg.privacyuri = !this.sv.cfg.privacyuri
      ? "http://www.foresee.com/about-us/privacy-policy/"
      : this.sv.cfg.privacyuri;
    this.sv.cfg.privacytext = !this.sv.cfg.privacytext ? "Privacy policy" : this.sv.cfg.privacytext;

    // Fires when a survey is submitted
    this.SurveySubmitted = new FSEvent();
    // Fires on a network error
    this.networkError = new FSEvent();

    // Bind to the event that fires when a user begins submitting a survey
    this.sv.SubmitClicked.subscribe(() => {
      this.$content.removeClass("acsVisible");
      this._showWait();
      this._postSurveyData(() => {
        // Signal the event to the eventing server
        if (this.jrny) {
          this.jrny.addEventObj({
            name: "feedback_submitted",
            properties: {
              mid: [this.cfg.mid],
            },
          });
        }
        this.$content.addClass("acsVisible");
        this._showThankyou();
        this.SurveySubmitted.fire();
        this._removeWait();
      });
    });

    // Bind to the event that fires when a network error occurred
    this.networkError.subscribe(obj => {
      this._removeWait();
      // Signal the event to the eventing server
      if (obj && !!obj.type) {
        if (this.jrny) {
          this.jrny.addEventObj({
            name: `feedback_survey_${obj.type}`,
            properties: {
              mid: [this.cfg.mid],
            },
          });
        }
      } else if (this.jrny) {
        // Keeping this if the error is not covered in the code..
        this.jrny.addEventObj({
          name: "feedback_server_error",
          properties: {
            mid: [this.cfg.mid],
          },
        });
      }

      this.$content.innerHTML = this.noserv(this.survey);
      const h1s = this.$content.$("h1");
      const cbut = this.$content.$(".acs-close-button")[0];
      const msg = this.$content.$(".acs-serviceunavailable__message")[0];
      if (obj.type === "expired") {
        while (msg.firstChild) {
          msg.removeChild(msg.firstChild);
        }
        if (this.sv.cfg.fbexpiremessage) {
          msg.appendChild($(`<p>${this.sv.cfg.fbexpiremessage}</p>`));
        } else {
          const st = this._unencodeHTML(this.sv.defaultCfg.expired);
          msg.appendChild($(st));
        }
      } else {
        while (msg.firstChild) {
          msg.removeChild(msg.firstChild);
        }
        const str = this._unencodeHTML(this.sv.defaultCfg.unavailable);
        msg.appendChild($(str));
      }
      for (let p = 0; p < h1s.length; p++) {
        $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
      }

      if (!this.cfg.preview) {
        this.positionModal();
        Bind(cbut, "feedbackModal:click", () => {
          this.remove();
        });
      }

      this.$content.addClass("acsVisible");
    });

    this._getSurveyData();
  }

  /**
   * Show the thankyou page
   * @private
   */
  _showThankyou() {
    const res = this.eptemplate(this.survey);
    this.$content.innerHTML = res;
    const h1s = this.$content.$("h1");
    const cbut = this.$content.$(".acs-close-button")[0];
    const focusModal = document.getElementById("fsrModalFocus");
    for (let p = 0; p < h1s.length; p++) {
      addClass(h1s[p], "acs-feedback__heading acs-feedback__heading--h1");
    }
    this.positionModal();

    if (!this.cfg.preview) {
      Bind(cbut, "feedbackModal:click", () => {
        this.remove();
      });
    }

    focusModal.focus();
  }

  /**
   * Decodes HTML if necessary.
   * @private
   */
  _unencodeHTML(str) {
    const lt = /&lt;/gi;
    const gt = /&gt;/gi;
    return str.replace(lt, "<").replace(gt, ">");
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
    this._wait.$el.css({
      top: `${scroll.y + (sz.h - this._wait.$el.offsetHeight) / 2}px`,
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
   * Remove everything
   */
  remove() {
    if (this.$el && this.$el.parentNode) {
      // remove all feedbackModal event handlers
      Unbind("feedbackModal:*");

      this.$el.parentNode.removeChild(this.$el);

      Singletons.onFeedbackClosed.fire(this.$el);
    }
  }

  /**
   * Add the modal to the page
   * @param win - window object to add the modal to
   */
  add(win) {
    // Get a reference to the window object
    win = win || window;

    const body = win.document.body;
    const html = win.document.documentElement;
    const height = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
    let modalClass = `acsModalContainer--${this.instcfg.template}`;
    const cfg = this.sv.cfg;
    const backFace = $('<div class="acsModalBackFace"></div>');
    const chrome = $('<div class="acsModalChrome"></div>');

    // CC-3039 add IE10 class for customizations
    if (this.browser.isIE && this.browser.browser.version == 10) {
      modalClass += " acsIE10";
    }

    // Construct the modal element
    this.$el = $(`<div class="${modalClass}"></div>`);
    this.$el.css({ height });

    if (!this.cfg.preview) {
      const ctx = this;
      Bind(backFace, "feedbackModal:click", () => {
        // Only honor this request if we have the survey displayed or there was a network error
        if (this.survey || this.networkError.didFire) {
          // Signal the event to the eventing server
          if (ctx.jrny) {
            ctx.jrny.addEventObj({
              name: "feedback_abandoned",
              properties: {
                mid: [cfg.mid],
              },
            });
          }
          // Network error, removing the modal, so that the next click triggers a new request.
          this.remove();
        }
      });

      // Close on esc
      const escClbk = event => {
        if (getKeyCode(event) == "escape") {
          // Signal the event to the eventing server
          if (ctx.jrny) {
            ctx.jrny.addEventObj({
              name: "feedback_abandoned",
              properties: {
                mid: [cfg.mid],
              },
            });
          }
          ctx.remove();
          ctx.focusOnBadge();
        }
      };
      Bind(document.body, "feedbackModal:keyup", escClbk);
      Bind(chrome, "feedbackModal:click", e => {
        const targ = e.target;
        if (targ && targ == chrome) {
          // Signal the event to the eventing server
          if (ctx.jrny) {
            ctx.jrny.addEventObj({
              name: "feedback_abandoned",
              properties: {
                mid: [cfg.mid],
              },
            });
          }
          ctx.remove();
          ctx.focusOnBadge();
        }
      });
    }

    // Create the content holder and header
    const head = (this.head = $(
      '<div class="acsModalContent" id="acsModalContent" role="dialog" aria-labelledby="acsFeedbackDialogTitle" aria-describedby="acsFeedbackDialogDesc"></div>'
    ));
    const mdlhead = $('<div class="acsModalHead" role="presentation"></div>');
    const closebtn = $(
      `<img id="fsrModalFocus" src="${makeURI(
        `$templates/feedback/${this.instcfg.template || "default"}/closeBtn.svg`
      )}" class="acsModalCloseButton" alt="Close Button" tabindex="0">`
    );

    this.$head = mdlhead;
    mdlhead.appendChild(closebtn);
    head.appendChild(mdlhead);

    // Create inner content
    this.$content = $('<div class="acsModalInnerContent" role="presentation"></div>');

    // Append the elements to modal
    head.appendChild(this.$content);
    chrome.appendChild(head);
    this.$el.appendChild(backFace);
    this.$el.appendChild(chrome);

    // Add the modal to body
    const topContainer = win.document.body;
    topContainer.appendChild(this.$el);
    if (!this.cfg.preview) {
      Bind(closebtn, "feedbackModal:click", () => {
        // Signal the event to the eventing server
        if (this.jrny) {
          this.jrny.addEventObj({
            name: "feedback_abandoned",
            properties: {
              mid: [this.cfg.mid],
            },
          });
        }
        this.remove();
        this.focusOnBadge();
      });

      Bind(closebtn, "feedbackModal:keypress", e => {
        // Signal the event to the eventing server
        const kc = getKeyCode(e);
        const exitBtn = kc == "enter" || kc == "spacebar";

        if (exitBtn) {
          this.jrny.addEventObj({
            name: "feedback_abandoned",
            properties: {
              mid: [this.cfg.mid],
            },
          });
          this.remove();
          this.focusOnBadge();
          e.preventDefault();
        }
      });
    }

    nextTick(() => {
      backFace.addClass("_acsActive");
    });
    this._showWait();
    this._trapKeyBoard(head, closebtn);
  }

  /**
   * Add/Update content
   *
   */
  renderSurvey() {
    this._removeWait();
    this.$head.addClass("acsVisible");

    // Modify the incoming survey data with various tweaks

    // Add in the answers logo url
    this.survey.ansLogoSrc = makeURI("$p_b_foresee.svg");

    // Make sure the role="dialog" points to the label and description of the modal properly
    this.survey.meta.prologuetext = this._addTitleDescIds(this.survey.meta.prologuetext);
    this.survey.meta.epiloguetext = this._addTitleDescIds(this.survey.meta.epiloguetext);

    const res = this.modaltemplate(this.survey);
    this.$content.innerHTML = res;
    this.sv.bind(this.$content);
    this.positionModal();
    this.$content.addClass("acsVisible");

    Singletons.onFeedbackShown.fire(this.$el);

    if (this.jrny) {
      this.jrny.addEventObj({
        name: "feedback_survey_shown",
        properties: {
          mid: [this.cfg.mid],
        },
      });
    }

    // Ensure that CSS has loaded before focusing
    Singletons.onModalCssRetrieved.subscribe(
      () => {
        const firstfocusEl = document.getElementById("fsrModalFocus");
        firstfocusEl.focus();
      },
      true,
      true
    );
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
   * Update the position of the modal
   */
  positionModal() {
    const sz = getSize(window);
    const mdlHeight = this.$content.offsetHeight || this.prevOffsetHeight;
    let vl;

    if (sz.h > mdlHeight) {
      vl = `${Math.max(0, (sz.h - mdlHeight - 50) / 2)}px`;
    }

    this.head.style.marginTop = vl;

    // Enforce special css to modalcontainer on *.peco.c* to avoid their restrictions on body tag for overflow.
    if (ACS_OVERRIDES && ACS_OVERRIDES.FBALTOVERFLOW) {
      this.$el.css({ "overflow-y": "scroll", display: "block" });
    }
  }

  /**
   * Reveal
   */
  show() {
    this.positionModal();
    this.$el.css({ display: "block" });
    Singletons.onFeedbackShown.fire(this.$el);
  }

  /**
   *
   */
  focusOnBadge() {
    const badgeEl = this.instcfg.badge && this.instcfg.badge.$el;

    if (badgeEl) {
      badgeEl.focus();
    }
  }

  /**
   * Trap the keyboard tabbing in modal
   */
  _trapKeyBoard(modalContainer, firstFocusEl) {
    // Trap keyboard inside the Modal
    firstFocusEl = firstFocusEl ? firstFocusEl : modalContainer;

    Bind(
      document.body,
      "feedbackModal:focus",
      e => {
        e = e || window.event;
        const target = e.target || e.srcElement;

        // If an invite is present, it has the priority
        const elInvite =
          document.getElementById("acsMainInvite") || document.getElementById("fsrInvite");
        if (elInvite && DOMContains(elInvite, target)) {
          return;
        }

        if (!DOMContains(modalContainer, target)) {
          if (firstFocusEl) {
            e.stopPropagation();
            firstFocusEl.focus();
          }
        }
      },
      false
    );
  }

  /**
   * Make a request to GET Survey data
   * @private
   */
  _getSurveyData() {
    if (!this.sv.isExpired()) {
      /* pragma:DEBUG_START */
      console.warn("fb: frame controller ready. making ajax request..");
      /* pragma:DEBUG_END */

      const cfobj = {
        mid: this.sv.cfg.mid,
        cachebust: new Date().getTime(),
      };

      if (this.sv.cfg.version) {
        cfobj.version = this.sv.cfg.version;
      }

      // Set a timer to simulate a timeout on the ajax request
      this._surveyTimer = setTimeout(() => {
        /* pragma:DEBUG_START */
        console.warn("fb: timed out requesting data from the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: "timedout" });
      }, 10000);

      this.ajax.send({
        url: this.sv.cfg.datauri,
        data: cfobj,
        method: "GET",
        skipEncode: false,
        success: res => {
          if (!this.networkError.didFire) {
            clearTimeout(this._surveyTimer);
            this.sv.SurveyData.fire(res, data => {
              this.survey = data;
              this.renderSurvey();
            });
          }
        },
        failure: () => {
          if (!this.networkError.didFire) {
            // Fire the network error event
            this.networkError.fire({ type: "getdata_failed" });
          }
        },
      });
    } else {
      /* pragma:DEBUG_START */
      console.warn("fb: survey is expired..");
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
          return cb();
        }
      });
      // Bomb out
      return;
    }

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
        answerText: "BADGE",
      });
    }
    Singletons.onFeedbackSubmitted.fire(ext({ rating: this.sv._getScore() }, data));

    this._surveyTimer = setTimeout(() => {
      /* pragma:DEBUG_START */
      console.warn("fb: timed out posting data to the server");
      /* pragma:DEBUG_END */
      this.networkError.fire({ type: "timedout" });
    }, 10000);

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

export { Modal };
