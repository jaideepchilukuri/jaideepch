/**
 * Module for capturing DOM mutations
 *
 * An extension that captures select DOM mutations .
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { ext } from "../../fs/index";
import { EVENT_TYPES } from "./actions";
import { DomResync } from "./domresync";

/**
 * Set to true to diagnose desync issues. This will turn on calculating and
 * sending structural checksums to the worker, as well as re-scanning the
 * dom each frame to ensure the DomTree stays in sync with it.
 *
 * NOTE: very computationally heavy.
 */
const DIAGNOSE_DESYNCS = false;

/**
 * A DOM mutation capture
 * @param {Window} frm
 * @param {Object} config
 * @param {Masker} masker
 * @param {Worker} worker
 * @param {Function} newInfoScanner
 * @param {?} ctxId
 * @param {DomTree} tree
 */
class Mutation {
  constructor(frm, config, masker, worker, newInfoScanner, ctxId, inputCap, tree) {
    // Assign props
    ext(
      this,
      {
        fr: frm,
        config,
        masker,
        worker,
        newInfoScanner,
        inputCap,
        ctx: ctxId,
        tree,
      },
      false
    );

    // Set up the mutation observer
    let MutationObserverCtor;
    if (typeof window.__zone_symbol__MutationObserver !== "undefined") {
      // newer angular/zone.js is nice enough to save a copy of
      // the original MutationObserver for us
      MutationObserverCtor = window.__zone_symbol__MutationObserver;
    } else if (typeof window.WebKitMutationObserver !== "undefined") {
      MutationObserverCtor = window.WebKitMutationObserver;
    } else {
      MutationObserverCtor = MutationObserver;
    }

    if (MutationObserverCtor.name !== "MutationObserver") {
      // danger, angular/zone.js monkey patch detected!!!
      const inst = new MutationObserverCtor(() => {});
      if (inst.__zone_symbol__originalInstance) {
        // This should work in angular 4-5, zone.js 0.6ish
        MutationObserverCtor = inst.__zone_symbol__originalInstance.constructor;
      } else if (inst._zone$originalInstance) {
        // This will hopefully work angular 3-, zone.js 0.5-
        MutationObserverCtor = inst._zone$originalInstance.constructor;
      }
    }

    /* pragma:DEBUG_START */
    if (MutationObserverCtor.name !== "MutationObserver") {
      console.error("MutationObserver looks like its monkey patched!!! (or this is IE)");
    }
    /* pragma:DEBUG_END */

    this.ob = new MutationObserverCtor(this._handleMutation.bind(this));

    this.ob.observe(frm.document.documentElement, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false,
    });
  }

  /**
   * Clean up and process the incoming mutations
   * @private
   */
  _handleMutation(summaries) {
    let sum;
    let i;
    let k;
    let targ;
    let targt;
    let el;
    let elo;
    let elop;
    const modQueue = [];
    const worker = this.worker;
    const masker = this.masker;
    const shouldScanFramesInputs = [];
    const tree = this.tree;
    let fn;
    let resyncAdded = 0;
    let resyncRemoved = 0;
    let newAttr;
    let maskingChanged = false;

    const resync = new DomResync(this.fr.document.documentElement, tree, {
      add: (el, node, index) => {
        /* pragma:DEBUG_START */
        console.warn("Resync, add:", el, node, "at", index);
        /* pragma:DEBUG_END */
        resyncAdded++;
        this._addElement(modQueue, shouldScanFramesInputs, el, node, index);
      },
      remove: (el, node) => {
        /* pragma:DEBUG_START */
        console.warn("Resync, remove:", el, node);
        /* pragma:DEBUG_END */
        resyncRemoved++;
        this._removeElement(modQueue, el, node);
      },
    });

    // First scan to see if we need to rescan masking targets.
    // Only update once and stop checking once you do it
    if (!masker.piiObj.noRules) {
      fn = (acc, nd) => {
        acc = acc || 0;
        const tagName = (nd.tagName || "").toUpperCase();
        if (nd.nodeType === 1 && tagName != "SCRIPT" && tagName != "LINK" && tagName != "IFRAME") {
          return acc + 1;
        }
        return acc + 0;
      };
    } else {
      // do nothing
      fn = () => 0;
    }

    // first pass, figure out if nodes have moved and check masking for updates
    let changedNodes = 0;
    for (i = 0; i < summaries.length; i++) {
      sum = summaries[i];
      if (sum.addedNodes.length > 0) {
        // Only rescan for masking if there any actual meaningful nodes added
        changedNodes += Array.prototype.reduce.call(sum.addedNodes, fn, changedNodes);
      } else if (
        sum.type === "attributes" &&
        (sum.attributeName === "class" ||
          sum.attributeName === "fsrVisibile" ||
          sum.attributeName === "id")
      ) {
        // also, some attribute changes can cause nodes to change masking state
        changedNodes++;
      }

      if (sum.type === "childList" && tree.get(sum.target)) {
        for (k = 0; k < sum.removedNodes.length; k++) {
          // Update masking targets
          changedNodes++;
        }
      }
    }

    if (changedNodes > 0) {
      // Do a rescan
      maskingChanged = masker.updateMaskingTargets();
    }

    // Now scan a 2nd time and handle each set
    for (i = 0; i < summaries.length; i++) {
      sum = summaries[i];
      targ = sum.target;
      targt = tree.get(targ);
      if (sum.type == "attributes") {
        if (!targt) {
          // ignore attribute changes on elements later deleted
          continue;
        }
        targt.a = targt.a || {};
        newAttr = targ.getAttribute(sum.attributeName);

        // This will get the absolute url instead of a relative url for the asset
        // to avoid a bug when the page url changes after load
        if (
          (sum.attributeName === "href" || sum.attributeName === "src") &&
          targ[sum.attributeName] &&
          targ.nodeName !== "A" &&
          targ.nodeName !== "AREA" &&
          targ.nodeName !== "SCRIPT"
        ) {
          newAttr = targ[sum.attributeName];
        }

        if (newAttr === targt.a[sum.attributeName]) {
          // ignore this event if we already have the new value
          // this ignores intermediate values sometimes but that's a limitation
          // of mutation observers
          continue;
        }
        targt.a[sum.attributeName] = newAttr;

        /**
         * ATTR_MODIFIED: An attribute has been modified on a node
         */
        modQueue.push({
          e: EVENT_TYPES.ATTR_MODIFIED,
          d: {
            /**
             * The id of the parent frame
             * @type {number}
             */
            ctx: this.ctx,

            /**
             * The id of the DomTree node to modify
             * @type {number}
             */
            id: targt.id,

            /**
             * The key name of the attribute to modify
             * @type {string}
             */
            attr: sum.attributeName,

            /**
             * The new value of the attribute
             * @type {string}
             */
            val: targt.a[sum.attributeName],

            /**
             * The tag name of the element.
             * For asset preloading/proxy.
             * @type {string}
             */
            tn: targt.n,

            /**
             * The rel attribute of the element if it exists, or zero.
             * For asset preloading/proxy.
             * @type {string | 0}
             */
            r: targt.a.rel || 0, // rel if it exists
          },
        });
      } else if (sum.type == "characterData") {
        if (!targt) {
          // ignore text changes on elements later deleted
          continue;
        }
        targt.v = targ.nodeValue;

        /**
         * CHAR_DATA: The value of a text node has changed
         */
        modQueue.push({
          e: EVENT_TYPES.CHAR_DATA,
          d: {
            /**
             * Id of the frame
             * @type {number}
             */
            ctx: this.ctx,

            /**
             * ID of the DomTree node
             * @type {number}
             */
            id: targt.id,

            /**
             * New value of the text contents of the node
             * @type {string}
             */
            v: targ.nodeValue,
          },
        });
      } else if (sum.type == "childList") {
        resync.addChangedEl(targ);

        // Handle removed nodes
        for (let j = 0; j < sum.removedNodes.length; j++) {
          el = sum.removedNodes[j];

          if (!tree.get(el)) {
            // Ignore elements we never knew about
            continue;
          }

          targt = this.tree.remove(el);

          this._removeElement(modQueue, el, targt);
        }

        // Handle added nodes
        for (let j = 0; j < sum.addedNodes.length; j++) {
          el = sum.addedNodes[j];
          elo = tree.get(el);
          elop = tree.get(targ);

          if (!elop) {
            // ignore add when no known parent
            continue;
          }

          if (
            elo ||
            !this.fr.document.documentElement.contains(el) ||
            !el.parentNode ||
            !tree.get(el.parentNode)
          ) {
            // Ignore elements already added, or have no parent node
            continue;
          }

          elo = tree.add(el.parentNode, el);

          elop = tree.getById(elo.p);

          this._addElement(modQueue, shouldScanFramesInputs, el, elo, elop.c.indexOf(elo));
        }
      } else {
        throw new Error(`Unknown type: ${sum.type}`);
      }
    }

    if (!resync.check()) {
      /* pragma:DEBUG_START */
      console.warn(
        "Dom sync repaired by adding",
        resyncAdded,
        "node and removing",
        resyncRemoved,
        "nodes"
      );
      /* pragma:DEBUG_END */
    }

    // send the masking targets to the worker before we send any
    // dom mutations, so the worker knows what to mask
    if (maskingChanged) {
      masker.sendMaskingTargets(worker, tree, this.ctx);
    }

    // Now we queue the changed nodes
    if (modQueue.length > 0) {
      worker.queueAction(EVENT_TYPES.MOD_LIST, modQueue);
    }

    // Signal Rescan for IFrames
    if (shouldScanFramesInputs.length > 0) {
      this.newInfoScanner(shouldScanFramesInputs);
    }
  }

  _removeElement(modQueue, el, node) {
    // Stop tracking any inputs
    this.inputCap.untrackInputs(el);

    /**
     * NODE_REMOVED: Remove a node from the tree
     */
    modQueue.push({
      e: EVENT_TYPES.NODE_REMOVED,
      d: {
        /**
         * The id of the parent frame
         * @type {number}
         */
        ctx: this.ctx,

        /**
         * The id of the node to remove
         * @type {number}
         */
        id: node.id,

        /* PRAGMA:DEBUG_START */
        s: DIAGNOSE_DESYNCS ? this.tree.checksum() : undefined,
        /* PRAGMA:DEBUG_END */
      },
    });
  }

  _addElement(modQueue, shouldScanFramesInputs, el, node, index) {
    // need to clone the tree because it can be modified later
    // not sure if there is a faster way to do this?
    const copyOfNode = JSON.parse(JSON.stringify(node));

    /**
     * NODE_ADDED: Add a new node (and subtree) to the tree
     */
    modQueue.push({
      e: EVENT_TYPES.NODE_ADDED,
      d: {
        /**
         * The id of the parent frame
         * @type {number}
         */
        ctx: this.ctx,

        /**
         * The DomTree representation of the node and its children.
         * Will include p to signify what the parent id of the node is where
         * the node will be grafted into the tree.
         * @type {object}
         */
        tree: copyOfNode,

        /**
         * The index in the new parent's children list.
         * @type {number}
         */
        idx: index,

        /* PRAGMA:DEBUG_START */
        s: DIAGNOSE_DESYNCS ? this.tree.checksum() : undefined,
        /* PRAGMA:DEBUG_END */
      },
    });

    // Should we look for iframes or new inputs?
    if (el.nodeType === 1 && shouldScanFramesInputs.indexOf(el) == -1) {
      shouldScanFramesInputs.push(el);
    }
  }

  /**
   * Dispose of the mutation class
   */
  dispose() {
    // Handle the mutation
    this.ob.disconnect();

    // Summaries has whatever diffs are remaining
    this.fr = null;
    this.newInfoScanner = null;
  }
}

export { Mutation };
