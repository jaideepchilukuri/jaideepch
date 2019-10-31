/**
 * Module for resyncing the DomTree should sync be lost
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

/**
 * This class will detect and resync the dom should a desync
 * occur. Because mutation observers do not provide a cloned
 * copy of the dom state at the time of the event, it is alas
 * possible for changes to slip through the cracks or for
 * changes to not be reconstructed properly. Rather than make
 * the observer algorithm really complicated, we just go fast
 * and make mistakes and then fix it afterward with this code.
 */
class DomResync {
  constructor(dom, tree, modifier) {
    this.dom = dom;
    this.tree = tree;
    this.modifier = modifier;
    this.roots = new Set();
    this.checked = new Set();
  }

  /**
   * Reset the internal state so we can re-check things.
   */
  reset() {
    this.roots.clear();
    this.checked.clear();
  }

  /**
   * Dispose of dom references.
   */
  dispose() {
    this.reset();
    this.dom = null;
    this.tree = null;
  }

  /**
   * Inform of a node whose children may have changed,
   * this will become a list of change roots we check later.
   */
  addChangedEl(el) {
    this.roots.add(el);
  }

  /**
   * Check & resync the whole dom, not just starting at the roots
   */
  checkAll() {
    this.reset();
    this.roots.add(this.dom);
    return this.check();
  }

  /**
   * Check & resync starting at the change roots. Note,
   * special care is taken to keep track of already checked nodes
   * so as not to duplicate any effort.
   */
  check() {
    let okay = true;
    this.roots.forEach(el => {
      const node = this.tree.get(el);
      if (node && !this._checkEl(el, node)) {
        okay = false;
      }
    });
    return okay;
  }

  /**
   * Check a single element is the same as its node
   * @private
   */
  _checkEl(el, node) {
    if (this.checked.has(el)) {
      return true;
    }
    this.checked.add(el);

    let okay = true;

    if (this.tree.get(el) !== node) {
      console.error("Node mismatch", node, el);
      okay = false;
    }

    if (node.t !== el.nodeType) {
      console.error("Name mismatch at node", node, el);
      okay = false;
    }

    if (node.n && node.n !== el.nodeName) {
      console.error("Name mismatch at node", node, el);
      okay = false;
    }

    if (node.v && node.v !== el.nodeValue) {
      console.error("Value mismatch at node", node, el);
      okay = false;
    }

    if (!this._syncChildren(el, el.childNodes, node.c)) {
      okay = false;
    }

    return okay;
  }

  /**
   * Check the list of children is the same and do fancy things to resync if not
   * @private
   */
  _syncChildren(el, domnodes, vnodes) {
    let okay = true;
    const domlen = domnodes.length;
    const vlen = vnodes.length;
    const minlen = Math.min(domlen, vlen);
    let left = 0;
    let domend = domlen - 1;
    let vend = vlen - 1;
    let node;
    let cel;

    for (; left < minlen; left++) {
      if (this.tree.get(domnodes[left]) !== vnodes[left]) {
        break;
      }
      if (!this._checkEl(domnodes[left], vnodes[left])) {
        okay = false;
      }
    }
    for (; domend >= left && vend >= left; domend--, vend--) {
      if (this.tree.get(domnodes[domend]) !== vnodes[vend]) {
        break;
      }
      if (!this._checkEl(domnodes[domend], vnodes[vend])) {
        okay = false;
      }
    }
    domend++;
    vend++;

    if (left >= domend && left >= vend) {
      // we are equal, the end
      return okay;
    }

    // simple case: we have pure insertion of new nodes
    if (left < domend && left >= vend) {
      // console.log("Found diff, insert", left, domend, vend);
      for (; left < domend; left++) {
        node = this.tree.add(el, domnodes[left]);
        this.modifier.add(domnodes[left], node, left);
      }
      return false;
    }

    // simple case: we have pure removal of old nodes
    if (left < vend && left >= domend) {
      // console.log("Found diff, removal", left, domend, vend);
      for (; left < vend; vend--) {
        cel = this.tree.idEl.get(vnodes[left].id);
        node = this.tree.remove(cel);
        this.modifier.remove(cel, node);
      }
      return false;
    }

    // from now on we have a non-simple case... mixed insert/delete
    // a simple agorithm that's slow is to just remove everything from the
    // vdom and add everything from the dom

    for (let i = left; i < vend; i++) {
      cel = this.tree.idEl.get(vnodes[left].id);
      node = this.tree.remove(cel);
      this.modifier.remove(cel, node);
    }

    for (; left < domend; left++) {
      node = this.tree.add(el, domnodes[left]);
      this.modifier.add(domnodes[left], node, left);
    }

    return false;
  }
}

export { DomResync };
