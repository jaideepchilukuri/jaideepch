/**
 * DOM stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isArray, isElement, isNodeList } from "../../fs/index";

/**
 * Adds a class to a list of elements.
 * @param element_list {array,string} An array of html element nodes to apply the masking to
 * @param value {value} The name of the CSS class to add to the elements
 * @return {*}
 */
const addClass = (elements, value) => {
  let i;
  let l;
  let j;
  let elem;

  if (!isNodeList(elements) && !isArray(elements)) {
    elements = [elements];
  }

  value = value.trim().split(" ");

  for (i = 0, l = elements.length; i < l; i++) {
    // Quickreference this element
    elem = elements[i];
    if (isElement(elem)) {
      for (j = 0; j < value.length; j++) {
        elem.classList.add(value[j]);
      }
    }
  }
};

/**
 * Removes a class from a list of elements
 * @param element_list
 * @param value
 */
const removeClass = (elements, value) => {
  let i;
  let l;
  let j;
  let elem;

  if (!isNodeList(elements) && !isArray(elements)) {
    elements = [elements];
  }

  value = value.trim().split(" ");

  for (i = 0, l = elements.length; i < l; i++) {
    // Quickreference this element
    elem = elements[i];

    // Replace the className with an empty string
    if (isElement(elem)) {
      for (j = 0; j < value.length; j++) {
        elem.classList.remove(value[j]);
      }
    }
  }
};

/**
 * Does an element have a particular class on it?
 * @param el
 * @param cname
 * @returns {boolean}
 */
const hasClass = (el, cname) => isElement(el) && el.classList && el.classList.contains(cname);

/**
 * retrieve a string as the rbowser would render it, decoding HTML entities
 * like &amp; &eacute; etc.
 * from https://stackoverflow.com/a/34064434/1263612
 */
const decodeHTMLEntities = str => {
  // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
  const doc = new DOMParser().parseFromString(str, "text/html");
  return doc.documentElement.textContent;
};

/**
 * Node.contains(), cross platform
 * @param {DOMElement|DOMNode} nodeParent containing nodeChild
 * @param {DOMElement|DOMNode} nodeChild contained, maybe
 * @returns {boolean} does nodeParent contain nodeChild
 */
const DOMContains = (nodeParent, nodeChild) => {
  if (nodeParent.contains) {
    return nodeParent.contains(nodeChild);
  }

  // document is not a DOMNode object, thus ie11 doesnt offer .contains() on it
  if (nodeParent.documentElement) {
    return nodeParent.documentElement.contains(nodeChild);
  }

  return false;
};

export { addClass, removeClass, hasClass, decodeHTMLEntities, DOMContains };
