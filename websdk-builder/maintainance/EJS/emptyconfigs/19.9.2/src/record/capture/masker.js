/**
 * DOM Masking module
 *
 * An extension which support inline personalization masking
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext, getParam, toLowerCase } from "../../fs/index";
import { DOMContains, testAgainstSearch } from "../../utils/utils";

/**
 * Does masking work on a document
 * @constructor
 */
class Masker {
  constructor(piiObj, winRef) {
    this.win = winRef;
    this.doc = winRef.document;
    this.piiObj = this._prepPIIObjectForPage(piiObj, winRef);
    this.maskEls = {
      whiteList: [],
      block: [],
      obscure: [],
      ignore: [],
      inputWhiteList: [],
      useWhiteListing: true,
    };
  }

  /**
   * Remove unneeded PII rules for the current page.
   * @private
   */
  _prepPIIObjectForPage(_piiObj, winRef) {
    // Get the href of the document. Use location href. If blank, use "about:blank".
    const piiObj = JSON.parse(JSON.stringify(_piiObj));
    const h = toLowerCase(getParam("fsrurl") || winRef.location.href || "about:blank");
    let useWhiteListing = true;
    let k;
    let upgraded = false;

    // Upgrade older configs
    if (piiObj.staticBlockEls) {
      piiObj.selectiveMaskZones = ext(piiObj.selectiveMaskZones || {}, piiObj.staticBlockEls);
      delete piiObj.staticBlockEls;
      upgraded = true;
    }

    if (piiObj.dynamicBlockEls) {
      piiObj.selectiveMaskZones = ext(piiObj.selectiveMaskZones || {}, piiObj.dynamicBlockEls);
      delete piiObj.dynamicBlockEls;
      upgraded = true;
    }

    piiObj.selectiveMaskZones = piiObj.selectiveMaskZones || {};

    if (piiObj.staticVisibleEls) {
      piiObj.selectiveUnMaskZones = ext(piiObj.selectiveUnMaskZones || {}, piiObj.staticVisibleEls);
      piiObj.visibleInputs = ext(piiObj.visibleInputs || {}, piiObj.staticVisibleEls);
      delete piiObj.staticVisibleEls;
      upgraded = true;
    }

    if (piiObj.dynamicVisibleEls) {
      piiObj.selectiveUnMaskZones = ext(
        piiObj.selectiveUnMaskZones || {},
        piiObj.dynamicVisibleEls
      );
      piiObj.visibleInputs = ext(piiObj.visibleInputs || {}, piiObj.dynamicVisibleEls);
      delete piiObj.dynamicVisibleEls;
      upgraded = true;
    }

    if (piiObj.staticWhiteListEls) {
      piiObj.selectiveUnMaskZones = ext(
        piiObj.selectiveUnMaskZones || {},
        piiObj.staticWhiteListEls
      );
      piiObj.visibleInputs = ext(piiObj.visibleInputs || {}, piiObj.staticWhiteListEls);
      delete piiObj.staticWhiteListEls;
      upgraded = true;
    }

    if (piiObj.dynamicWhiteListEls) {
      piiObj.selectiveUnMaskZones = ext(
        piiObj.selectiveUnMaskZones || {},
        piiObj.dynamicWhiteListEls
      );
      piiObj.visibleInputs = ext(piiObj.visibleInputs || {}, piiObj.dynamicWhiteListEls);
      delete piiObj.dynamicWhiteListEls;
      upgraded = true;
    }

    piiObj.selectiveUnMaskZones = piiObj.selectiveUnMaskZones || {};

    if (piiObj.removeVisibilityEls) {
      piiObj.redactZones = ext(piiObj.redactZones || {}, piiObj.removeVisibilityEls);
      delete piiObj.removeVisibilityEls;
      upgraded = true;
    }

    if (piiObj.obscureEls) {
      piiObj.redactZones = ext(piiObj.redactZones || {}, piiObj.obscureEls);
      delete piiObj.obscureEls;
      upgraded = true;
    }

    if (piiObj.assetBlockEls) {
      piiObj.redactZones = ext(piiObj.redactZones || {}, piiObj.assetBlockEls);
      delete piiObj.assetBlockEls;
      upgraded = true;
    }

    piiObj.redactZones = piiObj.redactZones || {};

    if (piiObj.pagesToSelectiveMask == null) {
      piiObj.pagesToSelectiveMask = [];

      // carefully only switch to blacklisting mode if there are no
      // unmasking zones, and we are upgrading an old config
      if (upgraded && Object.keys(piiObj.selectiveUnMaskZones).length === 0) {
        piiObj.pagesToSelectiveMask = Object.keys(piiObj.selectiveMaskZones);
      }
    }

    if (upgraded) {
      // NOTE: will appear in prod on purpose and will only happen when using
      // the old config format with the new record
      console.warn(
        "sr: upgraded config to: pii:",
        JSON.stringify(piiObj, null, 2),
        "\n(to make this message disappear, please upgrade to new record config format)"
      );
    }
    // End upgrade

    /**
     * Order of precedence:
     *
     * We mask all pages completely by default UNLESS there is a wildcard match in the
     * selectiveUnMask list of URL wildcards - in this case we look for elements in that list
     * and un-mask them.
     *
     * Next we look at the pagesToSelectiveMask list. If there is a wildcard match, we switch
     * to blacklisting mode where the page is UNMASKED by default with selective masking implemented
     * via the selectiveMask list of wildcards.
     *
     * Inputs are whitelisted via the visibleInputs wildcard set.
     * Redaction (blacking out of sections of the page) is implemented via the redactEls set.
     * Note: redaction still transmits the CONTENTS of these sections (if text) to the server
     * but blacks it out in the replay.
     */

    // First check to see if we are in a selective-mask part of the site
    for (k = 0; k < piiObj.pagesToSelectiveMask.length; k++) {
      if (testAgainstSearch(piiObj.pagesToSelectiveMask[k], h)) {
        // Switch to blacklisting mode from whitelisting mode
        useWhiteListing = false;
        break;
      }
    }

    // Save the state
    piiObj.useWhiteListing = useWhiteListing;

    /**
     * Run a set of rules againt the current URL
     * @param {*} piiObj
     * @param {*} keyName
     */
    function processWildCardObject(piiObj, keyName, currentUrl) {
      const objset = piiObj[keyName];
      const elkeys = Object.keys(objset || {});
      const finalList = [];
      let k;
      for (k = 0; k < elkeys.length; k++) {
        if (testAgainstSearch(elkeys[k] || "*", currentUrl)) {
          finalList.push(objset[elkeys[k]]);
        } else {
          delete objset[elkeys[k]];
        }
      }
      piiObj[keyName] = finalList.join(",").trim();
      if (finalList.length == 0) {
        delete piiObj[keyName];
        return true;
      } else {
        return false;
      }
    }

    // Don't need this anymore
    delete piiObj.pagesToSelectiveMask;

    // If whitelisting is used, enforce it
    if (useWhiteListing) {
      delete piiObj.selectiveMaskZones;
      piiObj.noRules = processWildCardObject(piiObj, "selectiveUnMaskZones", h);
    } else {
      // Black-listing mode
      piiObj.noRules = processWildCardObject(piiObj, "selectiveMaskZones", h);
      delete piiObj.selectiveUnMaskZones;
    }

    // Handle visible inputs
    processWildCardObject(piiObj, "visibleInputs", h);

    // Handle redaction
    processWildCardObject(piiObj, "redactZones", h);

    /* pragma:DEBUG_START */
    console.warn(
      `sr: ${winRef === window.top ? "" : "[frm] "}`,
      "************* MASKING SITUATION *************"
    );
    if (useWhiteListing) {
      console.warn(
        `sr: ${winRef === window.top ? "" : "[frm] "}`,
        `whitelisting with ${
          piiObj.noRules
            ? "no rules applied"
            : `${piiObj.selectiveUnMaskZones.split(",").length} rules applied`
        }`
      );
    } else {
      console.warn(
        `sr: ${winRef === window.top ? "" : "[frm] "}`,
        `blacklisting with ${
          piiObj.noRules
            ? "no rules applied"
            : `${piiObj.selectiveMaskZones.split(",").length} rules applied`
        }`
      );
    }
    if (piiObj.visibleInputs && piiObj.visibleInputs.length > 0) {
      console.warn(
        `sr: ${winRef === window.top ? "" : "[frm] "}`,
        `visible input rules: ${piiObj.visibleInputs.split(",").length}`
      );
    }
    if (piiObj.redactZones && piiObj.redactZones.length > 0) {
      console.warn(
        `sr: ${winRef === window.top ? "" : "[frm] "}`,
        `redaction rules: ${piiObj.redactZones.split(",").length}`
      );
    }
    console.warn(
      `sr: ${winRef === window.top ? "" : "[frm] "}`,
      "*********************************************"
    );
    /* pragma:DEBUG_END */

    // Return the result
    return piiObj;
  }

