/**
 * Logger. Runs inside the WebWorker
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Data.Log");

fs.require("rec.Top");

(function () {
  // Wrap in an iffy
  var ___log = function () {
    /**
     * Handles logging
     */
    var Logger = function (fs, Compress, Differ, tree, censor, EVENT_TYPES, payloadReadyCB) {
      fs.ext(this, {
        Differ: Differ,
        Compress: Compress,
        tree: tree,
        censor: censor,
        log: [],
        types: EVENT_TYPES,
        payloadReady: payloadReadyCB || function () { }
      }, false);
    };

    /**
     * Verifies the checksum is correct, emitting a helpful error if not.
     * @param {string} operation
     * @param {DomTree} tree
     * @param {number} sum
     */
    Logger.prototype.checkChecksum = function (operation, tree, sum) {
      /* pragma:DEBUG_START */
      // note: will not run if DIAGNOSE_DESYNCS is false
      if (sum && tree.checksum) {
        if (tree.checksum() !== sum) {
          console.error("Failed checksum while doing", operation);
        }
      }
      /* pragma:DEBUG_END */
    };

    /**
     * Add an array of events to the log
     * @param {Array} arr
     */
    Logger.prototype.addEvents = function (arr) {
      var tree = this.tree,
        censor = this.censor,
        el;

      // Apply the masking
      arr.forEach(function (evt) {
        if (evt.d) {
          // Dom Serialize event
          if (evt.e == this.types.PAGE_MARKER && evt.d.doc) {
            // console.error("Page marker");
            el = tree.import(evt.d.doc);
            censor.clean(el);
            censor.censor(el);
            evt.d.doc = JSON.parse(JSON.stringify(el));
          } else if (evt.e == this.types.MOD_LIST) {
            evt.d.forEach(function (modevt) {
              switch (modevt.e) {
                case (this.types.ATTR_MODIFIED):
                  el = tree.getById(modevt.d.id);
                  el.a = el.a || {};
                  el.a[modevt.d.attr] = modevt.d.val;
                  censor.clean(el);
                  modevt.d.val = el.a[modevt.d.attr];
                  break;
                case (this.types.CHAR_DATA):
                  el = tree.getById(modevt.d.id);
                  el.v = modevt.d.v;
                  censor.censor(el);
                  modevt.d.v = el.v;
                  break;
                case (this.types.NODE_REMOVED):
                  // console.error("Node removed");
                  tree.removeById(modevt.d.id);
                  this.checkChecksum("removing node", tree, modevt.d.s);
                  break;
                case (this.types.NODE_ADDED):
                  tree.insert(modevt.d.idx, modevt.d.tree);
                  censor.clean(modevt.d.tree);
                  censor.censor(modevt.d.tree);
                  modevt.d.tree = JSON.parse(JSON.stringify(modevt.d.tree));
                  this.checkChecksum("adding node", tree, modevt.d.s);
                  break;
                case (this.types.NODE_MOVED):
                  // console.error("Node moved");
                  tree.moveById(modevt.d.id, modevt.d.p, modevt.d.idx);
                  censor.clean(tree.getById(modevt.d.id));
                  censor.censor(tree.getById(modevt.d.id));
                  this.checkChecksum("moving node", tree, modevt.d.s);
                  break;
              }
            }.bind(this));
          } else if (evt.e === this.types.KEY_PRESS) {
            var diff = this.Differ(evt.d.v0, evt.d.v1);
            el = tree.getById(evt.d.id);
            delete evt.d.v0;
            delete evt.d.v1;
            if (diff) {
              if (!el.whitelist) {
                diff.v = this.censor.maskString(diff.v);
              }
              evt.d.s = diff.s;
              evt.d.e = diff.e;
              evt.d.v = diff.v;
            }
          } else if (evt.e === this.types.INPUT_SERIALIZE) {
            if (evt.d.v) {
              el = tree.getById(evt.d.id);
              if (!el.whitelist) {
                evt.d.v = this.censor.maskString(evt.d.v);
              }
            }
          }
        }
      }.bind(this));

      // Add it to the list of events
      this.log = this.log.concat(arr);
      if (this.log.length > 10000) {
        this.pinch();
      }
    };

    /**
     * Close off a block, clean, and compress
     * @param {Array} arr
     */
    Logger.prototype.pinch = function () {
      // Compress
      this.payloadReady(this.Compress.compress(JSON.stringify(this.log)));
      this.log = [];
    };

    // Return the logger
    return Logger;
  };

})();