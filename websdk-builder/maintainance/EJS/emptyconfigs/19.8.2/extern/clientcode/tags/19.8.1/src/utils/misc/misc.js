/**
 * Miscellaneous Stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Gets information about an image
 * @param img
 * @param callback
 */
utils.imgInfo = function(img, callback) {
  var noop = function() {};
  callback = callback || noop;
  var iobj = new Image();
  iobj.onload = function() {
    callback(iobj.width, iobj.height);
  };
  iobj.onerror = function() {
    // Don't hang
    callback();
  };
  if (img.indexOf("//") > -1) {
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
utils.getHashParm = function(parmname) {
  var psh = window.location.hash.toString();
  if (psh && psh.length > 0) {
    var pbits = psh.split("&");
    for (var i = 0; i < pbits.length; i++) {
      var mb = pbits[i].split("="),
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
  // CC-3332 backing up Array.constructor.constructor because FOREX site overwrites it and breaks the call to it below
  var temp = [].constructor.constructor,
    f;
  delete [].constructor.constructor;
  f = new [].constructor.constructor("var v = ''; try { v = " + code + "} catch(err) {}return v;");
  [].constructor.constructor = temp;
  return f.call(window);
};

/**
 * Itereates through an object search for a nested variable
 * @param winRef: reference of the window context
 * @param variableName: variable name we are searching for (ex. company.shopping.checkout.cart )
 * @returns if the variable exists and array length matches iteration count
 * then return the string value else return false
 */
utils.retrieveNestedVariable = function(winRef, variableName) {
  var ctx = winRef || window,
    valbits = variableName.split("."),
    k = 0;
  while (k < valbits.length && ctx) {
    ctx = ctx[valbits[k++]];
  }
  return typeof ctx !== "undefined" && k === valbits.length ? ctx : undefined;
};
