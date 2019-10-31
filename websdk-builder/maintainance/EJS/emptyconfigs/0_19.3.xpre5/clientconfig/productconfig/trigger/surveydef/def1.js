({
  /**
   * The name of the definition
   */
  name: '',

  /**
   * The site (optional)
   */
  site: null,

  /**
   * The section (optional)
   */
  section: null,

  /**
   * The locale of this definition
   */
  language: {
    locale: 'en'
    /*
     // src can be 'cookie:' or 'variable'
     ,src: 'variable',
     name: 'lcvar',
     locales: [{
     match: 'en',
     locale: 'en-ca'
     }, {
     match: 'fr',
     locale: 'fr-ca'
     }]*/
  },

  /**
   * Are we recording users for this surveydef?
   */
  cxRecord: false,

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
      outreplaypool: 0
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
    supportsDesktop: false
  },

  /**
   * These items whitelist triggering on a page.
   * If ANY of these criteria are met, we proceed unless we have been excluded.
   */
  include: {
    urls: [],
    referrers: [],
    userAgents: [],
    browsers: [/*{
     name: 'chrome', // you can just have the browser name, or include the comparison stuff below
     comparison: 'lt', // lt = less than, gt == greater than, eq == equals
     version: 3
     }*/],
    cookies: [/*{
     name: 'acs.t',
     value: 'true' // omit 'value' altogether if you just want to check if a cookie exists or not
     }*/],
    variables: [/*{
     name: 'myvar',
     value: 'yes' // omit 'value' altogether if you want to check if the var exists or not
     }*/]
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
    variables: []
  },

  /**
   * What CPP to set the 'pattern' value to, which gets passed on to the survey. Can be any CPP.
   * Possible options: url (the last URL visited)
   * pv (the page view count)
   */
  pattern: 'url',

  /**
   * The technique used to choose a particular surveydef. Options:
   * 'default': The criteria are evaluated on every page. The selected surveydef can change at any time.
   * 'pin': Once a user has been invited, we stick with that surveydef unless a higher priority one is selected.
   * 'lock': Once a user has been invited, we stick with that surveydef and do not change it.
   */
  selectMode: 'default',

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
    cancel: [/*{
     selector: 'a',
     attribute: 'href',
     patterns: ['cancelit'],
     preventDefault: false
     }*/],
    survey: [],
    tracker: []
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
    desktop: [{
      /**
       * The name of this configuration. Used for tracking A/B tests. Should correspond to a robocop test.
       */
      displayname: 'default',

      /**
       * The name of the template to use.
       * Examples: classicdesktop, mobile, ribbondesktop, greylargedesktop, tuxedo
       * Don't use 'admintools' because it's for the fsoptout and fstest screens.
       */
      template: 'classicdesktop',

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
       * The title of the site logo (usually the customer name)
       */
      siteLogoTitleText: "",

      /**
       * The alt-text of the site logo (usually the customer name)
       */
      siteLogoAltText: "",

      /**
       * The name of the vendor
       */
      vendorTitleText: "ForeSee",

      /**
       * The alt-text for the vendor logo
       */
      vendorAltText: "ForeSee",

      /**
       * The Alt text for the trust seal
       */
      trusteLogoAltText: "Validate our Trust Certification",

      /**
       * The invitation type.
       * Valid options:
       * TRACKER - Use a tracker window. Note - if you select this option, we WILL be setting third party cookies (DOM storage, actually)
       * INSESSION - Pop the survey right away
       * SMS - Use a phone number (SMS) system
       * EMAIL - Use an email system
       * SMSEMAIL - Use either SMS or email
       */
      inviteType: 'TRACKER',

      /**
       * Does clicking on the backdrop cause the invite to close?
       */
      closeClickOnBackdrop: true,

      /**
       * Option to remove survey alerts. Default: false
       */
      removeSurveyAlerts: false,

      /**
       * Dialog values
       */
      dialog: {
        headline: "We'd welcome your feedback!",
        blurb: "Thank you for visiting our website. You have been selected to participate in a brief customer satisfaction survey to let us know how we can improve your experience.",
        noticeAboutSurvey: "The survey is designed to measure your entire experience, please look for it at the <u>conclusion</u> of your visit.",
        attribution: "This survey is conducted by an independent company ForeSee, on behalf of the site you are visiting.",
        closeInviteButtonText: "Click to close.",
        declineButton: "No, thanks",
        acceptButton: "Yes, I'll give feedback",
        acceptButtonTitleText: "Yes, I'll give feedback (Opens in a new window)",
        error: "Error",
        warnLaunch: "this will launch a new window",
        allowclose: true,
        surveyavailable: "Your survey is now available",

        trackerTitle: 'ForeSee - Survey Tracker Window',
        trackerClickToView: 'Click to view the survey.',
        trackerPlsLeaveOpen: 'Please leave this window open.',
        trackerAtEnd: 'At the end of your session, click here to begin the survey.',
        trackerDesc1: 'It is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site.',
        trackerDesc2: 'Please leave this window open until you have completed your time on this site. This window is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site.',
        trackerDesc3: 'Thank you for helping us improve your website experience. This survey is conducted by an independent company, ForeSee, on behalf of the site you visited.',
        trackerCorp: 'ForeSee. All rights reserved.',
        trackerPrivacy: 'Privacy',

        onexitheadline: "Thank you for helping!",
        onexitblurb: "Please provide your email address or mobile number (US and CA only). After your visit we'll send you a link to the survey. Text Messaging rates apply.",
        onexitattribution: "ForeSee's <a class='fsrPrivacy' href='//www.foresee.com/privacy-policy.shtml' target='_blank'>Privacy Policy</a>",
        onexitdeclineButton: "Cancel",
        onexitacceptButton: "email/text me",
        onexiterror: "Error",
        onexitallowclose: false,
        // e for email only, s for sms only, b for both
        onexitsupport: "b",
        onexitinputMessage: "Email or mobile number",
        onexitinputMessageJustMobile: "Mobile number",
        onexitinputMessageJustEmail: "Email address",
        onexitemailMeButtonText: "Email me",
        onexittextMeButtonText: "Text me",
        onexitinvalidemailtext: "Format should be: name@domain.com",
        onexitinvalidsmstext: "Format should be: 123-456-7890",
        onexitinvalidFormatErrorText: "Format should be: name@domain.com or 123-456-7890",
        cssInviteExtraClasses: null,//'fsrbottomright'
        /*
         , locales: {
         "fr-ca": {
         headline: "Je n'est c'est pas!"
         }
         }*/
      }
    }],

    /**
     * The invite config and template(s) to use for mobile devices. If you define
     * more than one (like desktop), it amounts to an a/b test. Define as many as you want.
     */
    mobile: [{
      /**
       * The name of this configuration. Used for tracking A/B tests.
       */
      displayname: 'default',

      /**
       * The name of the template to use
       */
      template: 'mobile',

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
       * The Alt text for the trust seal
       */
      trusteLogoAltText: "Validate TRUSTe Privacy Certification",

      /**
       * The invitation type.
       * Valid options:
       * INSESSION - Pop the survey right away
       * SMS - Use a phone number (SMS) system
       * EMAIL - Use an email system
       * SMSEMAIL - Use either SMS or email
       */
      inviteType: 'SMSEMAIL',

      /**
       * Dialog values
       */
      dialog: {
        // Initial screen configs..
        headline: "Your ideas make us better!",
        subheadline: "Please let us know how to improve our site so we can better serve you.",
        declineButton: "No, thanks",
        acceptButton: "Yes, I'll help",
        emailButton: "Email me",
        textButton: "Text me",
        poweredbyDisclaimer: null,//"Powered by ",
        poweredbyLink: "http://www.foresee.com",
        poweredbyText: "Powered by ForeSee",

        // Second Screen configs...
        emailPlaceholder: "Your email...",
        textPlaceholder: "Your cellphone number...",
        submitButton: "Submit",
        textDisclaimer: "Providing your number means you are participating in a ForeSee survey. Message &amp; data rates may apply. 2 messages per survey.",
        emailDisclaimer: "",
        privacyPolicyLink: "http://www.foresee.com/sms-terms-and-conditions",
        privacyPolicyText: "Terms and Conditions",
        emailInvalidation: "Please enter a valid email",
        textInvalidation: "Please enter a valid cellphone number",

        // Thank you page configs...
        onexitheadline: "Thank you!",
        onexitsubheadline: "We'll reach out to you after you finish on our site.",
        onexitcountertag: "Returning in ",
        // Number in seconds to wait.
        onexitcounterval: "3",

        // Looks and feel of the UI..
        // "main" is the main dark template and "light" is the light template.
        theme: "main",
        // Any google font..
        font: null,//"Anton",
        // These override the values from the "main" or "light" templates. Omit them by commenting them out if not necessary.
        invitebg: null,//"#FFA94F",
        // Shadows in the invite will be of this color
        shadowcolor: null,//"#FF8F35",
        // First screen privacy section background.
        bannerprivacybg: null,//"rgb(249,99,2)",
        // Text color on the invite.
        textcolor: null,//"blue",
        // Text color on the buttons on the invite
        buttontextcolor: null,//"rgb(249,99,2)",
        // Button background.
        buttonbg: null,//"rgb(249,99,2)",
        // Disabled button background on the second screen.
        buttondisabledbg: null,//"#FFDB81",
        // Button shadow color.
        buttonshadowcolor: null,//"orange",
        // This is where rgba value is required, omitting this will fallback to invitebg.
        fullscreenbg: null,//"rgba(255, 169, 79, 0.95)",
        // Closebutton text color for the banner
        closebuttontextcolor: null,//"#ffffff",
        // Closebutton background color for the banner
        closebuttonbg: null,//"rgb(249,99,2)",
        // Closebutton background color for fullscreen
        closebuttonfullscreenbg: null,//"transparent",
        // Invalid text color.
        invalidtextcolor : null,//"rgb(249,99,2)"
      }
    }]
  },

  /**
   * Specifies whether or not to use a qualifier survey.
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
      noThanksTopSection: "You will not receive the survey.  Thank you for your willingness to help.",
      noThanksBottomSection: "You can close this window now.",
      validationFailedMsg: "Please answer all of the questions.",
      continueLabel: "Continue",
      noLabel: "No thanks",
      closeLabel: "Close the window",
      questions: [{
        text: "Please specify your age:",
        /**
         * The type of question. Valid options are: "RADIO" (no more at the moment).
         */
        questionType: "RADIO",
        choices: [{
          text: "Prefer not to say",
          qualifies: false
        }, {
          text: "8 or under",
          qualifies: "preteen",
          cpps: [{"Age": "8 or under"}]
        }, {
          text: "9-13",
          qualifies: "preteen",
          cpps: [{"Age": "9-13"}]
        }, {
          text: "14-17",
          qualifies: "teen",
          cpps: [{"Age": "14-17"}]
        }, {
          text: "18-24",
          qualifies: "adult",
          cpps: [{"Age": "18-24"}]
        }, {
          text: "25-34",
          qualifies: "adult",
          cpps: [{"Age": "25-34"}]
        }, {
          text: "35-44",
          qualifies: "adult",
          cpps: [{"Age": "35-44"}]
        }, {
          text: "45-54",
          qualifies: "adult",
          cpps: [{"Age": "45-54"}]
        }, {
          text: "55-64",
          qualifies: "adult",
          cpps: [{"Age": "55-64"}]
        }, {
          text: "65+",
          qualifies: "adult",
          cpps: [{"Age": "65+"}]
        }]
      }]
    }
  },
  reminder: {
    useReminder: false,
    display: {
      // TODO put better default text
      headerSection: "Your survey is available.",
      bodySection: "This is the body section.",
      buttonText: "Click here for the survey"
    }
  }
})