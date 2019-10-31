/**
 * Performs general redaction and modifications of DomTree's
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White, Ryan Sanche
 *
 */

// Wrap in an iffy
const ___treecensor = () => {
  /**
   * Alphabet vars for censoring
   */
  const censorStrings = {
    alphabetL: "abcdefghijklmnopqrstuvwxyz",
    alphabetU: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
  };

  /**
   * Sets up a new censor thingy for a DomTree
   * @param {*} tree
   */
  class TreeCensor {
    constructor(tree, pii) {
      this.tree = tree;
      this.pii = pii || { noRules: true };
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
      if (node.a && (tagName == "INPUT" || tagName == "TEXTAREA" || tagName == "SELECT")) {
        if (node.a.fsrVisible == true) {
          node.whitelist = true;
        } else if (!node.whitelist) {
          if (typeof node.v != "undefined" && node.v != null) {
            node.v = this.maskString(node.v);
          }
          if (typeof node.a.value != "undefined" && node.a.value != null) {
            node.a.value = this.maskString(node.a.value);
          }
          if (node.c && node.c.length > 0) {
            this._maskTree(node);
          }
        }
        delete node.a.fsrVisible;
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
     * Apply PII masking to this tree and its descendents
     * @param {*} node
     */
    _maskTree(node) {
      const parent = node.p && this.tree.getById(node.p);
      const parentTagName = ((parent && parent.n) || "").toUpperCase();
      if (node.unmasked || node.whitelist || parentTagName === "STYLE") {
        // don't mask this or its children
        return;
      }
      if (typeof node.v != "undefined" && node.v != null) {
        node.v = this.maskString(node.v);
      }
      if (node.c && node.c.length > 0) {
        node.c.forEach(nd => {
          this._maskTree(nd);
        });
      }
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
     * See if any of the parent nodes have the flag you are looking for
     * @param {*} node
     * @param {*} attr
     */
    _parentScan(node, attr) {
      while (node.p > 0) {
        node = this.tree.getById(node.p);
        if (node[attr]) {
          return true;
        }
      }
    }

    /**
     * Perform censoring
     * @param {*} node
     */
    censor(node) {
      // First we determine if we are in whitelisting mode or blacklisting mode
      const pii = this.pii;
      if (pii.useWhiteListing) {
        // We are in whitelisting mode
        if (pii.noRules) {
          // Mask everything
          this._maskTree(node);
        } else if (!node.unmasked && !this._parentScan(node, "unmasked")) {
          // if we are in a whitelisted portion of the tree
          this._maskTree(node);
        }
      } else if (!pii.noRules) {
        // We are in blacklisting mode and there are rules
        if (node.masked || this._parentScan(node, "masked")) {
          this._maskTree(node);
        }
      }

      if (node.c && node.c.length > 0) {
        node.c.forEach(nd => {
          this.censor(nd);
        });
      }
    }
  }

  // Make it available as a module
  return TreeCensor;
};

export { ___treecensor };
