/**
 * Performs general redaction and modifications of DomTree's
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White, Ryan Sanche
 *
 */

fs.provide("rec.Data.TreeCensor");

fs.require("rec.Top");

(function () {

  // Wrap in an iffy
  var ___treecensor = function () {

    /**
     * Alphabet vars for censoring
     */
    var SensorStrings = {
      alphabetL: "abcdefghijklmnopqrstuvwxyz",
      alphabetU: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      numbers: "0123456789"
    };

    /**
     * Sets up a new censor thingy for a DomTree
     * @param {*} tree
     */
    var TreeCensor = function (tree, pii) {
      this.tree = tree;
      this.pii = pii || { noRules: true };
    };

    /**
     * Remove an attribute if it exists
     * @param {*} nd
     * @param {*} attr
     */
    TreeCensor.prototype._removeAttr = function (nd, attr) {
      if (nd.a) {
        delete nd.a[attr];
      }
    };

    /**
     * Remove JS and other baddness from a node
     * Removes:
     *   - event handlers
     *   - inline scripts
     *   - src attr on script tags
     * @param {*} node
     */
    TreeCensor.prototype.clean = function (node) {
      if (node.n == "SCRIPT") {
        this._removeAttr(node, "src");

        // this doesn't really address script nodes used for HTML templates
        // but those shouldn't be visible so it shouldn't be an issue
        this._blankTreeText(node);
      }
      if (node.a && (node.n == "INPUT" || node.n == "TEXTAREA" || node.n == "SELECT")) {
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
        for (var atr in node.a) {
          if (atr.length > 2 && atr.substr(0, 2) == "on") {
            delete node.a[atr];
          }
        }
      }
      if (node.c && node.c.length > 0) {
        node.c.forEach(function (nd) {
          this.clean(nd);
        }.bind(this));
      }
    };

    /**
     * Mask a string
     * @param {*} str
     */
    TreeCensor.prototype.maskString = function (str) {
      // note: make sure the dash '-' is last in this list
      // otherwise it's interpretted as a range which is not what we want
      return str.replace(/[^.,!?@#$%\(\)\\\/:\s-]/g, function (match) {
        if (SensorStrings.numbers.indexOf(match) > -1) {
          return SensorStrings.numbers.substr(Math.round(Math.random() * (SensorStrings.numbers.length - 1)), 1);
        } else if (match == match.toUpperCase()) {
          return SensorStrings.alphabetU.substr(Math.round(Math.random() * (SensorStrings.alphabetU.length - 1)), 1);
        } else {
          return SensorStrings.alphabetL.substr(Math.round(Math.random() * (SensorStrings.alphabetL.length - 1)), 1);
        }
      });
    };

    /**
     * Apply PII masking to this tree and its descendents
     * @param {*} node
     */
    TreeCensor.prototype._maskTree = function (node) {
      if (node.unmasked || node.whitelist || node.n === "STYLE") {
        // don't mask this or its children
        return;
      }
      if (typeof (node.v) != "undefined" && node.v != null) {
        node.v = this.maskString(node.v);
      }
      if (node.c && node.c.length > 0) {
        node.c.forEach(function (nd) {
          this._maskTree(nd);
        }.bind(this));
      }
    };

    /**
     * Remove text from a node and its decendants
     * @param {*} node
     */
    TreeCensor.prototype._blankTreeText = function (node) {
      if (typeof (node.v) != "undefined" && node.v != null) {
        node.v = "";
      }
      if (node.c && node.c.length > 0) {
        node.c.forEach(function (nd) {
          this._blankTreeText(nd);
        }.bind(this));
      }
    };

    /**
     * See if any of the parent nodes have the flag you are looking for
     * @param {*} node
     * @param {*} attr
     */
    TreeCensor.prototype._parentScan = function (node, attr) {
      while (node.p > 0) {
        node = this.tree.getById(node.p);
        if (node[attr]) {
          return true;
        }
      }
    };

    /**
     * Perform censoring
     * @param {*} node
     */
    TreeCensor.prototype.censor = function (node) {
      // First we determine if we are in whitelisting mode or blacklisting mode
      var pii = this.pii;
      if (pii.useWhiteListing) {
        // We are in whitelisting mode
        if (pii.noRules) {
          // Mask everything
          this._maskTree(node);
        } else {
          // Check to see if we are in a whitelisted portion of the tree
          if (!node.unmasked && !this._parentScan(node, "unmasked")) {
            this._maskTree(node);
          }
        }
      } else if (!pii.noRules) {
        // We are in blacklisting mode and there are rules
        if (node.masked || this._parentScan(node, "masked")) {
          this._maskTree(node);
        }
      }

      if (node.c && node.c.length > 0) {
        node.c.forEach(function (nd) {
          this.censor(nd);
        }.bind(this));
      }
    };

    // Make it available as a module
    return TreeCensor;
  };

})();
