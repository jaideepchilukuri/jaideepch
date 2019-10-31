/**
 * The invite class
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("inv.Invite");

fs.require("inv.Top");
fs.require("inv.Misc.Template");

(function () {

  // This is populated later
  var Singletons;

  /**
   * An invitation class
   * @param config - Full config object
   * @param def - The current survey def
   * @param brwsr - The Browser Object
   * @param displayoverride - The display override to use (optional)
   * @param cpps - The CPPS
   * @constructor
   */
  var Invite = function (config, def, brwsr, displayoverride, cpps, sngltons) {
    this.cfg = config;
    this.def = fs.ext({}, def);
    this.displayoverride = displayoverride;
    this.brwsr = brwsr;
    this._inviteEls = [];
    this.locale = cpps.get('locale') || 'en';
    this.lastActiveEl = null;
    this.lastScroll = null;
    Singletons = sngltons;
    this.isCustom = (Singletons.customInvitationRequested.subscriptions.length > 0);

    // currentDisplayType tells us if the display is desktop or mobile
    var currentDef = {};
    var oldinvite = {};
    var currentDisplayType;
    var displayLocale;
    var display;
    var i;

    /* pragma:DEBUG_START */
    console.warn("invite: invite constructor started with", config);
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
    this.declined = new utils.FSEvent();

    // Bind to our own declined event so we remember to remove the elements
    this.declined.subscribe(function () {
      this._removeEls();
    }.bind(this));

    /**
     * Fires when the user abandons the invite (by clicking on the X or similar)
     * @type {utils.FSEvent}
     */
    this.abandoned = new utils.FSEvent();

    // Bind to our own abandoned event so we remember to remove the elements
    this.abandoned.subscribe(function () {
      this._removeEls();
    }.bind(this));

    /**
     * The invite was accepted. This may pass info about what to do next.
     * @type {utils.FSEvent}
     */
    this.accepted = new utils.FSEvent();

    /**
     * The process was complete.
     * @type {utils.FSEvent}
     */
    this.completed = new utils.FSEvent();

    // The process is complete here at this point, remove the elements.
    this.completed.subscribe(function (removeEls) {
      if (!!removeEls) {
        this._removeEls();
      }
    }.bind(this));

    /**
     * Keeps track of any elements we added
     * @type {Array}
     * @private
     */

    if (this.brwsr.isMobile && this.def.display.mobile) {
      currentDef = {};
      oldinvite = {};
      currentDisplayType = this.def.display.mobile;
    } else {
      currentDisplayType = this.def.display.desktop;
    }

    // Normalize the invite defs
    if (currentDisplayType) {
      for (i = 0; i < currentDisplayType.length; i++) {
        oldinvite = currentDef.dialog || {};
        currentDef = fs.ext({}, currentDef);
        currentDef = fs.ext(currentDef, currentDisplayType[i]);
        if (currentDisplayType[i].dialog && currentDef.dialog) {
          currentDef.dialog = fs.ext(fs.ext({}, oldinvite), currentDisplayType[i].dialog);
        }

        currentDisplayType[i] = currentDef;
      }
    }

    // Figure out which thing we're going to display
    if (this.displayoverride) {
      for (i = 0; i < currentDisplayType.length; i++) {
        if (currentDisplayType[i].displayname == this.displayoverride) {
          display = currentDisplayType[i];
          break;
        }

      }
    } else {
      display = currentDisplayType[Math.round(Math.random() * 999999999999) % currentDisplayType.length];
    }

    // Now apply the locales
    if (display.dialog.locales && display.dialog.locales[this.locale]) {
      displayLocale = display.dialog.locales[this.locale];

      /* pragma:DEBUG_START */
      console.warn("invite: applying locale to invite definition: ", displayLocale);
      /* pragma:DEBUG_END */

      display.dialog = fs.ext(display.dialog, displayLocale);

      if (displayLocale.localeImages) {
        display = fs.ext(display, displayLocale.localeImages);
      }

    }

    // Make sure there are some minimums
    display = fs.ext({
      inviteLogo: '',
      trackerLogo: '',
      siteLogoAlt: ''
    }, display);

    this.display = display;
    this.template = display.template;
  };


  /**
   * Retrieve the template and stylesheet
   * @param readyEvent (Object) the event that gets fired when invite assets are ready
   */
  Invite.prototype.loadResources = function (readyEvent) {
    var display = this.display;
    if (this.isCustom) {
      /* pragma:DEBUG_START */
      console.log("invite: assuming custom invitation");
      /* pragma:DEBUG_END */
      // Fire the ready event immediately
      readyEvent.fire();
    } else {
      var templatename = display.template,
        csslocation = fs.makeURI('$templates/trigger/' + templatename + '/' + (!!display.dialog.theme ? display.dialog.theme : 'main') + '.css'),
        templatelocation = fs.makeURI('$templates/trigger/' + templatename + '/invite.html'),
        gotcss = false,
        gottemplate = false,
        check = function () {
          if (gotcss && gottemplate && readyEvent) {
            readyEvent.fire();
          }
        };

      // Is this a custom template?
      if (templatename.indexOf('@') === 0) {
        templatename = templatename.substr(1);
        csslocation = fs.makeAssetURI('trigger/templates/' + templatename + '/' + (!!display.dialog.theme ? display.dialog.theme : 'main') + '.css');
        templatelocation = fs.makeAssetURI('trigger/templates/' + templatename + '/invite.html');
      }

      /* pragma:DEBUG_START */
      console.log("invite: loading resources");
      /* pragma:DEBUG_END */

      // Grab the CSS
      utils.loadCSS(csslocation, function (linkel) {
        /* pragma:DEBUG_START */
        console.log("invite: got the css");
        /* pragma:DEBUG_END */
        gotcss = true;
        check();
      }.bind(this), null, this.brwsr);

      // Grab the template
      var jp = new utils.JSONP({
        success: function (result) {
          /* pragma:DEBUG_START */
          console.log("invite: got the template " + templatelocation);
          /* pragma:DEBUG_END */
          gottemplate = true;
          this.invitetemplate = result;
          check();
        }.bind(this)
      });
      jp.get(templatelocation, 'templates_trigger_' + templatename + '_');
    }
  };

  /**
   * Validate what the user inputted in the mobile input
   * @param successcallback (Function) What to call when it is successful
   * @private
   */
  Invite.prototype._validateMobileInput = function (successcallback) {
    var val = document.getElementById('acsEmailSMSInput').value,
      validateEmail = function (email) {
        var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(email);
      }, getUKPhone = function (p) {
        var numberWithoutJunk = p.replace(/[ -.\(\)]+/g, "");
        // uk numbers start with +44, 44, 0044 or 0
        // then following is 9 or 10 digits that don't start with 0
        var ukPhoneNum = /^(\+44|44|0044|0)([1-9]\d{8,9})$/;
        var match = numberWithoutJunk.match(ukPhoneNum);
        if (match) {
          var numberWithoutCountryCode = match[2];
          return "+44" + numberWithoutCountryCode;
        }
        return null;
      }, isPhone = function (p) {
        p = p.split(" ").join("");
        var phoneNum = /^(\+1|1)?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})$/;
        var phoneMatch = p.match(phoneNum) && p.length <= 15;

        return phoneMatch || !!getUKPhone(p);
      }, handleInvalid = function () {
        utils.removeClass(document.getElementById('acsInvalidInput'), 'acsNoDisplay');
        document.getElementById('acsEmailSMSInput').focus();
      }, handleValid = function () {
        utils.addClass(document.getElementById('acsInvalidInput'), 'acsNoDisplay');
        setTimeout(function () {
          successcallback(getUKPhone(val) || val);
        }, 250);
      };
    successcallback = successcallback || function () {
    };
    switch (this.display.inviteType) {
      case 'SMS':
        if (isPhone(val)) {
          handleValid();
        } else {
          handleInvalid();
        }
        break;
      case 'EMAIL':
        if (validateEmail(val)) {
          handleValid();
        } else {
          handleInvalid();
        }
        break;
      case 'SMSEMAIL':
        if (fs.toLowerCase(this.template) !== "mobile") {
          if (validateEmail(val) || isPhone(val)) {
            handleValid();
          } else {
            handleInvalid();
          }
        } else {
          if (utils.hasClass(document.getElementById('acsEmailSMSInput'), "acsSMSValue")) {
            if (isPhone(val)) {
              handleValid();
            } else {
              handleInvalid();
            }
          } else {
            if (validateEmail(val)) {
              handleValid();
            } else {
              handleInvalid();
            }
          }
        }
        break;
    }
  };

  /**
   * Switch to the second invite for mobile on exit cases
   * @private
   */
  Invite.prototype._switchToMobileOnExitStageInvite = function () {
    var doc = document,
      stage1Invite = doc.querySelector('#acsMainInvite'),
      stage2Invite = doc.querySelector('#acsOnExitMobileInvite'),
      acsMain = doc.querySelector('#acsFullScreenContainer');

    if (!!acsMain) {
      utils.addClass(doc.body, 'acsFullScreen');
      utils.addClass(doc.documentElement, 'acsFullScreen');
      // rmq: setting acsFullScreen (overflow: hidden; height: 100 %;) to documentElement and body
      // fixes the scroll position to 0
      utils.addClass(acsMain, 'acsFullScreen');
      utils.addClass(stage2Invite, 'acsClassicInvite--fullscreen');
    }

    utils.addClass(stage1Invite, 'acsNoDisplay');
    utils.removeClass(stage2Invite, 'acsNoDisplay');
    if (!acsMain) {
      doc.querySelector('#acsEmailSMSInput').focus();
    }

    // Set the invite stage to 1 (would have been 0)
    this.inviteStage += 1;
  };

  /**
   * Show the thank you page
   * @private
   */
  Invite.prototype._switchToThankYouPage = function () {
    var doc = document,
      stg2Inv = doc.getElementById('acsOnExitMobileInvite'),
      tyDialog = doc.getElementById('acsOnExitThankYou'),
      acsMain = doc.getElementById('acsFullScreenContainer'),
      declineBtns = doc.getElementsByClassName('acsDeclineButton'),
      ctrVal,
      tmout = Number(this.display.dialog.onexitcounterval) * 1000 || 8000,
      closeHandler = function (evt) {
        utils.preventDefault(evt);
        this.completed.fire(true);
      }.bind(this);

    // Be nice and thank the user.
    if (!!acsMain) {
      // They're not decline buttons anymore..
      // Change their event handler to just close and not fire a declined event.
      for (var i = 0; i < declineBtns.length; i++) {
        // The order of unbinding, binding another event and removing the class is important because utils.Unbind uses ===.
        utils.Unbind(declineBtns[i], "invite:click");
        utils.Bind(declineBtns[i], "invite:click", closeHandler);
        utils.removeClass(declineBtns[i], 'acsDeclineButton');
      }
      utils.removeClass(acsMain, '__acs__input-clicked');
      utils.addClass(stg2Inv, 'acsNoDisplay');
      utils.removeClass(tyDialog, 'acsNoDisplay');
      this.closeTimeOut = setTimeout(function () {
        // Survey submitted..
        this.completed.fire(true);
      }.bind(this), tmout + 1000);
      this.counterInterval = setInterval(function () {
        // This is intentionally inside the timeout here, if the user declines the survey before the closeTimeOut,
        // the element doesn't exist anymore. Hence this needs to happen every second before the closeTimeOut.
        var ctr = document.getElementsByClassName('counter');
        if (!!acsMain && !!ctr) {
          ctrVal = Number(ctr[0].innerHTML);
          ctr[0].innerHTML = ctrVal - 1;

          if (Number(ctrVal) === 1) {
            utils.addClass(acsMain, "__acs--complete");
          }
        }
      }.bind(this), 1000);
    }

    // Push the invite to the next stage.
    this.inviteStage += 1;
  };

  /**
   * Accept the invite and possible proceed to the next stage, depending on
   * the configuration
   * @private
   */
  Invite.prototype._handleAcceptCurrentStage = function () {
    var acsMain = document.getElementById("acsFullScreenContainer");
    switch (this.display.inviteType) {
      case 'TRACKER':
        this.accepted.fire(this.display.inviteType);
        this.completed.fire(true);
        break;
      case 'INSESSION':
        this.accepted.fire(this.display.inviteType);
        this.completed.fire(true);
        break;
      case 'SMS':
      case 'EMAIL':
      case 'SMSEMAIL':
        if (this.inviteStage === 0) {
          this._switchToMobileOnExitStageInvite();
          this._trapKeyBoardMobile(acsMain);
        } else if (this.inviteStage === 1) {
          this._validateMobileInput(function (userval) {
            this.accepted.fire(this.display.inviteType, userval);
            if (!!acsMain) {
              // Show thank you page for the fullscreen type.
              this._switchToThankYouPage();
            }
          }.bind(this));
        }
        break;
    }
  };

  /**
   * Remove all the UI from the page
   * @private
   */
  Invite.prototype._removeEls = function () {
    // Clear intervals and timeouts.
    clearTimeout(this.closeTimeOut);
    clearInterval(this.counterInterval);

    utils.removeClass(document.body, 'acsFullScreen');
    utils.removeClass(document.documentElement, 'acsFullScreen');

    while (this._inviteEls.length > 0) {
      var el = this._inviteEls.pop();
      el.parentNode.removeChild(el);
    }

    utils.Unbind("invite:*");
  };

  /**
   * Returns focus to first focus element whenever focus goes outside of dialog
   * @param {Object} dialog - modal element
   * @param {Object} ff - first focus element
   */
  Invite.prototype._trapKeyBoard = function (dialog, ff) {
    // Trap keyboard inside the invite
    utils.Bind(document.body, 'invite:focus', function (e) {
      e = e || window.event;
      var target = e.target || e.srcElement;
      if (!dialog.contains(target)) {
        e.stopPropagation();
        ff.focus();
      }
    }, false);

  };

  /**
   * Traps user tabs to our mobile invite depending on the stage of the invite
   * @private
   */
  Invite.prototype._trapKeyBoardMobile = function (acsMain, dialog, ff) {
    var containConditional,
      exitBtn,
      trapKeyboard;

    if (this.inviteStage === 0) {
      // Trap keyboard inside the invite
      exitBtn = document.getElementById("acsinviteCloseButton");

      containConditional = function (target) {
        trapKeyboard = acsMain.getAttribute("data-trapkeyboard");

        // if attribute is false we don't trap inside the keyboard
        if (!trapKeyboard || trapKeyboard == "false") {
          return false;
        }
        return ((!dialog.contains(target) && !exitBtn.contains(target)) || !acsMain);
      };
    } else if (this.inviteStage === 1) {
      // Unbind invite:focus from inviteStage 0
      utils.Unbind(document.body, 'invite:focus');

      dialog = document.getElementById("acsFullScreenContainer") || document.getElementById('fsrFullScreenContainer');
      ff = document.getElementById("acsFirstFocus") || document.getElementById('fsrFirstFocus');

      containConditional = function (target) {
        return (!dialog.contains(target) || !acsMain);
      };
    }

    utils.Bind(document.body, 'invite:focus', function (e) {
      var target;
      e = e || window.event;
      target = e.target || e.srcElement;

      if (containConditional(target)) {
        if (ff) {
          e.stopPropagation();
          ff.focus();
        }
      }
    }, false);
  };

  /**
   * Show the invitation
   */
  Invite.prototype.present = function () {
    /* pragma:DEBUG_START */
    console.log("invite: presenting");
    /* pragma:DEBUG_END */

    if (!this.lastActiveEl) {
      this.lastActiveEl = document.activeElement;
      this.lastScroll = { x: window.scrollX, y: window.scrollY };
    }

    if (this.isCustom) {
      // Advance to the second stage
      this.inviteStage = 1;

      // Handle a custom invite
      Singletons.customInvitationRequested.fire(this.display.inviteType, function (userval) {
        // accept
        this.accepted.fire(this.display.inviteType, userval);
        this.completed.fire(true);
      }.bind(this), function () {
        // decline
        this.declined.fire();
      }.bind(this), function () {
        // abandon
        this.abandoned.fire();
      }.bind(this));

    } else {
      // Normalize the inviteType
      this.display.inviteType = this.display.inviteType.toUpperCase();

      // Merge the options with a larger object
      var displayopts = fs.ext({
        supportsSVG: this.brwsr.supportsSVG
      }, this.display, this.cfg.config);

      if (displayopts.inviteLogo && displayopts.inviteLogo.length) {
        // No "$" on purpose here because it needs to be drawn from the customers FCP bucket
        displayopts.inviteLogo = fs.makeAssetURI('trigger/' + displayopts.inviteLogo);
      }
      if (displayopts.inviteBanner && displayopts.inviteBanner.length) {
        // No "$" on purpose here because it needs to be drawn from the customers FCP bucket
        displayopts.inviteBanner = fs.makeAssetURI('trigger/' + displayopts.inviteBanner);
      }
      if (displayopts.trackerLogo && displayopts.trackerLogo.length) {
        // No "$" on purpose here because it needs to be drawn from the customers FCP bucket
        displayopts.trackerLogo = fs.makeAssetURI('trigger/' + displayopts.trackerLogo);
      }
      if (displayopts.vendorLogo && displayopts.vendorLogo.length) {
        displayopts.vendorLogo = fs.makeURI("$" + displayopts.vendorLogo);
      }
      if (displayopts.vendorLogoPNG && displayopts.vendorLogoPNG.length) {
        displayopts.vendorLogoPNG = fs.makeURI("$" + displayopts.vendorLogoPNG);
      }
      if (displayopts.trusteLogo && displayopts.trusteLogo.length) {
        displayopts.trusteLogo = fs.makeURI("$" + displayopts.trusteLogo);
      }

      /* pragma:DEBUG_START */
      console.warn("invite: about to integrate data into the template", displayopts);
      /* pragma:DEBUG_END */

      var restemplate = Templater(this.invitetemplate, displayopts),
        el = document.createElement('div');

      el.innerHTML = restemplate;
      for (var i = 0; i < el.childNodes.length; i++) {
        this._inviteEls.push(el.childNodes[i]);
        document.body.appendChild(el.childNodes[i]);
      }

      // Focus to something
      var input = document.getElementById("acsEmailSMSInput");
      var dialog = document.getElementById("acsMainInvite") || document.getElementById('fsrInvite');
      var acsMain = document.getElementById("acsFullScreenContainer") || document.getElementById('fsrFullScreenContainer');
      var ff = document.getElementById('acsFocusFirst') || document.getElementById('fsrFocusFirst');

      var getPlaceHolder = function (ele) {
        var ph;
        if (!!ele) {
          if (utils.hasClass(ele, "acsClassicInvite--placeholder")) {
            return ele;
          }
          var siblings = ele.parentNode.childNodes;
          for (var i = 0; i < siblings.length; i++) {
            if (utils.hasClass(siblings[i], "acsClassicInvite--placeholder")) {
              ph = siblings[i];
              break;
            }
          }
          if (!ph) {
            // Still falsy, search the children of the input container;
            var chldrn = ele.childNodes;
            for (var j = 0; j < chldrn.length; j++) {
              if (utils.hasClass(chldrn[j], "acsClassicInvite--placeholder")) {
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
      var declines = document.querySelectorAll(".acsDeclineButton, .fsrDeclineButton"),
        declineHandler = function (evt) {
          utils.preventDefault(evt);
          this.declined.fire("INVITE_DECLINED_BTN");
        }.bind(this);
      for (var s = 0; s < declines.length; s++) {
        utils.Bind(declines[s], "invite:click", declineHandler);
      }

      // Do the accepts buttons & placeholder clicks
      var accepts = document.querySelectorAll(".acsAcceptButton, .fsrAcceptButton"),
        submitBtn = document.getElementsByClassName('acsSubmitBtn'),
        // There's only one fullscreen container
        fsContainers = document.getElementsByClassName("acsClassicInvite--fullscreen__container"),
        // There's only one disclaimer, unless hideForeSeeLogoMobile config was set to true
        disclaimers = document.getElementsByClassName("acsClassicInner--description"),
        // There will be two policy links, one is hidden on SMS and one hidden on Email
        policyLinks = document.getElementsByClassName("acsClassingInner--policyLink"),
        focusHandler = function (evt) {
          var tgt = evt.target || evt.srcElement;
          if (!!acsMain) {
            utils.addClass(fsContainers[0], "acsClassicInvite--fullscreen__input-clicked");
            var placeholder = getPlaceHolder(tgt);
            if (!!placeholder) {
              utils.addClass(placeholder, 'acsClassicInvite--placeholder__clicked');
            }
            utils.addClass(acsMain, "__acs__input-clicked");
          }
        }.bind(this),
        toggleBtnHandler = function (evt) {
          var tgt = evt.target || evt.srcElement;
          var val = tgt.value.replace(/\s/g, '');
          var kC = evt.keyCode || evt.which;
          if (val.length > 0 && kC !== 27) {
            if (utils.hasClass(submitBtn[0], 'acsClassicInner--btn__grey')) {
              utils.removeClass(submitBtn[0], 'acsClassicInner--btn__grey');
            }
          }
        }.bind(this),
        acceptHandler = function (evt) {
          utils.preventDefault(evt);
          var tgt = evt.target || evt.srcElement;
          if (utils.hasClass(tgt, 'acsEmailInput') || utils.hasClass(tgt.parentNode, 'acsEmailInput')) {
            var placeholder = document.getElementsByClassName("acsClassicInvite--placeholder")[0];
            if (!!placeholder) {
              placeholder.innerHTML = this.display.dialog.emailPlaceholder || "";
            }
            input.type = "email";
            if (utils.hasClass(input, "acsClassicInvite__input--spaced")) {
              utils.removeClass(input, "acsClassicInvite__input--spaced");
            }
            if (utils.hasClass(input, "acsSMSValue")) {
              utils.removeClass(input, "acsSMSValue");
              utils.addClass(input, "acsEmailValue");
            }
            document.getElementById("acsInvalidInput").innerHTML = this.display.dialog.emailInvalidation || "";
            if (!!this.display.dialog.emailDisclaimer) {
              disclaimers[0].innerHTML = this.display.dialog.emailDisclaimer;
            } else if (disclaimers[0]) {
              utils.addClass(disclaimers[0], 'acsNoDisplay');
            }

            // The policy link on the SMS screen is now different than the
            // link on the Email screen. So this swaps the links for the
            // email screen.
            utils.addClass(policyLinks[0], 'acsNoDisplay');
            utils.removeClass(policyLinks[1], 'acsNoDisplay');
          }
          if (!utils.hasClass(tgt, 'acsClassicInner--btn__grey')) {
            this._handleAcceptCurrentStage();
          }
        }.bind(this);
      for (var d = 0; d < accepts.length; d++) {
        utils.Bind(accepts[d], "invite:click", acceptHandler);
      }

      if (!!acsMain) {
        utils.Bind(input, "invite:focus", focusHandler);
        utils.Bind(input, "invite:keydown", toggleBtnHandler);
      }

      // Do ESC-to-close
      this.__kpEscape = function (e) {
        if (e.keyCode == 27) {
          utils.preventDefault(e);
          this.declined.fire("INVITE_DECLINED_ESC");
        }
      }.bind(this);
      utils.Bind(document.body, "invite:keydown", this.__kpEscape);

      // Do the abandon buttons

      var abandonHandler = function (evt) {
        var targ = evt.target || evt.srcElement,
          isAnchor = false;
        while (targ) {
          if (targ.tagName && targ.tagName == 'A' && (utils.hasClass(targ, 'acsAllowDefault') || utils.hasClass(targ, 'fsrAllowDefault'))) {
            isAnchor = true;
            break;
          }
          targ = targ.parentNode;
        }
        if (!isAnchor) {
          utils.preventDefault(evt);
        }
        var tg2 = evt.target || evt.srcElement;
        if ((utils.hasClass(tg2, 'acsAbandonButton') || utils.hasClass(tg2, 'fsrAbandonButton')) &&
          (tg2.getAttribute("data-isbackdrop") != "true" || displayopts.closeClickOnBackdrop)) {
          this.abandoned.fire();
        }
      }.bind(this);

      var abandons = document.querySelectorAll(".acsAbandonButton, .fsrAbandonButton");
      for (var r = 0; r < abandons.length; r++) {
        utils.Bind(abandons[r], "invite:click", abandonHandler);
      }
    }
    // At this point we have presented the invite it is okay to set the lock to false;
    Singletons._triggerResetLock = false;

  };

  /**
   * Dispose of the invite
   */
  Invite.prototype.dispose = function () {
    if (!this.disposed) {
      this.disposed = true;
      this._removeEls();
      utils.Unbind("invite:*");
      this.restoreUserFocus();
      this.restoreUserScroll();
    }
  };

  /**
   * Return original user focus
   */
  Invite.prototype.restoreUserFocus = function () {
    if (this.lastActiveEl !== null) {
      this.lastActiveEl.focus();
    } else {
      document.body.focus();
    }
  };

  /**
   * Restore the user's scroll position
   */
  Invite.prototype.restoreUserScroll = function () {
    if (this.lastScroll) {
      window.scroll(this.lastScroll.x, this.lastScroll.y);
    }
  };

})();
