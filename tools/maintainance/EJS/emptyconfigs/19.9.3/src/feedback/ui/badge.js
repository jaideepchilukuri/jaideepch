/**
 * Badge class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ACS_OVERRIDES } from "../customerhacks";
import { $ } from "../dom/minidom";
import { Templater } from "../misc/template";
import { ext } from "../../fs/index";
import { addClass, Bind, FSEvent, getKeyCode, getGeneralStorage } from "../../utils/utils";

// TODO clean this up; this.btncfg and this.cfg are the same thing
/**
 * Represents a badge
 * @param cfg
 * @constructor
 */
class ButtonBadge {
  constructor(cfg, browser, cpps, template, emtemplate, enabled) {
    // Create the badge html
    this.cfg = cfg;
    this.cpps = cpps;
    this.jrny = cfg.jrny;
    const rtkn = "acsFeedbackResultsCounter";
    const prevMode = cfg.previewMode ? cfg.previewMode.toLowerCase() : "";

    this.btncfg = cfg;

    /**
     * Fires when someone clicks on the badge
     * @type {utils.FSEvent}
     */
    this.badgeClicked = new FSEvent();
    this.surveyTriggered = new FSEvent();
    this.br = browser;

    // Check if we have device-type badge overrides
    if (cfg.devices && cfg.devices.overridesEnabled) {
      let overrides;
      // Any values can be overridden, cxsuite enforces which ones are valid
      if (browser.isTablet || prevMode === "tablet") {
        overrides = cfg.devices.tablet;
      } else if (browser.isMobile || prevMode === "mobile") {
        overrides = cfg.devices.mobile;
      } else {
        overrides = cfg.devices.desktop;
      }
      ext(this.cfg, overrides);
      // Change the png to svg..
      if (this.cfg.icon.lastIndexOf(".png") > -1) {
        this.btncfg.icon = this.cfg.icon.replace(".png", ".svg");
      }
    }

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
    this.btncfg.fbsize = this.cfg.fbsize || "medium";
    this.btncfg.btnClass = `_acs _acs${cfg.fbtype}--${cfg.template} _acsbadge--${
      this.btncfg.fbsize
    } _acs${cfg.fblocation}`;
    this.btncfg.fbcolortext = this.btncfg.fbcolortext || "#fff";
    this.btnTemplate = template;
    this.emtemplate = emtemplate;
    this.enabled = !!enabled;
  }

  /**
   * Gets the template
   */
  setBtnTemplate() {
    const btncfg = {
      btncfg: this.btncfg,
    };
    const temp = Templater(this.btnTemplate, btncfg);
    const ctx = this;

    // Handle when it is clicked
    ctx.badgeClicked.subscribe(
      () => {
        // Signal the event to the eventing server
        if (ctx.jrny) {
          ctx.jrny.addEventObj({
            name: `feedback_clicked${ctx.br.isMobile ? "_mobile" : ""}`,
            properties: {
              mid: [ctx.cfg.mid],
            },
          });
        }

        // Chain these events down
        ctx.surveyTriggered.fire({ emtemplate: ctx.emtemplate });
      },
      false,
      true
    );

    this.$el = document.createElement("div");
    this.$el.innerHTML = temp;
    this.$el = $(this.$el.querySelectorAll("div._acs")[0]);

    // Attach an event handler to trigger the feedback
    if (this.enabled) {
      Bind(this.$el, "feedback:click", () => {
        ctx._unhover();
        ctx.badgeClicked.fire(ctx.cfg);
      });

      Bind(this.$el, "feedback:keypress", e => {
        const keyVal = getKeyCode(e);
        // Only enter this conditional if the user has hit enter;
        if (keyVal === "enter" || keyVal === "spacebar") {
          ctx._unhover();
          ctx.badgeClicked.fire(ctx.cfg);
        }
      });
    }

    // Attach an event handler to mouseover
    if (this.cfg.fbanimate) {
      Bind(this.$el, "feedback:mouseenter", () => {
        ctx._hover();
      });
      Bind(this.$el, "feedback:mouseleave", () => {
        ctx._unhover();
      });
    }
    // If label is empty, adjust the padding of the label to ensure square badge
    if (!this.btncfg.label.length) {
      this.$el.querySelector("._acsBadgeLabel").style.paddingLeft = 0;
    }

    // Add the element to the page
    document.body.appendChild(this.$el);

    // Add the main class to the html tag only if it's not b-a-b, for their conflicting
    // CSS on body tag.
    if (ACS_OVERRIDES && !ACS_OVERRIDES.FBALTPOSITION) {
      addClass(document.documentElement, "fsfb fsfb-relbody");
    }

    if (this.cfg.delay && this.cfg.delay > 0) {
      setTimeout(() => {
        this.init();
      }, this.cfg.delay);
    } else {
      this.init();
    }
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
   * Initialize position                    `
   */
  init(cb) {
    const timg = this.$el.$("._acsBadgeLabel");
    const ctx = this;
    const stg = getGeneralStorage(this.br);
    // Ensure the callback
    cb = cb || (() => {});

    // Transmit the event
    if (ctx.jrny && !stg.get("fbb")) {
      stg.set("fbb", "s", 24 * 60 * 60 * 1000);
      ctx.jrny.addEventObj({
        name: "feedback_button_shown",
        properties: {
          mid: [ctx.cfg.mid],
        },
      });
    }
    // Hide this till we're done
    this.$el.css({ visibility: "hidden" });

    if (timg && timg.length > 0) {
      // Callback after the image has successfully loaded
      if (cb) {
        const vf = this.$el;
        setTimeout(() => {
          ctx._unhover();
          setTimeout(() => {
            vf.addClass("_acsAnimate");
            cb();
          }, 250);
        }, 250);

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

      if (this.cfg.fbtype === "none") {
        this.$el.css({ display: "none" });
      } else {
        this.$el.css({ visibility: "visible" });
      }

      if (ctx.br.isMobile) {
        this.$el.setAttribute("role", "link");
      }
    }
  }

  /**
   * Remove badge
   */
  remove() {
    this.enabled = false;
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  }

  /**
   * Total disposition
   */
  dispose() {
    this.remove();
    this.disposed = true;
  }
}

/**
 * Get the actual config, after applying the devices.overrides corresponding to
 * the current context (browser).
 * @param {Object} [config=this.cfg] The base configuration to use
 * @param {Object} [browser=this.br] The browser representing the current context
 */
function getFeedbackBadgeType(config, browser) {
  config = config || this.cfg;
  browser = browser || this.br;

  const prevMode = config.previewMode ? config.previewMode.toLowerCase() : "";
  let result = config.fbtype;

  if (!config || !browser) {
    /* pragma:DEBUG_START */
    console.log("fb: invalid argument", config, browser);
    /* pragma:DEBUG_END */
    return result;
  }

  // Check if we have device-type badge overrides
  if (config.devices && config.devices.overridesEnabled) {
    // Any values can be overridden, cxsuite enforces which ones are valid
    if (browser.isTablet || prevMode === "tablet") {
      result = config.devices.tablet.fbtype || config.fbtype;
    } else if (browser.isMobile || prevMode === "mobile") {
      result = config.devices.mobile.fbtype || config.fbtype;
    } else {
      result = config.devices.desktop.fbtype || config.fbtype;
    }
  }

  return result;
}

export { ButtonBadge, getFeedbackBadgeType };
