/**
 * JSONP Transport
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.JSONP");

fs.require("fs.Top");
fs.require("fs.Misc.Base64");
fs.require("fs.Dom.ScriptLoad");

(function (utils) {

  window.__fsJSONPCBr = {};
  window.__fsJSONPCB = fs.proxy(function (dta) {
    if (dta) {
      var fname = dta.filename,
        contents = atob(dta.contents);
      if (window.__fsJSONPCBr[fname]) {
        window.__fsJSONPCBr[fname].fire(contents);
      }
    }
  }, this);

  /**
   * JSONP Transport
   * @param opts
   * @constructor
   */
  utils.JSONP = function (opts) {
    this._expireTimeout = null;
    this._networkError = new utils.FSEvent();
    this.opts = fs.ext({
      success: function () {
      },
      failure: function () {
      },
      timeout: 5000
    }, opts);

  };

  /**
   * Get a file
   * @param src {String} The original source of the file
   * @param prefix {String} Optionsl. The prefix on the final key string
   */
  utils.JSONP.prototype.get = function (src, prefix) {
    var ext = (src.indexOf('?') > -1) ? src.substr(src.indexOf('?') + 1) : '',
      fldr = src.substr(0, src.lastIndexOf('/') + 1),
      fname = src.substr(src.lastIndexOf('/') + 1),
      cbQR = window.__fsJSONPCBr;

    this._expireTimeout = setTimeout(fs.proxy(function () {
      this._networkError.fire({ type: 'timedout' });
    }, this), this.opts.timeout);

    if (fname.indexOf('?') > -1) {
      fname = fname.substr(0, fname.indexOf('?'));
    }

    var gblToken = (prefix || '') + fname;

    if (!cbQR[gblToken]) {
      cbQR[gblToken] = new utils.FSEvent();
      var nfname = fldr + fname.substr(0, fname.lastIndexOf('.')) + '___' + fname.substr(fname.lastIndexOf('.') + 1) + '.js' + (ext.length > 0 ? '?' + ext : ''),
        sl = new ScriptLoader(nfname, '_fscl' + gblToken);
      sl.loadFailure.subscribe(fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.warn('fb: could not load the script ', nfname);
        /* pragma:DEBUG_END */
        this.el.parentNode.removeChild(this.el);
        this.ctx._networkError.fire({ type: 'internalserror' });
      }, { ctx: this, el: sl.st }));
    }

    cbQR[gblToken].subscribe(fs.proxy(function (res) {
      this.ctx.opts.success(res);
      clearTimeout(this.ctx._expireTimeout);
      var scriptel = document.getElementById(this.tgId);
      if (scriptel) {
        scriptel.parentNode.removeChild(scriptel);
      }
    }, { ctx: this, tgId: '_fscl' + gblToken }), true, true);

    this._networkError.subscribe(fs.proxy(function (type) {
      this.opts.failure(type);
      cbQR[gblToken].unsubscribeAll();
    }, this), true, true);

  };

})(utils);