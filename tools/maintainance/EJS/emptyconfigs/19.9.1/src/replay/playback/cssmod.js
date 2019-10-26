/**
 * Module for emulating CSS features such as :hover and postion:fixed.
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

import { MediaQuery } from "./mediaquery";

// ES6 methods are safe to use in replay
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */
class CssMod {
  constructor(viewport) {
    // whether or not we are emulating a mobile device, and which
    // Note: set in page marker in worker
    this.mobile = false;

    // make sure fixed position elements update
    viewport.onUpdate.subscribe(this._onViewportUpdate.bind(this), false, true);

    // A set of all fixed hover rules so they don't get double-fixed
    this.fixedHoverRules = new Set();

    // list of media queries already seen
    this.fixedMediaQueries = new Set();
    this.originalMediaQueries = new Map();
  }

  /**
   * Search through the page's CSS rules looking for :hover or
   * position:fixed and manually correct them.
   *
   * This should be called every time the DOM changes.
   *
   * @param {Document} doc
   */
  updatedDOM(doc) {
    this._fixCSS(doc);

    this._hideScrollBarsOnMobile(doc);

    if (this.badgeCssFound) {
      this.badgeCssPatched = true;
    }
  }

  /**
   * Modify the CSS on the page.
   * @private
   */
  _fixCSS(doc, mqfixonly) {
    let i;
    const sheets = doc.styleSheets;
    for (i = 0; i < sheets.length; i++) {
      if (sheets[i].disabled) continue;

      this._recurseRules(doc, sheets[i], mqfixonly);
    }
  }

  _safeToUse(group) {
    try {
      if (group.cssRules) {
        return true;
      }
    } catch (e) {
      console.error("Failed to access CSS:", e, group);
      console.error("Ensure you are loading the replay over https!!");
    }
    return false;
  }

  _recurseRules(doc, group, mqfixonly) {
    if (!this._safeToUse(group)) {
      return;
    }

    let i;
    const rules = group.cssRules;
    for (i = 0; i < rules.length; i++) {
      if (rules[i].cssRules) {
        if (rules[i].type === CSSRule.MEDIA_RULE) {
          this._fixDeviceMediaRule(doc, rules[i]);

          if (doc.defaultView.matchMedia(rules[i].conditionText).matches) {
            this._recurseRules(doc, rules[i]);
          }
        } else if (rules[i].type !== CSSRule.KEYFRAMES_RULE) {
          // some rules like @import contain other rules inside
          this._recurseRules(doc, rules[i]);
        }
        continue;
      }

      // TODO: refactor this... obviously having flags alter the behaviour is
      // a bad code smell
      if (mqfixonly) continue;

      this._replaceHoverStyles(doc, rules[i], group, i);
      this._fixHiddenDocumentElement(doc, rules[i], group, i);
    }
  }

  /**
   * This checks for device specific media rules and applies them. This
   * emulates device media query application within the replay.
   *
   * @private
   */
  _fixDeviceMediaRule(doc, rule) {
    if (this.fixedMediaQueries.has(rule)) {
      return;
    }
    this.fixedMediaQueries.add(rule);

    if (rule.conditionText.match(/device|width|height|orientation|resolution|pixel-ratio/)) {
      let cond = rule.conditionText;
      let orig;

      // Save the original conditions so that it can be reapplied if the
      // size changes
      if (!this.originalMediaQueries.has(rule)) {
        this.originalMediaQueries.set(rule, {
          cond,
          list: Array.prototype.slice.call(rule.media, 0),
        });
      } else {
        orig = this.originalMediaQueries.get(rule);
        cond = orig.cond;
      }

      try {
        // This emulates the way the original recording device would run
        // this media query.
        const params = this.viewportParams;
        const landscape = params.vw > params.vh;
        const dw = landscape ? params.dh : params.dw;
        const dh = landscape ? params.dw : params.dh;
        const aspect = Math.max(dw, dh) / Math.min(dw, dh);

        const match = MediaQuery.matchQuery(cond, {
          type: "screen",

          width: `${params.lw}px`,
          height: `${params.lh}px`,

          "device-width": `${dw}px`,
          "device-height": `${dh}px`,
          "device-aspect-ratio": aspect,
          "aspect-ratio": aspect,

          // TODO: record this and pass it here?
          "device-pixel-ratio": doc.defaultView.devicePixelRatio,
          "pixel-ratio": doc.defaultView.devicePixelRatio,
          "device-resolution": `${150}dpi`,
          resolution: `${150}dpi`,

          orientation: landscape ? "landscape" : "portrait",
        });

        if (match && !doc.defaultView.matchMedia(cond).matches) {
          // We should match, but we don't... so force it to be applied
          console.warn("Modifying to enable:", rule);

          // This makes the query always apply
          if (rule.conditionText !== `${cond}, all`) {
            rule.media.appendMedium("all");
          }
        } else if (!match && doc.defaultView.matchMedia(cond).matches) {
          // we shouldn't match but we do, so force it be un-applied
          console.warn("Modifying to disable:", rule);

          if (rule.conditionText !== "not all") {
            // can't easily negate, so we just delete all conditions
            while (rule.media.length > 0) {
              rule.media.deleteMedium(rule.media[0]);
            }

            // this condition is always false
            rule.media.appendMedium("not all");
          }
        } else if (orig && cond !== rule.conditionText) {
          // apply original rules

          while (rule.media.length > 0) {
            rule.media.deleteMedium(rule.media[0]);
          }

          for (let i = 0; i < orig.list.length; i++) {
            rule.media.appendMedium(orig.list[i]);
          }
          console.warn("Restoring original:", rule);
        }
      } catch (e) {
        console.error("Unable to parse media query:", cond, e);
      }
    }
  }

