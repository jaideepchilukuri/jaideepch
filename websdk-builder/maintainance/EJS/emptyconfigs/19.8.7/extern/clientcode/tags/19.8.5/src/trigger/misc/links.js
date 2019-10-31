/**
 * Handle the links behavior in trigger
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Handles links
 * @param linksinfo
 * @constructor
 */
var LinksHandler = function(linksinfo) {
  this.cfg = linksinfo;
};

/**
 * Bind to links
 * @param info - The complete link object
 * @param handler
 * @private
 */
LinksHandler.prototype._bindToLink = function(info, handler) {
  var els = document.querySelectorAll(info.selector),
    bindfn = function(ctx, inf, hdlr) {
      return function(e) {
        /* pragma:DEBUG_START */
        console.log("activating link: ", inf);
        /* pragma:DEBUG_END */

        // Are we supposed to suppress the default behavior?
        if (inf.preventDefault) {
          utils.preventDefault(e);
        }
        hdlr.call(ctx, inf);
      };
    };
  for (var i = 0; i < els.length; i++) {
    var el = els[i],
      didPass = true,
      atr;

    if (info.attribute) {
      atr = el.getAttribute(info.attribute);
      didPass = false;
      if (atr) {
        didPass = true;
        if (info.patterns && info.patterns.length > 0) {
          didPass = false;
          for (var j = 0; j < info.patterns.length; j++) {
            if (fs.toLowerCase(atr).indexOf(fs.toLowerCase(info.patterns[j])) > -1) {
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
      utils.Bind(el, "trigger:click", bindfn(this, info, handler));
    }
  }
};

/**
 * Perform bindings to hyperlinks on the page to do various things
 * @param trig
 */
LinksHandler.prototype.performBindings = function(trig) {
  if (trig && this.cfg) {
    var lnks = this.cfg,
      i;

    // Do cancel
    if (lnks.cancel && lnks.cancel.length > 0) {
      var cancelfn = function() {
        trig.cancelTracker();
        trig.jrny.addEventString(LOGGING.LINKS_CANCEL);
      };
      for (i = 0; i < lnks.cancel.length; i++) {
        this._bindToLink(lnks.cancel[i], cancelfn);
      }
    }
    // Do survey
    if (lnks.survey && lnks.survey.length > 0) {
      var popfn = function() {
        trig.popSurvey();
      };
      for (i = 0; i < lnks.survey.length; i++) {
        this._bindToLink(lnks.survey[i], popfn);
      }
    }
    // Do attach tracker
    if (!trig.browser.isMobile && lnks.tracker && lnks.tracker.length > 0) {
      var attachfn = function() {
        trig.popTracker();
      };
      for (i = 0; i < lnks.tracker.length; i++) {
        this._bindToLink(lnks.tracker[i], attachfn);
      }
    }
  }
};
