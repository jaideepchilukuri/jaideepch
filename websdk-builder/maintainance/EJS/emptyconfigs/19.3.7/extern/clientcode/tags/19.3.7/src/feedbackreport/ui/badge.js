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
    this.btncfg.imgsrc = fs.makeURI("$templates/feedback/" + cfg.template + "/" + cfg.icon);
    if (!cfg.counter) {
      this.isIcon = true;
    } else {
      this.isIcon = false;
      this.counter = 0;
      if (sessionStorage.getItem(rtkn)) {
        this.counter = Math.round(parseFloat(sessionStorage.getItem(rtkn)));
        this.counter = isNaN(this.counter) ? 0 : this.counter;
      }
      this.btncfg.counter = this.counter;
      this.btncfg.counterLocale = cfg.counter.toLocaleString();
    }
    this.btncfg.btnClass = "_acs _acs" + cfg.fbtype + "--" + cfg.template + " _acs" + cfg.fblocation;

    this.queue = new utils.Async(true, fs.proxy(function() {
      /* pragma:DEBUG_START */
      console.warn("fbr: Fetched badge template.");
      /* pragma:DEBUG_END */
    }, this), fs.proxy(function() {
      /* pragma:DEBUG_START */
      console.warn("fbr: Failed fetching badge template.");
      /* pragma:DEBUG_END */
    }, this));

    this.queue.enqueue(fs.proxy(function(prom) {
      this._getBtnTemplate(prom, fs.proxy(function(template) {
        this.btnTemplate = template;
        // console.log(template);
        var btncfg = {btncfg: ctx.btncfg};
        var temp = Templater(ctx.btnTemplate, btncfg);
        this.$el = document.createElement("div");
        this.$el.innerHTML= temp;
        this.$el = $(this.$el.querySelectorAll("div._acs")[0]);

        // Attach an event handler to trigger the feedback
        utils.Bind(ctx.$el, "feedback:click", function () {
          ctx._unhover();
          ctx.badgeClicked.fire(cfg);
        }, this);

        // Attach an event handler to mouseover
        if (ctx.cfg.fbanimate) {
          utils.Bind(ctx.$el, "feedback:mouseenter", function () {
            ctx._hover();
          }, this);

          utils.Bind(ctx.$el, "feedback:mouseleave", function () {
            ctx._unhover();
          }, this);
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

      },this));
    },this));
  };

  /**
   * Simple button template grabber for feedbackreport.
   */
  ButtonBadge.prototype._getBtnTemplate = function(prom, cb) {
    var url  = fs.makeURI("$templates/feedback/" + (this.template || 'default') + '/badge.html'),
      prefix = 'templates_feedback_' + (this.template || 'default') + '_';

    // Make a call to get the error template
    var jp = new utils.JSONP({
      success: fs.proxy(function (res) {
        if(cb) {
          cb(res);
        }
        if(prom) {
          prom.resolve();
        }
      }, this)
    });
    jp.get(url, prefix);
  };

  /**
   * Hover mode
   * @private
   */
  ButtonBadge.prototype._hover = function () {
    this.busy = true;
    var timg = this.$el.$("._acsBadgeLabel");
    if (this.cfg.fbdirection == "horizontal") {
      if (timg && timg.length > 0) {
        if (this.cfg.fblocation.indexOf('right') > -1) {
          // It's on the right side
          this.$el.css({right: ''});
        } else {
          // It's on the left side
          this.$el.css({left: ''});
        }
      }
    } else {
      var oH = this.$el.offsetHeight,
        oW = this.$el.offsetWidth,
        ri = (oW - oH) / 2;

      if (this.cfg.fblocation.indexOf('right') > -1) {
        // It's on the right side
        this.$el.css({right: -(ri) + "px"});
      } else {
        // It's on the left side
        this.$el.css({left: -(ri) + "px"});
      }
    }
  };

  /**
   * UnHover mode
   * @private
   */
  ButtonBadge.prototype._unhover = function () {
    if (this.cfg.fbanimate && this.cfg.fbdirection == "horizontal") {
      var timg = this.$el.$("._acsBadgeLabel");
      if (timg && timg.length > 0) {
        timg = timg[0].offsetWidth;
        if (this.cfg.fblocation.indexOf('right') > -1) {
          // It's on the right side
          this.$el.css({right: -timg + "px"});
        } else {
          // It's on the left side
          this.$el.css({left: -timg + "px"});
        }
      }
      //If it's vertical move it back to the same place
    } else if (this.cfg.fbdirection == "vertical") {
      var oH = this.$el.offsetHeight,
        oW = this.$el.offsetWidth,
        ri = (oW - oH) / 2;

      if (this.cfg.fblocation.indexOf('right') > -1) {
        // It's on the right side
        this.$el.css({right: -(ri + this.animationMove) + "px"});
      } else {
        // It's on the left side
        this.$el.css({left: -(ri + this.animationMove) + "px"});
      }
    }
    this.busy = false;

  };

  /**
   * Change the position of the tab to be vertically placed on the page
   */
  ButtonBadge.prototype._positionVertical = function (cb) {
    var oH = this.$el.offsetHeight, oW = this.$el.offsetWidth, ri = (oW - oH) / 2, oT = this.$el.offsetTop, docHeight = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
    // Set top bottom
    if (this.cfg.fblocation.indexOf('top') > -1) {
      this.$el.css({top: oT + oW + "px"});
    } else if (this.cfg.fblocation.indexOf('bottom') > -1) {
      this.$el.css({bottom: (docHeight - oT) + oH + "px"});
    }

    // Set left/right
    if (this.cfg.fblocation.indexOf('right') > -1) {
      this.$el.css({right: -(ri + this.animationMove ) + "px"});
    } else {
      this.$el.css({left: -(ri + this.animationMove) + "px"});
    }
  };

  /**
   * Initialize position                    `
   */
  ButtonBadge.prototype.init = function (cb) {
    var timg = this.$el.$("._acsBadgeLabel"),
      ctx = this,
      cfg = ctx.cfg;

    // Hide this till we're done
    this.$el.css({visibility: "hidden"});

    if (timg && timg.length > 0) {
      // Callback after the image has successfully loaded
      if (cb) {
        ctx._unhover();
        if (this.isIcon && cfg.icon) {
          utils.imgInfo('templates/' + (cfg.template || 'default') + '/' + cfg.icon, function (vf) {
            return function (width, height) {
              /* pragma:DEBUG_START */
              console.warn("fb: badge icon loaded: " + width + ", " + height);
              /* pragma:DEBUG_END */
              setTimeout(function () {
                ctx._unhover();
                setTimeout(function () {
                  vf.addClass("_acsAnimate");
                  cb();
                }, 100);
                ctx._unhover();
              }, 100);
            };
          }(this.$el));
        } else {
          ctx._unhover();
          var vf = this.$el;
          setTimeout(function () {
            ctx._unhover();
            setTimeout(function () {
              vf.addClass("_acsAnimate");
              cb();
            }, 250);
          }, 250);
        }

        // If it's vertical then make it so
        if (this.cfg.fbdirection == "vertical") {
          if (this.cfg.fblocation.indexOf('right') > -1) {
            this.$el.addClass("_acsVertical_right");
          } else {
            this.$el.addClass("_acsVertical_left");
          }
          this._positionVertical();
        }

        // Add the fixed class if it's fixed
        if (this.cfg.fbfixed) {
          this.$el.addClass("_acsFixed");
        }
      }

      // Show
      this.$el.css({visibility: "visible"});
      this.$el.css({opacity: 1});
    }
  };

  /**
   * Replace the icon with a counter
   * @param num
   */
  ButtonBadge.prototype.setCounter = function (num) {
    if (this.numTween) {
      this.numTween.stop();
      this.counter = this.numTween.val;
    }
    var el = $(this.$el.$("._acsCounterInner")[0]);
    if (!el.hasClass("_acsNum")) {
      el.addClass("_acsNum");
    }
    this.numTween = new SimpleTween(this.counter, num, fs.proxy(function (val) {
      el.innerHTML = Math.round(val).toLocaleString();
    }, this));
    this.numTween.go(1000);
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

    if(!!el) {
      var el2 = $(this.$el.$("._acsCounterInner")[0]);
      if (el2 && el2.hasClass("_acsNum")) {
        el2.removeClass("_acsNum");
      }
    }

    if (!el && !!this.$el) {
      this.$el.$("._acsCounterInner")[0].innerHTML = "";
      $(this.$el.$("._acsCounterInner")[0]).css({"background": "none"});
      if (cfg.icon) {
        el = $("<img style=\"position: relative;top: -2px;height: 19px;\" src=\"" + fs.makeURI("$templates/feedback/" + (cfg.template || 'default') + "/" + cfg.icon) + "\" class=\"_acsBadgeImg\">");
        this.$el.$("._acsCounterInner")[0].appendChild(el);
      }
    }
  };

  /**
   * Enable badge counter
   */
  ButtonBadge.prototype.enableCounter = function () {
    if (this.$el) {
      this.$el.$("._acsCounterInner")[0].innerHTML = "0";
      $(this.$el.$("._acsCounterInner")[0]).css({"background": "#F87473"});
    }
  };

  /**
   * Remove badge
   */
  ButtonBadge.prototype.remove = function () {
    this.$el.parentNode.removeChild(this.$el);
  };

})();