/**
 * OptOut class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, ext, isDefined, makeURI } from "../fs/index";
import { loadCSS, Bind, preventDefault, TemplateFetcher, getGeneralStorage } from "../utils/utils";

/**
 * The opt out class
 * @param browser
 * @constructor
 */
class OptOut {
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
        const templatelocation = makeURI("$templates/trigger/admintools/optout.html");
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
            console.warn("optout: got css");
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
            console.warn("optout: got template");
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
   * Apply the current opt-out / opt-in state to the UI
   * @private
   */
  _applyOptOutState() {
    this.stg.ready.subscribe(
      data => {
        const d = document;
        const optout = this.stg.get("optout");
        if (!isDefined(optout) || optout == "false") {
          d.querySelector(".acsOptOutControls").style.display = "block";
          d.querySelector(".acsOptInControls").style.display = "none";
        } else {
          d.querySelector(".acsOptOutControls").style.display = "none";
          d.querySelector(".acsOptInControls").style.display = "block";
          const expdate = new Date();
          const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ];

          // TODO test this
          expdate.setTime(data._data.keys.optout.x);

          const day = expdate.getDate();
          const monthIndex = expdate.getMonth();
          const year = expdate.getFullYear();
          d.getElementById("acswhenexpires").innerHTML = `${
            monthNames[monthIndex]
          } ${day}, ${year}`;
        }
      },
      true,
      true
    );
  }

  /**
   * Draw everything
   */
  render() {
    document.title = "ForeSee Opt-Out Tool";
    const vrs = ext(this.browser, {
      siteLogo: `${globalConfig.staticUrl}/logos/foresee/foresee.svg`,
    });
    const outstr = this.template(vrs);
    document.body.innerHTML = outstr;
    const oob = document.getElementById("acsOptOutButton");
    const oib = document.getElementById("acsOptInButton");
    Bind(oob, "click", e => {
      preventDefault(e);
      this.stg.set("optout", true, 1000 * 60 * 60 * 24 * 365, true);
      this._applyOptOutState();
    });
    Bind(oib, "click", e => {
      preventDefault(e);
      this.stg.erase("optout", null, true);
      this._applyOptOutState();
    });
    this._applyOptOutState();
  }
}

export { OptOut };
