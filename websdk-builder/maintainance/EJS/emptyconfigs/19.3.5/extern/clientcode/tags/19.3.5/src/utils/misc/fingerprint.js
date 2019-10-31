/**
 * Used for fingerprinting a browser
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Misc.Fingerprint");

fs.require("fs.Top");
fs.require("fs.Misc.MD5");

(function () {

  /**
   * Keeps track of the fingerprint signature so we don't keep re-making it
   */
  var __fpSig;

  /**
   * Creates a very unique but persistent fingerprint of the browser that survives minor-version
   * upgrades.
   * @param browser {Browser} The detected Browser instance
   * @param callback {Function} The callback function
   * @constructor
   */
  var Fingerprint = function (browser) {
    /* pragma:DEBUG_START */
    if (!browser || fs.isString(browser)) {
      console.error("utils: fingerprint requested without a browser instance");
    }
    /* pragma:DEBUG_END */
    this.browser = browser;
    this.sig = __fpSig || "not detected";
    this.ready = new utils.FSEvent();
    this._detect();
  };

  /**
   * Perform the detection
   * @private
   */
  Fingerprint.prototype._detect = function () {
    var cb = fs.proxy(function(sig) {
      this.sig = sig;
      this.ready.fire(sig);
    }, this);
    if (GA.has()) {
      GA.uid(cb);
      return;
    } else if (OM.has()) {
      OM.uid(cb);
      return;
    }
    var sigBits = [],
      nav = navigator,
      sig,
      sign = '_fsrFP_',
      br = this.browser;

    // If we're running from within the frame, use the fp/sig from the query string
    if (_W != _W.top) {
      var pu = location.search.match(/uid=([\d\w]*)/i);
      if (pu && pu[1]) {
        sig = pu[1];
      }
    }

    if ((!sig || sig == 'not detected') && br.supportsLocalStorage) {
      sig = localStorage.getItem(sign);
    }
    if (!sig && !!__fpSig) {
      sig = __fpSig;
    }
    if (!sig) {
      sigBits = utils.trim(navigator.userAgent.replace(/[0-9\.\/\\\(\);_\-]*/gi, '')).split(' ');
      sigBits.push(nav.language || '');
      sigBits.push(nav.hardwareConcurrency || '');
      sigBits.push(nav.platform || '');
      sigBits.push(nav.vendor || '');
      sigBits.push(nav.appName || '');
      sigBits.push(nav.maxTouchPoints || '');
      sigBits.push(nav.doNotTrack || 'false');
      sigBits.push(br.os.name || 'false');
      sigBits.push(br.os.version || 'false');
      sigBits.push(this._getCanvasPrint());
      sig = utils.md5(sigBits.join(''));
      this.sig = sig;
      if (br.supportsLocalStorage) {
        localStorage.setItem(sign, sig);
      }
    }
    fs.nextTick(function() {
      cb(sig);
    });
  };

  /**
   * Get the canvas fingerprint
   * @private
   */
  Fingerprint.prototype._getCanvasPrint = function () {
    try {
      var c = document.createElement('canvas'),
        ctx = c.getContext("2d"),
        txt = "ForeSee,CloudUser <canvas> 1.0";
      c.width = 250;
      c.height = 30;
      ctx.textBaseline = "top";
      // The most common type
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      // Some tricks for color mixing to increase the difference in rendering
      ctx.fillStyle = "#069";
      ctx.fillText(txt, 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText(txt, 4, 17);
      return c.toDataURL();
    } catch (e) {
      // Canvas not supported, just an empty string
      return 'nocanvas';
    }
  };

  /**
   * Expose it
   * @type {Fingerprint}
   */
  utils.Fingerprint = Fingerprint;

})();