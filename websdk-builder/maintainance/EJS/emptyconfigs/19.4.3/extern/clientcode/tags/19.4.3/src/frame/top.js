/**
 * Top file for storage frame
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("frame.Top");
fs.require("frame.Debug");

(function () {

  /* pragma:DEBUG_START */
  console.log("frame: started frame module");
  /* pragma:DEBUG_END */

  // Top file for storage frame
  // We don't want beforeunload/unload to trigger on the iFrame
  utils.preventUnloadFlag = true;

})();