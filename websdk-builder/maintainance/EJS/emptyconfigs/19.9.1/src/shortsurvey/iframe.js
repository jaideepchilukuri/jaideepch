/**
 * Presents a short-form survey in an iframe
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */
import { getBrowserInstance } from "../utils/dom/browser";

class Iframe {
  constructor(html) {
    this.el = document.createElement("iframe");

    this.updateStyle();

    this.el.setAttribute("srcdoc", html);

    const browser = getBrowserInstance();

    if (browser.browser.name === "Edge" || browser.isIE) {
      // https://github.com/jugglinmike/srcdoc-polyfill/blob/master/srcdoc-polyfill.js
      // eslint-disable-next-line no-script-url
      const jsUrl = "javascript: window.frameElement.getAttribute('srcdoc');";

      // Explicitly set the iFrame's window.location for
      // compatability with IE9, which does not react to changes in
      // the `src` attribute when it is a `javascript:` URL, for
      // some reason
      if (this.el.contentWindow) {
        this.el.contentWindow.location = jsUrl;
      }
      this.el.setAttribute("src", jsUrl);
    }

    return this;
  }

  updateSize({ width, height }) {
    if (!this.el) return;

    if (width != null) {
      this.el.width = width;
    }

    if (height != null) {
      this.el.height = height;
    }

    return this;
  }

  updateStyle(displayStyle = {}) {
    // Start with the hardcoded, default values
    this.el.style.background = "transparent";
    this.el.style.border = 0;
    this.el.style.position = "fixed";

    // Now apply the values from the configuration

    // The position is expected to be a string like
    // "bottomright", "topleft". Only corner positions.
    if (displayStyle.position) {
      if (/^top/.test(displayStyle.position)) {
        this.el.style.top = 0;
      } else if (/^bottom/.test(displayStyle.position)) {
        this.el.style.bottom = 0;
      }

      if (/left$/.test(displayStyle.position)) {
        this.el.style.left = "-200px";
        this.el.style.transition = "left .66s ease-out";
        setTimeout(() => (this.el.style.left = "0px"), 0);
      } else if (/right$/.test(displayStyle.position)) {
        this.el.style.right = "-200px";
        this.el.style.transition = "right .66s ease-out";
        setTimeout(() => (this.el.style.right = "0px"), 0);
      }
    }

    // By default, it should be on top of the world
    this.el.style.zIndex = displayStyle.zIndex || 99999999;

    return this;
  }
}

export default Iframe;
