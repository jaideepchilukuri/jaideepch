/**
 * Survey Utility Class
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

/**
 * Static method to cleanup answer for text..
 * @param blob String text blob to be cleaned up.
 */
function cleanUpText(blob, maxlen) {
  // If max length is 0..
  if (maxlen === 0) {
    return "";
  }
  // If max length is smaller than any sensitive pattern (ssn is 9)
  if (maxlen < 9) {
    return blob;
  }

  if (blob.length > 9) {
    // regexp whitelist
    // List of things that should not be censored, like phone numbers
    const rew = {
      phone: /\b(?:(?:\(\d{3}\)?)|(?:\d{3}))[ -./\\]?\d{3}[ -./\\]?\d{4}\b/g,
    };
    // regexp blacklist
    // List of things to censor
    // helpful: http://www.richardsramblings.com/regex/credit-card-numbers/
    // helpful: https://codepen.io/gpeu/pen/eEdvmO
    const reb = {
      electron: /\b(4026|417500|4405|4508|4844|4913|4917)[ -./\\]?\d{4}[ -./\\]?\d{4}\d{3,4}\b/g,
      maestro: /\b(?:5[0678]\d\d|6304|6390|67\d\d)[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?(?:\d{4})?[ -./\\]?(?:\d{1,3})?\b/g,
      dankort: /\b(5019)[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,
      instaPayment: /\b(637|638|639)[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{1}\b/g,
      visa: /\b4\d{3}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{1,4}\b/g,
      mastercard: /\b5[1-5]\d{2}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,
      amex: /\b3[47]\d{2}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{3}\b/g,
      diners: /\b3(?:0[0-5]|[68]\d)\d{1}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{2}\b/g,
      discover: /\b6(?:011|5\d{2}|22[19]|4[56789]\d{1})[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,
      jcb: /\b(?:2131|1800|35\d[28-89])[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,
      ssn: /\b\d{3}[ -./\\]?\d{2}[ -./\\]?\d{4}\b/g,
    };

    // Look for text that should not be censored following the regexp whitelist,
    // and remember where it is to be able to restore it later.
    const whitelisted = [];
    for (const regexw in rew) {
      blob = blob.replace(
        rew[regexw],
        function(match, index) {
          this.push({ i: index, m: match });
          return "";
        }.bind(whitelisted)
      );
    }

    // utils to replace a matched string with Xs
    const maskStr = match => new Array(match.length + 1).join("X");

    // Censor sensitive data following the above regexp blacklist
    for (const regexb in reb) {
      // If there are, mask them
      blob = blob.replace(reb[regexb], maskStr);
    }

    // Restore whitelisted strings
    whitelisted.forEach(w => {
      blob = blob.slice(0, w.i) + w.m + blob.slice(w.i);
    });
  }

  if (maxlen && blob.length >= this.maxlen) {
    blob = blob.substr(0, this.maxlen - 1);
  }

  return blob;
}

export { cleanUpText };
