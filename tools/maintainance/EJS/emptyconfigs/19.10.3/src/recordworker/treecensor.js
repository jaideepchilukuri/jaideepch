/**
 * Performs general redaction and modifications of DomTree's
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White, Ryan Sanche
 *
 */

/**
 * Alphabet vars for censoring
 */
const censorStrings = {
  alphabetL: "abcdefghijklmnopqrstuvwxyz",
  alphabetU: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
};

/**
 * Attributes to mask when found
 */
const maskAttrs = "value label placeholder title".split(" ");

/**
 * Sets up a new censor thingy for a DomTree
 * @param {*} tree
 */
class TreeCensor {
  constructor(tree, pii) {
    this.tree = tree;
    this.pii = pii || { noRules: true };
    this.targets = {
      unmasked: new Set(),
      masked: new Set(),
      whitelist: new Set(),
      redact: new Set(),
    };
    this.originalValues = new Map();
    this.originalAttrs = {};
    maskAttrs.forEach(attr => {
      this.originalAttrs[attr] = new Map();
    });
    this.maskingChanged = new Set();
  }

  /**
   * Perform censoring
   * @param {*} node
   */
  censor(node) {
    if (this._isNodeMasked(node)) {
      this._maskNode(node);
    } else {
      this._unmaskNode(node);
    }

    if (this.targets.redact.has(node.id)) {
      node.redact = true;
    }

    if (node.c && node.c.length > 0) {
      node.c.forEach(nd => {
        this.censor(nd);
      });
    }
  }

  /**
   * Remove JS and other baddness from a node
   * Removes:
   *   - event handlers
   *   - inline scripts
   *   - src attr on script tags
   * @param {*} node
   */
  clean(node) {
    const tagName = (node.n || "").toUpperCase();
    if (tagName == "SCRIPT") {
      this._removeAttr(node, "src");

      // this doesn't really address script nodes used for HTML templates
      // but those shouldn't be visible so it shouldn't be an issue
      this._blankTreeText(node);
    }

    if (node.a) {
      for (const atr in node.a) {
        if (atr.length > 2 && atr.substr(0, 2) == "on") {
          delete node.a[atr];
        }
      }
    }

    if (node.c && node.c.length > 0) {
      node.c.forEach(nd => {
        this.clean(nd);
      });
    }
  }

  /**
   * Updates the masking targets to match the list of elements from
   * the main page.
   */
  updateMaskingTargets(targets) {
    const previousTargets = this.targets;
    this.targets = {};
    for (const key in targets) {
      this.targets[key] = new Set(targets[key]);
    }

    // determine a list of nodes that were added or removed from the masking targets
    for (const key in targets) {
      this.targets[key].forEach(id => {
        if (!previousTargets[key].has(id)) {
          this.maskingChanged.add(id);
        }
      });

      previousTargets[key].forEach(id => {
        if (!this.targets[key].has(id)) {
          this.maskingChanged.add(id);
        }
      });
    }
  }

  /**
   * Called when a node is added, these nodes don't need to be re-sent to the server,
   * so we remove them from the maskingChanged list.
   */
  added(node) {
    if (this.maskingChanged.has(node.id)) {
      this.maskingChanged.delete(node.id);
    }

    // check if any children are in the list and remove those too
    if (node.c) {
      for (let i = 0; i < node.c.length; i++) {
        this.added(node.c[i]);
      }
    }
  }

  /**
   * When masking rules update, it's necessary to remove and re-add the affected
   * nodes. This will use the list of changed nodes to compile the minimum number
   * of nodes that need to be resent.
   */
  determineNodesToResend() {
    const resend = [];
    this.maskingChanged.forEach(id => {
      const node = this.tree.getById(id);
      if (!node) return;

      // if one if its parents is already in the list, don't send this one
      if (this._hasParentInList(node, this.maskingChanged)) return;

      this.censor(node);

      resend.push(node);
    });

    this.maskingChanged.clear();

    return resend;
  }

  /**
   * Update the original value of a node in case it needs to be unmasked later
   */
  updateOriginalValue(node, value) {
    const info = this.originalAttrs.value.get(node.id);
    if (info) {
      info.orig = value;
    }
  }

  /**
   * Remove any stored original values for a node or its children
   */
  removeOriginalValue(id) {
    if (this.originalValues.has(id)) {
      this.originalValues.delete(id);
    }

    maskAttrs.forEach(attr => {
      if (this.originalAttrs[attr].has(id)) {
        this.originalAttrs[attr].delete(id);
      }
    });

    const node = this.tree.getById(id);
    if (node && node.c && node.c.length > 0) {
      node.c.forEach(nd => {
        this.removeOriginalValue(nd.id);
      });
    }
  }

