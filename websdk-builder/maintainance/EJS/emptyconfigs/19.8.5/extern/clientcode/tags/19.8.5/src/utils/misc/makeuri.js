/**
 * Handles constructing fully qualified URI's
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/* pragma:AMD_START */
_fsNormalizeUrl = fs.makeURI;
/* pragma:AMD_END */

/* pragma:NOTAMD_START */
// Get the version tag from the URL
var __ver__ = fs.enc(fs.getParam("v"));

/**
 * Properly format a URI
 * @param path
 */
_fsNormalizeUrl = function(url) {
  var rooturl = "";
  // First, fix the URL
  url = url || "/";
  var addm = "v=" + __ver__;
  if (url.indexOf("//") == -1) {
    url =
      rooturl.substr(rooturl.length - 1, 1) == "/" && url.substr(0, 1) == "/"
        ? rooturl + url.substr(1)
        : rooturl + url;
  }
  return url + (url.indexOf("?") > -1 ? "&" : "?") + "v=" + __ver__;
};
/* pragma:NOTAMD_END */
