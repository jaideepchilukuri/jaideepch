/**
 * Top file for trigger code
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { FSEvent } from "../utils/utils";

// Top file

/**
 * This can hold any singletons we want
 * @type {{}}
 */
const Singletons = {
  // Public API Event Emitters
  loadedEmitter: new FSEvent(),
  initializedEmitter: new FSEvent(),
  inviteShownEmitter: new FSEvent(),
  inviteAcceptedEmitter: new FSEvent(),
  inviteAbandonedEmitter: new FSEvent(),
  inviteDeclinedEmitter: new FSEvent(),
  trackerShownEmitter: new FSEvent(),
  customInvitationRequested: new FSEvent(),
  CPPS: null,
  _triggerResetLock: null,
  state: {
    didInvite: false,
  },
  inviteSetup: null,
};

// Journey Event types list
const LOGGING = {
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
  REMINDER_ACCEPTED: "fs_reminderAccepted",
};

/**
 * Quickreference the window
 */
const _W = window;

export { Singletons, LOGGING, _W };
