/**
 * The invite class
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext, makeAssetURI, makeURI, toLowerCase } from "../fs/index";
import { Templater } from "./misc/template";
import {
  addClass,
  Bind,
  DOMContains,
  FSEvent,
  getKeyCode,
  hasClass,
  JSONP,
  loadCSS,
  preventDefault,
  removeClass,
  Unbind,
  getScroll,
} from "../utils/utils";

// This is populated later
let Singletons;

/**
 * An invitation class
 * @param config - Full config object
 * @param def - The current survey def
 * @param brwsr - The Browser Object
 * @param displayoverride - The display override to use (optional)
 * @param cpps - The CPPS
 * @constructor
 */
class Invite {
  constructor(config, def, brwsr, display, cpps, sngltons) {
    this.cfg = config;
    this.def = ext({}, def);
    this.display = display;
    this.template = this.display.template;
    this.brwsr = brwsr;
    this._inviteEls = [];
    this.locale = cpps.get("locale") || "en";
    this.lastActiveEl = null;
    this.lastScroll = null;
    Singletons = sngltons;
    this.isCustom = Singletons.customInvitationRequested.subscriptions.length > 0;

    /* pragma:DEBUG_START */
    console.warn("invite: invite constructor started with", this.cfg);
    /* pragma:DEBUG_END */

    /**
     * The stage of the invite we are on
     * @type {number}
     */
    this.inviteStage = 0;

    /**
     * Fires when the user declines the invite
     * @type {utils.FSEvent}
     */
    this.declined = new FSEvent();

    // Bind to our own declined event so we remember to remove the elements
    this.declined.subscribe(() => {
      this._removeEls();
    });

    /**
     * Fires when the user abandons the invite (by clicking on the X or similar)
     * @type {utils.FSEvent}
     */
    this.abandoned = new FSEvent();

    // Bind to our own abandoned event so we remember to remove the elements
    this.abandoned.subscribe(() => {
      this._removeEls();
    });

    /**
     * The invite was accepted. This may pass info about what to do next.
     * @type {utils.FSEvent}
     */
    this.accepted = new FSEvent();

    /**
     * The process was complete.
     * @type {utils.FSEvent}
     */
    this.completed = new FSEvent();

    // The process is complete here at this point, remove the elements.
    this.completed.subscribe(removeEls => {
      if (removeEls) {
        this._removeEls();
      }
    });
  }

  /**
   * Retrieve the template and stylesheet
   * @param readyEvent (Object) the event that gets fired when invite assets are ready
   */
  loadResources(readyEvent) {
    const display = this.display;
    if (this.isCustom) {
      /* pragma:DEBUG_START */
      console.log("invite: assuming custom invitation");
      /* pragma:DEBUG_END */
      // Fire the ready event immediately
      readyEvent.fire();
    } else {
      let templatename = display.template;
      let csslocation = makeURI(
        `$templates/trigger/${templatename}/${
          display.dialog.theme ? display.dialog.theme : "main"
        }.css`
      );
      let templatelocation = makeURI(`$templates/trigger/${templatename}/invite.html`);
      let gotcss = false;
      let gottemplate = false;
      const check = () => {
        if (gotcss && gottemplate && readyEvent) {
          readyEvent.fire();
        }
      };

      // Is this a custom template?
      if (templatename.indexOf("@") === 0) {
        templatename = templatename.substr(1);
        csslocation = makeAssetURI(
          `trigger/templates/${templatename}/${
            display.dialog.theme ? display.dialog.theme : "main"
          }.css`
        );
        templatelocation = makeAssetURI(`trigger/templates/${templatename}/invite.html`);
      }

      /* pragma:DEBUG_START */
      console.log("invite: loading resources");
      /* pragma:DEBUG_END */

      // Grab the CSS
      loadCSS(
        csslocation,
        () => {
          /* pragma:DEBUG_START */
          console.log("invite: got the css");
          /* pragma:DEBUG_END */
          gotcss = true;
          check();
        },
        null,
        this.brwsr
      );

      // Grab the template
      const jp = new JSONP({
        success: result => {
          /* pragma:DEBUG_START */
          console.log(`invite: got the template ${templatelocation}`);
          /* pragma:DEBUG_END */
          gottemplate = true;
          this.invitetemplate = result;
          check();
        },
      });
      jp.get(templatelocation, `templates_trigger_${templatename}_`);
    }
  }

