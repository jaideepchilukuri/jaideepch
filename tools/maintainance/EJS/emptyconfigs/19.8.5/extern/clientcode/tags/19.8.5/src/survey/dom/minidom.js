/**
 * Mini DOM
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Micro JQuery Clone
 * @private
 */
var _MiniDom = {
  /**
   * Remove this from the DOM
   */
  remove: function() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  },

  /**
   * Does a node have a particular class?
   * @param cname
   */
  hasClass: function(cname) {
    return this.className.indexOf(cname) > -1;
  },

  /**
   * Add a class
   * @param cname
   */
  addClass: function(cname) {
    if (!this.hasClass(cname)) {
      this.className += " " + cname;
    }
  },

  /**
   * Remove a class
   * @param cname
   */
  removeClass: function(cname) {
    this.className = (this.className || "").replace(cname, "");
  },

  /**
   * Subquery
   */
  $: function(subquery) {
    return this.querySelectorAll(subquery);
  },

  /**
   * Set CSS
   * @param obj
   */
  css: function(obj) {
    for (var nm in obj) {
      if (obj.hasOwnProperty(nm)) {
        this.style[nm] = obj[nm];
      }
    }
  },
};

/**
 * Our dollarfn
 * @param el
 */
var $ = function(el) {
  if (typeof el == "string" && el.indexOf("<") == -1) {
    return document.querySelectorAll(el);
  } else {
    if (typeof el == "string") {
      var frag = document.createElement("div");
      frag.innerHTML = el;
      el = frag.firstChild;
    }
    for (var nm in _MiniDom) {
      if (_MiniDom.hasOwnProperty(nm)) {
        el[nm] = _MiniDom[nm];
      }
    }
    return el;
  }
};
