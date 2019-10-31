/**
 * Main Report class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { $ } from "./dom/minidom";
import { ButtonBadge } from "./ui/badge";
import { makeURI, getProductConfig } from "../fs/index";
import { loadCSS, Bind, FSEvent } from "../utils/utils";

/**
 * The reporter class
 */
class Report {
  constructor(browser, cfg) {
    // Keep the browser
    this.br = browser;

    // Will fire when the resources are loaded
    this.ready = new FSEvent();

    // Initially we havent initialized
    this.didInitialize = false;

    // We havent built the UI either
    this.didBuildUI = false;

    // These are the defaults for the badge, note that reporturi is passed in here.

    this.cfg = {
      counter: true,
      label: "ForeSee",
      fbtype: "report",
      fblocation: "topright",
      template: "default",
      icon: "aspark100.png",
    };

    const config = getProductConfig("feedback");
    if (typeof cfg === "undefined" && config.instances[0] && config.instances[0].reporturi) {
      // Default to the first instance if nothing is passed in.
      this.cfg.reporturi = config.instances[0].reporturi;
    } else {
      // If a config is passed in, take the reporturi from it.
      this.cfg.reporturi = cfg.reporturi;
    }
  }

  /**
   * Load resources and set up the reporting mode
   */
  initialize() {
    loadCSS(
      makeURI("$templates/feedback/default/main.css"),
      success => {
        if (success) {
          /* pragma:DEBUG_START */
          console.warn("fbr: css loaded");
          /* pragma:DEBUG_END */
        }

        // Remember that we initialized
        this.didInitialize = true;

        // Let the world know we are ready
        this.ready.fire();
      },
      null,
      this.br
    );
  }

  /**
   * Build the UI
   */
  run() {
    // Only let this happen once
    if (!this.didBuildUI) {
      // Keep track of if we were ever logged in
      this.wasLoggedInEver = false;

      // Add modal
      this._addiFrame();

      // Add the badge
      this._addReportBadge();

      // Listen on messages coming in from the iFrame
      Bind(window, "feedback:message", this.onMessageReceived.bind(this));

      // Remember that we did build the UI
      this.didBuildUI = true;
    }
  }

  /**
   * A message was received
   * @param ctx
   * @returns {Function}
   */
  onMessageReceived(e) {
    const d = e.data;
    if (d.location) {
      // Save the route
      sessionStorage.setItem("acsFeedbackRoute", d.location);
    } else if (d.isLoggedIn === true) {
      this.badge.enableCounter();
      this.wasLoggedInEver = true;
      this.frame.contentWindow.postMessage({ wPageUrl: window.location.toString() }, "*");
    } else if (d.isLoggedIn === false) {
      if (sessionStorage.getItem("acsReportFrameVisible") === "true") {
        this.showiFrame();
      } else {
        this.removeReport();
        sessionStorage.setItem("acsFeedbackLoaded", "false");
      }
      this.badge.disableCounter();
    } else if (typeof d.feedbackResponses != "undefined") {
      this.badge.setCounter(d.feedbackResponses);
    }
  }

  /**
   * Remove the report
   * @param e
   */
  removeReport() {
    this.container.removeClass("acsVisibleFrame");
    sessionStorage.setItem("acsReportFrameVisible", "false");
  }

  /**
   * Add the badge
   */
  _addReportBadge() {
    if (!this.badge) {
      this.badge = new ButtonBadge(this.cfg, this.br);
      this.badge.badgeClicked.subscribe(() => {
        this.showiFrame();
      });
    }
  }

  /**
   * Show it
   */
  showiFrame() {
    if (this.didBuildUI) {
      this.container.addClass("acsVisibleFrame");
      sessionStorage.setItem("acsReportFrameVisible", "true");
    }
  }

  /**
   * Add the iFrame
   */
  _addiFrame() {
    // Quick reference document body
    const d = document;

    if (!this.didBuildUI) {
      this.container = $('<div class="acsFrameContainer--default"></div>');

      if (sessionStorage.getItem("acsReportFrameVisible") == "true") {
        this.container.addClass("acsVisibleFrame");
      }
      this.closeBtn = $(
        '<a href="#" class="acsReportCloseBtn" title="Close"><span class="material-icons">&#xE5CD;</span></a>'
      );

      Bind(this.closeBtn, "feedback:click", e => {
        e.preventDefault();
        this.removeReport(e);
        return false;
      });

      // Create the iFrame element
      // Allowfullscreen for replay videos to be able to expand to full screen.
      this.frame = $('<iframe class="acsReportFrame" frameBorder="0" allowfullscreen></iframe>');

      // Point to admin portal
      this.frame.src = this.cfg.reporturi || sessionStorage.getItem("acsFeedbackRoute");

      // Post message to see if the user is logged in after the iFrame has been loaded
      Bind(this.frame, "feedback:load", () => {
        const msg = {};
        msg.wIsLoggedIn = "GET";
        if (this.frame.contentWindow) {
          this.frame.contentWindow.postMessage(msg, "*");
        }
      });

      // Append iFrame to document body
      this.container.appendChild(this.frame);
      this.container.appendChild(this.closeBtn);
      d.body.appendChild(this.container);

      const preventDefault = e => {
        e = e || window.event;
        if (e.preventDefault) {
          e.preventDefault();
        }
        e.returnValue = false;
      };

      Bind(this.container, "feedback:mouseenter", () => {
        if (window.addEventListener) {
          window.addEventListener("DOMMouseScroll", preventDefault, false);
        }
        window.onmousewheel = document.onmousewheel = preventDefault;
      });

      Bind(this.container, "feedback:mouseleave", () => {
        if (window.removeEventListener) {
          window.removeEventListener("DOMMouseScroll", preventDefault, false);
        }
        window.onmousewheel = document.onmousewheel = document.onkeydown = null;
      });

      /* pragma:DEBUG_START */
      console.warn("fbr: iFrame added");
      /* pragma:DEBUG_END */
    }
  }
}

export { Report };
