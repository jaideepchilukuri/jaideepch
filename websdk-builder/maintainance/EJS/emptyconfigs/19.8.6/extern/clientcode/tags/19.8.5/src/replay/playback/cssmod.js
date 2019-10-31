/**
 * Module for emulating CSS features such as :hover and postion:fixed.
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

function CssMod(viewport) {
  // whether or not we are emulating a mobile device, and which
  // Note: set in page marker in worker
  this.mobile = false;

  this.disablePositionFixedFix = viewport.disablePositionFixedFix || false;

  // make sure fixed position elements update
  viewport.onUpdate.subscribe(this._onViewportUpdate.bind(this), false, true);

  // A set of all fixed hover rules so they don't get double-fixed
  this.fixedHoverRules = new Set();

  // list of fixed position elements on the page that need to update
  // when the viewport moves
  this.fixedPositionRules = new Set();

  // list of media queries already seen
  this.fixedMediaQueries = new Set();
  this.originalMediaQueries = new Map();

  this.fixedPositionInfo = [];

  this.fixedPositionEls = [];

  this.fixedPositionComputeStyleSlowCount = 0;
  this.fixedPositionMovingSlowCount = 0;

  this.lastFixedMoveDisable = Date.now();

  this.badgeCssFound = false;
  this.badgeCssPatched = false;
}

/**
 * Search through the page's CSS rules looking for :hover or
 * position:fixed and manually correct them.
 *
 * This should be called every time the DOM changes.
 *
 * @param {Document} doc
 */
CssMod.prototype.updatedDOM = function(doc) {
  this._fixCSS(doc);

  this._updateFixedPositionElements(doc);
  this._hideScrollBarsOnMobile(doc);

  if (this.badgeCssFound) {
    this.badgeCssPatched = true;
  }
};

/**
 * Modify the CSS on the page.
 * @private
 */
CssMod.prototype._fixCSS = function(doc, mqfixonly) {
  var i,
    sheets = doc.styleSheets;
  for (i = 0; i < sheets.length; i++) {
    if (sheets[i].disabled) continue;

    this._recurseRules(doc, sheets[i], mqfixonly);
  }
};

CssMod.prototype._safeToUse = function(group) {
  try {
    if (group.cssRules) {
      return true;
    }
  } catch (e) {
    console.error("Failed to access CSS:", e, group);
    console.error("Ensure you are loading the replay over https!!");
  }
  return false;
};

CssMod.prototype._recurseRules = function(doc, group, mqfixonly) {
  if (!this._safeToUse(group)) {
    return;
  }

  var i,
    rules = group.cssRules;
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
    this._replaceFixedPositionRules(doc, rules[i], group, i);
    this._fixHiddenDocumentElement(doc, rules[i], group, i);
    if (!this.badgeCssPatched) {
      this._removeBadgeImportant(doc, rules[i], group, i);
    }
  }
};

/**
 * This checks for device specific media rules and applies them. This
 * emulates device media query application within the replay.
 *
 * @private
 */
