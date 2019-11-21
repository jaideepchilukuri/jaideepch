module.exports = {
  /**
   * The name of the definition
   */
  name: "custom_surveydefname",

  /**
   * The site (optional)
   */
  site: "custom_surveydefsite",

  /**
   * Unique identifier must be a string unique beyond all survey definitions
   * Recommended GUID standard: https://duckduckgo.com/?q=uuid
   */
  uid: "custom_surveydefuid",

  /**
   * The section (optional)
   */
  section: "custom_surveydefsection",

  /**
   * The locale of this definition
   */
  language: {
    locale: "custom_surveydeflocale",
    src: "variable",
    name: "custom_surveydeflocalename",
    locales: [
      {
        match: "custom_surveydeflocalematch",
        locale: "custom_surveydeflocalelocale",
      },
    ],
  },

  /**
   * Are we recording users for this surveydef?
   */
  cxRecord: true,

  /**
   * MouseOff configs -- trigger an invite when the user mouses off at top of of window
   */
  mouseoff: {
    /**
     * (Required) options:
     * off
     * multitab - The invite is possible when there are multiple tabs open
     * lasttab - The invite is possible when there is only tab of the site open
     * (lasttab is not supported in IE or Edge. multitab will be used instead)
     */
    mode: "multitab",

    // (Optional to omit one of these), if both are undefined, no mouseout invite will occur
    // A mouseout invite is possible when minSiteTime or minPageTime (in milliseconds) has passed (whichever comes first)
    minSiteTime: 1,
    minPageTime: 1,

    // (Optional to omit) these will override what is in criteria if set
    sp: {
      reg: 99,
      outreplaypool: 99,
    },
    lf: 99,
  },

  /**
   * The criteria that needs to be met
   */
  criteria: {
    /**
     * The sampling percentage. Random dice throw between 0 and 100 that occurs on each page AFTER someone
     * has met the loyalty factor.
     * reg : regular sampling percentage (0-100)
     * outreplaypool: (optional) when the user is out of the replay pool (0-100)
     */
    sp: {
      reg: 99,
      outreplaypool: 99,
    },

    /**
     * The loyalty factor. This is the minimum number of pages a user must visit before we start rolling
     * the dice (the SP or sampling percentage).
     */
    lf: 99,

    /**
     * Will this measure work on mobile phones?
     */
    supportsSmartPhones: true,

    /**
     * Will it work on tablets?
     */
    supportsTablets: true,

    /**
     * Will this measure work on desktop?
     */
    supportsDesktop: true,
  },

  /**
   * These items whitelist triggering on a page.
   * If ANY of these criteria are met, we proceed unless we have been excluded.
   */
  include: {
    urls: ["*custom_includeurl*", "*custom_includeurl2*"],
    referrers: ["*custom_includereferrers*", "*custom_includereferrers2*"],
    userAgents: ["custom_includeuseragent"],
    browsers: [
      {
        name: "AOL Shield Browser", // you can just have the browser name, or include the comparison stuff below
        comparison: "lt", // lt = less than, gt == greater than, eq == equals
        version: 3,
      },
    ],
    cookies: [
      {
        name: "custom_includecookiename",
        value: "custom_includecookievalue", // omit 'value' altogether if you just want to check if a cookie exists or not
      },
    ],
    variables: [
      {
        name: "custom_includevariablename",
        value: "custom_includevariablevalue", // omit 'value' altogether if you want to check if the var exists or not
      },
    ],
    cpps: [{ name: "custom_includecppname", value: "custom_includecppvalue" }],
  },

  /**
   * If any of these are matched, we will not show the invite on this page
   */
  inviteExclude: {
    urls: ["*custom_defexcludeurl*", "*custom_defexcludeurl2*"],
    referrers: ["*custom_defexcludereferrers*", "*custom_defexcludereferrers2*"],
    userAgents: ["custom_defexcludeuseragent"],
    browsers: [{ name: "AOL Shield Browser", comparison: "lt", version: 3 }],
    cookies: [{ name: "custom_defexcludecookiename", value: "custom_defexcludecookievalue" }],
    variables: [{ name: "custom_defexcludevariablename", value: "custom_defexcludevariablevalue" }],
    cpps: [{ name: "custom_defexcludecppname", value: "custom_defexcludecppvalue" }],
  },

  /**
   * What CPP to set the 'pattern' value to, which gets passed on to the survey. Can be any CPP.
   * Possible options: url (the last URL visited)
   * pv (the page view count)
   */
  pattern: "custom_pattern",

  /**
   * The technique used to choose a particular surveydef. Options:
   * 'default': The criteria are evaluated on every page. The selected surveydef can change at any time.
   * 'pin': Once a user has been invited, we stick with that surveydef unless a higher priority one is selected.
   * 'lock': Once a user has been invited, we stick with that surveydef and do not change it.
   */
  selectMode: "lock",

  /**
   * Bind on-page elements to actions. See http://bit.ly/1NKPZy6 for details. Overview:
   *
   * cancel: Closes the tracker if open
   * survey: Pops survey or qualifier. This can be done after the tracker window is launched as well.
   * tracker: Launches the tracker window right away. The delay feature is no longer supported due to
   *          changes in browser security making this impossible.
   *
   * NOTE: Unlike 18.x code, you specify a CSS selector instead of a tag type. You can achieve the same effect
   * with more flexibility. Also, you need not include attribute or patterns.
   *
   * preventDefault specifies whether to allow the default behavior of the button or suppress it.
   * This is optional (default is false).
   *
   * patterns are not case sensitive.
   */
  links: {
    cancel: [
      {
        selector: "custom_cancelselector",
        attribute: "custom_cancelattribute",
        patterns: ["custom_cancelpattern"],
        preventDefault: false,
      },
    ],
    survey: [
      {
        selector: "custom_surveyselector",
        attribute: "custom_surveyattribute",
        patterns: ["custom_surveypattern"],
        preventDefault: false,
      },
    ],
    tracker: [
      {
        selector: "custom_trackerselector",
        attribute: "custom_trackerattribute",
        patterns: ["custom_trackerpattern"],
        preventDefault: false,
      },
    ],
  },

  /**
   * These are our display values. This is how you set up A/B tests or define what happens on mobile vs desktop.
   * NOTE: you don't need to respecify all the properties in each display definition. They are copied over
   * from the one before it automatically if you don't specify anything. As long as the first definition
   * in each of desktop[] and mobile[] have all the properties, you can be terse in subsequent ones, only
   * specifying things that have changed.
   */
  display: {
    /**
     * Define what tests to run on desktop
     */
    desktop_legacy_disabled: [
      {
        /**
         * The name of this configuration. Used for tracking A/B tests. Should correspond to a robocop test.
         */
        displayname: "custom_desktoplegacydisplayname",

        /**
         * The name of the template to use.
         * Examples: classicdesktop, mobile
         * To load a custom template from the /custom/ folder, prefix your template name with an @ symbol. Eg: "@mytemplate"
         * Don't use 'admintools' because it's for the fsoptout and fstest screens.
         */
        template: "custom_desktoplegacytemplate",

        /**
         * If there is a customer logo for the invite, define it here, and add it to the assets folder.
         * Otherwise comment out this line
         */
        inviteLogo: "custom_desktoplegacyinvitelogo.png",

        /**
         * If there is a customer logo for the tracker, define it here, and add it to the assets folder.
         * Otherwise comment out this line
         */
        trackerLogo: "custom_desktoplegacytrackerlogo.png",

        /**
         * The title of the site logo (usually the customer name)
         */
        siteLogoTitleText: "custom_desktoplegacysiteLogoTitleText",

        /**
         * The alt-text of the site logo (usually the customer name)
         */
        siteLogoAltText: "custom_desktoplegacysiteLogoAltText",

        /**
         * The name of the vendor
         */
        vendorTitleText: "custom_desktoplegacyvendorTitleText",

        /**
         * The alt-text for the vendor logo
         */
        vendorAltText: "custom_desktoplegacyvendorAltText",

        /**
         * Hide ForeSee Logo for Desktop
         */
        hideForeSeeLogoDesktop: true,

        /**
         * The invitation type.
         * Valid options:
         * TRACKER - Use a tracker window. Note - if you select this option, we WILL be setting third party cookies (DOM storage, actually)
         * INSESSION - Pop the survey right away
         * SHORTSURVEY - Display a short/contextual survey in a pop-up iframe (see shortSurvey settings for more info)
         */
        inviteType: "INSESSION",

        /**
         * Number of milliseconds to delay display of this invite. This
         * overrides the value in the trigger product config if present.
         */
        inviteDelay: 1,

        /**
         * Does clicking on the backdrop cause the invite to close?
         */
        closeClickOnBackdrop: false,

        /**
         * Option to remove survey alerts. Default: false
         */
        removeSurveyAlerts: true,

        /**
         * Options for Short Survey inviteType -- only used if inviteType === "SHORTSURVEY"
         */
        shortSurvey: {
          // Maximum number of page views for this survey to show up despite no
          // interaction.
          // falsey is off
          idleViewsBeforeStop: 99,

          // Number of milliseconds after a survey that is not interacted with
          // will close. As long as this time isn't reached, the counter
          // restarts from 0 on every page load.
          // falsey is off
          idleTimeBeforeAbandon: 1,

          // Force a mid to be used instead of a cid/sid. This should only be used for testing.
          midOverride: "FSRTESTINGCODEMID12345==",

          // "default" or falsey, "split", "single", "random" to get one of the other 3
          paginationType: "random",

          // If this is less than 100, show the short survey only that percent of the time,
          // pinning the decision in storage until the storage expires in repeat days.
          // If the short survey is not selected, it acts as if inviteType === "TRACKER".
          // If this is missing, null or zero, that is the same as 100.
          // GOTCHA: for pinning the decision to work, every display must have a unique name!
          abTestPercent: 99,

          style: {
            zIndex: 1,
            // The position is expected to be a string like
            // "bottomright", "topleft". Only corner positions.
            position: "topleft",
          },
        },

        /**
         * Dialog values
         */
        dialog: {
          headline: "custom_desktoplegacyheadline",
          blurb: "custom_desktoplegacyblurb",
          noticeAboutSurvey: "custom_desktoplegacynoticeAboutSurvey",
          attribution: "custom_desktoplegacyattribution",
          closeInviteButtonText: "custom_desktoplegacycloseInviteButtonText",
          declineButton: "custom_desktoplegacydeclineButton",
          acceptButton: "custom_desktoplegacyacceptButton",
          acceptButtonTitleText: "custom_desktoplegacyacceptButtonTitleText",
          error: "custom_desktoplegacyerror",
          warnLaunch: "custom_desktoplegacywarnLaunch",
          allowclose: false,
          surveyavailable: "custom_desktoplegacysurveyavailable",

          trackerTitle: "custom_desktoplegacytrackerTitle",
          trackerClickToView: "custom_desktoplegacytrackerClickToView",
          trackerPlsLeaveOpen: "custom_desktoplegacytrackerPlsLeaveOpen",
          trackerAtEnd: "custom_desktoplegacytrackerAtEnd",
          trackerDesc1: "custom_desktoplegacytrackerDesc1",
          trackerDesc2: "custom_desktoplegacytrackerDesc2",
          trackerDesc3: "custom_desktoplegacytrackerDesc3",
          trackerCorp: "custom_desktoplegacytrackerCorp",
          trackerPrivacy: "custom_desktoplegacytrackerPrivacy",
          cssInviteExtraClasses: "fsrbottomright",

          locales: {
            "fr-ca": {
              headline: "Je n'est c'est pas!",
            },
          },

          // Look and feel of the UI of the invite..
          backdropbg: "rgba(0, 0, 0, 0.7)",
          font: "Lato",
          borderbgcolor: "rgba(0, 0, 0, 0.5)",
          bgcolor: "#ffffff",
          txtcolor: "#000000",
          btntxtcolor: "#000000",
          btnbordercolor: "#ffffff",
          // Left button background color.
          btnbgcolor: "white",
          btnboxshadow: "rgba(0, 0, 0, 0.5)",
          // Right button background color.
          rightbtnbgcolor: "#ffffff",
          leftbtnhoverbg: "#ededed",
          rightbtnhoverbg: "#e8f1e5",

          // Close Button attributes
          closebtncolor: "#595959",
          closebtnbordercolor: "#595959",
          closebtnhoverbgcolor: "#cccccc",
        },
      },
    ],
    desktop: [
      {
        displayname: "custom_desktopdisplayname",
        template: "custom_desktoptemplate",
        // invite images
        inviteLogo: "custom_desktopinvitelogo.png", // 200px x 200px
        inviteBanner: "custom_desktopinvitebanner.png", // 450px x 125px
        // tracker images
        trackerLogo: "custom_desktoptrackerlogo.png", // 200px x 200px
        trackerBanner: "custom_desktoptrackerbanner.png", // 230px x 495px
        // alt text
        siteLogoTitleText: "custom_desktopsiteLogoTitleText",
        siteLogoAltText: "custom_desktopsiteLogoAltText",
        // modal behavior
        inviteType: "INSESSION",
        inviteDelay: 1,
        closeClickOnBackdrop: false,
        removeSurveyAlerts: true,

        /**
         * Options for Short Survey inviteType -- only used if inviteType === "SHORTSURVEY"
         */
        shortSurvey: {
          // Maximum number of page views for this survey to show up despite no
          // interaction.
          // falsey is off
          idleViewsBeforeStop: 99,

          // Number of milliseconds after a survey that is not interacted with
          // will close. As long as this time isn't reached, the counter
          // restarts from 0 on every page load.
          // falsey is off
          idleTimeBeforeAbandon: 1,

          // "default" or falsey, "split", "single", "random" to get one of the other 3
          paginationType: "random",

          // Force a mid to be used instead of a cid/sid. This should only be used for testing.
          midOverride: "FSRTESTINGCODEMID12345==",

          // If this is less than 100, show the short survey only that percent of the time,
          // pinning the decision in storage until the storage expires in repeat days.
          // If the short survey is not selected, it acts as if inviteType === "TRACKER".
          // If this is missing or null, that is the same as 100.
          abTestPercent: 99,

          style: {
            zIndex: 1,
            // The position is expected to be a string like
            // "bottomright", "topleft". Only corner positions.
            position: "topleft",
          },
        },

        dialog: {
          headline: "custom_desktopheadline",
          blurb: "custom_desktopblurb",
          closeInviteButtonText: "custom_desktopcloseInviteButtonText",
          declineButton: "custom_desktopdeclineButton",
          acceptButton: "custom_desktopacceptButton",
          acceptButtonTitleText: "custom_desktopacceptButtonTitleText",
          error: "custom_desktoperror",
          warnLaunch: "custom_desktopwarnLaunch",
          allowclose: false,
          surveyavailable: "custom_desktopsurveyavailable",

          poweredbyLink: "http://www.custom_desktoppoweredbyLink.com",
          poweredbyText: "custom_desktoppoweredbyText",
          privacyPolicyText: "custom_desktopprivacyPolicyText",
          privacyPolicyLink: "http://www.custom_mobileprivacyPolicyLink.com",
          trackerTitle: "custom_desktoptrackerTitle",
          trackerClickToView: "custom_desktoptrackerClickToView",
          trackerPlsLeaveOpen: "custom_desktoptrackerPlsLeaveOpen",
          trackerDesc1: "custom_desktoptrackerDesc1",
          trackerDesc2: "custom_desktoptrackerDesc2",
        },
        style: {
          // theme
          fonts: [],
          backgroundColor: "#000000",
          brandColor: "#000000",
          invite: {
            // invite container
            backgroundImage: "custom_desktopbackgroundImage.png",
            height: "99",
            width: "99",
            borderRadius: "99",
            // banner
            bannerBackgroundColor: "#000000",
            bannerHeight: "99",
            // logo
            logoMargin: "99",
            logoBackgroundColor: "#000000",
            logoHide: true,
            // header
            headerFontFamily: "custom_desktopheaderFontFamily",
            headerFontSize: "custom_desktopheaderFontSize",
            headerLineHeight: "99",
            headerFontWeight: "99",
            headerTextDecor: "custom_desktopheaderTextDecor",
            // body
            bodyFontFamily: "custom_desktopbodyFontFamily",
            bodyFontSize: "99",
            bodyLineHeight: "99",
            bodyTextDecor: "custom_desktopbodyTextDecor",
            // button global
            buttonFontFamily: "custom_desktopbuttonFontFamily",
            buttonBorder: "99",
            buttonBorderRadius: "99",
            // accept button
            acceptTextColor: "#000000",
            acceptFontSize: "99",
            // decline button
            declineTextColor: "#000000",
            declineFontSize: "99",
            // close button
            xColor: "#000000",
            xBorderRadius: "99",
          },

          tracker: {
            // logo
            margin: "99",
            leftBackgroundColor: "#000000",
            logoHide: true,
            // header
            headerFontFamily: "custom_desktopheaderFontFamily",
            headerFontSize: "99",
            headerLineHeight: "99",
            headerFontWeight: "99",
            headerTextDecor: "custom_desktopheaderTextDecor",
            // body
            bodyFontFamily: "custom_desktopbodyFontFamily",
            bodyFontSize: "99",
            bodyLineHeight: "99",
            // start button
            buttonFontFamily: "custom_desktopbuttonFontFamily",
            startBorder: "99",
            startBorderRadius: "99",
            startTextColor: "#000000",
            startFontSize: "99",
          },

          /*
           * presetStyles and customStyleBlock apply to invite and tracker:
           *
           * 'fsrNoLogo' removes logo and logo container
           * 'fsrNoLogoBg' removes logo container and centers logo with banner
           * 'fsrLogoShadow' adds box shadow to logo container
           *
           * 'fsrTopLeft', 'fsrTopRight', 'fsrBottomRight', and 'fsrBottomLeft' position invite accordingly
           */
          presetStyles: "fsrBottomRight",
          customStyleBlock: "custom_desktopcustomStyleBlock",
        },
      },
    ],

    /**
     * The invite config and template(s) to use for mobile devices. If you define
     * more than one (like desktop), it amounts to an a/b test. Define as many as you want.
     */
    mobile: [
      {
        /**
         * The name of this configuration. Used for tracking A/B tests.
         */
        displayname: "custom_mobiledisplayname",

        /**
         * The name of the template to use.
         * Examples: mobile
         * To load a custom template from the /custom/ folder, prefix your template name with an @ symbol. Eg: "@mymobiletemplate"
         * Don't use 'admintools' because it's for the fsoptout and fstest screens.
         */
        template: "custom_mobiletemplate",

        /**
         * If there is a customer logo for the invite, define it here, and add it to the assets folder.
         * Otherwise comment out this line
         */
        inviteLogo: "custom_mobileinvitelogo.png",

        /**
         * If there is a customer logo for the tracker, define it here, and add it to the assets folder.
         * Otherwise comment out this line
         */
        trackerLogo: "custom_mobiletrackerlogo.png",

        /**
         * The title text for company/logo img. Accessibility
         */
        siteLogoTitleText: "custom_mobilesiteLogoTitleText",

        /**
         * The alt text for company/logo img. Accessibility
         */
        siteLogoAltText: "custom_mobilesiteLogoAltText",

        /**
         * The vendor logo
         */
        vendorLogo: "custom_mobilevendorLogo.svg",
        vendorLogoPNG: "custom_mobilevendorLogoPNG.png",

        /**
         * The title text for the ForeSee logo
         */
        vendorTitleText: "custom_mobilevendorTitleText",

        /**
         * The alt text for the ForeSee logo
         */
        vendorAltText: "custom_mobilevendorAltText",

        /**
         * Hide ForeSee Logo
         */
        hideForeSeeLogoMobile: true,

        /**
         * The invitation type.
         * Valid options:
         * INSESSION - Pop the survey right away
         * SMS - Use a phone number (SMS) system
         * EMAIL - Use an email system
         * SMSEMAIL - Use either SMS or email
         */
        inviteType: "EMAIL",

        /**
         * Number of milliseconds to delay display of this invite. This
         * overrides the value in the trigger product config if present.
         */
        inviteDelay: 1,

        /**
         * Keep the keyboard focus inside the mobile invite at all times, even
         * on the first page. This will prevent the user from being able to focus on
         * other parts of the page even though they are visible, so only set this
         * true if the client really wants it.
         *
         * Note: the contact page and thank you page already act as if this setting is
         * true. This setting only affects the first page with the SMS/Email buttons.
         */
        trapFocus: true,

        /**
         * Dialog values
         */
        dialog: {
          // Initial screen configs..
          ariaCloseInvite: "custom_mobileariaCloseInvite", // just spoken
          headline: "custom_mobileheadline",
          subheadline: "custom_mobilesubheadline",
          declineButton: "custom_mobiledeclineButton",
          acceptButton: "custom_mobileacceptButton",
          emailButton: "custom_mobileemailButton",
          textButton: "custom_mobiletextButton",
          poweredbyDisclaimer: "custom_mobilepoweredbyDisclaimer",
          poweredbyLink: "http://www.custom_mobilepoweredbyLink.com",
          poweredbyText: "custom_mobilepoweredbyText",

          // Second Screen configs...
          ariaContactLabel: "custom_mobileariaContactLabel", // just spoken
          emailPlaceholder: "custom_mobileemailPlaceholder",
          textPlaceholder: "custom_mobiletextPlaceholder",
          submitButton: "custom_mobilesubmitButton",
          textDisclaimer: "custom_mobiletextDisclaimer",
          emailDisclaimer: "custom_mobileemailDisclaimer",
          termsAndConditionsText: "custom_mobiletermsAndConditionsText",
          termsAndConditionsLink: "https://www.custom_mobiletermsAndConditionsLink.com",
          privacyPolicyText: "custom_mobileprivacyPolicyText",
          privacyPolicyLink: "http://www.custom_mobileprivacyPolicyLink.com",
          emailInvalidation: "custom_mobileemailInvalidation",
          textInvalidation: "custom_mobiletextInvalidation",

          // Thank you page configs...
          onexitheadline: "custom_mobileonexitheadline",
          onexitsubheadline: "custom_mobileonexitsubheadline",
          onexitcountertag: "custom_mobileonexitcountertag",
          // Number in seconds to wait.
          onexitcounterval: "99",
          // Looks and feel of the UI..
          // "main" is the main dark template and "light" is the light template.
          theme: "light",
          locales: {
            fr: {
              headline: "custom_mobileheadlineINFRENCH",
              localeImages: {
                inviteLogo: "custom_mobileinvitelogoINFRENCH.png",
                siteLogoAltText: "custom_mobilesiteLogoAltTextINFRENCH",
                siteLogoTitleText: "custom_mobilesiteLogoTitleTextINFRENCH",
              },
            },
          },
        },
        style: {
          font: "custom_mobilefont",
          backgroundColor: "#000000",
          shadowColor: "#000000",
          privacyBackgroundColor: "#000000",
          fullScreenBackgroundColor: "#000000",
          invite: {
            // Logo
            logoSwitch: true,
            // Text
            textColor: "#000000",
            // Text Me button
            smsButtonTextColor: "#000000",
            smsButtonBackgroundColor: "#000000",
            // Email Me button
            emailButtonTextColor: "#000000",
            emailButtonBackgroundColor: "#000000",
            // Close Button
            xColor: "#000000",
            xBackgroundColor: "#000000",
            xBorderRadius: "99",
            // Global Button style
            buttonBorderRadius: "99",
            buttonShadowColor: "#000000",
            // Disabled Submit button
            buttonDisabledTextColor: "#000000",
            buttonDisabledBackgroundColor: "#000000",
            // Alert
            invalidColor: "#000000",
          },
          presetStyles: "fsrBottomRight",
          customStyleBlock: "custom_mobilecustomStyleBlock",
        },
      },
    ],
  },
  /**
   * Specifies whether or not to use a qualifier survey.
   *
   * Note: Qualifier renders in legacy format only.
   * Modern looking qualifier can be built within survey
   * application
   */
  qualifier: {
    /**
     * Do we actually use a qualifier here?
     */
    useQualifier: true,

    /**
     * If so, here is the survey
     */
    survey: {
      topSection: "custom_qualifiertopSection",
      noThanksTopSection: "custom_qualifiernoThanksTopSection",
      noThanksBottomSection: "custom_qualifiernoThanksBottomSection",
      validationFailedMsg: "custom_qualifiervalidationFailedMsg",
      continueLabel: "custom_qualifiercontinueLabel",
      noLabel: "custom_qualifiernoLabel",
      closeLabel: "custom_qualifiercloseLabel",
      questions: [
        {
          text: "custom_qualifierquestionstext",
          /**
           * The type of question. Valid options are: "RADIO" (no more at the moment).
           */
          questionType: "RADIO",
          choices: [
            {
              text: "custom_qualifierquestionschoicestext",
              qualifies: true,
            },
            {
              text: "custom_qualifierquestionschoicestext1",
              qualifies: "custom_qualifierquestionschoicesqualifies1",
              cpps: [
                { custom_qualifierquestionschoicescpp: "custom_qualifierquestionschoicescppvalue" },
              ],
            },
          ],
        },
      ],
      // Add different locales:
      locales: {
        fr: {
          topSection: "custom_qualifiertopSectionINFRENCH",
          noThanksTopSection: "custom_qualifiernoThanksTopSectionINFRENCH",
          noThanksBottomSection: "custom_qualifiernoThanksBottomSectionINFRENCH",
          validationFailedMsg: "custom_qualifiervalidationFailedMsgINFRENCH",
          continueLabel: "custom_qualifiercontinueLabelINFRENCH",
          noLabel: "custom_qualifiernoLabelINFRENCH",
          closeLabel: "custom_qualifiercloseLabelINFRENCH",
          questions: [
            {
              text: "custom_qualifierquestionstextINFRENCH",
              /**
               * The type of question. Valid options are: "RADIO" (no more at the moment).
               */
              questionType: "RADIO",
              choices: [
                {
                  text: "custom_qualifierquestionschoicestextINFRENCH",
                  qualifies: true,
                },
                {
                  text: "custom_qualifierquestionschoicestext1INFRENCH",
                  qualifies: "custom_qualifierquestionschoicesqualifies1INFRENCH",
                  cpps: [
                    {
                      custom_qualifierquestionschoicescpp:
                        "custom_qualifierquestionschoicescppvalueINFRENCH",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  },
  reminder: {
    useReminder: true,
    display: {
      headerSection: "custom_reminderheaderSection",
      bodySection: "custom_reminderbodySection",
      buttonText: "custom_reminderbuttonText",

      // different language option
      locales: {
        fr: {
          headerSection: "custom_reminderheaderSectionINFRENCH",
          bodySection: "custom_reminderbodySectionINFRENCH",
          buttonText: "custom_reminderbuttonTextINFRENCH",
        },
      },
    },
  },
};
