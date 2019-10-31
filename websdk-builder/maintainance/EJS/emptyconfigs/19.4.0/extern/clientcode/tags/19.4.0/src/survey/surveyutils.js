/**
 * Survey Utility Class
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("sv.SurveyUtils");
(function () {
  /**
   * A class that holds default values if any for the survey.
   * @constructor
   */
  var surveyUtils = function () {};

  /**
   * Static method to cleanup answer for text..
   * @param blob String text blob to be cleaned up.
   */
  surveyUtils.cleanUpText = function (blob, maxlen) {
    // If max length is 0..
    if (maxlen === 0) {
      return '';
    }

    if (blob.length > 13) {
      // Possibility that this can contain a credit card or SSN
      var re = {
        electron: /(4026|417500|4405|4508|4844|4913|4917)[0-9]{11,12}/g,
        maestro: /(5018|5020|5038|5612|5893|6304|6759|6761|6762|6763|0604|6390)[0-9]{12}/g,
        dankort: /(5019)[0-9]{12}/g,
        instaPayment: /(637|638|639)[0-9]{13}/g,
        visa: /4[0-9]{12}(?:[0-9]{3})?/g,
        mastercard: /5[1-5][0-9]{14}/g,
        amex: /3[47][0-9]{13}/g,
        diners: /3(?:0[0-5]|[68][0-9])[0-9]{11}/g,
        discover: /6(?:011|5[0-9]{2}|22[19]|4[56789][0-9]{1})[0-9]{12}/g,
        jcb: /(?:2131|1800|35\d{3})\d{11}/g,
        ssn: /[0-9]{9}/g
      };

      // Check to see if there are any of the above credit card patterns..
      blob = blob.replace(/[\d\-\.\s\\\/]+/g, function (mtch) {
        if (mtch.length >= 13) {
          var rtnVal = mtch;
          for (var regex in re) {
            if (re[regex].test(mtch.replace(/[\s-]/g, ""))) {
              // If there are, mask them
              rtnVal = rtnVal.replace(/\d/g, "X");
              break;
            }
          }
          return rtnVal;
        } else {
          // If there are not, just return the matched string.
          return mtch;
        }
      });
    }

    if (maxlen && blob.length >= this.maxlen) {
      blob = blob.substr(0, this.maxlen - 1);
    }

    return blob;
  };
})();