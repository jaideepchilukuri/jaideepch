/**
 * Badge class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.UI.Badge");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Misc.Template");

(function () {

  /**
   * Represents a badge
   * @param cfg
   * @constructor
   */
  var ButtonBadge = function (cfg, browser) {
    // Create the badge html
    this.cfg = cfg;
    var el, ctx = this, rtkn = 'acsFeedbackResultsCounter';
    this.btncfg = cfg;

    /**
     * Fires when someone clicks on the badge
     * @type {utils.FSEvent}
     */
    this.badgeClicked = new utils.FSEvent();
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
    this.btncfg.btnClass = "_acs _acs" + cfg.fbtype + "--" + cfg.template + " _acs" + cfg.fblocation;

    // Same defaults as a normal survey badge.
    this.btncfg.fbsize = this.cfg.fbsize || "medium";
    this.btncfg.btnClass = "_acs _acs" + cfg.fbtype + "--" + cfg.template + " _acsbadge--" + this.btncfg.fbsize + " _acs" + cfg.fblocation;
    this.btncfg.fbcolortext = this.btncfg.fbcolortext || "#fff";

    this.queue = new utils.Async(true, function () {
      /* pragma:DEBUG_START */
      console.warn("fbr: Fetched badge template.");
      /* pragma:DEBUG_END */
    }.bind(this), function () {
      /* pragma:DEBUG_START */
      console.warn("fbr: Failed fetching badge template.");
      /* pragma:DEBUG_END */
    }.bind(this));

    this.queue.enqueue(function (prom) {
      this._getBtnTemplate(prom, function (template) {
        this.btnTemplate = template;
        // console.log(template);
        var btncfg = { btncfg: ctx.btncfg };
        var temp = Templater(ctx.btnTemplate, btncfg);
        this.$el = document.createElement("div");
        this.$el.innerHTML = temp;
        this.$el = $(this.$el.querySelectorAll("div._acs")[0]);

        // Attach an event handler to trigger the feedback
        utils.Bind(ctx.$el, "feedback:click", function () {
          ctx._unhover();
          ctx.badgeClicked.fire(cfg);
        }, true);

        utils.Bind(ctx.$el, "feedback:keypress", function (e) {
          var keyVal = utils.getKeyCode(e);
          // Only enter this conditional if the user has hit enter;
          if (keyVal === "enter" || keyVal === " " || keyVal === "spacebar") {
            ctx._unhover();
            ctx.badgeClicked.fire(ctx.cfg);
          }
        }, true);

        // Attach an event handler to mouseover
        if (ctx.cfg.fbanimate) {
          utils.Bind(ctx.$el, "feedback:mouseenter", function () {
            ctx._hover();
          }, true);

          utils.Bind(ctx.$el, "feedback:mouseleave", function () {
            ctx._unhover();
          }, true);
        }

        // Add the element to the page
        document.body.appendChild(this.$el);

        // Add the main class to the html tag only if it's not b-a-b, for their conflicting
        // CSS on body tag.
        if (ACS_OVERRIDES && !ACS_OVERRIDES.FBALTPOSITION) {
          utils.addClass(document.documentElement, "fsfb fsfb-relbody");
        }

        // Initialize
        this.init();

      }.bind(this));
    }.bind(this));
  };

  /**
   * Simple button template grabber for feedbackreport.
   */
  ButtonBadge.prototype._getBtnTemplate = function (prom, cb) {
    var url = fs.makeURI("$templates/feedback/" + (this.template || 'default') + '/badge.html'),
      prefix = 'templates_feedback_' + (this.template || 'default') + '_';

    // Make a call to get the error template
    var jp = new utils.JSONP({
      success: function (res) {
        if (cb) {
          cb(res);
        }
        if (prom) {
          prom.resolve();
        }
      }.bind(this)
    });
    jp.get(url, prefix);
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
   * Initialize position
   */
  ButtonBadge.prototype.init = function (cb) {
    var timg = this.$el.$("._acsBadgeLabel"),
      ctx = this,
      cfg = ctx.cfg;

    // Hide this till we're done
    this.$el.css({ visibility: "hidden" });

    if (timg && timg.length > 0) {
      // Callback after the image has successfully loaded
      var vf = this.$el;
      ctx._unhover();
      this.$el.addClass("_acsAnimate");

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

    // Show
    this.$el.css({ visibility: "visible" });
    this.$el.css({ opacity: 1 });
    if (cb) {
      cb();
    }
  };

  /**
   * Replace the icon with a counter
   * @param num
   */
  ButtonBadge.prototype.setCounter = function (num) {
    var el = $(this.$el.$("._acsCounterInner")[0]);
    if (typeof num === 'undefined') {
      num = 0;
    }
    el.innerHTML = Math.round(num).toLocaleString();
    sessionStorage.setItem('acsFeedbackResultsCounter', num);
  };

  /**
   * Disable badge counter
   */
  ButtonBadge.prototype.disableCounter = function () {
    var el, cfg = this.cfg;
    if (this.$el) {
      el = this.$el.$("._acsBadgeImg")[0];
    }
  };

  /**
   * Enable badge counter
   */
  ButtonBadge.prototype.enableCounter = function () {
    if (this.$el) {
      this.$el.$("._acsCounterInner")[0].innerHTML = "0";
      $(this.$el.$("._acsCounterInner")[0]).css({ "background": "#F87473" });
    }
  };

  /**
   * Remove badge
   */
  ButtonBadge.prototype.remove = function () {
    this.$el.parentNode.removeChild(this.$el);
  };

})();