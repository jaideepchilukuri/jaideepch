/**
 * Startup sequence for invite
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("inv.Bottom");

fs.require("inv.Top");
fs.require("inv.Misc.Template");
fs.require("inv.Invite");

(function () {

  // Return the Invite class to the world
  return Invite;

})();