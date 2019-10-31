module.exports = {
  /**
   * The name of the definition
   */
  name: "",

  /**
   * The site (optional)
   */
  site: null, //'main',

  /**
   * Unique identifier must be a string unique beyond all survey definitions
   * Recommended GUID standard: https://duckduckgo.com/?q=uuid
   */
  uid: null, //"f7de999a-f0b7-4af5-b673-b46d61b004af",

  /**
   * The section (optional)
   */
  section: null, //'catalog',

  /**
   * The locale of this definition
   */
  language: {
    locale: "en",
    /*
     // src can be 'cookie:' or 'variable'
     ,src: "variable",
     name: "lcvar",
     locales: [{
     match: "en",
     locale: "en-ca"
     }, {
     match: "es",
     locale: "es-es"
     }]*/
  },

  /**
   * Are we recording users for this surveydef?
   */
  cxRecord: false,

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
    mode: "off",

    // (Optional to omit one of these), if both are undefined, no mouseout invite will occur
    // A mouseout invite is possible when minSiteTime or minPageTime (in milliseconds) has passed (whichever comes first)
    minSiteTime: 6 * 1000,
    minPageTime: 3 * 1000,

    // (Optional to omit) these will override what is in criteria if set
    sp: {
      reg: -1,
      outreplaypool: 0,
    },
    lf: 1,
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
      reg: -1,
      outreplaypool: 0,
    },

    /**
     * The loyalty factor. This is the minimum number of pages a user must visit before we start rolling
     * the dice (the SP or sampling percentage).
     */
    lf: 1,

    /**
     * Will this measure work on mobile phones?
     */
    supportsSmartPhones: false,

    /**
     * Will it work on tablets?
     */
    supportsTablets: false,

    /**
     * Will this measure work on desktop?
     */
    supportsDesktop: false,
  },

  /**
   * These items whitelist triggering on a page.
   * If ANY of these criteria are met, we proceed unless we have been excluded.
   */
  include: {
    urls: [],
    referrers: [],
    userAgents: [],
    browsers: [
      /*{
     name: 'chrome', // you can just have the browser name, or include the comparison stuff below
     comparison: 'lt', // lt = less than, gt == greater than, eq == equals
     version: 3
     }*/
    ],
    cookies: [
      /*{
     name: 'acs.t',
     value: 'true' // omit 'value' altogether if you just want to check if a cookie exists or not
     }*/
    ],
    variables: [
      /*{
     name: 'myvar',
     value: 'yes' // omit 'value' altogether if you want to check if the var exists or not
     }*/
    ],
  },

  /**
   * If any of these are matched, we will not show the invite on this page
   */
  inviteExclude: {
    urls: [],
    referrers: [],
    userAgents: [],
    browsers: [],
    cookies: [],
    variables: [],
  },

  /**
   * What CPP to set the 'pattern' value to, which gets passed on to the survey. Can be any CPP.
   * Possible options: url (the last URL visited)
   * pv (the page view count)
   */
  pattern: "url",

  /**
   * The technique used to choose a particular surveydef. Options:
   * 'default': The criteria are evaluated on every page. The selected surveydef can change at any time.
   * 'pin': Once a user has been invited, we stick with that surveydef unless a higher priority one is selected.
   * 'lock': Once a user has been invited, we stick with that surveydef and do not change it.
   */
  selectMode: "default",

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
      /*{
     selector: 'a',
     attribute: 'href',
     patterns: ['cancelit'],
     preventDefault: false
     }*/
    ],
    survey: [
      /*{ selector: ".fsrTracker" }*/
    ],
    tracker: [],
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
        displayname: "redesign",
        template: "desktopredesign",
        // invite images
        inviteLogo: "", // 200px x 200px
        inviteBanner: "", // 450px x 125px
        // tracker images
        trackerLogo: "", // 200px x 200px
        trackerBanner: "", // 230px x 495px
        // alt text
        siteLogoTitleText: "Logo Image",
        siteLogoAltText: "Logo Image",
        // modal behavior
        inviteType: "TRACKER",
        inviteDelay: null, //3000,
        closeClickOnBackdrop: true,
        removeSurveyAlerts: false,

        dialog: {
          headline: "We'd welcome your feedback!",
          blurb: "Would you take a brief survey so we can improve your experience on our site?",
          closeInviteButtonText: "Close dialog", // spoken by screen readers
          declineButton: "No thanks",
          acceptButton: "Yes, I'll give feedback",
          acceptButtonTitleText: "Yes, I'll give feedback (Opens in a new window)",
          error: "Error",
          warnLaunch: "this will launch a new window",
          allowclose: true,
          surveyavailable: "Your survey is now available",

          poweredbyLink: "http://www.foresee.com",
          poweredbyText: "Powered by ForeSee",
          privacyPolicyText: "Privacy Policy",
          privacyPolicyLink: "//www.foresee.com/privacy-policy/",
          trackerTitle: "ForeSee - Survey Window",
          trackerClickToView: "Begin Survey Now",
          trackerPlsLeaveOpen: "Please keep this window open!",
          trackerDesc1:
            "<strong>We'll ask you some questions after you finish your visit.</strong><br><br>The survey will appear in this window. You can minimize it for now or simply click on the window of our website.",
          trackerDesc2:
            "<strong>If your session is complete, please click below to begin the survey.</strong><br><br>The survey will appear in this window. You can minimize it for now or simply click on the window of our website.",
        },
        style: {
          // theme
          fonts: [],
          backgroundColor: "#FFFFFF",
          brandColor: "#000000",
          invite: {
            // invite container
            backgroundImage: "",
            height: "",
            width: "",
            borderRadius: "",
            // banner
            bannerBackgroundColor: "#000000",
            bannerHeight: "",
            // logo
            logoMargin: "",
            logoBackgroundColor: "",
            logoHide: false,
            // header
            headerFontFamily: "",
            headerFontSize: "",
            headerLineHeight: "",
            headerFontWeight: "",
            headerTextDecor: "",
            // body
            bodyFontFamily: "",
            bodyFontSize: "",
            bodyLineHeight: "",
            bodyTextDecor: "",
            // button global
            buttonFontFamily: "",
            buttonBorder: "",
            buttonBorderRadius: "",
            // accept button
            acceptTextColor: "",
            acceptFontSize: "",
            // decline button
            declineTextColor: "",
            declineFontSize: "",
            // close button
            xColor: "",
            xBorderRadius: "",
          },
          tracker: {
            // logo
            margin: "",
            leftBackgroundColor: "",
            logoHide: false,
            // header
            headerFontFamily: "",
            headerFontSize: "",
            headerLineHeight: "",
            headerFontWeight: "",
            headerTextDecor: "",
            // body
            bodyFontFamily: "",
            bodyFontSize: "",
            bodyLineHeight: "",
            // start button
            buttonFontFamily: "",
            startBorder: "",
            startBorderRadius: "",
            startTextColor: "",
            startFontSize: "",
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
          presetStyles: "",
          customStyleBlock: null, //'',
        },

        shortSurvey: {
          style: {
            zIndex: 99999999,
            // The position is expected to be a string like
            // "bottomright", "topleft". Only corner positions.
            position: "bottomright",
          },
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
        displayname: "default",

        /**
         * The name of the template to use.
         * Examples: mobile
         * To load a custom template from the /custom/ folder, prefix your template name with an @ symbol. Eg: "@mymobiletemplate"
         * Don't use 'admintools' because it's for the fsoptout and fstest screens.
         */
        template: "mobile",

        /**
         * If there is a customer logo for the invite, define it here, and add it to the assets folder.
         * Otherwise comment out this line
         */
        inviteLogo: "",

        /**
         * If there is a customer logo for the tracker, define it here, and add it to the assets folder.
         * Otherwise comment out this line
         */
        trackerLogo: "",

        /**
         * The title text for company/logo img. Accessibility
         */
        siteLogoTitleText: "",

        /**
         * The alt text for company/logo img. Accessibility
         */
        siteLogoAltText: "",

        /**
         * The vendor logo
         */
        vendorLogo: "fslogo.svg",
        vendorLogoPNG: "fslogo.png",

        /**
         * The title text for the ForeSee logo
         */
        vendorTitleText: "ForeSee",

        /**
         * The alt text for the ForeSee logo
         */
        vendorAltText: "ForeSee Logo",

        /**
         * Hide ForeSee Logo
         */
        hideForeSeeLogoMobile: false,

        /**
         * The invitation type.
         * Valid options:
         * INSESSION - Pop the survey right away
         * SMS - Use a phone number (SMS) system
         * EMAIL - Use an email system
         * SMSEMAIL - Use either SMS or email
         */
        inviteType: "SMSEMAIL",

        /**
         * Number of milliseconds to delay display of this invite. This
         * overrides the value in the trigger product config if present.
         */
        inviteDelay: null, //3000,

        /**
         * Keep the keyboard focus inside the mobile invite at all times, even
         * on the first page. This will prevent the user from being able to focus on
         * other parts of the page even though they are visible, so only set this
         * true if the client really wants it.
         *
         * Note: the contact page and thank you page already act as if this setting is
         * true. This setting only affects the first page with the SMS/Email buttons.
         */
        trapFocus: false,

        /**
         * Dialog values
         */
        dialog: {
          // Initial screen configs..
          ariaCloseInvite: "Close dialog", // just spoken
          headline: "We'd welcome your feedback!",
          subheadline:
            "Can we send you a brief survey so we can improve your experience on this website?",
          // IF inviteType is INSESSION, use the following subheadline:
          //subheadline: "Would you take a brief survey so we can improve your experience on this website?",
          declineButton: "No, thanks",
          acceptButton: "Yes, I'll help",
          emailButton: "Email me",
          textButton: "Text me",
          poweredbyDisclaimer: null, //"Powered by ",
          poweredbyLink: "http://www.foresee.com",
          poweredbyText: "Powered by ForeSee",

          // Second Screen configs...
          ariaContactLabel: "Please provide your contact information", // just spoken
          emailPlaceholder: "Your email...",
          textPlaceholder: "Your cellphone number...",
          submitButton: "Submit",
          textDisclaimer:
            "Providing your number means you are participating in a ForeSee survey. Message &amp; data rates may apply. 1 message per survey.",
          emailDisclaimer: "",
          termsAndConditionsText: "SMS Disclosure",
          termsAndConditionsLink: "https://www.foresee.com/sms-terms-and-conditions/",
          privacyPolicyText: "Privacy Policy",
          privacyPolicyLink: "https://www.foresee.com/privacy-policy/",
          emailInvalidation: "Error: Please enter a valid email",
          textInvalidation: "Error: Please enter a valid cellphone number",

          // Thank you page configs...
          onexitheadline: "Thank you!",
          onexitsubheadline: "We'll reach out to you after you finish on our site.",
          onexitcountertag: "Returning in ",
          // Number in seconds to wait.
          onexitcounterval: "7",
          // Looks and feel of the UI..
          // "main" is the main dark template and "light" is the light template.
          theme: "main",
          // locales: {
          //   "fr": {
          //     headline: "Je n'est c'est pas!",
          //     localeImages: {
          //       inviteLogo : "french food",
          //       siteLogoAltText: "french toast",
          //       siteLogoTitleText: "french fries"
          //     }
          //   }
          // },
        },
        style: {
          font: "",
          backgroundColor: "",
          shadowColor: "",
          privacyBackgroundColor: "",
          fullScreenBackgroundColor: "",
          invite: {
            // Logo
            logoSwitch: false,
            // Text
            textColor: "",
            // Text Me button
            smsButtonTextColor: "",
            smsButtonBackgroundColor: "",
            // Email Me button
            emailButtonTextColor: "",
            emailButtonBackgroundColor: "",
            // Close Button
            xColor: "",
            xBackgroundColor: "",
            xBorderRadius: "",
            // Global Button style
            buttonBorderRadius: "",
            buttonShadowColor: "",
            // Disabled Submit button
            buttonDisabledTextColor: "",
            buttonDisabledBackgroundColor: "",
            // Alert
            invalidColor: "",
          },
          presetStyles: "",
          customStyleBlock: null, //"",
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
    useQualifier: false,

    /**
     * If so, here is the survey
     */
    survey: {
      topSection: "Thank you for your willingness to participate in our survey.",
      noThanksTopSection:
        "You will not receive the survey.  Thank you for your willingness to help.",
      noThanksBottomSection: "You can close this window now.",
      validationFailedMsg: "Please answer all of the questions.",
      continueLabel: "Continue",
      noLabel: "No thanks",
      closeLabel: "Close the window",
      questions: [
        {
          text: "Please specify your age:",
          /**
           * The type of question. Valid options are: "RADIO" (no more at the moment).
           */
          questionType: "RADIO",
          choices: [
            {
              text: "Prefer not to say",
              qualifies: false,
            },
            {
              text: "8 or under",
              qualifies: "preteen",
              cpps: [{ Age: "8 or under" }],
            },
            {
              text: "9-13",
              qualifies: "preteen",
              cpps: [{ Age: "9-13" }],
            },
            {
              text: "14-17",
              qualifies: "teen",
              cpps: [{ Age: "14-17" }],
            },
            {
              text: "18-24",
              qualifies: "qual1",
              cpps: [{ Age: "18-24" }],
            },
            {
              text: "25-34",
              qualifies: "qual1",
              cpps: [{ Age: "25-34" }],
            },
            {
              text: "35-44",
              qualifies: "qual1",
              cpps: [{ Age: "35-44" }],
            },
            {
              text: "45-54",
              qualifies: "qual1",
              cpps: [{ Age: "45-54" }],
            },
            {
              text: "55-64",
              qualifies: "qual1",
              cpps: [{ Age: "55-64" }],
            },
            {
              text: "65+",
              qualifies: "qual1",
              cpps: [{ Age: "65+" }],
            },
          ],
        },
      ],
      // Add different locales:
      /*
       , locales: {
         "fr": {
         topSection: "Je ne sais pas!",
         noThanksTopSection: "Je ne sais pas! Je ne sais pas!.",
         noThanksBottomSection: "Je Je Je Je!.",
         validationFailedMsg: "Je Je Je Je! Je Je Je Je! Oui.",
         continueLabel: "Continuer",
         noLabel: "Non merci",
         closeLabel: "Je Je Je Je!",
           questions: [{
             text: "Please specify your age:",
             // The type of question. Valid options are: "RADIO" (no more at the moment).
             questionType: "RADIO",
             choices: [{
             text: "Prefer not to say",
             qualifies: false
             }, {
             text: "8 or under",
             qualifies: "preteen",
             cpps: [{"Age": "8 or under"}]
             }, {
             text: "65+",
             qualifies: "qual1",
             cpps: [{"Age": "65+"}]
             }]
            }]
         }
       } */
    },
  },
  reminder: {
    useReminder: false,
    display: {
      headerSection: "Your survey is ready now!",
      bodySection: "Thank you for your willingness to give your feedback",
      buttonText: "Begin Survey",

      // different language option
      // locales: {
      //    "fr": {
      //    headerSection: "Je ne sais pas!",
      //    bodySection: "Je n'ai pas!",
      //    buttonText: "Je Je Je Je!"
      //    }
      //  }
    },
  },
};
