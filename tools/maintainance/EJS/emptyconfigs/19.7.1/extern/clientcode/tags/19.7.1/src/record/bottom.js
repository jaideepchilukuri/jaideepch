/**
 * Bottom file for cx record
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Bottom");

fs.require("rec.Top");
fs.require("rec.RecordController");
fs.require("rec.Record");
fs.require("rec.Misc.Symbols");
fs.require("rec.Misc.PublicAPI");

(function () {

  // Return the Record class to the world
  return RecordController;

})();