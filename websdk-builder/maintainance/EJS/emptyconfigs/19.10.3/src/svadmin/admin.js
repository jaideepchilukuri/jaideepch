/**
 * Survey Admin class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, ext, makeURI, getProductConfig } from "../fs/index";
import { loadCSS, Bind, preventDefault, TemplateFetcher, getGeneralStorage } from "../utils/utils";

/**
 * The Survey Admin class
 * @param browser
 * @constructor
 */
class Admin {
  constructor(browser) {
    this.browser = browser;
    this.stg = getGeneralStorage(browser);
  }

  /**
   * Retrieve the template and stylesheet
   * @param cb (Function) callback on complete
   */
  loadResources(cb) {
    this.stg.ready.subscribe(
      () => {
        const csslocation = makeURI("$templates/trigger/admintools/main.css");
        const templatelocation = makeURI("$templates/trigger/admintools/admin.html");
        let gotcss = false;
        let gottemplate = false;

        const check = () => {
          if (gotcss && gottemplate && cb) {
            return cb();
          }
        };

        // Grab the CSS
        loadCSS(
          csslocation,
          () => {
            /* pragma:DEBUG_START */
            console.log("sva: got css");
            /* pragma:DEBUG_END */
            gotcss = true;
            check();
          },
          null,
          this.browser
        );

        // Grab the template
        const tr = new TemplateFetcher({
          success: result => {
            /* pragma:DEBUG_START */
            console.log("sva: got template");
            /* pragma:DEBUG_END */
            gottemplate = true;
            this.template = result;
            check();
          },
        });
        tr.get(templatelocation);
      },
      true,
      true
    );
  }

  /**
   * Apply any set values
   * @private
   */
  _applyValues() {
    const overrideobject = {
      sp: {},
      lf: {},
    };
    const spvals = document.querySelectorAll(".acsSPOverride");
    const lfvals = document.querySelectorAll(".acsLFOverride");
    let i;

    for (i = 0; i < spvals.length; i++) {
      const spid = spvals[i].id;
      const spval = spvals[i].value;
      const realspid = spid.replace("_spovr_", "");
      if (spval && spval.length > 0) {
        overrideobject.sp[realspid] = {
          reg: parseInt(spval, 10),
          outreplaypool: parseInt(spval, 10),
        };
      }
    }
    for (i = 0; i < lfvals.length; i++) {
      const lfid = lfvals[i].id;
      const lfval = lfvals[i].value;
      const reallfid = lfid.replace("_lfovr_", "");
      if (lfval && lfval.length > 0) {
        overrideobject.lf[reallfid] = parseInt(lfval, 10);
      }
    }
    let pooloveride = false;
    if (document.getElementById("acsOverridePooling").checked) {
      pooloveride = true;
    }
    overrideobject.pooloverride = pooloveride;
    this.stg.set("ovr", JSON.stringify(overrideobject), null, true, () => {
      this.writeMessage("Override saved.");
    });
  }

  /**
   * Write a message
   * @param msg
   */
  writeMessage(msg) {
    const msgfield = document.getElementById("fsMessage");
    clearTimeout(this.wmTimeout);
    if (msgfield) {
      msgfield.innerHTML = msg || "";
      this.wmTimeout = setTimeout(() => {
        msgfield.innerHTML = "";
      }, 3000);
    }
  }

  /**
   * Draw everything
   */
  render() {
    document.title = "ForeSee Survey Administration Tool";
    const vrs = ext(
      {},
      this.browser,
      {
        siteLogo: `${globalConfig.staticUrl}/logos/foresee/foresee.svg`,
      },
      { defs: getProductConfig("trigger").surveydefs },
      false
    );
    const outstr = this.template(vrs);
    document.body.innerHTML = outstr;
    const setb = document.getElementById("acsSetValues");
    if (setb) {
      Bind(setb, "click", e => {
        preventDefault(e);
        this.stg.reset(
          () => {
            this._applyValues();
          },
          null,
          true
        );
      });
    }
    const clearb = document.getElementById("acsClearValues");
    if (clearb) {
      Bind(clearb, "click", e => {
        preventDefault(e);
        this.stg.reset(
          () => {
            this.writeMessage("State cleared.");
          },
          () => {
            this.writeMessage("Failed to clear state.");
          }
        );
        const spsl = document.querySelectorAll(".acsSPOverride, .acsLFOverride");
        for (let p = 0; p < spsl.length; p++) {
          spsl[p].value = "";
        }
        document.getElementById("acsOverridePooling").checked = false;
      });
    }
    const retbtw = document.getElementById("acsReturnToSite");
    if (retbtw) {
      Bind(retbtw, "click", e => {
        preventDefault(e);
        const wloc = window.location.href.toString().replace(/[#&]fscommand=\w+/g, "");

        // If the hash part of the url is removed, we need to set the window.location first
        // then reload. If the hash part remains, we need to reload then set the window.location.
        // This just does it in both orders so it works in both cases.
        window.location = wloc;
        window.location.reload();
        window.location = wloc;
      });
    }
    let ckovr = this.stg.get("ovr");

    if (ckovr) {
      ckovr = JSON.parse(ckovr);
      document.getElementById("acsOverridePooling").checked = ckovr.pooloverride;
      for (const spel in ckovr.sp) {
        try {
          document.getElementById(`_spovr_${spel}`).value = ckovr.sp[spel].reg;
        } catch (e) {}
      }
      for (const lfel in ckovr.lf) {
        try {
          document.getElementById(`_lfovr_${lfel}`).value = ckovr.lf[lfel];
        } catch (e) {}
      }
    }
  }
}

export { Admin };
