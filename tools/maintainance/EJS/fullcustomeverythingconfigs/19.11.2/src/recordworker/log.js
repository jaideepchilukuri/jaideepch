/**
 * Logger. Runs inside the WebWorker
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { EVENT_TYPES } from "../record/capture/actions";
import { Differ } from "./diff";
import { TreeCensor } from "./treecensor";

let compress;

// shim to grab a reference to the Compress library
self._fsDefine = (mods, code) => {
  const exp = {};
  code(exp);
  compress = exp.compress;
};

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
const MAX_CORKED_DATA_SIZE = 1 * 1024 * 1024;

/**
 * This is the target size for compressed data once the transmit
 * flag has been turned on (uncorked mode).
 *
 * SendBeacon data limit is 64KB, so we need to try to avoid going
 * over this size in case the page unexpectedly unloads.
 */
const MAX_UNCORKED_COMPRESSED_SIZE = 50 * 1024;

/**
 * Handles logging
 */
class Logger {
  constructor(tree, pii, payloadReadyCB, partialCB) {
    this.tree = tree;
    this.censorFactory = () => new TreeCensor(tree, pii);
    this.censor = new Map();
    this.censorFrames = new Set();
    this.log = [];
    this.payloadReady = payloadReadyCB;
    this.partial = partialCB;

    // conservative default size, will be adjusted on first
    // pinch after initial payload has been compressed
    this.dataSizeGoal = MAX_UNCORKED_COMPRESSED_SIZE * 2;
    this.firstPacket = true;

    // we start in the corked state and operate that way until uncorked
    this.corked = true;

    this.dataSize = 0;
  }

  /**
   * Verifies the checksum is correct, emitting a helpful error if not.
   * @param {string} operation
   * @param {DomTree} tree
   * @param {number} sum
   */
  checkChecksum(operation, tree, sum) {
    /* pragma:DEBUG_START */
    // note: will not run if DIAGNOSE_DESYNCS is false
    if (sum && tree.checksum) {
      if (tree.checksum() !== sum) {
        console.error("Failed checksum while doing", operation);
      }
    }
    /* pragma:DEBUG_END */
  }

  /**
   * We start off in a corked state where we hoard as much data
   * as possible to make compression ratios good. Then when uncorked
   * we dump the hoarded data and begin more regular packet sending.
   */
  uncork() {
    this.corked = false;
    if (this.firstPacket && this.log.length === 0) {
      this.uncorkedRecently = true;
    }
    this.pinch();
  }

  /**
   * Handle the wrapup message
   */
  wrapup() {
    if (this.corked) return;
    this.pinch();
  }

