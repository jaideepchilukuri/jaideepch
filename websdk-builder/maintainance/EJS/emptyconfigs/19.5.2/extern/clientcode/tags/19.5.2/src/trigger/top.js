/**
 * Top file for trigger code
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Top");

(function () {

  // Top file

  /**
   * This can hold any singletons we want
   * @type {{}}
   */
  var Singletons = {
    // Public API Event Emitters
    loadedEmitter: new utils.FSEvent(),
    initializedEmitter: new utils.FSEvent(),
    inviteShownEmitter: new utils.FSEvent(),
    inviteAcceptedEmitter: new utils.FSEvent(),
    inviteAbandonedEmitter: new utils.FSEvent(),
    inviteDeclinedEmitter: new utils.FSEvent(),
    trackerShownEmitter: new utils.FSEvent(),
    customInvitationRequested: new utils.FSEvent(),
    CPPS: null,
    _triggerResetLock: null,
    state: {
      didInvite: false
    }
  };

  // Journey Event types list
  var LOGGING = {
    INVITE_SHOWN: "fs_inviteShown",
    INVITE_ACCEPTED: "fs_inviteAccepted",
    INVITE_DECLINED: "fs_inviteDeclined",
    INVITE_ABANDONED: "fs_inviteAbandoned",
    LINKS_CANCEL: "fs_linksCancel",
    TRACKER_SHOWN: "fs_trackerShown",
    TRACKER_CLICKED: "fs_trackerClicked",
    QUALIFIER_ACCEPTED: "fs_qualifierAccepted",
    QUALIFIER_DECLINED: "fs_qualifierDeclined",
    QUALIFIER_SHOWN: "fs_qualifierShown",
    REMINDER_SHOWN: "fs_reminderShown",
    REMINDER_ACCEPTED: "fs_reminderAccepted"
  };

  // Decode survey definitions
  if (config && config.surveydefs) {
    for (var p = 0; p < config.surveydefs.length; p++) {
      if (fs.isString(config.surveydefs[p])) {
        config.surveydefs[p] = utils.compile(utils.b64DecodeUnicode(config.surveydefs[p]));
      }
    }
  }

  /**
   * Quickreference the window
   */
  var _W = window;

  /**
   * The cookie interface
   * @type {utils.Cookie}
   */
  var ckie = new utils.Cookie({
    'path': '/',
    'secure': false,
    'encode': true
  });

  /**
   * Copies the Compress interface for use in getCookie public API function
   */
  var compress = utils.Compress;

  // Handle FSR Admin and OPTOUT pages
  if (fs.fsCmd("fstest")) {
    // Loads the fsradmin page, load trigger project to be able to register the product.
    require([fs.makeURI("$fs.svadmin.js")], function (SVAdmin) { });
    return;
  } else if (fs.fsCmd("fsoptout")) {
    // Loads the opt-out interface
    require([fs.makeURI("$fs.optout.js")], function (OptOut) { });
    return;
  }

})();
