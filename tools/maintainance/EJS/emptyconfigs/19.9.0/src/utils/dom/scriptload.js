/**
 * A Script loader
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Ani Pendakur(ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

import { getBrowserInstance } from "./browser";
import { FSEvent } from "./event";

/**
 * A simple script loader
 * @param url {String} The URL to load
 * @param id {String} (Optional) The ID of the script tag
 */
class ScriptLoader {
  constructor(src, id) {
    // Just have the events for interfacing, let the parent handle it.
    this.loadSuccess = new FSEvent();
    this.loadFailure = new FSEvent();
    this.st = document.createElement("script");
    this.st.type = "text/javascript";
    this.st.src = src;
    if (id) {
      this.st.id = id;
    }
    this.br = getBrowserInstance();

    if (typeof this.st.addEventListener !== "undefined") {
      this._loadOnOthers();
    } else if (typeof this.st.attachEvent !== "undefined") {
      this._loadOnIE();
    }
  }

  /**
   * Loads script for IE.
   */
  _loadOnIE() {
    const ctx = this;
    const scriptag = this.st;
    scriptag.onreadystatechange = () => {
      if (scriptag.readyState == 3) {
        scriptag.onreadystatechange = () => {
          ctx.loadSuccess.fire(scriptag.src);
          ctx.loadFailure = null;
        };
        // Error handling goes here..
        if (ctx.loadFailure) {
          ctx.loadFailure.fire(scriptag.src);
        }
      }
    };
    document.body.appendChild(scriptag);
  }

  /**
   * Loads script for WebKit & Gecko browsers.
   */
  _loadOnOthers() {
    this.st.addEventListener(
      "load",
      () => {
        this.loadSuccess.fire(this.st.src);
      },
      false
    );
    this.st.addEventListener(
      "error",
      () => {
        this.loadFailure.fire(this.st.src);
      },
      false
    );
    document.body.appendChild(this.st);
  }
}

export { ScriptLoader };
