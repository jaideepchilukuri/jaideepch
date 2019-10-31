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
     * This is the max amount of data we will hold on to before
     * compressing it and sending it back to the main thread to be
     * persisted in a more reliable way before transmit flag is turned
     * on (corked mode).
     *
     * Another consideration for this size: it takes roughly 100 ms to
     * compress 1MB. So if the page unloads any hoarded data will be
     * compressed on the main thread. This will get noticable if this
     * is set to too large of a number.
     */
    var MAX_CORKED_DATA_SIZE = 1 * 1024 * 1024;

    /**
     * This is the target size for compressed data once the transmit
     * flag has been turned on (uncorked mode).
     *
     * SendBeacon data limit is 64KB, so we need to try to avoid going
     * over this size in case the page unexpectedly unloads.
     */
    var MAX_UNCORKED_COMPRESSED_SIZE = 50 * 1024;

    /**
     * Handles logging
     */
    var Logger = function (fs, Compress, Differ, tree, censor, EVENT_TYPES, payloadReadyCB, partialCB) {
      fs.ext(this, {
        Differ: Differ,
        Compress: Compress,
        tree: tree,
        censor: censor,
        log: [],
        types: EVENT_TYPES,
        payloadReady: payloadReadyCB || function () { },
        partial: partialCB || function () { },
        // conservative default size, will be adjusted on first
        // pinch after initial payload has been compressed
        dataSizeGoal: MAX_UNCORKED_COMPRESSED_SIZE * 2,
        firstPacket: true,

        // we start in the corked state and operate that way until uncorked
        corked: true,
        dataSize: 0
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
     * We start off in a corked state where we hoard as much data
     * as possible to make compression ratios good. Then when uncorked
     * we dump the hoarded data and begin more regular packet sending.
     */
    Logger.prototype.uncork = function () {
      this.corked = false;
      this.pinch();
    };


    /**
     * Handle the wrapup message
     */
    Logger.prototype.wrapup = function () {
      if (this.corked) return;
      this.pinch();
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

      // send back partial processed but not compressed yet data
      // the mule may compress this and transmit it if necessary
      this.partial(arr);

      // Add it to the list of events
      this.log = this.log.concat(arr);

      this.dataSize += JSON.stringify(arr).length;

      if (
        this.dataSize >= MAX_CORKED_DATA_SIZE ||
        (!this.corked && this.dataSize >= this.dataSizeGoal)
      ) {
        this.pinch();
      }
    };

    /**
     * Close off a block, clean, and compress
     * @param {Array} arr
     */
    Logger.prototype.pinch = function () {
      // Compress
      if (this.log.length > 0) {
        /* pragma:DEBUG_START */
        var startTime = Date.now();
        /* pragma:DEBUG_END */


        var payload = this.Compress.compress(JSON.stringify(this.log));

        if (!this.firstPacket) {
          // After the initial page marker packet we dynamically adjust
          // the dataSizeGoal to ensure we adjust for how compressible
          // the data generated by the page is.
          var compressionRatio = payload.length / this.dataSize;
          this.dataSizeGoal = Math.floor(MAX_UNCORKED_COMPRESSED_SIZE / compressionRatio);
        }
        this.firstPacket = false;

        /* pragma:DEBUG_START */
        console.log(
          'srw: pinched ' +
          this.dataSize + ' bytes down to ' +
          payload.length + ' in ' +
          (Date.now() - startTime) +
          ' ms, new goal size: ' +
          this.dataSizeGoal
        );
        /* pragma:DEBUG_END */

        this.payloadReady(payload);
        this.log = [];
        this.dataSize = 0;
      }
    };

    // Return the logger
    return Logger;
  };

})();