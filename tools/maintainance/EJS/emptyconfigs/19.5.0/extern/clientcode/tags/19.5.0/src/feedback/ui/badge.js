/**
 * Badge class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.ui.Badge");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Misc.Template");

(function () {

  // TODO clean this up; this.btncfg and this.cfg are the same thing
  /**
   * Represents a badge
   * @param cfg
   * @constructor
   */
  var ButtonBadge = function (cfg, browser, cpps, template, emtemplate, enabled) {
    // Create the badge html
    this.cfg = cfg;
    this.cpps = cpps;
    this.jrny = cfg.jrny;
    var el,
      rtkn = 'acsFeedbackResultsCounter',
      ctx = this,
      prevMode = cfg.previewMode ? cfg.previewMode.toLowerCase() : "";

    this.btncfg = cfg;

    /**
     * Fires when someone clicks on the badge
     * @type {utils.FSEvent}
     */
    this.badgeClicked = new utils.FSEvent();
    this.surveyTriggered = new utils.FSEvent();
    this.br = browser;

    // Check if we have device-type badge overrides
    if (cfg.devices && cfg.devices.overridesEnabled) {
      var overrides;
      // Any values can be overridden, cxsuite enforces which ones are valid
      if (browser.isTablet || prevMode === "tablet") {
        overrides = cfg.devices.tablet;
      } else if (browser.isMobile || prevMode === "mobile") {
        overrides = cfg.devices.mobile;
      } else {
        overrides = cfg.devices.desktop;
      }
      fs.ext(this.cfg, overrides);
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
    this.btncfg.btnClass = "_acs _acs" + cfg.fbtype + "--" + cfg.template + " _acsbadge--" + this.btncfg.fbsize + " _acs" + cfg.fblocation;
    this.btncfg.fbcolortext = this.btncfg.fbcolortext || "#fff";
    this.btnTemplate = template;
    this.emtemplate = emtemplate;
    this.enabled = !!enabled;
  };

  /**
   * Gets the template
   */
  ButtonBadge.prototype.setBtnTemplate = function () {
    var btncfg = {
      btncfg: this.btncfg
    },
      temp = Templater(this.btnTemplate, btncfg),
      ctx = this;

    // Handle when it is clicked
    ctx.badgeClicked.subscribe(function () {

      // Signal the event to the eventing server
      if (!ctx.br.isMobile && ctx.jrny) {
        ctx.jrny.addEventObj({
          "name": 'feedback_clicked',
          "properties": {
            "mid": [ctx.cfg.mid]
          }
        });
      }

      // Chain these events down
      ctx.surveyTriggered.fire({ emtemplate: ctx.emtemplate });
    }, false, true);

    this.$el = document.createElement("div");
    this.$el.innerHTML = temp;
    this.$el = $(this.$el.querySelectorAll("div._acs")[0]);

    // Attach an event handler to trigger the feedback
    if (this.enabled) {
      utils.Bind(this.$el, "feedback:click", function () {
        ctx._unhover();
        ctx.badgeClicked.fire(ctx.cfg);
      });

      utils.Bind(this.$el, "feedback:keypress", function (e) {
        var keyVal = utils.getKeyCode(e);
        // Only enter this conditional if the user has hit enter;
        if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
          ctx._unhover();
          ctx.badgeClicked.fire(ctx.cfg);
        }
      });
    }

    // Attach an event handler to mouseover
    if (this.cfg.fbanimate) {
      utils.Bind(this.$el, "feedback:mouseenter", function () {
        ctx._hover();
      });
      utils.Bind(this.$el, "feedback:mouseleave", function () {
        ctx._unhover();
      });
    }
    // If label is empty, set no display
    if (!this.btncfg.label.length) {
      this.$el.querySelectorAll("._acsBadgeLabel")[0].className += " _acsNoDisplay";
    }

    // Add the element to the page
    document.body.appendChild(this.$el);

    // Add the main class to the html tag only if it's not b-a-b, for their conflicting
    // CSS on body tag.
    if (ACS_OVERRIDES && !ACS_OVERRIDES.FBALTPOSITION) {
      utils.addClass(document.documentElement, "fsfb fsfb-relbody");
    }

    if (this.cfg.delay && this.cfg.delay > 0) {
      setTimeout(fs.proxy(function () {
        this.init();
      }, this), this.cfg.delay);
    } else {
      this.init();
    }
  };

  /**
   * Hover mode
   * @private
   */
  ButtonBadge.prototype._hover = function () {
    if (this.cfg.fbanimate) {
      this.$el.addClass("_acsHover");
    }
  };

  /**
   * UnHover mode
   * @private
   */
  ButtonBadge.prototype._unhover = function () {
    if (this.cfg.fbanimate) {
      this.$el.removeClass("_acsHover");
    }
  };

  /**
   * Initialize position                    `
   */
  ButtonBadge.prototype.init = function (cb) {
    var timg = this.$el.$("._acsBadgeLabel"),
      ctx = this,
      cfg = ctx.cfg;
    // Ensure the callback
    cb = cb || function () {
    };

    // Transmit the event
    if (ctx.jrny) {
      ctx.jrny.addEventObj({
        "name": 'feedback_button_shown',
        "properties": {
          "mid": [ctx.cfg.mid]
        }
      });
    }
    // Hide this till we're done
    this.$el.css({ visibility: "hidden" });

    if (timg && timg.length > 0) {
      // Callback after the image has successfully loaded
      if (cb) {
        var vf = this.$el;
        setTimeout(function () {
          ctx._unhover();
          setTimeout(function () {
            vf.addClass("_acsAnimate");
            cb();
          }, 250);
        }, 250);

        // If it's vertical then make it so
        if (this.cfg.fbdirection == "vertical") {
          if (this.cfg.fblocation.indexOf('right') > -1) {
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
  };

  /**
   * Remove badge
   */
  ButtonBadge.prototype.remove = function () {
    this.enabled = false;
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  };

  /**
   * Total disposition
   */
  ButtonBadge.prototype.dispose = function () {
    this.remove();
    this.disposed = true;
  };

})();