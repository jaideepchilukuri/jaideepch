/**
 * Badge class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ACS_OVERRIDES } from "../../feedback/customerhacks";
import { $ } from "../dom/minidom";
import { Templater } from "../misc/template";
import { makeURI } from "../../fs/index";
import { addClass, Bind, FSEvent, getKeyCode, Async, JSONP } from "../../utils/utils";

/**
 * Represents a badge
 * @param cfg
 * @constructor
 */
class ButtonBadge {
  constructor(cfg, browser) {
    // Create the badge html
    this.cfg = cfg;
    const ctx = this;
    const rtkn = "acsFeedbackResultsCounter";
    this.btncfg = cfg;

    /**
     * Fires when someone clicks on the badge
     * @type {utils.FSEvent}
     */
    this.badgeClicked = new FSEvent();
    this.br = browser;
    this.animationMove = 4;
    if (cfg.counter) {
      this.counter = 0;
      if (sessionStorage.getItem(rtkn)) {
        this.counter = Math.round(parseFloat(sessionStorage.getItem(rtkn)));
        this.counter = isNaN(this.counter) ? 0 : this.counter;
      }
      this.btncfg.counter = this.counter;
      this.btncfg.counterLocale = cfg.counter.toLocaleString();
    }
    this.btncfg.btnClass = `_acs _acs${cfg.fbtype}--${cfg.template} _acs${cfg.fblocation}`;

    // Same defaults as a normal survey badge.
    this.btncfg.fbsize = this.cfg.fbsize || "medium";
    this.btncfg.btnClass = `_acs _acs${cfg.fbtype}--${cfg.template} _acsbadge--${
      this.btncfg.fbsize
    } _acs${cfg.fblocation}`;
    this.btncfg.fbcolortext = this.btncfg.fbcolortext || "#fff";

    this.queue = new Async(
      true,
      () => {
        /* pragma:DEBUG_START */
        console.warn("fbr: Fetched badge template.");
        /* pragma:DEBUG_END */
      },
      () => {
        /* pragma:DEBUG_START */
        console.warn("fbr: Failed fetching badge template.");
        /* pragma:DEBUG_END */
      }
    );

    this.queue.enqueue(prom => {
      this._getBtnTemplate(prom, template => {
        this.btnTemplate = template;
        // console.log(template);
        const btncfg = { btncfg: ctx.btncfg };
        const temp = Templater(ctx.btnTemplate, btncfg);
        this.$el = document.createElement("div");
        this.$el.innerHTML = temp;
        this.$el = $(this.$el.querySelectorAll("div._acs")[0]);

        // Attach an event handler to trigger the feedback
        Bind(
          ctx.$el,
          "feedback:click",
          () => {
            ctx._unhover();
            ctx.badgeClicked.fire(cfg);
          },
          true
        );

        Bind(
          ctx.$el,
          "feedback:keypress",
          e => {
            const keyVal = getKeyCode(e);
            // Only enter this conditional if the user has hit enter;
            if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
              ctx._unhover();
              ctx.badgeClicked.fire(ctx.cfg);
            }
          },
          true
        );

        // Attach an event handler to mouseover
        if (ctx.cfg.fbanimate) {
          Bind(
            ctx.$el,
            "feedback:mouseenter",
            () => {
              ctx._hover();
            },
            true
          );

          Bind(
            ctx.$el,
            "feedback:mouseleave",
            () => {
              ctx._unhover();
            },
            true
          );
        }

        // Add the element to the page
        document.body.appendChild(this.$el);

        // Add the main class to the html tag only if it's not b-a-b, for their conflicting
        // CSS on body tag.
        if (ACS_OVERRIDES && !ACS_OVERRIDES.FBALTPOSITION) {
          addClass(document.documentElement, "fsfb fsfb-relbody");
        }

        // Initialize
        this.init();
      });
    });
  }

  /**
   * Simple button template grabber for feedbackreport.
   */
  _getBtnTemplate(prom, cb) {
    const url = makeURI(`$templates/feedback/${this.template || "default"}/badge.html`);
    const prefix = `templates_feedback_${this.template || "default"}_`;

    // Make a call to get the error template
    const jp = new JSONP({
      success(res) {
        if (prom) {
          prom.resolve();
        }
        if (cb) {
          return cb(res);
        }
      },
    });
    jp.get(url, prefix);
  }

  /**
   * Hover mode
   * @private
   */
  _hover() {
    if (this.cfg.fbanimate) {
      this.$el.addClass("_acsHover");
    }
  }

  /**
   * UnHover mode
   * @private
   */
  _unhover() {
    if (this.cfg.fbanimate) {
      this.$el.removeClass("_acsHover");
    }
  }

  /**
   * Initialize position
   */
  init(cb) {
    const timg = this.$el.$("._acsBadgeLabel");
    const ctx = this;

    // Hide this till we're done
    this.$el.css({ visibility: "hidden" });

    if (timg && timg.length > 0) {
      // Callback after the image has successfully loaded
      ctx._unhover();
      this.$el.addClass("_acsAnimate");

      // If it's vertical then make it so
      if (this.cfg.fbdirection == "vertical") {
        if (this.cfg.fblocation.indexOf("right") > -1) {
          this.$el.addClass("_acsVertical_right");
        } else {
          this.$el.addClass("_acsVertical_left");
        }
      }

      // Add the fixed class if it's fixed
      if (this.cfg.fbfixed) {
        this.$el.addClass("_acsFixed");
      }
    }

    // Show
    this.$el.css({ visibility: "visible" });
    this.$el.css({ opacity: 1 });
    if (cb) {
      return cb();
    }
  }

  /**
   * Replace the icon with a counter
   * @param num
   */
  setCounter(num) {
    const el = $(this.$el.$("._acsCounterInner")[0]);
    if (typeof num === "undefined") {
      num = 0;
    }
    el.innerHTML = Math.round(num).toLocaleString();
    sessionStorage.setItem("acsFeedbackResultsCounter", num);
  }

  /**
   * Disable badge counter
   */
  disableCounter() {}

  /**
   * Enable badge counter
   */
  enableCounter() {
    if (this.$el) {
      this.$el.$("._acsCounterInner")[0].innerHTML = "0";
      $(this.$el.$("._acsCounterInner")[0]).css({ background: "#F87473" });
    }
  }

  /**
   * Remove badge
   */
  remove() {
    this.$el.parentNode.removeChild(this.$el);
  }
}

export { ButtonBadge };
