/**
 * Basic stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Encode the string as a regular expression, replacing special
 * characters for later substitution.
 * @param {String} str The string to escape
 * @return {String}
 */
const escapeRegExp = str => (str || "").toString().replace(/([-.*+?^${}()|[\]/\\])/g, "\\$1");

export { escapeRegExp };