  /**
   * Add an array of events to the log
   * @param {Array} arr
   */
  addEvents(arr) {
    const tree = this.tree;
    let el;

    // Apply the masking
    arr.forEach(evt => {
      if (evt.d) {
        const censor = this.getCensorForFrame(evt.d.ctx);

        // Dom Serialize event
        if (evt.e === EVENT_TYPES.MASKING_CHANGE) {
          censor.updateMaskingTargets(evt.d.targets);
        } else if (evt.e == EVENT_TYPES.PAGE_MARKER && evt.d.doc) {
          el = tree.import(evt.d.doc);

          if (evt.d.maskingTargets) {
            // update masking targets unless it's a non-recorded (blacklisted) page
            censor.updateMaskingTargets(evt.d.maskingTargets);
            delete evt.d.maskingTargets;
          }

          censor.clean(el);
          censor.censor(el);
          censor.added(el);
          const changed = [];
          this.addCensorChangedNodes(changed);
          /* pragma:DEBUG_START */
          if (changed.length > 0) {
            throw new Error(`Should not have changes already: ${JSON.stringify(changed, null, 2)}`);
          }
          /* pragma:DEBUG_END */
          evt.d.doc = JSON.parse(JSON.stringify(el));
        } else if (evt.e == EVENT_TYPES.MOD_LIST) {
          evt.d.forEach(modevt => {
            const censor = this.getCensorForFrame(modevt.d.ctx);

            switch (modevt.e) {
              case EVENT_TYPES.ATTR_MODIFIED:
                el = tree.getById(modevt.d.id);
                el.a = el.a || {};
                el.a[modevt.d.attr] = modevt.d.val;
                censor.clean(el);
                if (modevt.d.attr === "value") {
                  censor.updateOriginalValue(modevt.d.id, modevt.d.val);
                }
                modevt.d.val = el.a[modevt.d.attr];
                break;
              case EVENT_TYPES.CHAR_DATA:
                el = tree.getById(modevt.d.id);
                el.v = modevt.d.v;
                censor.censor(el);
                censor.added(el);
                modevt.d.v = el.v;
                break;
              case EVENT_TYPES.NODE_REMOVED:
                // console.error("Node removed");
                censor.removeOriginalValue(modevt.d.id);
                tree.removeById(modevt.d.id);
                /* pragma:DEBUG_START */
                this.checkChecksum("removing node", tree, modevt.d.s);
                /* pragma:DEBUG_END */
                break;
              case EVENT_TYPES.NODE_ADDED:
                tree.insert(modevt.d.idx, modevt.d.tree);
                censor.clean(modevt.d.tree);
                censor.censor(modevt.d.tree);
                censor.added(modevt.d.tree);
                modevt.d.tree = JSON.parse(JSON.stringify(modevt.d.tree));
                /* pragma:DEBUG_START */
                this.checkChecksum("adding node", tree, modevt.d.s);
                /* pragma:DEBUG_END */
                break;
              default:
                throw new Error(`Unsupported DOM mutation type ${modevt.e}`);
            }
          });

          this.addCensorChangedNodes(evt.d);
        } else if (evt.e === EVENT_TYPES.KEY_PRESS) {
          const diff = Differ(evt.d.v0, evt.d.v1);
          el = tree.getById(evt.d.id);
          if (diff) {
            if (censor.isInputMasked(el)) {
              censor.updateOriginalValue(evt.d.id, evt.d.v1);
              diff.v = censor.maskString(diff.v);
            }
            evt.d.s = diff.s;
            evt.d.e = diff.e;
            evt.d.v = diff.v;
          }
          delete evt.d.v0;
          delete evt.d.v1;
        } else if (evt.e === EVENT_TYPES.INPUT_SERIALIZE) {
          if (evt.d.v) {
            el = tree.getById(evt.d.id);
            if (censor.isInputMasked(el)) {
              censor.updateOriginalValue(evt.d.id, evt.d.v);
              evt.d.v = censor.maskString(evt.d.v);
            }
          }
        }
      }
    });

    // don't transmit any MASKING_CHANGE events to the server, they are
    // just for worker
    arr = arr.filter(evt => evt.e !== EVENT_TYPES.MASKING_CHANGE);

    // send back partial processed but not compressed yet data
    // the mule may compress this and transmit it if necessary
    this.partial(arr);

    // Add it to the list of events
    this.log = this.log.concat(arr);

    this.dataSize += JSON.stringify(arr).length;

    if (
      this.dataSize >= MAX_CORKED_DATA_SIZE ||
      (!this.corked && this.dataSize >= this.dataSizeGoal) ||
      this.uncorkedRecently
    ) {
      this.uncorkedRecently = false;
      this.pinch();
    }
  }

  getCensorForFrame(ctx) {
    if (ctx == null) return null;
    // get the censor for this specific frame so the frames don't clobber
    // each other's masking state
    if (!this.censor.has(ctx)) {
      this.censor.set(ctx, this.censorFactory());
    }
    this.censorFrames.add(ctx);
    return this.censor.get(ctx);
  }

  addCensorChangedNodes(changed) {
    this.censorFrames.forEach(ctx => {
      const nodes = this.censor.get(ctx).determineNodesToResend();
      nodes.forEach(node => {
        const idx =
          node.p > 0 && this.tree.getById(node.p) ? this.tree.getById(node.p).c.indexOf(node) : 0;

        // fake a node removal
        changed.push({
          e: EVENT_TYPES.NODE_REMOVED,
          d: {
            ctx,
            id: node.id,
          },
        });

        // fake a node re-add
        changed.push({
          e: EVENT_TYPES.NODE_ADDED,
          d: {
            ctx,
            tree: JSON.parse(JSON.stringify(node)),
            idx,
          },
        });
      });
    });
    this.censorFrames.clear();
  }

  /**
   * Close off a block, clean, and compress
   * @param {Array} arr
   */
  pinch() {
    // Compress
    if (this.log.length > 0) {
      /* pragma:DEBUG_START */
      const startTime = Date.now();
      /* pragma:DEBUG_END */

      const payload = compress(JSON.stringify(this.log));

      if (!this.firstPacket) {
        // After the initial page marker packet we dynamically adjust
        // the dataSizeGoal to ensure we adjust for how compressible
        // the data generated by the page is.
        const compressionRatio = payload.length / this.dataSize;
        this.dataSizeGoal = Math.floor(MAX_UNCORKED_COMPRESSED_SIZE / compressionRatio);
      }
      this.firstPacket = false;

      /* pragma:DEBUG_START */
      console.log(
        `srw: pinched ${this.dataSize} bytes down to ${payload.length} in ${Date.now() -
          startTime} ms, new goal size: ${this.dataSizeGoal}`
      );
      /* pragma:DEBUG_END */

      this.payloadReady(payload);
      this.log = [];
      this.dataSize = 0;
    }
  }
}

export { Logger };
