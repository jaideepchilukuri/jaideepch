/**
 * Miscellaneous Stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { makeURI, toLowerCase } from "../../fs/index";

/**
 * Gets information about an image
 * @param img
 * @param callback
 */
const imgInfo = (img, callback) => {
  const noop = () => {};
  callback = callback || noop;
  const iobj = new Image();
  iobj.onload = () => {
    callback(iobj.width, iobj.height);
  };
  iobj.onerror = () => {
    // Don't hang
    callback();
  };
  if (img.indexOf("//") > -1) {
    iobj.src = img;
  } else {
    iobj.src = makeURI(`$${img}`);
  }
  if (iobj.width) {
    iobj.onload = iobj.onerror = noop;
    return callback(iobj.width, iobj.height);
  }
};

/**
 * Get a hash parameter. Eg: #acscommand=feedbackpreview&previewmode=desktop&mid=bla&datauri=%2F%2Fsurvey-dev.foreseeresults.com%2Fsurvey%2Fdisplay%2Fjson-view
 * @param parmname
 * @returns {*}
 */
const getHashParm = parmname => {
  const psh = window.location.hash.toString();
  if (psh && psh.length > 0) {
    const pbits = psh.split("&");
    for (let i = 0; i < pbits.length; i++) {
      const mb = pbits[i].split("=");
      const lb = toLowerCase(mb[0]).trim();
      if (lb == toLowerCase(parmname)) {
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
const compile = code => {
  // CC-3332 backing up Array.constructor.constructor because FOREX site overwrites it and breaks the call to it below
  const temp = [].constructor.constructor;
  delete [].constructor.constructor;
  const f = new [].constructor.constructor(`var v = ''; try { v = ${code}} catch(err) {}return v;`);
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
const retrieveNestedVariable = (winRef, variableName) => {
  let ctx = winRef || window;
  const valbits = variableName.split(".");
  let k = 0;
  while (k < valbits.length && ctx) {
    ctx = ctx[valbits[k++]];
  }
  return typeof ctx !== "undefined" && k === valbits.length ? ctx : undefined;
};

export { imgInfo, getHashParm, compile, retrieveNestedVariable };