CssMod.prototype._fixDeviceMediaRule = function(doc, rule) {
  if (this.fixedMediaQueries.has(rule)) {
    return;
  }
  this.fixedMediaQueries.add(rule);

  if (rule.conditionText.match(/device|width|height|orientation|resolution|pixel-ratio/)) {
    var cond = rule.conditionText;
    var orig;

    // Save the original conditions so that it can be reapplied if the
    // size changes
    if (!this.originalMediaQueries.has(rule)) {
      this.originalMediaQueries.set(rule, {
        cond: cond,
        list: Array.prototype.slice.call(rule.media, 0),
      });
    } else {
      orig = this.originalMediaQueries.get(rule);
      cond = orig.cond;
    }

    try {
      // This emulates the way the original recording device would run
      // this media query.
      var params = this.viewportParams;
      var landscape = params.vw > params.vh;
      var dw = landscape ? params.dh : params.dw;
      var dh = landscape ? params.dw : params.dh;
      var aspect = Math.max(dw, dh) / Math.min(dw, dh);

      var match = MediaQuery.matchQuery(cond, {
        type: "screen",

        width: params.lw + "px",
        height: params.lh + "px",

        "device-width": dw + "px",
        "device-height": dh + "px",
        "device-aspect-ratio": aspect,
        "aspect-ratio": aspect,

        // TODO: record this and pass it here?
        "device-pixel-ratio": doc.defaultView.devicePixelRatio,
        "pixel-ratio": doc.defaultView.devicePixelRatio,
        "device-resolution": 150 + "dpi",
        resolution: 150 + "dpi",

        orientation: landscape ? "landscape" : "portrait",
      });

      if (match && !doc.defaultView.matchMedia(cond).matches) {
        // We should match, but we don't... so force it to be applied
        console.warn("Modifying to enable:", rule);

        // This makes the query always apply
        if (rule.conditionText !== cond + ", all") {
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

        for (var i = 0; i < orig.list.length; i++) {
          rule.media.appendMedium(orig.list[i]);
        }
        console.warn("Restoring original:", rule);
      }
    } catch (e) {
      console.error("Unable to parse media query:", cond, e);
    }
  }
};

/**
 * Go through all the fixed position rules and recalculate their
 * elements and computed styles
 * @private
 */
CssMod.prototype._updateFixedPositionElements = function(doc) {
  var i, j;
  var startedAt = performance.now();
  var elementNewlyVisible = false;
  var lastUpdate = Date.now();
  var el;
  var ostyle;

  function finder(el) {
    return function(v) {
      return v.el === el;
    };
  }

  // for each fixed position rule in this document
  for (i = 0; i < this.fixedPositionInfo.length; i++) {
    var rinfo = this.fixedPositionInfo[i];
    if (rinfo.doc !== doc) continue;

    // go over each element to which the selector applies
    var els = doc.querySelectorAll(rinfo.rule.selectorText);
    for (j = 0; j < els.length; j++) {
      el = els[j];

      // find or create the elinfo
      var elinfo = this.fixedPositionEls.find(finder(el));
      if (!elinfo) {
        elinfo = {
          enabled: false,
          doc: doc,
          el: el,
          origStyles: {
            left: el.style.left,
            top: el.style.top,
            bottom: el.style.bottom,
            right: el.style.right,
            width: el.style.width,
            height: el.style.height,
          },
        };
        this.fixedPositionEls.push(elinfo);
      }
      elinfo.lastUpdate = lastUpdate;

      // only recompute the style if it's not super slow on this page
      if (this.fixedPositionComputeStyleSlowCount < 1 || !elinfo.style) {
        elinfo.style = doc.defaultView.getComputedStyle(el, null);
        this._calculateFixedAnchor(elinfo);
      }

      // determine if it's visible and keep track of whether anything
      // is newly made visible
      var penabled = elinfo.enabled;
      elinfo.enabled = this._fixedPositionVisible(elinfo);
      if (!penabled && elinfo.enabled) {
        elementNewlyVisible = true;
      }
    }
  }

  // garbage collect... remove all elements not seen in this doc
  for (j = 0; j < this.fixedPositionEls.length; j++) {
    if (
      this.fixedPositionEls[j].doc === doc &&
      this.fixedPositionEls[j].lastUpdate !== lastUpdate
    ) {
      // reset the style the way it was if it's still on the page
      el = this.fixedPositionEls[j].el;
      ostyle = this.fixedPositionEls[j].origStyles;
      if (this.fixedPositionEls[j].doc.documentElement.contains(el)) {
        var props = ["top", "left", "bottom", "right", "width", "height"];
        for (var k = 0; k < props.length; k++) {
          var prop = props[k];
          if (!ostyle[prop]) {
            el.style.removeProperty(prop);
          } else {
            el.style[prop] = ostyle[prop];
          }
        }

        console.log("Reset fixed position element:", el, ostyle);
      }

      // delete!
      this.fixedPositionEls.splice(j, 1);
      j--;
    }
  }

  // optimization: if the duration of the above is too slow, we
  // will stop recalculating the styles of the elements after a few tries
  var duration = performance.now() - startedAt;
  if (duration > 30) {
    this.fixedPositionComputeStyleSlowCount++;
    console.warn("Fixed position computed style calculation took", duration, "ms");
  }

  // this will trigger all enabled elements to reposition themselves
  if (elementNewlyVisible && this.viewportParams) {
    this._onViewportUpdate(this.viewportParams);
  }
};

/**
 * On mobile, the scrollbars are distracting, so hide them.
 * TODO: it might be better to modify the scrollbar style to be
 * very thin or hidden, rather than doing overflow: hidden.
 */
CssMod.prototype._hideScrollBarsOnMobile = function(doc) {
  if (this.mobile) {
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
  }
};

/**
 * Is this fixed position element visible on the screen?
 * @private
 */
CssMod.prototype._fixedPositionVisible = function(elinfo) {
  // try to catch simple -N% off screen hacks
  if (elinfo.left && elinfo.left.factor < 0) return false;
  if (elinfo.top && elinfo.top.factor < 0) return false;
  if (elinfo.right && elinfo.right.factor < 0) return false;
  if (elinfo.bottom && elinfo.bottom.factor < 0) return false;

  if (
    elinfo.style.display !== "none" &&
    elinfo.style.visibility !== "hidden" &&
    elinfo.style.opacity !== "0"
  ) {
    // TODO: this won't catch elements that are positioned off
    // the screen on purpose, but it should cover common cases
    return true;
  }

  return false;
};

CssMod.prototype._calculateFixedAnchor = function(elinfo) {
  // restore original properties to the element's style
  Object.keys(elinfo.origStyles).forEach(function(prop) {
    var value = elinfo.origStyles[prop];
    if (value !== "") {
      elinfo.el.style[prop] = value;
    } else if (elinfo.el.style[prop] !== "") {
      elinfo.el.style.removeProperty(prop);
    }
  });

  // determine how the element is anchored to the viewport and save
  // some metadata about it
  var styles = this._allMatchedRules(elinfo.el).concat([elinfo.el]);
  styles.reverse();

  var percentMatcher = /^(-?[\d\.]+)(%|vh|vw)$/i;
  var anchorMatcher = /^(-?[\d\.]+)(px|rem|em|%|vh|vw|)$/i;
  ["top", "left", "bottom", "right"].forEach(function(prop) {
    if (
      styles.find(function(rule) {
        return rule.style.getPropertyPriority(prop) === "important" && rule.style[prop] === "auto";
      })
    ) {
      // we want to skip this if there's an auto!important rule that will
      // override other rules (like our feedback buttons)
      return;
    }

    var rule = styles.find(function(rule) {
      return rule.style[prop] != null && rule.style[prop] !== "";
    });
    if (!rule || rule.style[prop] === "auto") {
      // skip if we can't find a rule for this property. We need to do
      // this because getComputedStyle always returns left, right, top, bottom
      // even if there's no rules defined for them, and we want to know
      // which side(s) the fixed:position element is anchored to
      return;
    }

    // check for percent rules
    var match = rule.style[prop].match(percentMatcher);
    if (match) {
      elinfo[prop] = { offset: 0, factor: +match[1] / 100 };
      return;
    }

    match = elinfo.style[prop].match(anchorMatcher);
    if (!match) return;
    var number = +match[1];
    var unit = match[2];
    switch (unit) {
      case "":
      case "px":
        // console.log("updating", prop, "to", number)
        elinfo[prop] = { offset: number, factor: 0 };
        break;
      case "em":
      case "rem":
        // Note: this is not correct for em but is close enough
        // this is correct for rem
        var fontSize = +getComputedStyle(elinfo.doc.documentElement).fontSize;
        elinfo[prop] = { offset: fontSize * number, factor: 0 };
        break;
    }
  });

  // handle the width/height being stretched to viewport
  // getComputedStyle can't be used here because it converts % to px which
  // is really not helpful.
  ["width", "height"].forEach(function(prop) {
    var rule = styles.find(function(rule) {
      return (
        rule.style[prop] != null &&
        rule.style[prop] !== "" &&
        rule.style[prop] !== "auto" &&
        rule.style[prop].match(percentMatcher)
      );
    });
    if (!rule) return;
    var match = rule.style[prop].match(percentMatcher);
    if (match) {
      elinfo[prop] = +match[1] / 100;
    }
  });

  if (
    elinfo.top &&
    elinfo.top.offset === 0 &&
    elinfo.left &&
    elinfo.left.offset === 0 &&
    elinfo.bottom &&
    elinfo.bottom.offset === 0 &&
    elinfo.right &&
    elinfo.right.offset === 0
  ) {
    // special case, all sides anchored, then remove some
    delete elinfo.bottom;
    delete elinfo.right;
    if (!elinfo.width) {
      elinfo.width = 1;
    }
    if (!elinfo.height) {
      elinfo.height = 1;
    }
  }

  if (!elinfo.top && !elinfo.left && !elinfo.bottom && !elinfo.right) {
    // special case, no anchor side, then specify one
    elinfo.top = { offset: 0, factor: 0 };
    elinfo.left = { offset: 0, factor: 0 };
  }
};

/**
 * Replace all :hover styles with [fsrhover="true"] styles so that
 * hover state emulation works. Also disables the real mouse pointer
 * from triggering hover states.
 *
 * @private
 */
CssMod.prototype._replaceHoverStyles = function(doc, rule, group, index) {
  if (rule.selectorText) {
    var replacement = rule.selectorText.replace(/:hover\b/gi, '[fsrhover="true"]');
    if (replacement !== rule.selectorText && !this.fixedHoverRules.has(rule)) {
      // make sure we don't replace this rule twice
      this.fixedHoverRules.add(rule);

      // this can fail silently in firefox, but it's better performance if it works
      try {
        rule.selectorText = replacement;
      } catch (e) {}

      if (rule.selectorText.indexOf(replacement) < 0) {
        // quick fix didn't work... this method is slightly more expensive
        var text = rule.cssText.replace(rule.selectorText, replacement);

        try {
          // insert the rule at the location of the old rule
          group.insertRule(text, index);
          // delete the previous rule, which was bumped to i+1 position
          group.deleteRule(index + 1);
        } catch (e) {}
      }
    }
  }
};

CssMod.prototype._replaceFixedPositionRules = function(doc, rule) {
  if (this.disablePositionFixedFix) return;
  if (this._positionFixedFixUnnecessary(doc)) return;
  if (!rule.style) return;
  if (rule.style.position !== "fixed") return;
  if (this.fixedPositionRules.has(rule)) return;

  this.fixedPositionRules.add(rule);
  var info = { enabled: false, rule: rule, doc: doc };

  this.fixedPositionInfo.push(info);
};

/**
 * If the body has `height: 100%` or `height: 100vh` then likely the
 * position fixed fix is not necessary. Possibly values less than 100
 * would also work, so guessing it needs to be above 50.
 * @private
 */
CssMod.prototype._positionFixedFixUnnecessary = function(doc) {
  var map = doc.body.computedStyleMap();
  var height = map && map.get("height");
  this.disablePositionFixedFix =
    height && (height.unit === "percent" || height.unit === "vh") && height.value > 50;
  if (this.disablePositionFixedFix) {
    console.log("Position fixed unnecessary on this page! YAY!");
  }
  return this.disablePositionFixedFix;
};

/**
 * Removes "security" fixes intended to hide documents when displayed in an iframe.
 * @private
 */
CssMod.prototype._fixHiddenDocumentElement = function(doc, rule, group, index) {
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
};

/**
 * Fixes the badge CSS to remove !important and simplify the locations
 * @private
 */
CssMod.prototype._removeBadgeImportant = function(doc, rule, group, index) {
  switch (rule.selectorText) {
    case "._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("top");
      rule.style.removeProperty("left");
      break;

    case "._acsbottomright._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("top");
      rule.style.removeProperty("left");
      rule.style.removeProperty("right");
      rule.style.right = "0px";
      break;

    case "._acsbottomleft._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("top");
      rule.style.removeProperty("right");
      rule.style.left = "0px";
      break;

    case "._acstopright._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("bottom");
      rule.style.removeProperty("left");
      rule.style.removeProperty("right");
      rule.style.right = "0px";
      break;

    case "._acstopleft._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("bottom");
      rule.style.removeProperty("right");
      rule.style.left = "0px";
      break;

    case "._acsmiddleleft._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("right");
      rule.style.removeProperty("top");
      rule.style.left = "0px";
      rule.style.top = "48%";
      break;

    case "._acsmiddleleft._acsVertical_left._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("top");
      rule.style.top = "50%";
      break;

    case "._acsmiddleright._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("left");
      rule.style.removeProperty("right");
      rule.style.removeProperty("top");
      rule.style.top = "48%";
      rule.style.right = "0px";
      break;

    case "._acsmiddleright._acsVertical_right._acsbadge--default":
      this.badgeCssFound = true;
      rule.style.removeProperty("top");
      rule.style.top = "30%";
      break;

    case "._acsAnimate._acsbadge--default":
      // This animation causes the badges to lag around the page,
      // so remove it.
      this.badgeCssFound = true;
      rule.style["transition-duration"] = "0ms";
      break;
  }
};

/**
 * When the viewport updates we want to update all fixed position elements.
 * @private
 */
CssMod.prototype._onViewportUpdate = function(params, doc) {
  var sizeChange =
    this.viewportParams &&
    (params.lw !== this.viewportParams.lw || params.lh !== this.viewportParams.lh);

  this.viewportParams = params;

  // clear the fixed position slow fix after some time
  if (Date.now() - this.lastFixedMoveDisable > 20000) {
    this.fixedPositionMovingSlowCount = 0;
  }

  // if it's too slow, just disable it for a bit
  if (this.fixedPositionMovingSlowCount > 3) {
    this.lastFixedMoveDisable = Date.now();
    return;
  }

  var startedAt = performance.now();
  for (var i = 0; i < this.fixedPositionEls.length; i++) {
    this._moveFixedPositionElement(this.fixedPositionEls[i], params);
  }
  var duration = performance.now() - startedAt;
  if (duration > 15) {
    console.warn("Moving fixed position elements took", duration, "ms!");
    this.fixedPositionMovingSlowCount++;
  }

  if (sizeChange) {
    // recalculate the media queries
    this.fixedMediaQueries.clear();
    this._fixCSS(doc, true);
  }
};

/**
 * Adjust the position of a visible fixed position element.
 */
CssMod.prototype._moveFixedPositionElement = function(elinfo, params) {
  if (this.disablePositionFixedFix) return;
  if (!elinfo.enabled) {
    // ignore invisible elements
    return;
  }

  var vw = params.vw,
    vh = params.vh;
  var el = elinfo.el;
  var bounds = elinfo.doc.documentElement.getBoundingClientRect();
  var width = bounds.width;
  var height = bounds.height;
  var top = -bounds.top / params.viewScale;
  var left = -bounds.left / params.viewScale;
  var bottom = (height + bounds.top - vh * params.viewScale) / params.viewScale;
  var right = (width + bounds.left - vw * params.viewScale) / params.viewScale;
  var vwidth = vw;
  var vheight = vh;

  if (
    this.mobile &&
    (params.viewScale > 1.1 || params.viewScale < 0.9) &&
    (elinfo.width !== 1 || elinfo.height !== 1)
  ) {
    top = 0;
    left = 0;
    bottom = 0;
    right = 0;
    vwidth = width;
    vheight = height;
  }

  if (elinfo.width) {
    el.style.width = Math.round(vwidth * elinfo.width) + "px";
  }
  if (elinfo.height) {
    el.style.height = Math.round(vheight * elinfo.height) + "px";
  }
  if (elinfo.top) {
    el.style.top =
      Math.round(top + (elinfo.top.offset + elinfo.top.factor * vh) / params.viewScale) + "px";
  }
  if (elinfo.left) {
    el.style.left =
      Math.round(left + (elinfo.left.offset + elinfo.left.factor * vh) / params.viewScale) + "px";
  }
  if (elinfo.bottom) {
    el.style.bottom =
      Math.round(bottom - (elinfo.bottom.offset + elinfo.bottom.factor * vh) / params.viewScale) +
      "px";
  }
  if (elinfo.right) {
    el.style.right =
      Math.round(right - (elinfo.right.offset + elinfo.right.factor * vw) / params.viewScale) +
      "px";
  }
};

/**
 * Search through the stylesheets on the page looking for rules that apply
 * to a specific element.
 *
 * @private
 */
CssMod.prototype._allMatchedRules = function(el) {
  var i;
  var len;
  var matching = [];
  var doc = el.ownerDocument;
  var sheets = doc.styleSheets;
  var win = doc.defaultView;

  function loopRules(rules) {
    var i, len, rule;

    for (i = 0, len = rules.length; i < len; i++) {
      rule = rules[i];
      if (rule.type === CSSRule.MEDIA_RULE) {
        if (win.matchMedia(rule.conditionText).matches) {
          loopRules(rule.cssRules);
        }
      } else if (rule.cssRules) {
        loopRules(rule.cssRules);
      } else if (rule.type === CSSRule.STYLE_RULE) {
        if (el.matches(rule.selectorText)) {
          matching.push(rule);
        }
      }
    }
  }

  for (i = 0, len = sheets.length; i < len; i++) {
    loopRules(sheets[i].cssRules);
  }

  return matching;
};
