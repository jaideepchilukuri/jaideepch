/**
 * True conversion plugin
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("true.Conversion");

fs.require("true.Top");

(function () {

  /**
   * The True Conversion class. Implements the rules and service requests for TC.
   * @param trigger
   * @constructor
   */
  var TrueConversion = function (trigger) {
    this.trigger = trigger;
    this.stg = trigger.stg;
    this.cfg = trigger.cfg;
    this.browser = trigger.browser;
    this.crit = trigger.crit;
    this.def = trigger.surveydef;
    this.tc = this.cfg.config.trueconversion;
    this.jrny = trigger.jrny;
    if (this.tc && this.tc.enabled) {
      // Run the rules
      this._processRules();
    }
  };

  /**
   * Signal a message
   * @param codeinfo
   * @private
   */
  TrueConversion.prototype._signal = function (codeinfo, val) {
    // Enforce repeat
    if (!codeinfo.repeat) {
      var didSig = this.stg.get('tc' + codeinfo.code);
      if (didSig) {
        return;
      }
    }

    // Before we signal we need to check if we are within our purchase days limit
    var ixw = this.stg.get('ixw'),
      pd = this.tc.pd || 7,
      pdms = pd * (1000 * 60 * 60 * 24);

    if (!ixw || parseInt(ixw, 10) + pdms > utils.now()) {
      /* pragma:DEBUG_START */
      if (ixw) {
        console.warn("trueconversion: we are within our " + pd + " purchase days limit for true conversion");
      } else {
        console.warn("trueconversion: user has not accepted the invite yet, so we can signal true conversion");
      }
      /* pragma:DEBUG_END */

      /* pragma:DEBUG_START */
      console.log("trueconversion: signaling conversion rule ***** ", codeinfo, val);
      /* pragma:DEBUG_END */

      // Log that message
      this.jrny.addEventObj({
        "name": "fs_conversion",
        "data": {
          "code": codeinfo.code.toString()
        }
      });

      // Make a note
      this.stg.set('tc' + codeinfo.code, 'y');
    }
  };

  /**
   * Implement the TC Rules
   * @private
   */
  TrueConversion.prototype._processRules = function () {
    var tc = this.tc,
      i,
      codeinfo;
    for (var code in tc.codes) {
      codeinfo = tc.codes[code];
      switch (codeinfo.source) {
        case "variable":
          if (fs.isDefined(window[codeinfo.name])) {
            this._signal(codeinfo, window[codeinfo.name]);
          }
          break;
        case "url":
          for (i = 0; i < codeinfo.patterns.length; i++) {
            if (fs.toLowerCase(window.location.toString()).indexOf(fs.toLowerCase(codeinfo.patterns[i])) > -1) {
              this._signal(codeinfo, codeinfo.patterns[i]);
              break;
            }
          }
          break;
      }
    }
  };

  /**
   * Do any cleanup that is necessary to reset the state later
   */
  TrueConversion.prototype.dispose = function () {

  };

})();