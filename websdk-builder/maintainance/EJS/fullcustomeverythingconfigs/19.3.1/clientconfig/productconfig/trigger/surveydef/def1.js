({
  /**
   * The name of the definition
   */
  name: "custom_surveydefname",

  /**
   * The site (optional)
   */
  site: "custom_surveydefsite",

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
        locale: "custom_surveydeflocalelocale"
      }
    ]
  },

  /**
   * Are we recording users for this surveydef?
   */
  cxRecord: true,

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
      outreplaypool: 99
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
    supportsDesktop: true
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
        version: 3
      }
    ],
    cookies: [
      {
        name: "custom_includecookiename",
        value: "custom_includecookievalue" // omit 'value' altogether if you just want to check if a cookie exists or not
      }
    ],
    variables: [
      {
        name: "custom_includevariablename",
        value: "custom_includevariablevalue" // omit 'value' altogether if you want to check if the var exists or not
      }
    ]
  },

  /**
   * If any of these are matched, we will not show the invite on this page
   */
  inviteExclude: {
    urls: ["*custom_defexcludeurl*", "*custom_defexcludeurl2*"],
    referrers: [
      "*custom_defexcludereferrers*",
      "*custom_defexcludereferrers2*"
    ],
    userAgents: ["custom_defexcludeuseragent"],
    browsers: [
      {
        name: "AOL Shield Browser", // you can just have the browser name, or include the comparison stuff below
        comparison: "lt", // lt = less than, gt == greater than, eq == equals
        version: 3
      }
    ],
    cookies: [
      {
        name: "custom_defexcludecookiename",
        value: "custom_defexcludecookievalue" // omit 'value' altogether if you just want to check if a cookie exists or not
      }
    ],
    variables: [
      {
        name: "custom_defexcludevariablename",
        value: "custom_defexcludevariablevalue" // omit 'value' altogether if you want to check if the var exists or not
      }
    ]
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
        preventDefault: false
      }
    ],
    survey: [
      {
        selector: "custom_surveyselector",
        attribute: "custom_surveyattribute",
        patterns: ["custom_surveypattern"],
        preventDefault: false
      }
    ],
    tracker: [
      {
        selector: "custom_trackerselector",
        attribute: "custom_trackerattribute",
        patterns: ["custom_trackerpattern"],
        preventDefault: false
      }
    ]
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
    desktop: [
      {
        /**
         * The name of this configuration. Used for tracking A/B tests. Should correspond to a robocop test.
         */
        displayname: "custom_desktoplegacydisplayname",

        /**
         * The name of the template to use.
         * Examples: classicdesktop, mobile
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
         * The Alt text for the trust seal
         */
        trusteLogoAltText: "custom_desktoplegacytrusteLogoAltText",

        /**
         * The invitation type.
         * Valid options:
         * TRACKER - Use a tracker window. Note - if you select this option, we WILL be setting third party cookies (DOM storage, actually)
         * INSESSION - Pop the survey right away
         * SMS - Use a phone number (SMS) system
         * EMAIL - Use an email system
         * SMSEMAIL - Use either SMS or email
         */
        inviteType: "INSESSION",

        /**
         * Does clicking on the backdrop cause the invite to close?
         */
        closeClickOnBackdrop: false,

        /**
         * Option to remove survey alerts. Default: false
         */
        removeSurveyAlerts: true,

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

          onexitheadline: "custom_desktoplegacyonexitheadline",
          onexitblurb: "custom_desktoplegacyonexitblurb",
          onexitattribution: "custom_desktoplegacyonexitattribution",
          onexitdeclineButton: "custom_desktoplegacyonexitdeclineButton",
          onexitacceptButton: "custom_desktoplegacyonexitacceptButton",
          onexiterror: "custom_desktoplegacyonexiterror",
          onexitallowclose: false,
          // e for email only, s for sms only, b for both
          onexitsupport: "e",
          onexitinputMessage: "custom_desktoplegacyonexitinputMessage",
          onexitinputMessageJustMobile:
            "custom_desktoplegacyonexitinputMessageJustMobile",
          onexitinputMessageJustEmail:
            "custom_desktoplegacyonexitinputMessageJustEmail",
          onexitemailMeButtonText:
            "custom_desktoplegacyonexitemailMeButtonText",
          onexittextMeButtonText: "custom_desktoplegacyonexittextMeButtonText",
          onexitinvalidemailtext: "custom_desktoplegacyonexitinvalidemailtext",
          onexitinvalidsmstext: "custom_desktoplegacyonexitinvalidsmstext",
          onexitinvalidFormatErrorText:
            "custom_desktoplegacyonexitinvalidFormatErrorText",
          cssInviteExtraClasses: "fsrbottomright",

          locales: {
            fr: {
              headline: "custom_desktoplegacyheadlineINFRENCH"
            }
          },

          // Look and feel of the UI of the invite..
          backdropbg: "rgba(0, 0, 0, 0.7)",
          font: "Lato",
          borderbgcolor: "rgba(0, 0, 0, 0.5)",
          bgcolor: "#ffffff",
          txtcolor: "#000000",
          btntxtcolor: "#000000",
          btnbordercolor: "#ffffff",
          btnbgcolor: "white",
          btnboxshadow: "rgba(0, 0, 0, 0.5)",
          rightbtnbgcolor: "#ffffff",
          leftbtnhoverbg: "#ededed",
          rightbtnhoverbg: "#e8f1e5",

          // Close Button attributes
          closebtncolor: "#595959",
          closebtnbordercolor: "#595959",
          closebtnhoverbgcolor: "#cccccc"
        }
      }
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
         * The name of the template to use
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
         * The Alt text for the trust seal
         */
        trusteLogoAltText: "custom_mobiletrusteLogoAltText",

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
         * Dialog values
         */
        dialog: {
          // Initial screen configs..
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
          emailPlaceholder: "custom_mobileemailPlaceholder",
          textPlaceholder: "custom_mobiletextPlaceholder",
          submitButton: "custom_mobilesubmitButton",
          textDisclaimer: "custom_mobiletextDisclaimer",
          emailDisclaimer: "custom_mobileemailDisclaimer",
          privacyPolicyLink: "http://www.custom_mobileprivacyPolicyLink.com",
          privacyPolicyText: "custom_mobileprivacyPolicyText",
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
          // Any google font..
          font: "Anton",
          // These override the values from the "main" or "light" templates. Omit them by commenting them out if not necessary.
          invitebg: "#FFA94F",
          // Shadows in the invite will be of this color
          shadowcolor: "#FF8F35",
          // First screen privacy section background.
          bannerprivacybg: "rgb(249,99,2)",
          // Text color on the invite.
          textcolor: "blue",
          // Text color on the buttons on the invite
          buttontextcolor: "rgb(249,99,2)",
          // Button background.
          buttonbg: "rgb(249,99,2)",
          // Disabled button background on the second screen.
          buttondisabledbg: "#FFDB81",
          // Button shadow color.
          buttonshadowcolor: "orange",
          // This is where rgba value is required, omitting this will fallback to invitebg.
          fullscreenbg: "rgba(255, 169, 79, 0.95)",
          // Closebutton text color for the banner
          closebuttontextcolor: "#ffffff",
          // Closebutton background color for the banner
          closebuttonbg: "rgb(249,99,2)",
          // Closebutton background color for fullscreen
          closebuttonfullscreenbg: "transparent",
          // Invalid text color.
          invalidtextcolor: "rgb(249,99,2)"
        }
      }
    ]
  },

  /**
   * Specifies whether or not to use a qualifier survey.
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
              qualifies: true
            },
            {
              text: "custom_qualifierquestionschoicestext1",
              qualifies: "custom_qualifierquestionschoicesqualifies1",
              cpps: [
                {
                  custom_qualifierquestionschoicescpp:
                    "custom_qualifierquestionschoicescppvalue"
                }
              ]
            }
          ]
        }
      ]
    }
  },
  reminder: {
    useReminder: true,
    display: {
      // TODO put better default text
      headerSection: "custom_reminderheaderSection",
      bodySection: "custom_reminderbodySection",
      buttonText: "custom_reminderbuttonText"
    }
  }
});
