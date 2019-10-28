/**
 * Activity indicator
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { $ } from "./dom/minidom";
import { getSize, getScroll } from "../utils/utils";

/**
 * Created by alexei on 15-03-13.
 */
class Loader {
  constructor() {
    // Create the loader html
    this.$el = $(`<img src="${window._fsNormalizeUrl("$loader.gif")}" class="acs-loader">`);
    this.$el.setAttribute("alt", "loading survey");
    this.$el.setAttribute("tabindex", "-1");
    this.$el.setAttribute("role", "alert");
    this.$el.setAttribute("aria-busy", "true");
    this.moveOffScreen();
  }

  /**
   * Center badge horizontally (and vertically by option)
   */
  center() {
    const fr = getSize(window);
    const fs = getScroll(window);
    const sw = this.$el.offsetWidth;
    const sh = this.$el.offsetHeight;
    this.$el.css({
      left: `${(fr.w - sw) / 2}px`,
      top: `${(fr.h - sh) / 2 + fs.y}px`,
      display: "block",
      position: "absolute",
    });
  }

  /**
   * Move the loader off screen
   */
  moveOffScreen() {
    this.$el.css({
      left: `${-999}px`,
      top: `${-999}px`,
      display: "none",
    });
  }

  /**
   * Remove loader
   */
  remove() {
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  }
}

export { Loader };
