/**
 * JSONP Transport
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext } from "../../fs/index";
import { FSEvent } from "../dom/event";
import { ScriptLoader } from "../dom/scriptload";

window.__fsJSONPCBr = {};
window.__fsJSONPCB = dta => {
  if (dta) {
    const fname = dta.filename;
    const contents = atob(dta.contents);
    if (window.__fsJSONPCBr[fname]) {
      window.__fsJSONPCBr[fname].fire(contents);
    }
  }
};

/**
 * JSONP Transport
 * @param opts
 * @constructor
 */
class JSONP {
  constructor(opts) {
    this._expireTimeout = null;
    this._networkError = new FSEvent();
    this.opts = ext(
      {
        success() {},
        failure() {},
        timeout: 5000,
      },
      opts
    );
  }

  /**
   * Get a file
   * @param src {String} The original source of the file
   * @param prefix {String} Optionsl. The prefix on the final key string
   */
  get(src, prefix) {
    const ext = src.indexOf("?") > -1 ? src.substr(src.indexOf("?") + 1) : "";
    const fldr = src.substr(0, src.lastIndexOf("/") + 1);
    let fname = src.substr(src.lastIndexOf("/") + 1);
    const cbQR = window.__fsJSONPCBr;

    this._expireTimeout = setTimeout(() => {
      this._networkError.fire({ type: "timedout" });
    }, this.opts.timeout);

    if (fname.indexOf("?") > -1) {
      fname = fname.substr(0, fname.indexOf("?"));
    }

    const gblToken = (prefix || "") + fname;

    if (!cbQR[gblToken]) {
      cbQR[gblToken] = new FSEvent();
      const nfname = `${fldr + fname.substr(0, fname.lastIndexOf("."))}___${fname.substr(
        fname.lastIndexOf(".") + 1
      )}.js${ext.length > 0 ? `?${ext}` : ""}`;
      const sl = new ScriptLoader(nfname, `_fscl${gblToken}`);
      sl.loadFailure.subscribe(
        function() {
          /* pragma:DEBUG_START */
          console.warn("fb: could not load the script ", nfname);
          /* pragma:DEBUG_END */
          this.el.parentNode.removeChild(this.el);
          this.ctx._networkError.fire({ type: "internalserror" });
        }.bind({ ctx: this, el: sl.st })
      );
    }

    cbQR[gblToken].subscribe(
      function(res) {
        this.ctx.opts.success(res);
        clearTimeout(this.ctx._expireTimeout);
        const scriptel = document.getElementById(this.tgId);
        if (scriptel) {
          scriptel.parentNode.removeChild(scriptel);
        }
      }.bind({ ctx: this, tgId: `_fscl${gblToken}` }),
      true,
      true
    );

    this._networkError.subscribe(
      type => {
        this.opts.failure(type);
        cbQR[gblToken].unsubscribeAll();
      },
      true,
      true
    );
  }
}

export { JSONP };