  /**
   * A node has been removed from the document. update the masking targets to reflect this
   */
  removeNodeFromMaskingTargets(node) {
    const piiObj = this.piiObj;
    const els = this.maskEls;
    const _elsWhiteList = els.whiteList;
    const _elsBlock = els.block;
    const _elsInputWhiteList = els.inputWhiteList;
    let i;

    if (piiObj.useWhiteListing && _elsWhiteList.length > 0) {
      for (i = _elsWhiteList.length - 1; i >= 0; i--) {
        if (
          node === _elsWhiteList[i] ||
          (node.nodeType === 1 && DOMContains(node, _elsWhiteList[i]))
        ) {
          _elsWhiteList.splice(i, 1);
        }
      }
    } else if (!piiObj.useWhiteListing && _elsBlock.length > 0) {
      for (i = _elsBlock.length - 1; i >= 0; i--) {
        if (node === _elsBlock[i] || (node.nodeType === 1 && DOMContains(node, _elsBlock[i]))) {
          _elsBlock.splice(i, 1);
        }
      }
    }

    for (i = _elsInputWhiteList.length - 1; i >= 0; i--) {
      if (
        node === _elsInputWhiteList[i] ||
        (node.nodeType === 1 && DOMContains(node, _elsInputWhiteList[i]))
      ) {
        _elsInputWhiteList.splice(i, 1);
      }
    }
  }

