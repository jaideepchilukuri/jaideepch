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

fs.provide("rec.Capture.Mutation");

fs.require("rec.Top");
fs.require("rec.Capture.DomTree");
fs.require("rec.Capture.DomResync");

(function () {

  /**
   * Set to true to diagnose desync issues. This will turn on calculating and
   * sending structural checksums to the worker, as well as re-scanning the
   * dom each frame to ensure the DomTree stays in sync with it.
   *
   * NOTE: very computationally heavy.
   */
  var DIAGNOSE_DESYNCS = false;

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
  var Mutation = function (frm, config, masker, worker, newInfoScanner, ctxId, inputCap, urlmd5, tree) {
    // Assign props
    fs.ext(this, {
      fr: frm,
      config: config,
      masker: masker,
      worker: worker,
      newInfoScanner: newInfoScanner,
      inputCap: inputCap,
      ctx: ctxId,
      urlmd5: urlmd5,
      tree: tree
    }, false);

    // Set up the mutation observer
    var MutationObserverCtor;
    if (typeof WebKitMutationObserver !== 'undefined') {
      MutationObserverCtor = WebKitMutationObserver;
    } else {
      MutationObserverCtor = MutationObserver;
    }

    this.ob = new MutationObserverCtor(this._handleMutation.bind(this));
    this.ob.observe(frm.document.documentElement, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false
    });
  };

  /**
   * Clean up and process the incoming mutations
   * @private
   */
  Mutation.prototype._handleMutation = function (summaries) {
    var sum,
      i,
      j,
      k,
      targ,
      targt,
      el,
      elo,
      elop,
      modQueue = [],
      worker = this.worker,
      masker = this.masker,
      shouldScanFramesInputs = [],
      tree = this.tree,
      maskingChanges,
      fn,
      maybeMoved = new Map(),
      moved = new Map(),
      resyncAdded = 0,
      resyncRemoved = 0,
      resync = new DomResync(this.fr.document.documentElement, tree, {
        add: function (el, node, index) {
          /* pragma:DEBUG_START */
          console.warn("Resync, add:", el, node, "at", index);
          /* pragma:DEBUG_END */
          resyncAdded++;
          this._addElement(modQueue, shouldScanFramesInputs, el, node, index);
        }.bind(this),
        remove: function (el, node) {
          /* pragma:DEBUG_START */
          console.warn("Resync, remove:", el, node);
          /* pragma:DEBUG_END */
          resyncRemoved++;
          this._removeElement(modQueue, el, node);
        }.bind(this)
      });

    // First scan to see if we need to rescan masking targets.
    // Only update once and stop checking once you do it
    if (!masker.piiObj.noRules) {
      fn = function (acc, nd) {
        acc = acc || 0;
        if (nd.nodeType === 1 && nd.tagName != "SCRIPT" && nd.tagName != "LINK" && nd.tagName != "IFRAME") {
          return acc + 1;
        }
        return acc + 0;
      };
    } else {
      // do nothing
      fn = function () { return 0; };
    }

    // first pass, figure out if nodes have moved and check masking for updates
    for (i = 0; i < summaries.length; i++) {
      sum = summaries[i];
      if (sum.addedNodes.length > 0) {
        // Only rescan for masking if there any actual meaningful nodes added
        j = Array.prototype.reduce.call(sum.addedNodes, fn, j);
      } else if (sum.type === "attributes" && sum.attributeName === "class") {
        // also, class changes can cause nodes to change masking state
        j++;
      }

      if (sum.type === "childList" && tree.get(sum.target)) {
        for (k = 0; k < sum.removedNodes.length; k++) {
          if (tree.get(sum.removedNodes[k])) {
            maybeMoved.set(sum.removedNodes[k], sum.target);
          }
        }
        for (k = 0; k < sum.addedNodes.length; k++) {
          targ = sum.addedNodes[k];
          if (maybeMoved.has(targ)) {
            moved.set(targ, (moved.get(targ) || []).concat({
              from: maybeMoved.get(targ),
              to: sum.target
            }));
            maybeMoved.delete(targ);
          }
        }
      }
    }

    if (j > 0) {
      // Do a rescan
      maskingChanges = masker.updateMaskingTargets();
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
        if (targ.getAttribute(sum.attributeName) === targt.a[sum.attributeName]) {
          // ignore this event if we already have the new value
          // this ignores intermediate values sometimes but that's a limitation
          // of mutation observers
          continue;
        }
        targt.a[sum.attributeName] = targ.getAttribute(sum.attributeName);

        /**
         * ATTR_MODIFIED: An attribute has been modified on a node
         * {
         *   ctx: the id of the parent iframe
         *   id: the id of the node to modify
         *   attr: the key of the attribute to modify
         *   val: the new value of the attribute
         * }
         */
        modQueue.push({
          e: EVENT_TYPES.ATTR_MODIFIED,
          d: {
            "ctx": this.ctx,
            "id": targt.id,
            "attr": sum.attributeName,
            "val": targt.a[sum.attributeName]
          }
        });
      } else if (sum.type == "characterData") {
        if (!targt) {
          // ignore text changes on elements later deleted
          continue;
        }
        targt.v = targ.nodeValue;

        /**
         * CHAR_DATA: The value of a text node has changed
         * {
         *   ctx: the id of the parent iframe
         *   id: the id of the node to modify
         *   v: the new value of the text node
         *   urlmd5: md5 of the url
         * }
         */
        modQueue.push({
          e: EVENT_TYPES.CHAR_DATA,
          d: {
            "ctx": this.ctx,
            "id": targt.id,
            "v": targ.nodeValue
          }
        });
      } else if (sum.type == "childList") {
        resync.addChangedEl(targ);

        // Handle removed nodes
        for (j = 0; j < sum.removedNodes.length; j++) {
          el = sum.removedNodes[j];
          if (moved.has(el) && tree.get(el)) {
            // Skip moved nodes for now
            continue;
          }

          if (!tree.get(el)) {
            // Ignore elements we never knew about
            continue;
          }

          targt = this.tree.remove(el);

          this._removeElement(modQueue, el, targt);
        }

        // Handle added nodes
        for (j = 0; j < sum.addedNodes.length; j++) {
          el = sum.addedNodes[j];
          elo = tree.get(el);
          elop = tree.get(targ);

          if (!elop) {
            // ignore add when no known parent
            continue;
          }

          if (elo && moved.has(el)) {
            // handle moving nodes

            if (moved.has(el)) {
              moved.get(el).shift();
              if (moved.get(el).length < 1) {
                moved.delete(el);
              }
            }

            var pelo = tree.getById(elo.p);
            if (elop.id === elo.p && Array.prototype.indexOf.call(targ, el) === pelo.c.indexOf(elo)) {
              // ignore move when it's already there
              continue;
            }

            var oldindex = pelo.c.indexOf(elo);

            // Handle move
            tree.move(el, targ, sum.previousSibling, sum.nextSibling);

            /**
             * NODE_MOVED: Move (reparent) a node from one branch to another
             * {
             *   ctx: the id of the parent iframe
             *   id: the id of the node to move
             *   p: the new parent of the node
             *   idx: the index in the child list of the parent to insert at
             *   urlmd5: the md5 of the url
             *   s: optional structural checksum of the tree state after move
             * }
             */
            modQueue.push({
              e: EVENT_TYPES.NODE_MOVED,
              d: {
                "ctx": this.ctx,
                "id": elo.id,
                "p": elop.id,
                "idx": elop.c.indexOf(elo),
                /* PRAGMA:DEBUG_START */
                "s": DIAGNOSE_DESYNCS ? tree.checksum() : undefined
                /* PRAGMA:DEBUG_END */
              }
            });
          } else {
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
        }
      } else {
        throw new Error("Unknown type: " + sum.type);
      }
    }

    if (!resync.check()) {
      /* pragma:DEBUG_START */
      console.warn("Dom sync repaired by adding", resyncAdded, "node and removing", resyncRemoved, "nodes");
      /* pragma:DEBUG_END */
    }

    // Now we update the masking
    if (maskingChanges && maskingChanges.hasChanges) {
      // There WAS new masking stuff to deal with
      Mutation.markTreeMaskingChanges(tree, maskingChanges, this.ctx, modQueue);
    }

    // Now we queue the changed nodes
    if (modQueue.length > 0) {
      worker.queueAction(EVENT_TYPES.MOD_LIST, modQueue);
    }

    // Signal Rescan for IFrames
    if (shouldScanFramesInputs.length > 0) {
      this.newInfoScanner(shouldScanFramesInputs);
    }
  };

  Mutation.prototype._removeElement = function (modQueue, el, node) {
    // Update masking targets
    this.masker.removeNodeFromMaskingTargets(el);

    // Stop tracking any inputs
    this.inputCap.untrackInputs(el);

    /**
     * NODE_REMOVED: Remove a node from the tree
     * {
     *   ctx: the id of the parent iframe
     *   id: the id of the node to remove
     *   s: optional structural checksum of the tree state after removal
     * }
     */
    modQueue.push({
      e: EVENT_TYPES.NODE_REMOVED,
      d: {
        "ctx": this.ctx,
        "id": node.id,
        /* PRAGMA:DEBUG_START */
        "s": DIAGNOSE_DESYNCS ? tree.checksum() : undefined
        /* PRAGMA:DEBUG_END */
      }
    });
  };

  Mutation.prototype._addElement = function (modQueue, shouldScanFramesInputs, el, node, index) {
    /**
     * NODE_ADDED: Add a new node (and subtree) to the tree
     * {
     *   ctx: the id of the parent iframe
     *   tree: the subtree to be added (see DomTree for format)
     *   idx: the index in the child list of the parent to insert at
     *   urlmd5: the md5 of the url
     *   s: optional structural checksum of the tree state after add
     * }
     */
    modQueue.push({
      e: EVENT_TYPES.NODE_ADDED,
      d: {
        "ctx": this.ctx,
        // need to clone the tree because it can be modified later
        // not sure if there is a faster way to do this?
        "tree": JSON.parse(JSON.stringify(node)),
        "idx": index,
        /* PRAGMA:DEBUG_START */
        "s": DIAGNOSE_DESYNCS ? this.tree.checksum() : undefined
        /* PRAGMA:DEBUG_END */
      }
    });

    // Should we look for iframes or new inputs?
    if (el.nodeType === 1 && shouldScanFramesInputs.indexOf(el) == -1) {
      shouldScanFramesInputs.push(el);
    }
  };

  /**
   * Apply all the masking updates to our tree
   * @param {*} maskingChanges
   */
  Mutation.markTreeMaskingChanges = function (tree, maskingChanges, ctx, mods) {
    var kind,
      i,
      els,
      node;

    for (kind in maskingChanges) {
      els = maskingChanges[kind];
      for (i = 0; i < els.length; i++) {
        node = tree.get(els[i]);
        node[kind] = true;

        // TODO: it might be possible to refactor this for newly added
        // nodes so they don't get sent to the server twice

        // the worker has no way to unmask content that has been
        // previously masked, or vice versa, so we fake this by
        // removing and re-adding the nodes that were masked
        mods.push({
          e: EVENT_TYPES.NODE_REMOVED,
          d: {
            "ctx": ctx,
            "id": node.id,
          }
        });
        mods.push({
          e: EVENT_TYPES.NODE_ADDED,
          d: {
            "ctx": ctx,
            // need to clone the tree because it can be modified later
            // not sure if there is a faster way to do this?
            "tree": JSON.parse(JSON.stringify(node)),
            "idx": tree.getById(node.p).c.indexOf(node)
          }
        });
      }
    }
  };

  /**
   * Dispose of the mutation class
   */
  Mutation.prototype.dispose = function () {
    // Handle the mutation
    this.ob.disconnect();

    // Summaries has whatever diffs are remaining
    this.fr = null;
    this.newInfoScanner = null;
  };

})();