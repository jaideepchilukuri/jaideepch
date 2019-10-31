/**
 * DOM XPath Utility
 *
 * Can determine the XPath of a node, and get that node from a predefined XPath
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Capture.XPath");

fs.require("rec.Top");

(function () {

  /**
   * @class Holds the XPath tools.
   * @static
   */
  var XPath = {};

  /**
   * Gets an xPath mapping of a node.
   * @param node {HTMLNode} The node to map
   * @param path {Array} The starting path (optional)
   * @param skipFinalId {skipFinalId} Skip the most in-depth level ID for some reason. This might be called on ATTRMODIFIED events for when ID's have changed
   * @memberOf XPath
   */
  XPath.getMapping = function (node, path, skipFinalId) {
    // Set path to empty array if no path is passed.
    path = path || [];

    // Recursive step, if node.parentNode, getMapping of parent Node and add it to path.
    if (node.parentNode) {
      path = XPath.getMapping(node.parentNode, path);
    }

    // If nodeType is not HTML element, return the path without pushing additional information. If we are not pushing additional path information there is no reason to check the siblings
    if (node.nodeType == 1) {
      /**
       * Seed step
       * if node.previousSibling
       * get count of previous siblings with the same nodeName
       */
      var count,
        sibling;

      // TODO: look up if there is a way to get next/previous sibling count in a better or faster way
      if (node.previousSibling) {
        // Add the previous sibling to the count
        count = 1;
        // Set sibling iterator to previous sibling
        sibling = node.previousSibling;
        // For every additional sibling that is the same nodeName as the node we are getting xpath map for increment count
        // Set the sibling iterator to the previous sibling or null
        do {
          if (sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {
            count++;
          }
          sibling = sibling.previousSibling;
        } while (sibling);

        // If count == 1 then there were no siblings of the same nodeName
        if (count == 1) {
          count = null;
        }

      } else if (node.nextSibling) {
        // Check the next siblings of node
        // If any of the siblings are the same nodeName, set count to 1 and quit the loop
        sibling = node.nextSibling;
        do {
          // If sibling iterator nodeName == node nodeName, set count to 1 and exit
          if (sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {
            count = 1;
            sibling = null;
          } else {
            count = null;
            sibling = sibling.previousSibling;
          }
        } while (sibling);
      }
      /**
       * Add node xpath, id and count are optional: "nodename[count]"
       * with count "nodename[count]"
       * Note: we no longer do ID's since this can get screwed up with MutationObservers
       */
      path.push(__getNodeSignature(node, count, !!skipFinalId));
    }
    return path;
  };

  /**
   * Get the node signature
   * @param node {HTMLElement}
   * @param count {Number}
   * @private
   */
  var __getNodeSignature = function (node, count, skipFinalId) {
    var nid;
    if (node.getAttribute) {
      nid = node.getAttribute('id');
      if (nid && nid.indexOf('yui_') > -1) {
        nid = null;
      }
    }
    return fs.toLowerCase(node.nodeName) + ((nid && !skipFinalId) ? "[@id='" + nid + "'][" + (count || 1) + "]" : count > 0 ? "[" + count + "]" : '');
  };

  /**
   * Does a 1-level retrieve by tag name
   * @param el
   * @param tagname
   * @returns {Array}
   * @private
   */
  var __getChildrenByTagName = function (el, tagname) {
    tagname = fs.toLowerCase(tagname);
    var res = [],
      q,
      i;

    if (el) {
      for (i = 0; i < el.childNodes.length; i++) {
        q = el.childNodes[i];
        if (fs.toLowerCase(q.tagName) == tagname) {
          res[res.length] = q;
        } else if (tagname == "#text" && q.nodeType == 3) {
          res[res.length] = q;
        }
      }
      return res;
    }
  };

  /**
   * Get the position of a node
   * @param nd
   */
  XPath.getNodeXPathPosition = function (nd) {
    var nt = nd.nodeType,
      tn = nd.tagName,
      pn = nd.parentNode,
      i = 0,
      cn = pn.childNodes,
      cnl = cn.length,
      pos = 0;
    while (cnl > i && cn[i]) {
      if (cn[i].nodeType == nt && ((tn && tn == cn[i].tagName) || !tn)) {
        pos++;
        if (cn[i] == nd) {
          return pos;
        }
      }
      i++;
    }
    return 0;
  };

  /**
   * Does a 1-level retrieve by id
   * @param el
   * @param tagn
   * @param nid
   * @param idx
   * @returns {*}
   * @private
   */
  var __getChildrenById = function (el, tagn, nid, idx) {
    if (el) {
      var els = el.childNodes,
        i,
        q,
        id,
        realIndex = 0;
      for (i = 0; i < els.length; i++) {
        q = els[i];
        if (q.nodeType == 1 && fs.toLowerCase(q.tagName) == tagn) {
          id = (q.getAttribute) ? q.getAttribute("id") : q.id;
          if (id == nid && realIndex + 1 >= idx) {
            return q;
          }
          realIndex++;
        }
      }

      // If we got here, look for its ID
      els = el.childNodes;
      for (i = 0; i < els.length; i++) {
        q = els[i];
        if (q.nodeType == 1 && fs.toLowerCase(q.tagName) == tagn) {
          id = (q.getAttribute) ? q.getAttribute("id") : q.id;
          if (id == nid) {
            return q;
          }
        }
      }
    }
  };

})();