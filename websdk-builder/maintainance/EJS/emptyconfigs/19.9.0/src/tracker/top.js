/**
 * Top file for tracker window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, getParam } from "../fs/index";

// Top file for storage frame
/* pragma:DEBUG_START */
console.log("tracker: file is being executed");
/* pragma:DEBUG_END */

globalConfig.brainUrl = getParam("brain_url") || globalConfig.brainUrl;

// Journey Event types list
const LOGGING = {
  INVITE_SHOWN: "fs_inviteShown",
  INVITE_ACCEPTED: "fs_inviteAccepted",
  INVITE_DECLINED: "fs_inviteDeclined",
  INVITE_ABANDONED: "fs_inviteAbandoned",
  TRACKER_SHOWN: "fs_trackerShown",
  TRACKER_CLICKED: "fs_trackerClicked",
  QUALIFIER_ACCEPTED: "fs_qualifierAccepted",
  QUALIFIER_DECLINED: "fs_qualifierDeclined",
  QUALIFIER_SHOWN: "fs_qualifierShown",
  REMINDER_SHOWN: "fs_reminderShown",
  REMINDER_ACCEPTED: "fs_reminderAccepted",
};

export { LOGGING };
