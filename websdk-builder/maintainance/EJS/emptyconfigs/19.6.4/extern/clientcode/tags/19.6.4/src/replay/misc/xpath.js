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

fs.provide("rp.Misc.XPath");

fs.require("rp.Top");

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

    // TODO: check that I can use "this" here
    if (node.parentNode) {
      path = XPath.getMapping(node.parentNode, path);
    }
    // if nodeType is not HTML element, return the path without pushing additional information. If we are not pushing additional path information there is no reason to check the siblings
    if (node.nodeType == 1) {
      // seed step
      // if node.previousSibling
      // get count of previous siblings with the same nodeName
      var count, sibling;
      // TODO: look up if there is a way to get next/previous sibling count in a better or faster way
      if (node.previousSibling) {
        // add the previous sibling to the count
        count = 1;
        // set sibling iterator to previous sibling
        sibling = node.previousSibling;
        // for every additional sibling that is the same nodeName as the node we are getting xpath map for increment count
        // set the sibling iterator to the previous sibling or null
        do {
          if (sibling.nodeType == 1 && sibling.nodeName == node.nodeName)
            count++;
          sibling = sibling.previousSibling;
        } while (sibling);

        // if count == 1 then there were no sibling of the same nodeName
        if (count == 1)
          count = null;

      } else if (node.nextSibling) {
        // check the next siblings of node
        // if any of the siblings are the same nodeName, set count to 1 and quit the loop
        sibling = node.nextSibling;
        do {
          // if sibling iterator nodeName == node nodeName, set count to 1 and exit
          if (sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {
            count = 1;
            sibling = null;
          } else {
            count = null;
            sibling = sibling.previousSibling;
          }
        } while (sibling);
      }
      // add node xpath, id and count are optional: "nodename[@id='nodeid'][count]"
      // with ID "nodename[@id='nodeid']"
      // with count "nodename[count]"
      path.push(node.nodeName.toLowerCase() + ((node.getAttribute && node.getAttribute("id") && !skipFinalId) ? "[@id='" + node.getAttribute("id") + "'][" + (count || 1) + "]" : count > 0 ? "[" + count + "]" : ''));
    }
    return path;
  };

  /**
   * Does a 1-level retrieve by tag name
   * @param el
   * @param tagname
   * @returns {Array}
   * @private
   */
  var __getChildrenByTagName = function (el, tagname) {
    var res = [],
      q,
      i;

    tagname = tagname.toLowerCase();

    if (el) {
      for (i = 0; i < el.childNodes.length; i++) {
        q = el.childNodes[i];
        if (q.tagName && q.tagName.toLowerCase() == tagname) {
          res[res.length] = q;
        } else if (tagname == "#text" && q.nodeType == 3) {
          res[res.length] = q;
        }
      }
      return res;
    }
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
        if (q.nodeType == 1 && q.tagName && q.tagName.toLowerCase() == tagn) {
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
        if (q.nodeType == 1 && q.tagName && q.tagName.toLowerCase() == tagn) {
          id = (q.getAttribute) ? q.getAttribute("id") : q.id;
          if (id == nid) {
            return q;
          }
        }
      }
    }
  };

  /**
   * Gets an HTML node from an xpath mapping.
   * @param xpath {String} The path to use
   * @param doc {Document} The document object to use
   * @memberOf XPath
   */
  XPath.getNode = function (xpath, doc) {
    // IE can't use xmldocument.selectSingleNode(xpath);
    var tags = xpath.split(','),
      ele = doc,
      nele,
      i,
      idx,
      nidx,
      ctag,
      sbits,
      tag,
      num,
      tagname,
      ilist,
      oele,
      olist;

    for (i = 0; i < tags.length; ++i) {
      idx = 1;
      ctag = tags[i];
      // Ending paren "]" check because adidas is using urls for @id's and that can contain ","'s which with cause the tags var to populate incorrectly.
      if (ctag.indexOf('[') != -1 && ctag.indexOf(']') != -1) {
        idx = ctag.split('[')[1].split(']')[0];
        if (idx.indexOf("@id=") > -1) {
          sbits = ctag.split("[");
          tag = sbits[0];
          num = parseInt(sbits[2].replace("]", ""));
          idx = idx.replace("@id='", "").replace("'", "");
          oele = ele;
          ele = __getChildrenById(ele, tag, idx, num);
          if (!ele) {
            idx = ctag.substr(ctag.indexOf('][') + 2).replace(']', '');
            tagname = tags[i].split('[')[0];
            ilist = __getChildrenByTagName(oele, tagname);
            if (ilist) {
              ele = ilist[parseInt(idx) - 1];
            }
          }
        } else {
          tagname = tags[i].split('[')[0];
          ilist = __getChildrenByTagName(ele, tagname);
          if (ilist) {
            ele = ilist[parseInt(idx) - 1];
          }
        }
      } else {
        oele = ele;
        olist = __getChildrenByTagName(ele, ctag);
        if (olist) {
          ele = olist[idx - 1];
        }
        if (!ele && oele) {
          ele = oele.getElementsByTagName(ctag)[idx - 1];
        }
      }
    }
    // Spit out the result
    return ele;
  };

})();