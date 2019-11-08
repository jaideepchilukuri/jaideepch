/**
 * Activity indicator
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { makeURI } from "../fs/index";
import { $ } from "./dom/minidom";

/**
 * Created by alexei on 15-03-13.
 */
class Loader {
  constructor() {
    // Create the loader html
    const el = $(`<img src="${makeURI("$loader.gif")}" class="acs-loader">`);
    el.setAttribute("alt", "loading survey");
    this.$el = el;
  }

  /**
   * Center badge horizontally (and vertically by option)
   */
  center(verticalAlso) {
    const pw = this.$el.parentNode.offsetWidth;
    const sw = this.$el.offsetWidth;
    this.$el.css({
      left: `${(pw - sw) / 2}px`,
      top: verticalAlso ? `${(pw - sw) / 2}px` : "auto",
    });
  }

  /**
   * Remove badge
   */
  remove() {
    this.$el.parentNode.removeChild(this.$el);
  }
}

export { Loader };
