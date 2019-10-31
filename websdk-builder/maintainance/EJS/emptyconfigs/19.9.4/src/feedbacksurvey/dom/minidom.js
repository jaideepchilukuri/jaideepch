/**
 * Mini DOM
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { hasProp } from "../../fs/index";

/**
 * Micro JQuery Clone
 * @private
 */
const _MiniDom = {
  /**
   * Remove this from the DOM
   */
  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  },

  /**
   * Does a node have a particular class?
   * @param cname
   */
  hasClass(cname) {
    return this.className.indexOf(cname) > -1;
  },

  /**
   * Add a class
   * @param cname
   */
  addClass(cname) {
    if (!this.hasClass(cname)) {
      this.className += ` ${cname}`;
    }
  },

  /**
   * Remove a class
   * @param cname
   */
  removeClass(cname) {
    this.className = (this.className || "").replace(cname, "");
    // Removing the trailing spaces.
    this.className = this.className.replace(/[ ]+$/g, "");
  },

  /**
   * Subquery
   */
  $(subquery) {
    return this.querySelectorAll(subquery);
  },

  /**
   * Set CSS
   * @param obj
   */
  css(obj) {
    for (const nm in obj) {
      if (hasProp(obj, nm)) {
        this.style[nm] = obj[nm];
      }
    }
  },
};

/**
 * Our dollarfn
 * @param el
 */
const $ = el => {
  if (typeof el == "string" && el.indexOf("<") == -1) {
    return document.querySelectorAll(el);
  } else {
    if (typeof el == "string") {
      const frag = document.createElement("div");
      frag.innerHTML = el;
      el = frag.firstChild;
    }
    for (const nm in _MiniDom) {
      if (hasProp(_MiniDom, nm)) {
        el[nm] = _MiniDom[nm];
      }
    }
    return el;
  }
};

export { _MiniDom, $ };
