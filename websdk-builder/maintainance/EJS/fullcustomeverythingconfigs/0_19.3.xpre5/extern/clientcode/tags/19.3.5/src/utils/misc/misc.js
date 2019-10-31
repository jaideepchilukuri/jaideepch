/**
 * Miscellaneous Stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Misc");

fs.require("fs.Top");

(function () {

  /**
   * Gets information about an image
   * @param img
   * @param callback
   */
  utils.imgInfo = function (img, callback) {
    var noop = function () {
    };
    callback = callback || noop;
    var iobj = new Image();
    iobj.onload = function () {
      callback(iobj.width, iobj.height);
    };
    iobj.onerror = function () {
    };
    if (img.indexOf('//') > -1) {
      iobj.src = img;
    } else {
      iobj.src = fs.makeURI("$" + img);
    }
    if (iobj.width) {
      iobj.onload = iobj.onerror = noop;
      callback(iobj.width, iobj.height);
    }
  };

  /**
   * Get a hash parameter. Eg: #acscommand=feedbackpreview&previewmode=desktop&mid=bla&datauri=%2F%2Fsurvey-dev.foreseeresults.com%2Fsurvey%2Fdisplay%2Fjson-view
   * @param parmname
   * @returns {*}
   */
  utils.getHashParm = function (parmname) {
    var psh = window.location.hash.toString();
    if (psh && psh.length > 0) {
      var pbits = psh.split('&');
      for (var i = 0; i < pbits.length; i++) {
        var mb = pbits[i].split('='),
          lb = fs.toLowerCase(mb[0]).trim();
        if (lb == fs.toLowerCase(parmname)) {
          if (mb.length > 1) {
            return decodeURIComponent(mb[1]);
          }
          break;
        }
      }
    }
  };

  /**
   * Palatable form of eval
   * @param code
   * @returns {*}
   */
  utils.compile = function(code) {
    var f = new [].constructor.constructor("var v = ''; try { v = " + code + "} catch(err) {}return v;");
    return f.call(window);
  };

})();