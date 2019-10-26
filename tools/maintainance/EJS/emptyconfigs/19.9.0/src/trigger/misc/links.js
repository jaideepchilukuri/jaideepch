/**
 * Handle the links behavior in trigger
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { toLowerCase } from "../../fs/index";
import { LOGGING } from "../top";
import { Bind, preventDefault } from "../../utils/utils";

/**
 * Handles links
 * @param linksinfo
 * @constructor
 */
class LinksHandler {
  constructor(linksinfo) {
    this.cfg = linksinfo;
  }

  /**
   * Bind to links
   * @param info - The complete link object
   * @param handler
   * @private
   */
  _bindToLink(info, handler) {
    const els = document.querySelectorAll(info.selector);

    const bindfn = (ctx, inf, hdlr) => e => {
      /* pragma:DEBUG_START */
      console.log("activating link: ", inf);
      /* pragma:DEBUG_END */

      // Are we supposed to suppress the default behavior?
      if (inf.preventDefault) {
        preventDefault(e);
      }
      hdlr.call(ctx, inf);
    };

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      let didPass = true;
      let atr;

      if (info.attribute) {
        atr = el.getAttribute(info.attribute);
        didPass = false;
        if (atr) {
          didPass = true;
          if (info.patterns && info.patterns.length > 0) {
            didPass = false;
            for (let j = 0; j < info.patterns.length; j++) {
              if (toLowerCase(atr).indexOf(toLowerCase(info.patterns[j])) > -1) {
                didPass = true;
                break;
              }
            }
          }
        }
      }

      if (didPass) {
        /* pragma:DEBUG_START */
        console.log("binding link: ", el);
        /* pragma:DEBUG_END */
        Bind(el, "trigger:click", bindfn(this, info, handler));
      }
    }
  }

  /**
   * Perform bindings to hyperlinks on the page to do various things
   * @param trig
   */
  performBindings(trig) {
    if (trig && this.cfg) {
      const lnks = this.cfg;
      let i;

      // Do cancel
      if (lnks.cancel && lnks.cancel.length > 0) {
        const cancelfn = () => {
          trig.cancelTracker();
          trig.jrny.addEventString(LOGGING.LINKS_CANCEL);
        };
        for (i = 0; i < lnks.cancel.length; i++) {
          this._bindToLink(lnks.cancel[i], cancelfn);
        }
      }
      // Do survey
      if (lnks.survey && lnks.survey.length > 0) {
        const popfn = () => {
          trig.popSurvey();
        };
        for (i = 0; i < lnks.survey.length; i++) {
          this._bindToLink(lnks.survey[i], popfn);
        }
      }
      // Do attach tracker
      if (!trig.browser.isMobile && lnks.tracker && lnks.tracker.length > 0) {
        const attachfn = () => {
          trig.popTracker();
        };
        for (i = 0; i < lnks.tracker.length; i++) {
          this._bindToLink(lnks.tracker[i], attachfn);
        }
      }
    }
  }
}

export { LinksHandler };