  /**
   * Validate what the user inputted in the mobile input
   * @param successcallback (Function) What to call when it is successful
   * @private
   */
  _validateMobileInput(successcallback) {
    const input = document.getElementById("acsEmailSMSInput");
    const val = input.value;
    const invalidErrorEl = document.getElementById("acsInvalidInput");

    const validateEmail = email => {
      const re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      return re.test(email);
    };

    const getUKPhone = p => {
      const numberWithoutJunk = p.replace(/[ -.()]+/g, "");
      // uk numbers start with +44, 44, 0044 or 0
      // then following is 9 or 10 digits that don't start with 0
      const ukPhoneNum = /^(\+44|44|0044|0)([1-9]\d{8,9})$/;
      const match = numberWithoutJunk.match(ukPhoneNum);
      if (match) {
        const numberWithoutCountryCode = match[2];
        return `+44${numberWithoutCountryCode}`;
      }
      return null;
    };

    const isPhone = p => {
      p = p.split(" ").join("");
      const phoneNum = /^(\+1|1)?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})$/;
      const phoneMatch = p.match(phoneNum) && p.length <= 15;

      return phoneMatch || !!getUKPhone(p);
    };

    const handleInvalid = () => {
      input.setAttribute("aria-invalid", "true");
      invalidErrorEl.setAttribute("role", "alert");
      removeClass(invalidErrorEl, "acsNoDisplay");
      input.focus();
    };

    const handleValid = () => {
      addClass(invalidErrorEl, "acsNoDisplay");
      input.removeAttribute("aria-invalid");
      setTimeout(() => {
        successcallback(getUKPhone(val) || val);
      }, 250);
    };

    successcallback = successcallback || (() => {});
    switch (this.display.inviteType) {
      case "SMS":
        if (isPhone(val)) {
          handleValid();
        } else {
          handleInvalid();
        }
        break;
      case "EMAIL":
        if (validateEmail(val)) {
          handleValid();
        } else {
          handleInvalid();
        }
        break;
      case "SMSEMAIL":
        if (toLowerCase(this.template) !== "mobile") {
          if (validateEmail(val) || isPhone(val)) {
            handleValid();
          } else {
            handleInvalid();
          }
        } else if (hasClass(input, "acsSMSValue")) {
          if (isPhone(val)) {
            handleValid();
          } else {
            handleInvalid();
          }
        } else if (validateEmail(val)) {
          handleValid();
        } else {
          handleInvalid();
        }
        break;
      case "SHORTSURVEY":
        break;
      default:
        throw new Error(`Unknown inviteType: ${this.display.inviteType}`);
    }
  }

  /**
   * Switch to the second invite for mobile on exit cases
   * @private
   */
  _switchToMobileOnExitStageInvite() {
    const doc = document;
    const stage1Invite = doc.querySelector("#acsMainInvite");
    const stage2Invite = doc.querySelector("#acsOnExitMobileInvite");
    const acsMain = doc.querySelector("#acsFullScreenContainer");

    if (acsMain) {
      addClass(doc.body, "acsFullScreen");
      addClass(doc.documentElement, "acsFullScreen");
      // rmq: setting acsFullScreen (overflow: hidden; height: 100 %;) to documentElement and body
      // fixes the scroll position to 0
      addClass(acsMain, "acsFullScreen");
      addClass(stage2Invite, "acsClassicInvite--fullscreen");
    }

    addClass(stage1Invite, "acsNoDisplay");
    removeClass(stage2Invite, "acsNoDisplay");
    if (acsMain) {
      doc.querySelector("#acsEmailSMSInput").focus();
    }

    // Set the invite stage to 1 (would have been 0)
    this.inviteStage += 1;
  }

  /**
   * Show the thank you page
   * @private
   */
  _switchToThankYouPage() {
    const doc = document;
    const stg2Inv = doc.getElementById("acsOnExitMobileInvite");
    const tyDialog = doc.getElementById("acsOnExitThankYou");
    const acsMain = doc.getElementById("acsFullScreenContainer");
    const declineBtns = doc.getElementsByClassName("acsDeclineButton");
    let ctrVal;
    const tmout = Number(this.display.dialog.onexitcounterval) * 1000 || 8000;

    const closeHandler = evt => {
      preventDefault(evt);
      this.completed.fire(true);
    };

    // Be nice and thank the user.
    if (acsMain) {
      // They're not decline buttons anymore..
      // Change their event handler to just close and not fire a declined event.
      for (let i = 0; i < declineBtns.length; i++) {
        // The order of unbinding, binding another event and removing the class is important because utils.Unbind uses ===.
        Unbind(declineBtns[i], "invite:click");
        Bind(declineBtns[i], "invite:click", closeHandler);
        removeClass(declineBtns[i], "acsDeclineButton");
      }
      removeClass(acsMain, "__acs__input-clicked");
      addClass(stg2Inv, "acsNoDisplay");
      removeClass(tyDialog, "acsNoDisplay");
      tyDialog.focus();
      this.closeTimeOut = setTimeout(() => {
        // Survey submitted..
        this.completed.fire(true);
      }, tmout + 1000);
      this.counterInterval = setInterval(() => {
        // This is intentionally inside the timeout here, if the user declines the survey before the closeTimeOut,
        // the element doesn't exist anymore. Hence this needs to happen every second before the closeTimeOut.
        const ctr = document.getElementsByClassName("counter");
        if (!!acsMain && !!ctr) {
          ctrVal = Number(ctr[0].innerHTML);
          ctr[0].innerHTML = ctrVal - 1;

          if (Number(ctrVal) === 1) {
            addClass(acsMain, "__acs--complete");
          }
        }
      }, 1000);
    }

    // Push the invite to the next stage.
    this.inviteStage += 1;
  }

  /**
   * Accept the invite and possible proceed to the next stage, depending on
   * the configuration
   * @private
   */
  _handleAcceptCurrentStage() {
    const acsMain =
      document.getElementById("acsFullScreenContainer") ||
      document.getElementById("fsrFullScreenContainer");
    switch (this.display.inviteType) {
      case "TRACKER":
        this.accepted.fire(this.display.inviteType);
        this.completed.fire(true);
        break;
      case "INSESSION":
        this.accepted.fire(this.display.inviteType);
        this.completed.fire(true);
        break;
      case "SMS":
      case "EMAIL":
      case "SMSEMAIL":
        if (this.inviteStage === 0) {
          this._switchToMobileOnExitStageInvite();

          // dialog and ff set inside _trapKeyBoardMobile
          this._trapKeyBoardMobile(acsMain);
        } else if (this.inviteStage === 1) {
          this._validateMobileInput(userval => {
            this.accepted.fire(this.display.inviteType, userval);
            if (acsMain) {
              // Show thank you page for the fullscreen type.
              this._switchToThankYouPage();

              // dialog and ff set inside _trapKeyBoardMobile
              this._trapKeyBoardMobile(acsMain);
            }
          });
        }
        break;
      case "SHORTSURVEY":
        break;
      default:
        throw new Error(`Unknown inviteType: ${this.display.inviteType}`);
    }
  }

  /**
   * Remove all the UI from the page
   * @private
   */
  _removeEls() {
    // Clear intervals and timeouts.
    clearTimeout(this.closeTimeOut);
    clearInterval(this.counterInterval);

    removeClass(document.body, "acsFullScreen");
    removeClass(document.documentElement, "acsFullScreen");

    while (this._inviteEls.length > 0) {
      const el = this._inviteEls.pop();
      el.parentNode.removeChild(el);
    }

    this.restoreUserFocus();
    this.restoreUserScroll();

    Unbind("invite:*");
  }

  /**
   * Returns focus to first focus element whenever focus goes outside of dialog
   * @param {Object} dialog - modal element
   * @param {Object} ff - first focus element
   */
  _trapKeyBoard(dialog, ff) {
    // Trap keyboard inside the invite
    Bind(
      document.body,
      "invite:focus",
      e => {
        e = e || window.event;
        const target = e.target || e.srcElement;
        if (!DOMContains(dialog, target)) {
          e.stopPropagation();
          ff.focus();
        }
      },
      false
    );
  }

  /**
   * Traps user tabs to our mobile invite depending on the stage of the invite
   * @private
   */
  _trapKeyBoardMobile(acsMain, dialog, ff) {
    let containConditional;
    let trapKeyboard;

    if (this.inviteStage === 0) {
      // Trap keyboard inside the invite
      containConditional = target => {
        trapKeyboard = acsMain.getAttribute("data-trapkeyboard");

        // if attribute is false we don't trap inside the keyboard
        if ((!trapKeyboard || trapKeyboard == "false") && !this.display.trapFocus) {
          return false;
        }
        return !DOMContains(dialog, target) || !acsMain;
      };
    } else if (this.inviteStage === 1) {
      // Unbind invite:focus from inviteStage 0
      Unbind(document.body, "invite:focus");

      dialog =
        document.getElementById("acsFullScreenContainer") ||
        document.getElementById("fsrFullScreenContainer");
      ff = document.getElementById("acsContactClose") || document.getElementById("fsrContactClose");

      containConditional = target => !DOMContains(dialog, target) || !acsMain;
    } else if (this.inviteStage === 2) {
      // thank you page, unbind from stage 1
      Unbind(document.body, "invite:focus");

      ff = document.getElementById("acsOnExitThankYou");
      containConditional = target => !DOMContains(ff, target) || !acsMain;
    }

    Bind(
      document.body,
      "invite:focus",
      e => {
        const target = e.target || e.srcElement;

        if (containConditional(target)) {
          if (ff) {
            e.stopPropagation();
            ff.focus();
          }
        }
      },
      false
    );
  }

  /**
   * Show the invitation
   */
  present() {
    /* pragma:DEBUG_START */
    console.log("invite: presenting");
    /* pragma:DEBUG_END */

    if (!this.lastActiveEl) {
      this.lastActiveEl = document.activeElement;
      this.lastScroll = getScroll(window);
    }

    if (this.isCustom) {
      // Advance to the second stage
      this.inviteStage = 1;

      // Handle a custom invite
      Singletons.customInvitationRequested.fire(
        this.display.inviteType,
        userval => {
          // accept
          this.accepted.fire(this.display.inviteType, userval);
          this.completed.fire(true);
        },
        () => {
          // decline
          this.declined.fire();
        },
        () => {
          // abandon
          this.abandoned.fire();
        }
      );
      // At this point we have presented the invite it is okay to set the lock to false;
      Singletons._triggerResetLock = false;
      return;
    }

    // Normalize the inviteType
    this.display.inviteType = this.display.inviteType.toUpperCase();

    // Merge the options with a larger object
    const displayopts = ext(
      {
        supportsSVG: this.brwsr.supportsSVG,
      },
      this.display,
      this.cfg.config
    );

    if (displayopts.inviteLogo && displayopts.inviteLogo.length) {
      // No "$" on purpose here because it needs to be drawn from the customers FCP bucket
      displayopts.inviteLogo = makeAssetURI(`trigger/${displayopts.inviteLogo}`);
    }
    if (displayopts.inviteBanner && displayopts.inviteBanner.length) {
      // No "$" on purpose here because it needs to be drawn from the customers FCP bucket
      displayopts.inviteBanner = makeAssetURI(`trigger/${displayopts.inviteBanner}`);
    }
    if (displayopts.trackerLogo && displayopts.trackerLogo.length) {
      // No "$" on purpose here because it needs to be drawn from the customers FCP bucket
      displayopts.trackerLogo = makeAssetURI(`trigger/${displayopts.trackerLogo}`);
    }
    if (displayopts.vendorLogo && displayopts.vendorLogo.length) {
      displayopts.vendorLogo = makeURI(`$${displayopts.vendorLogo}`);
    }
    if (displayopts.vendorLogoPNG && displayopts.vendorLogoPNG.length) {
      displayopts.vendorLogoPNG = makeURI(`$${displayopts.vendorLogoPNG}`);
    }
    if (displayopts.trusteLogo && displayopts.trusteLogo.length) {
      displayopts.trusteLogo = makeURI(`$${displayopts.trusteLogo}`);
    }
    // defaults this object to avoid to have validation conditionals in the template itself
    displayopts.style = ext({ invite: {}, tracker: {}, presetStyles: "" }, displayopts.style);
    if (displayopts.style.invite.backgroundImage) {
      displayopts.style.invite.backgroundImage = makeURI(
        `$${displayopts.style.invite.backgroundImage}`
      );
    }
    if (displayopts.style.tracker.backgroundImage) {
      displayopts.style.tracker.backgroundImage = makeURI(
        `$${displayopts.style.tracker.backgroundImage}`
      );
    }

    /* pragma:DEBUG_START */
    console.warn("invite: about to integrate data into the template", displayopts);
    /* pragma:DEBUG_END */

    const restemplate = Templater(this.invitetemplate, displayopts);
    const el = document.createElement("div");

    el.innerHTML = restemplate;
    for (let i = 0; i < el.childNodes.length; i++) {
      this._inviteEls.push(el.childNodes[i]);
      document.body.appendChild(el.childNodes[i]);
    }

    // Focus to something
    const input = document.getElementById("acsEmailSMSInput");
    const dialog = document.getElementById("acsMainInvite") || document.getElementById("fsrInvite");
    const acsMain =
      document.getElementById("acsFullScreenContainer") ||
      document.getElementById("fsrFullScreenContainer");
    const ff = document.getElementById("acsFocusFirst") || document.getElementById("fsrFocusFirst");

    const getPlaceHolder = ele => {
      let ph;
      if (ele) {
        if (hasClass(ele, "acsClassicInvite--placeholder")) {
          return ele;
        }
        const siblings = ele.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
          if (hasClass(siblings[i], "acsClassicInvite--placeholder")) {
            ph = siblings[i];
            break;
          }
        }
        if (!ph) {
          // Still falsy, search the children of the input container;
          const chldrn = ele.childNodes;
          for (let j = 0; j < chldrn.length; j++) {
            if (hasClass(chldrn[j], "acsClassicInvite--placeholder")) {
              ph = chldrn[j];
              break;
            }
          }
        }
      }
      return ph;
    };

    ff.focus();

    if (this.brwsr.isMobile) {
      // At this point called in stage 0
      this._trapKeyBoardMobile(acsMain, dialog, ff);
    } else {
      this._trapKeyBoard(dialog, ff);
    }

    // Bind to buttons ************

    // Do the decline buttons
    const declines = document.querySelectorAll(".acsDeclineButton, .fsrDeclineButton");
    const declineHandler = evt => {
      preventDefault(evt);
      this.declined.fire("INVITE_DECLINED_BTN");
    };

    for (let s = 0; s < declines.length; s++) {
      Bind(declines[s], "invite:click", declineHandler);
    }

    // Do the accepts buttons & placeholder clicks
    const accepts = document.querySelectorAll(".acsAcceptButton, .fsrAcceptButton");
    const submitBtn = document.getElementsByClassName("acsSubmitBtn");

    // There's only one fullscreen container
    const fsContainers = document.getElementsByClassName("acsClassicInvite--fullscreen__container");

    // There's only one disclaimer, unless hideForeSeeLogoMobile config was set to true
    const disclaimers = document.getElementsByClassName("acsClassicInner--description");

    // There will be two policy links, one is hidden on SMS and one hidden on Email
    const policyLinks = document.getElementsByClassName("acsClassingInner--policyLink");

    const focusHandler = evt => {
      const tgt = evt.target || evt.srcElement;
      if (acsMain) {
        addClass(fsContainers[0], "acsClassicInvite--fullscreen__input-clicked");
        const placeholder = getPlaceHolder(tgt);
        if (placeholder) {
          addClass(placeholder, "acsClassicInvite--placeholder__clicked");
        }
        addClass(acsMain, "__acs__input-clicked");
      }
    };

    const acceptHandler = evt => {
      preventDefault(evt);
      const tgt = evt.target || evt.srcElement;
      if (hasClass(tgt, "acsEmailInput") || hasClass(tgt.parentNode, "acsEmailInput")) {
        const placeholder = document.getElementsByClassName("acsClassicInvite--placeholder")[0];
        if (placeholder) {
          placeholder.innerHTML = this.display.dialog.emailPlaceholder || "";
        }
        input.type = "email";
        if (hasClass(input, "acsClassicInvite__input--spaced")) {
          removeClass(input, "acsClassicInvite__input--spaced");
        }
        if (hasClass(input, "acsSMSValue")) {
          removeClass(input, "acsSMSValue");
          addClass(input, "acsEmailValue");
        }
        document.getElementById("acsInvalidInput").innerHTML =
          this.display.dialog.emailInvalidation || "";
        if (this.display.dialog.emailDisclaimer) {
          disclaimers[0].innerHTML = this.display.dialog.emailDisclaimer;
        } else if (disclaimers[0]) {
          addClass(disclaimers[0], "acsNoDisplay");
        }

        // The policy link on the SMS screen is now different than the
        // link on the Email screen. So this swaps the links for the
        // email screen.
        addClass(policyLinks[0], "acsNoDisplay");
        removeClass(policyLinks[1], "acsNoDisplay");
      }
      if (!hasClass(tgt, "acsClassicInner--btn__grey")) {
        this._handleAcceptCurrentStage();
      }
    };

    const toggleBtnHandler = evt => {
      const tgt = evt.target || evt.srcElement;
      const val = tgt.value.replace(/\s/g, "");
      const kC = getKeyCode(evt);
      if (val.length > 0 && kC !== "escape") {
        if (hasClass(submitBtn[0], "acsClassicInner--btn__grey")) {
          removeClass(submitBtn[0], "acsClassicInner--btn__grey");
        }
      }
      if (val.length > 0 && kC === "enter") {
        // click on the submit button
        acceptHandler({ target: submitBtn });
      }
    };

    for (let d = 0; d < accepts.length; d++) {
      Bind(accepts[d], "invite:click", acceptHandler);
    }

    if (acsMain) {
      Bind(input, "invite:focus", focusHandler);
      Bind(input, "invite:keydown", toggleBtnHandler);
    }

    // Do ESC-to-close
    this.__kpEscape = e => {
      if (getKeyCode(e) == "escape") {
        preventDefault(e);
        this.declined.fire("INVITE_DECLINED_ESC");
      }
    };
    Bind(document.body, "invite:keydown", this.__kpEscape);

    // Do the abandon buttons
    const abandonHandler = evt => {
      let targ = evt.target || evt.srcElement;
      let isAnchor = false;
      while (targ) {
        if (
          targ.tagName &&
          targ.tagName == "A" &&
          (hasClass(targ, "acsAllowDefault") || hasClass(targ, "fsrAllowDefault"))
        ) {
          isAnchor = true;
          break;
        }
        targ = targ.parentNode;
      }
      if (!isAnchor) {
        preventDefault(evt);
      }
      const tg2 = evt.target || evt.srcElement;
      if (
        (hasClass(tg2, "acsAbandonButton") || hasClass(tg2, "fsrAbandonButton")) &&
        (tg2.getAttribute("data-isbackdrop") != "true" || displayopts.closeClickOnBackdrop)
      ) {
        this.abandoned.fire();
      }
    };

    const abandons = document.querySelectorAll(".acsAbandonButton, .fsrAbandonButton");
    for (let r = 0; r < abandons.length; r++) {
      Bind(abandons[r], "invite:click", abandonHandler);
    }

    // At this point we have presented the invite it is okay to set the lock to false;
    Singletons._triggerResetLock = false;
  }

  /**
   * Dispose of the invite
   */
  dispose() {
    if (!this.disposed) {
      this.disposed = true;
      this._removeEls();
    }
  }

  /**
   * Return original user focus
   */
  restoreUserFocus() {
    if (this.lastActiveEl !== null) {
      this.lastActiveEl.focus();
    } else {
      document.body.focus();
    }
  }

  /**
   * Restore the user's scroll position
   */
  restoreUserScroll() {
    if (this.lastScroll) {
      window.scroll(this.lastScroll.x, this.lastScroll.y);
    }
  }
}

export default Invite;