  /**
   * Get the current and complete list of masking targets
   */
  getCurrentMaskingTargets() {
    const els = this.maskEls;
    return {
      unmasked: els.whiteList,
      masked: els.block,
      whitelist: els.inputWhiteList,
      redact: els.obscure,
    };
  }

  /**
   * Update the masking targets
   */
  updateMaskingTargets() {
    const piiObj = this.piiObj;
    const doc = this.doc;
    const els = this.maskEls;
    const _elsWhiteList = els.whiteList;
    const _elsBlock = els.block;
    const _elsObscure = els.obscure;
    const _elsIgnore = els.ignore;
    const _elsInputWhiteList = els.inputWhiteList;
    let elList;
    let elsToDealWith;
    let ellen;
    let tmpEl;
    let hasChanges = false;
    let i;
    let j;
    let breakout;
    const changes = {
      unmasked: [],
      masked: [],
      whitelist: [],
      redact: [],
    };

    // If there are no actual rules, we can save ourselves a lot of work and just stop
    if (!piiObj.noRules) {
      // Dom Whitelisting mode?
      if (piiObj.useWhiteListing) {
        if (piiObj.selectiveUnMaskZones) {
          // First query the entire document for any elements that meet the criteria
          elList = doc.querySelectorAll(piiObj.selectiveUnMaskZones);

          // Then find the ones we dont already know about. NodeList doesnt have the stuff normal arrays have,
          // so we have to do it this way.
          elsToDealWith = Array.prototype.filter.call(
            elList,
            el => _elsWhiteList.indexOf(el) == -1 && _elsIgnore.indexOf(el) == -1
          );

          // OK now we have a list of elements we have to go and mask
          if (elsToDealWith.length > 0) {
            for (i = 0, ellen = elsToDealWith.length; i < ellen; i++) {
              // Quick reference
              tmpEl = elsToDealWith[i];

              // Check to see if this element is inside another element thats
              // already being masked
              breakout = false;
              for (j = _elsWhiteList.length - 1; j >= 0; j--) {
                if (_elsWhiteList[j].nodeType === 1 && DOMContains(_elsWhiteList[j], tmpEl)) {
                  _elsIgnore.push(tmpEl);
                  breakout = true;
                  break;
                }
              }

              if (!breakout) {
                // Add it to our permanent list
                _elsWhiteList.push(tmpEl);

                // Update the domTree to indicate it should be whitelisted
                changes.unmasked.push(tmpEl);
                hasChanges = true;
              }
            }
          }
        }
      } else if (piiObj.selectiveMaskZones) {
        // First query the entire document for any elements that meet the criteria
        elList = doc.querySelectorAll(piiObj.selectiveMaskZones);

        // Then find the ones we dont already know about. NodeList doesnt have the stuff normal arrays have,
        // so we have to do it this way.
        elsToDealWith = Array.prototype.filter.call(
          elList,
          el => _elsBlock.indexOf(el) == -1 && _elsIgnore.indexOf(el) == -1
        );

        // OK now we have a list of elements we have to go and mask
        if (elsToDealWith.length > 0) {
          for (i = 0, ellen = elsToDealWith.length; i < ellen; i++) {
            // Quick reference
            tmpEl = elsToDealWith[i];

            // Check to see if this element is inside another element thats
            // already being masked
            breakout = false;
            for (j = _elsBlock.length - 1; j >= 0; j--) {
              if (_elsBlock[j].nodeType === 1 && DOMContains(_elsBlock[j], tmpEl)) {
                _elsIgnore.push(tmpEl);
                breakout = true;
                break;
              }
            }

            if (!breakout) {
              // Add it to our permanent list
              _elsBlock.push(tmpEl);

              // Update the domTree to indicate it should be whitelisted
              changes.masked.push(tmpEl);
              hasChanges = true;
            }
          }
        }
      }
    }

    // Input whitelisting
    if (piiObj.visibleInputs) {
      // First query the entire document for any input, select, textarea
      elList = doc.querySelectorAll("input, select, textarea") || [];

      // Next, check those inputs for any elements that meet the criteria
      // and haven't yet been seen
      // NodeList doesnt have the stuff normal arrays have,
      // so we have to do it this way.
      elsToDealWith = Array.prototype.filter.call(elList, el => {
        let matches = false;
        if (typeof el.matches !== "undefined") {
          matches = el.matches(piiObj.visibleInputs);
        } else if (typeof el.msMatchesSelector !== "undefined") {
          matches = el.msMatchesSelector(piiObj.visibleInputs);
        } else if (typeof el.matchesSelector !== "undefined") {
          matches = el.matchesSelector(piiObj.visibleInputs);
        }

        return matches && _elsInputWhiteList.indexOf(el) == -1;
      });

      // OK now we have a list of elements we have to go and mask
      if (elsToDealWith.length > 0) {
        for (i = elsToDealWith.length - 1; i >= 0; i--) {
          // Quick reference
          tmpEl = elsToDealWith[i];

          // Add it to our permanent list
          _elsInputWhiteList.push(tmpEl);

          // Update the domTree to indicate it should be whitelisted
          changes.whitelist.push(tmpEl);
          hasChanges = true;
        }
      }
    }

    // Redaction elements
    if (piiObj.redactZones) {
      // First query the entire document for any elements that meet the criteria
      elList = doc.querySelectorAll(piiObj.redactZones);

      // Then find the ones we dont already know about. NodeList doesnt have the stuff normal arrays have,
      // so we have to do it this way.
      elsToDealWith = Array.prototype.filter.call(elList, el => _elsObscure.indexOf(el) == -1);

      // OK now we have a list of elements we have to go and mask
      if (elsToDealWith.length > 0) {
        for (i = elsToDealWith.length - 1; i >= 0; i--) {
          // Quick reference
          tmpEl = elsToDealWith[i];

          // Add it to our permanent list
          _elsObscure.push(tmpEl);

          // Update the domTree to indicate it should be redacted
          changes.redact.push(tmpEl);
          hasChanges = true;
        }
      }
    }

    // Return the changes
    changes.hasChanges = hasChanges;
    return changes;
  }

  /**
   * Free up any memory for the dispose
   */
  dispose() {}
}

export { Masker };
