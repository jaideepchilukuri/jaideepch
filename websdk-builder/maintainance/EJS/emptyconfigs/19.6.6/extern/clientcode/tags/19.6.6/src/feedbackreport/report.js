/**
 * Main Report class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Report");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.UI.Badge");

(function () {

  /**
   * The reporter class
   */
  var Report = function (browser, cfg) {

    // Keep the browser
    this.br = browser;

    // Will fire when the resources are loaded
    this.ready = new utils.FSEvent();

    // Initially we havent initialized
    this.didInitialize = false;

    // We havent built the UI either
    this.didBuildUI = false;

    // These are the defaults for the badge, note that reporturi is passed in here.

    this.cfg = {
      "counter": true,
      "label": "ForeSee",
      "fbtype": "report",
      "fblocation": "topright",
      "template": "default",
      "icon": "aspark100.png"
    };

    if (typeof cfg === 'undefined' && config.instances[0] && config.instances[0].reporturi) {
      // Default to the first instance if nothing is passed in.
      this.cfg.reporturi = config.instances[0].reporturi;
    } else {
      // If a config is passed in, take the reporturi from it.
      this.cfg.reporturi = cfg.reporturi;
    }
  };

  /**
   * Load resources and set up the reporting mode
   */
  Report.prototype.initialize = function () {
    utils.loadCSS(fs.makeURI("$templates/feedback/default/main.css"), fs.proxy(function (success, link) {
      if (success) {
        /* pragma:DEBUG_START */
        console.warn("fbr: css loaded");
        /* pragma:DEBUG_END */
      }

      // Remember that we initialized
      this.didInitialize = true;

      // Let the world know we are ready
      this.ready.fire();
    }, this), null, this.br);
  };

  /**
   * Build the UI
   */
  Report.prototype.run = function () {
    // Only let this happen once
    if (!this.didBuildUI) {
      // Keep track of if we were ever logged in
      this.wasLoggedInEver = false;

      // Add modal
      this._addiFrame();

      // Add the badge
      this._addReportBadge();

      // Listen on messages coming in from the iFrame
      utils.Bind(window, "feedback:message", fs.proxy(this.onMessageReceived, this));

      // Remember that we did build the UI
      this.didBuildUI = true;
    }
  };

  /**
   * A message was received
   * @param ctx
   * @returns {Function}
   */
  Report.prototype.onMessageReceived = function (e) {
    var d = e.data;
    if (d.location) {
      // Save the route
      sessionStorage.setItem('acsFeedbackRoute', d.location);
    } else if (d.isLoggedIn === true) {
      this.badge.enableCounter();
      this.wasLoggedInEver = true;
      this.frame.contentWindow.postMessage({ wPageUrl: window.location.toString() }, "*");
    } else if (d.isLoggedIn === false) {
      if (sessionStorage.getItem('acsReportFrameVisible') === 'true') {
        this.showiFrame();
      } else {
        this.removeReport();
        sessionStorage.setItem('acsFeedbackLoaded', 'false');
      }
      this.badge.disableCounter();
    } else if (typeof d.feedbackResponses != "undefined") {
      this.badge.setCounter(d.feedbackResponses);
    }

  };

  /**
   * Remove the report
   * @param e
   */
  Report.prototype.removeReport = function (e) {
    this.container.removeClass('acsVisibleFrame');
    sessionStorage.setItem('acsReportFrameVisible', 'false');
  };

  /**
   * Add the badge
   */
  Report.prototype._addReportBadge = function () {
    if (!this.badge) {
      this.badge = new ButtonBadge(this.cfg, this.br);
      this.badge.badgeClicked.subscribe(fs.proxy(function () {
        this.showiFrame();
      }, this));
    }
  };

  /**
   * Show it
   */
  Report.prototype.showiFrame = function () {
    if (this.didBuildUI) {
      this.container.addClass('acsVisibleFrame');
      sessionStorage.setItem('acsReportFrameVisible', 'true');
    }
  };

  /**
   * Add the iFrame
   */
  Report.prototype._addiFrame = function () {
    // Quick reference document body
    var d = document;

    if (!this.didBuildUI) {
      this.container = $("<div class=\"acsFrameContainer--default\"></div>");

      if (sessionStorage.getItem('acsReportFrameVisible') == 'true') {
        this.container.addClass('acsVisibleFrame');
      }
      this.closeBtn = $("<a href=\"#\" class=\"acsReportCloseBtn\" title=\"Close\"><span class=\"material-icons\">&#xE5CD;</span></a>");

      utils.Bind(this.closeBtn, "feedback:click", fs.proxy(function (e) {
        e.preventDefault();
        this.removeReport(e);
        return false;
      }, this));

      // Create the iFrame element
      // Allowfullscreen for replay videos to be able to expand to full screen.
      this.frame = $("<iframe class=\"acsReportFrame\" frameBorder=\"0\" allowfullscreen></iframe>");

      // Point to admin portal
      this.frame.src = this.cfg.reporturi || sessionStorage.getItem('acsFeedbackRoute');

      // Post message to see if the user is logged in after the iFrame has been loaded
      utils.Bind(this.frame, "feedback:load", fs.proxy(function (e) {
        var msg = {};
        msg.wIsLoggedIn = "GET";
        if (this.frame.contentWindow) {
          this.frame.contentWindow.postMessage(msg, "*");
        }
      }, this));

      // Append iFrame to document body
      this.container.appendChild(this.frame);
      this.container.appendChild(this.closeBtn);
      d.body.appendChild(this.container);

      var preventDefault = function (e) {
        e = e || window.event;
        if (e.preventDefault) {
          e.preventDefault();
        }
        e.returnValue = false;
      };

      utils.Bind(this.container, "feedback:mouseenter", fs.proxy(function (e) {

        if (window.addEventListener) {
          window.addEventListener('DOMMouseScroll', preventDefault, false);
        }
        window.onmousewheel = document.onmousewheel = preventDefault;

      }, this));

      utils.Bind(this.container, "feedback:mouseleave", fs.proxy(function (e) {
        if (window.removeEventListener) {
          window.removeEventListener('DOMMouseScroll', preventDefault, false);
        }
        window.onmousewheel = document.onmousewheel = document.onkeydown = null;
      }, this));

      /* pragma:DEBUG_START */
      console.warn("fbr: iFrame added");
      /* pragma:DEBUG_END */

    }
  };

})();