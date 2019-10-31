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

import { ext, getParam, toLowerCase, isDefined } from "../../fs/index";
import { testAgainstSearch } from "../../utils/utils";
import { EVENT_TYPES } from "./actions";

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
      masked: new Set(),
      unmasked: new Set(),
      redact: new Set(),
      whitelist: new Set(),
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
   * Get the current and complete list of masking targets
   */
  getCurrentMaskingTargets() {
    const els = this.maskEls;
    const result = {};
    ["unmasked", "masked", "whitelist", "redact"].forEach(key => {
      // convert the set to an array in a way that works on IE (no Array.from)
      const list = [];
      els[key].forEach(el => list.push(el));
      result[key] = list;
    });
    return result;
  }

  getCurrentMaskingTargetIds(tree) {
    const els = this.getCurrentMaskingTargets();

    const getId = el => tree.get(el) && tree.get(el).id;
    const defed = id => isDefined(id);

    return {
      unmasked: els.unmasked.map(getId).filter(defed),
      masked: els.masked.map(getId).filter(defed),
      whitelist: els.whitelist.map(getId).filter(defed),
      redact: els.redact.map(getId).filter(defed),
    };
  }

  /**
   * Send the current masking targets to the webworker.
   */
  sendMaskingTargets(worker, tree, ctx) {
    const targets = this.getCurrentMaskingTargetIds(tree);
    // could save some copy time by only sending the changes, but that risks a desync
    worker.queueAction(EVENT_TYPES.MASKING_CHANGE, {
      ctx,
      targets,
    });
  }

  /**
   * Update the masking targets
   */
  updateMaskingTargets() {
    const piiObj = this.piiObj;
    const doc = this.doc;
    const els = this.maskEls;
    let hasChanges = false;

    // Input whitelisting
    if (piiObj.visibleInputs) {
      // First query the entire document for any input, select, textarea
      let elList = doc.querySelectorAll("input, select, textarea") || [];

      // Next, check those inputs for any elements that meet the criteria
      // and haven't yet been seen
      // NodeList doesnt have the stuff normal arrays have,
      // so we have to do it this way.
      elList = Array.prototype.filter.call(elList, el => {
        let matches = false;
        if (typeof el.matches !== "undefined") {
          matches = el.matches(piiObj.visibleInputs);
        } else if (typeof el.msMatchesSelector !== "undefined") {
          matches = el.msMatchesSelector(piiObj.visibleInputs);
        } else if (typeof el.matchesSelector !== "undefined") {
          matches = el.matchesSelector(piiObj.visibleInputs);
        }

        return matches;
      });

      if (this.updateMaskingListWithElements(elList, els.whitelist)) {
        hasChanges = true;
      }
    }

    // Redaction elements
    if (this.updateMaskingList(piiObj.redactZones, els.redact)) {
      hasChanges = true;
    }

    // Selective unmask zones
    if (this.updateMaskingList(piiObj.selectiveUnMaskZones, els.unmasked)) {
      hasChanges = true;
    }

    // Selective unmask zones
    if (this.updateMaskingList(piiObj.selectiveMaskZones, els.masked)) {
      hasChanges = true;
    }

    // Return the changes
    return hasChanges;
  }

  updateMaskingList(selector, list) {
    if (selector) {
      // Query the entire document for any elements that meet the criteria
      const elList = this.doc.querySelectorAll(selector);

      // Update the list with them
      return this.updateMaskingListWithElements(elList, list);
    }

    return false;
  }

  updateMaskingListWithElements(elList, list) {
    let hasChanges = false;
    const set = new Set();

    // OK now we have a list of elements we have to go and mask
    for (let i = 0; i < elList.length; i++) {
      if (!list.has(elList[i])) {
        list.add(elList[i]);
        hasChanges = true;
      }

      // add to the set to make the next loop faster
      set.add(elList[i]);
    }

    // check if anything has been removed
    list.forEach(el => {
      if (!set.has(el)) {
        list.delete(el);
        hasChanges = true;
      }
    });

    return hasChanges;
  }

  /**
   * Free up any memory for the dispose
   */
  dispose() {
    // free up dom references
    for (const key in this.maskEls) {
      this.maskEls[key].clear();
    }
  }
}

export { Masker };