  /**
   * On mobile, the scrollbars are distracting, so hide them.
   * TODO: it might be better to modify the scrollbar style to be
   * very thin or hidden, rather than doing overflow: hidden.
   */
  _hideScrollBarsOnMobile(doc) {
    if (this.mobile) {
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
    }
  }

  /**
   * Replace all :hover styles with [fsrhover="true"] styles so that
   * hover state emulation works. Also disables the real mouse pointer
   * from triggering hover states.
   *
   * @private
   */
  _replaceHoverStyles(doc, rule, group, index) {
    if (rule.selectorText) {
      const replacement = rule.selectorText.replace(/:hover\b/gi, '[fsrhover="true"]');
      if (replacement !== rule.selectorText && !this.fixedHoverRules.has(rule)) {
        // make sure we don't replace this rule twice
        this.fixedHoverRules.add(rule);

        // this can fail silently in firefox, but it's better performance if it works
        try {
          rule.selectorText = replacement;
        } catch (e) {}

        if (rule.selectorText.indexOf(replacement) < 0) {
          // quick fix didn't work... this method is slightly more expensive
          const text = rule.cssText.replace(rule.selectorText, replacement);

          try {
            // insert the rule at the location of the old rule
            group.insertRule(text, index);
            // delete the previous rule, which was bumped to i+1 position
            group.deleteRule(index + 1);
          } catch (e) {}
        }
      }
    }
  }

  /**
   * Removes "security" fixes intended to hide documents when displayed in an iframe.
   * @private
   */
  _fixHiddenDocumentElement(doc, rule) {
    // I found this gem:
    // <!-- FIX FOR TYINTPRJ-5232 IFRAME SECURITY -->
    // <style>
    //     html{
    //         display : none ;
    //         visibility : hidden ;
    //     }
    // </style>
    //
    // So apparently when the page is NOT loaded in an iframe,
    // the browser ignores the above CSS rules. But when loaded in
    // an iframe, it doesn't. So I am just doing some basic matching
    // to delete these rules when found.
    if (rule.selectorText === "html") {
      if (rule.style.display === "none") {
        rule.style.removeProperty("display");
        console.warn("Removing iframe display:none security fix");
      }
      if (rule.style.visibility === "hidden") {
        rule.style.removeProperty("visibility");
        console.warn("Removing iframe visibility:hidden security fix");
      }
    }
  }

  /**
   * When the viewport updates we want to update all fixed position elements.
   * @private
   */
  _onViewportUpdate(params, doc) {
    const sizeChange =
      this.viewportParams &&
      (params.lw !== this.viewportParams.lw || params.lh !== this.viewportParams.lh);

    this.viewportParams = params;

    if (sizeChange) {
      // recalculate the media queries
      this.fixedMediaQueries.clear();
      this._fixCSS(doc, true);
    }
  }
}

export { CssMod };
