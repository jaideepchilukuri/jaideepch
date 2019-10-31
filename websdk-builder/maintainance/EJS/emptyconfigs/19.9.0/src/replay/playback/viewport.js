/**
 * This is the viewport simulator for the playback iframe
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

import { ext } from "../../fs/index";
import { UICSS } from "./UI/css";
import { FSEvent } from "../../utils/utils";

/**
 * Handles resizing/zooming and calculating the viewport width/height
 */
class Viewport {
  constructor(iframe) {
    this.iframe = iframe;
    this.doc = iframe.contentWindow.document;

    this.params = {};

    // This is the viewport scaling applied to ensure the user's viewport
    // fits nicely into the iframe
    this.viewScale = 1;

    // This is the scaling applied to the iframe itself so it fills the
    // whole window better, thus making prettier videos
    this.frameScale = 1;

    // the body translation offset
    this.bodyXOffset = 0;

    this.onUpdate = new FSEvent();

    this.forceUpdate = true;
  }

  /**
   * Handle updates to the viewport position or size. This will ensure if
   * something is hooked to viewport.onupdate that it will be updated with
   * any changes.
   */
  update(params) {
    const oldParams = this.params;
    this.params = ext({}, this.params, params);
    let change = false;

    // check size
    if (
      oldParams.vw !== this.params.vw ||
      oldParams.vh !== this.params.vh ||
      oldParams.lw !== this.params.lw ||
      oldParams.lh !== this.params.lh ||
      this.forceUpdate
    ) {
      change = true;
      this.resize();
    }

    this.forceUpdate = false;

    // check position
    if (oldParams.vx !== this.params.vx || oldParams.vy !== this.params.vy) {
      change = true;
    }

    // invert dependancy
    if (change) {
      this.params.viewScale = this.viewScale;
      this.params.frameScale = this.frameScale;
      this.onUpdate.fire(this.params, this.doc);
    }
  }

  /**
   * Dispose of all event listeners.
   */
  dispose() {
    this.onUpdate.unsubscribeAll();
  }

  /**
   * Calculate the zoomed iframe size presuming a 2px border and a 15px scroll bar.
   */
  zoomedIframeSize(iw, ih) {
    // the scale is applied around the center
    const nw = iw;
    const nh = ih;
    const cw = document.documentElement.clientWidth - (20 + UICSS.playbackFrameBorder * 2);
    const ch = document.documentElement.clientHeight - (20 + UICSS.playbackFrameBorder * 2);

    const scale = Math.min(cw / nw, ch / nh);

    const sw = Math.ceil(iw * scale);
    const sh = Math.ceil(ih * scale);

    return {
      w: sw,
      h: sh,
      scale,
    };
  }

  /**
   * Calculates how big the iframe should be based on the viewport and layout sizes.
   */
  getIframeSize(vw, vh, lw) {
    // iframe must be lw wide to layout correctly, but we want the aspect radio
    // to be the same as vw/vh so we will calculate what the height should be
    // to maintain that ratio

    const iw = lw;
    const ih = (vh * lw) / vw;

    return {
      w: Math.round(iw),
      h: Math.round(ih),
    };
  }

  /**
   * Scales the iframe so it takes up the whole available space.
   */
  rezoom(iw, ih) {
    const size = this.zoomedIframeSize(iw, ih);
    const scale = size.scale;

    this.iframe.style.transform = `scale(${scale})`;
    this.frameScale = scale;
  }

  /**
   * Resize the iframe and rezoom the outer document based on viewport and layout sizes.
   */
  resizeIframe(vw, vh, lw, lh) {
    const size = this.getIframeSize(vw, vh, lw, lh);

    if (size.w > window.innerWidth) {
      // When the iframe should be wider than the document body, the
      // browser shrinks the width of the iframe. That's bad. So to fix that,
      // we grow the document.body size.
      //
      // To make it more complicated, then the iframe doesn't center properly
      // so we need to translate the body left a bit. But then the mouse
      // transformCoord will be off by that amount, so we need to send that
      // to the mouse.
      const gw = size.w + 20;
      document.body.style.width = `${gw}px`;
      this.params.bodyXOffset = (window.innerWidth - gw) / 2;
      document.body.style.transform = `translateX(${this.params.bodyXOffset}px)`;
    } else {
      document.body.style.width = "100%";
      document.body.style.removeProperty("transform");
      this.params.bodyXOffset = 0;
    }

    this.iframe.setAttribute("width", size.w);
    this.iframe.setAttribute("height", size.h);
    this.rezoom(size.w, size.h);
  }

  /**
   * Resize the content of the content iframe by applying a CSS scale tranform
   */
  resize() {
    this.resizeIframe(this.params.vw, this.params.vh, this.params.lw, this.params.lh);

    const cw = this.doc.documentElement.clientWidth;
    const ch = this.doc.documentElement.clientHeight;

    const cscale = Math.min(cw / this.params.vw, ch / this.params.vh);

    this.doc.documentElement.style.transformOrigin = `${this.params.vx}px ${this.params.vy}px`;
    this.doc.documentElement.style.transform = `scale(${cscale}, ${cscale}) `;

    this.viewScale = cscale;
  }
}

export { Viewport };