  /**
   * Is an input element supposed to be masked?
   */
  isInputMasked(node) {
    // if it's in the whitelist it's not masked
    if (this._branchInList(node, this.targets.whitelist)) return false;

    // if it has an fsrVisible attribute that's true it's not masked
    if (node.a && node.a.fsrVisible === "true") {
      return false;
    }

    return true;
  }

  /**
   * Mask a string
   * @param {*} str
   */
  maskString(str) {
    // note: make sure the dash '-' is last in this list
    // otherwise it's interpretted as a range which is not what we want
    return str.replace(/[^.,!?@#$%()\\/:\s-]/g, match => {
      if (this.pii.maskCharacters) {
        return this.pii.maskCharacters.substr(
          Math.round(Math.random() * (this.pii.maskCharacters.length - 1)),
          1
        );
      } else if (censorStrings.numbers.indexOf(match) > -1) {
        return censorStrings.numbers.substr(
          Math.round(Math.random() * (censorStrings.numbers.length - 1)),
          1
        );
      } else if (match == match.toUpperCase()) {
        return censorStrings.alphabetU.substr(
          Math.round(Math.random() * (censorStrings.alphabetU.length - 1)),
          1
        );
      } else {
        return censorStrings.alphabetL.substr(
          Math.round(Math.random() * (censorStrings.alphabetL.length - 1)),
          1
        );
      }
    });
  }

  /**
   * Check if a node or its parents is an input element
   */
  _isNodeAnInput(node) {
    while (node.p > 0) {
      const tagName = (node.n || "").toUpperCase();
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return true;
      }
      node = this.tree.getById(node.p);
    }
    return false;
  }

  /**
   * Check if parent element is a style tag
   */
  _isStyleTag(node) {
    if (!node.p) return false;
    const parent = this.tree.getById(node.p);
    return (parent.n || "").toUpperCase() === "STYLE";
  }

  /**
   * Is a node masked
   */
  _isNodeMasked(node) {
    // never mask style tags
    if (this._isStyleTag(node)) return false;

    // input elements have different masking rules
    if (this._isNodeAnInput(node)) return this.isInputMasked(node);

    if (this.pii.useWhiteListing) {
      // We are in whitelisting mode
      if (this.pii.noRules) {
        // Mask everything
        return true;
      }

      if (!this._branchInList(node, this.targets.unmasked)) {
        // if we are not in a unmasked portion of the tree
        return true;
      }
    } else if (!this.pii.noRules) {
      // We are in blacklisting mode and there are rules
      if (this._branchInList(node, this.targets.masked)) {
        // we are in a masked portion of the tree
        return true;
      }
    }

    return false;
  }

  /**
   * Remove an attribute if it exists
   * @param {*} nd
   * @param {*} attr
   */
  _removeAttr(nd, attr) {
    if (nd.a) {
      delete nd.a[attr];
    }
  }

  /**
   * Apply PII masking to a node
   * @param {*} node
   */
  _maskNode(node) {
    if (node.v) {
      node.v = this._scramble(node.id, node.v, this.originalValues);
    }
    maskAttrs.forEach(attr => {
      if (node.a && node.a[attr]) {
        node.a[attr] = this._scramble(node.id, node.a[attr], this.originalAttrs[attr]);
      }
    });
  }

  _scramble(id, value, map) {
    const info = map.get(id) || { orig: "", masked: "" };
    if (!map.has(id)) {
      map.set(id, info);
    }
    if (info.orig === value) return info.masked;
    if (info.masked === value) return info.masked;
    info.orig = value;
    info.masked = this.maskString(value);
    return info.masked;
  }

  _unmaskNode(node) {
    if (this.originalValues.has(node.id)) {
      node.v = this.originalValues.get(node.id).orig;
      this.originalValues.delete(node.id);
    }

    maskAttrs.forEach(attr => {
      if (this.originalAttrs[attr].has(node.id)) {
        node.a[attr] = this.originalAttrs[attr].get(node.id).orig;
        this.originalAttrs[attr].delete(node.id);
      }
    });
  }

  /**
   * Remove text from a node and its decendants
   * @param {*} node
   */
  _blankTreeText(node) {
    if (typeof node.v != "undefined" && node.v != null) {
      node.v = "";
    }
    if (node.c && node.c.length > 0) {
      node.c.forEach(nd => {
        this._blankTreeText(nd);
      });
    }
  }

  /**
   * See if the node or its ancestors are in the list
   */
  _branchInList(node, ids) {
    return ids.has(node.id) || this._hasParentInList(node, ids);
  }

  /**
   * See if one of the parents is in the list
   */
  _hasParentInList(node, ids) {
    while (node.p > 0) {
      if (ids.has(node.p)) {
        return true;
      }
      node = this.tree.getById(node.p);
    }
    return false;
  }
}

export { TreeCensor };
