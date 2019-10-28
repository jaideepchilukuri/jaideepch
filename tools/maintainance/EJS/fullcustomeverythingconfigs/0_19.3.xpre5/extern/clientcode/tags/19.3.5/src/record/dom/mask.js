/**
 * DOM Masking module
 *
 * An extension which support inline personalization masking
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Dom.Mask");

fs.require("rec.Top");

(function () {

  /**
   * Does masking work on a document
   * @constructor
   */
  var Masker = function () {

  };

  /**
   * @class The namespace for PII stuff.
   * @static
   */
  Masker.prototype = {
    /**
     * Flag to indicate that white-listing is being used for these pages.
     */
    useWhiteListing: false,

    /**
     * Array of class names for elements that should be unblocked for white-listing
     */
    dynamicWhiteListUnblocks: [],

    /**
     * The list of selectors to dynamically mask
     */
    dynamicSelectorsToMask: [],

    /**
     * The list of selectors to dynamically unmask
     */
    dynamicSelectorsToUnmask: [],

    /**
     * Dynamic whitelisting elements
     */
    dynamicWhiteListEls: [],

    /**
     * The list of selectors to dynamically re-mask
     * used for clients unblocking all inputs, textareas, and selects,  and re-blocking individual ITSs within dynamic content
     */
    dynamicSelectorsToRemask: [],

    /**
     * The list of selectors to dynamically asset block
     */
    dynamicSelectorsToBlockAssets: [],

    /**
     * Whitelisted static elements
     */
    staticWhiteListEls: [],

    /**
     * Are we in the middle of masking?
     */
    isMasking: false,

    /**
     * Array of class names for elements that should not be masked.
     */
    noMaskClassArray: []
  };

  // The start mask tag string
  var SESSIONREPLAY_MASK_START_STRING = "fsrHiddenBlockStart";

  // The end mask tag string
  var SESSIONREPLAY_MASK_END_STRING = "fsrHiddenBlockEnd";

  // The start unblock tag string
  var SESSIONREPLAY_UNBLOCK_START_STRING = "fsrWhiteListStart";

  // The end unblock tag string
  var SESSIONREPLAY_UNBLOCK_END_STRING = "fsrWhiteListEnd";

  /**
   * Insert inline blocking comment tags before and after the selected elements.
   * @param select {String} CSS selector for elements that will be blocked.
   * @param winRef {HTMLWindow} Reference to the window that's being masked
   * @param whiteList {Boolean} Use whitelisting?
   * @memberOf Mask
   */
  Masker.prototype._maskStaticBySelector = function (css_selector, winRef, whiteList) {
    // Cache the list of html nodes to mask
    var docRef = winRef.document,
      nodes_to_mask = docRef.querySelectorAll(css_selector),
      i,
      this_node,
      parent,
      blockingCommentStart = whiteList ? SESSIONREPLAY_UNBLOCK_START_STRING : SESSIONREPLAY_MASK_START_STRING,
      blockingCommentEnd = whiteList ? SESSIONREPLAY_UNBLOCK_END_STRING : SESSIONREPLAY_MASK_END_STRING,
      wlClass = "_fsrWL";

    for (i = 0; i < nodes_to_mask.length; i++) {
      // Quickreference current node in loop
      this_node = nodes_to_mask[i];

      // Is this an HTMLBody element?
      if (this_node.nodeName == 'BODY') {
        if (!utils.hasClass(this_node, wlClass)) {
          utils.addClass(this_node, wlClass);
          // Make the SESSIONREPLAY_MASK_START_STRING and SESSIONREPLAY_MASK_END_STRING surround the children of this node
          this_node.insertBefore(docRef.createComment(blockingCommentStart), this_node.firstChild);
          this_node.appendChild(docRef.createComment(blockingCommentEnd));
        }
      } else {
        // Make the SESSIONREPLAY_MASK_START_STRING and SESSIONREPLAY_MASK_END_STRING surround this node
        parent = this_node.parentNode;
        if (!utils.hasClass(parent, wlClass)) {
          utils.addClass(parent, wlClass);
          parent.insertBefore(docRef.createComment(blockingCommentStart), this_node);
          parent.insertBefore(docRef.createComment(blockingCommentEnd), this_node.nextSibling);
        }
      }
    }
  };

  /**
   * Remove class name from selected elements to identify that they should be masked.
   * @param select {string} CSS selector for elements that will be unmasked.
   * @memberOf Mask
   */
  Masker.prototype._remaskBySelector = function (select, winRef) {
    utils.removeClass(winRef.document.querySelectorAll(select), "fsrVisible");
  };

  /**
   * Add classname to selected elements to identify that they should not be masked.
   * @param select {string} CSS selector for elements that will be unmasked.
   * @memberOf Mask
   */
  Masker.prototype._unmaskStaticBySelector = function (select, winRef) {
    utils.addClass(winRef.document.querySelectorAll(select), "fsrVisible");
  };

  /**
   * Add classname to selected elements to identify that they should not be masked.
   * @param select {string} CSS selector for elements that will be unmasked.
   * @memberOf Mask
   */
  Masker.prototype._obscureBySelector = function (select, winRef) {
    utils.addClass(winRef.document.querySelectorAll(select), "fsrObscure");
  };

  /**
   * Mask (or unmask) dynamic content
   * @param select {String} CSS selector for element that will be targetted
   * @param winRef {Window} Reference the calling window
   * @param selType {Sting} Apply inline text blocking, event unblocking, or event reBlocking
   * @memberOf Mask
   */
  Masker.prototype._maskDynamicBySelector = function (select, winRef, selType) {
    if (select.length > 0 && typeof(select) == "string") {
      /**
       * Apply static selection action using the selector string
       * Add selector as array to dynamic selector array
       * Use selType to determine action to take.
       */
      if (selType === undefined || selType === "" || selType == "inTxBlk") {
        this._maskStaticBySelector(select, winRef, false);
        this.dynamicSelectorsToMask[this.dynamicSelectorsToMask.length] = select;
      } else if (selType == "evUnblk") {
        this._unmaskStaticBySelector(select, winRef);
        this.dynamicSelectorsToUnmask[this.dynamicSelectorsToUnmask.length] = select;
      } else if (selType == "evReblk") {
        this._remaskBySelector(select, winRef);
        this.dynamicSelectorsToRemask[this.dynamicSelectorsToRemask.length] = select;
      } else if (selType == "DOMWL") {
        this._maskStaticBySelector(select, winRef, true);
        this.dynamicWhiteListUnblocks[this.dynamicWhiteListUnblocks.length] = select;
      }
    }
  };

  /**
   * Unmask dynamic content
   * @param select {String} CSS selectors for elements that will be targeted.
   * @memberOf Mask
   */
  Masker.prototype._unmaskDynamicBySelector = function (select, winRef) {
    this._maskDynamicBySelector(select, winRef, "evUnblk");
  };

  /**
   * Mask dynamic assets
   * @param select {Array} CSS selectors for elements that will be targeted.
   * @memberOf Mask
   */
  Masker.prototype._maskAssetDynamicBySelector = function (select, winRef) {
    // Add the 'fsrHidden' class to all element targeted by select parameter
    utils.addClass(winRef.document.querySelectorAll(select), "fsrHidden");

    /**
     * TODO: Decide in dynamic array objects are shared across iFrames, or if we should divide them up.
     * Force to be an array but support plain strings also
     */
    if (select.length > 0) {
      if (typeof(select) == "string") {
        select = [select];
      }

      // Quickreference the selector list
      var vm = this.dynamicSelectorsToBlockAssets;

      /**
       * Loop over the selectors
       * .. and Add the selector to the list of dynamic masks
       */
      for (var i = 0; i < select.length; i++) {
        vm[vm.length] = select[i];
      }
    }
  };

  /**
   * Remove fsrVisible classname of selected elements to remask them
   * @param select {string} CSS selector for elements that will be unmasked.
   * @memberOf Mask
   * @private
   */
  Masker.prototype._removeVisibility = function (select, winRef) {
    this._maskDynamicBySelector(select, winRef, "evReblk");
  };

  /**
   * Dynamic unblocking
   * @param select
   * @param winRef
   * @private
   */
  Masker.prototype._whiteListUnblockDynamic = function (select, winRef) {
    this._maskDynamicBySelector(select, winRef, "DOMWL");
  };

  /**
   * add classname to array of classes that should not be masked for live site performance reasons
   * @param classStr {string} classname to be added to array
   * @memberOf Mask
   */
  Masker.prototype.addClassToNoMaskArray = function (classStr) {
    this.noMaskClassArray[this.noMaskClassArray.length] = classStr;
  };

  /**
   * Test if node is masked.
   * Checks for child blocking tag comments
   * @param pNode {HTMLElement} Node to be checked for pre existing masking comment tag.
   * @memberOf Mask
   */
  Masker.prototype.isNodeMasked = function (pNode) {
    /**
     * returns true if the target node has no children, because there will be nothing to mask.
     * returns true if target node has been pre-defined as not maskable.
     */
    var maskable = true,
      nm,
      i,
      e;

    if (this.noMaskClassArray.length > 0 && pNode.className) {
      nm = this.noMaskClassArray;
      for (i = 0; i < nm.length; i++) {
        e = nm[i];
        if (pNode.className.indexOf(e) > -1) {
          maskable = false;
        }
        i = e = null;
      }
    }

    if (pNode.childNodes.length < 1 || !maskable) {
      return true;
    } else if (pNode.childNodes[0].data && pNode.childNodes[0].data.indexOf(SESSIONREPLAY_MASK_START_STRING) > -1) {
      return true;
    }

    return false;
  };

  /**
   * If there are any nodes in the parent node that should be (un)masked, or if the parent node is in a node that should be masked, mask them
   * * @param targetNode {HTMLElement} The parent node to look inside.
   * * @param classChange (Boolean) Flag passed in to indicate if this was called on classname change, in which case we skip dynamic masking.
   * @memberOf Mask
   * @private
   */
  Masker.prototype._tagDynamicMaskNodes = function (targetNode, classChange, winRef) {
    // Quickreference the dom
    var i,
      j,
      els,
      context = winRef.document,
      shouldMask = false,
      wlClass = "_fsrWL";

    if (!this.isMasking) {
      // Flag that we are currently applying masking
      this.isMasking = true;

      if (this.useWhiteListing) {
        shouldMask = true;
        // WHITELISTING CASE **********************************************
        if (this.dynamicWhiteListUnblocks.length > 0 && !classChange) {
          // Reference the list of nodes to apply masking to
          els = context.querySelectorAll(this.dynamicWhiteListUnblocks.join(","));

          for (i = 0, j = els.length; i < j; i++) {
            if (Dom.nodeBelongsTo(targetNode, els[i]) || els[i] == targetNode) {
              // Selected Node contains the replacement target, mask the replacement target node.
              // also catches the special case if targetNode and els[i] are both "body"
              // check that the masking tags are not already in place.
              if (!this.isNodeMasked(targetNode)) {
                // this is a change so that comment tags aren't needed to mask the html content. This flag is passed to ProcessHTML (tom 7/11/2012)
                shouldMask = false;
                // once we know that we should mask the html content there is no need to continue looking
                break;
              }
            } // Dom replacement target contains the selected node, mask the selected node
            else if (Dom.nodeBelongsTo(els[i], targetNode)) {
              if (!this.isNodeMasked(els[i]) && !utils.hasClass(els[i], wlClass)) {
                utils.addClass(els[i], wlClass);
                els[i].insertBefore(context.createComment(SESSIONREPLAY_UNBLOCK_START_STRING), els[i].firstChild);
                els[i].appendChild(context.createComment(SESSIONREPLAY_UNBLOCK_END_STRING));
              }
            }
          }
        }

      } else {
        // Collect all the mask nodes
        if (this.dynamicSelectorsToMask.length > 0 && !classChange) {
          els = context.querySelectorAll(this.dynamicSelectorsToMask.join(","));

          for (i = 0, j = els.length; i < j; i++) {
            if (Dom.nodeBelongsTo(targetNode, els[i]) || els[i] == targetNode) {
              /**
               * Selected Node contains the replacement target, mask the replacement target node.
               * also catches the special case if targetNode and els[i] are both "body"
               * check that the masking tags are not already in place.
               */
              if (!this.isNodeMasked(targetNode)) {
                // This is a change so that comment tags aren't needed to mask the html content. This flag is passed to ProcessHTML (tom 7/11/2012)
                shouldMask = true;
                // Once we know that we should mask the html content there is no need to continue looking
                break;
              }
            } // Dom replacement target contains the selected node, mask the selected node
            else if (Dom.nodeBelongsTo(els[i], targetNode)) {
              if (!this.isNodeMasked(els[i])) {
                els[i].insertBefore(context.createComment(SESSIONREPLAY_MASK_START_STRING), els[i].firstChild);
                els[i].appendChild(context.createComment(SESSIONREPLAY_MASK_END_STRING));
              }
            }
          }
        }
      }

      /**
       * Add frsVisible to any new nodes that should be unmasked.
       * Remove visibility from any nodes that shouldn't be visible.
       * Remasking follows unmasking.
       */
      if (this.dynamicSelectorsToUnmask.length > 0) {
        for (i = this.dynamicSelectorsToUnmask.length - 1; i >= 0; i--) {
          utils.addClass(context.querySelectorAll(this.dynamicSelectorsToUnmask[i]), "fsrVisible");
        }
        for (j = this.dynamicSelectorsToRemask.length - 1; j >= 0; j--) {
          utils.removeClass(context.querySelectorAll(this.dynamicSelectorsToRemask[j]), "fsrVisible");
        }
      }

      // Add fsrHidden to any new assets that should be blocked.
      if (this.dynamicSelectorsToBlockAssets.length > 0) {
        for (i = this.dynamicSelectorsToBlockAssets.length - 1; i >= 0; i--) {
          utils.addClass(context.querySelectorAll(this.dynamicSelectorsToBlockAssets[i]), "fsrHidden");
        }
      }
      this.isMasking = false;
    }
    return shouldMask;
  };

  /**
   * Reads selectors from arrays and calls the appropriate functions to handle making elements visible or blocked
   * @param piiArray {object} PII object defining masking technique
   * @param winRef optional argument to provide frame context when masking in iFrames.
   * @memberOf Mask
   */
  Masker.prototype.maskDocument = function (piiObj, winRef) {
    // Get the href of the document. Use location href. If blank, use "about:blank".
    var h = fs.toLowerCase(winRef.location.href || "about:blank");

    // Keep a record of the whitelisting option
    this.useWhiteListing = false;

    // See if there's whitelisting or not
    if (!!piiObj.staticWhiteListEls) {
      for (var wkey in piiObj.staticWhiteListEls) {
        if (piiObj.staticWhiteListEls.hasOwnProperty(wkey) && (h.indexOf(wkey) > -1 || utils.testAgainstSearch(wkey, h))) {
          this.useWhiteListing = true;
          break;
        }
      }
    }

    if (!!piiObj.dynamicWhiteListEls) {
      for (var wdkey in piiObj.dynamicWhiteListEls) {
        if (piiObj.dynamicWhiteListEls.hasOwnProperty(wdkey) && (h.indexOf(wdkey) > -1 || utils.testAgainstSearch(wdkey, h))) {
          this.useWhiteListing = true;
          break;
        }
      }
    }

    // Put it back on the PII object for convenience
    piiObj.useWhiteListing = this.useWhiteListing;

    /* pragma:DEBUG_START */
    console.log("sr: " + (window === window.top ? '' : '[frm] ') + "masking is set to ", this.useWhiteListing ? 'whitelisting' : 'blacklisting');
    /* pragma:DEBUG_END */

    /**
     * Callback for applying masking rules
     * @param eleObj
     * @param fncRef
     * @param winRef
     * @param useWL {Boolean} Use whitelist
     */
    var applyMaskingRule = function (ctx, eleObj, fncRef, winRef, useWL) {
      /**
       * Iterate through the keys in the object (the keys are url wildcards)
       * Apply the masking rule to this element (only if this url has the wildcard)
       */
      for (var key in eleObj) {
        if (h.indexOf(key) > -1 || utils.testAgainstSearch(key, h)) {
          fncRef.call(ctx, eleObj[key], winRef, useWL);
        }
      }
    };

    // Apply the seven masking/unmasking rules
    if (this.useWhiteListing) {
      applyMaskingRule(this, piiObj.staticWhiteListEls, this._maskStaticBySelector, winRef, true);
      applyMaskingRule(this, piiObj.dynamicWhiteListEls, this._whiteListUnblockDynamic, winRef);
    } else {
      applyMaskingRule(this, piiObj.staticBlockEls, this._maskStaticBySelector, winRef);
      applyMaskingRule(this, piiObj.dynamicBlockEls, this._maskDynamicBySelector, winRef);
    }
    applyMaskingRule(this, piiObj.staticVisibleEls, this._unmaskStaticBySelector, winRef);
    applyMaskingRule(this, piiObj.dynamicVisibleEls, this._unmaskDynamicBySelector, winRef);
    applyMaskingRule(this, piiObj.assetBlockEls, this._maskAssetDynamicBySelector, winRef);
    applyMaskingRule(this, piiObj.removeVisibilityEls, this._removeVisibility, winRef);
    applyMaskingRule(this, piiObj.obscureEls, this._obscureBySelector, winRef);
  };

})();