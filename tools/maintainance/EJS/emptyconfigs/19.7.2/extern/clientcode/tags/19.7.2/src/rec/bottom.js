/**
 * Bottom file for record
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Bottom");

fs.require("rec.Top");
fs.require("rec.RecordController");
fs.require("rec.Record");

(function () {

  // Return the Record class to the world
  return RecordController;

})();