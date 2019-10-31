/**
 * DOM utilities
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { isDefined, toLowerCase, getProductConfig } from "../../fs/index";
import { getScroll } from "../../utils/utils";

/**
 * @class Holds the dom modules for Session Recording.
 * @static
 */
const Dom = {};

/**
 * Get the parent window object of an object
 * @param {HTMLElement} obj An HTML Element
 */
Dom.getParentWindow = obj => {
  const oobj = obj;
  if (obj) {
    if (obj._pw) {
      return obj._pw;
    }
    if (obj.ownerDocument && obj.ownerDocument.defaultView) {
      return obj.ownerDocument.defaultView;
    }
    while (obj.parentNode || obj.document) {
      if (obj.document) {
        oobj._pw = obj;
        return obj;
      }
      obj = obj.parentNode;
    }
  }
};

/**
 * Get the doctype of a document in string form
 * @param docref Reference to the document
 * @return {String}
 * @private
 */
Dom.getDocType = (browser, docref) => {
  let ct = "";
  const dt = docref.doctype;
  let outdt;
  const ch = docref.childNodes;
  let i = 0;

  // If IE and document not standards compliant, return empty string
  // Return empty string if the document is not standards compliant
  if (browser.isIE && (docref.compatMode != "CSS1Compat" || docref.documentMode == 5)) {
    return ct;
  }

  if (dt) {
    try {
      outdt = new XMLSerializer().serializeToString(dt).toString();
      if (outdt && outdt.length > 0) {
        return outdt;
      }
    } catch (e) {}
    // Build the doctype string using the doctype publicId and systemId
    ct = "<!DOCTYPE HTML";

    if (dt.publicId) {
      ct += ` PUBLIC "${dt.publicId}"`;
    }
    if (dt.systemId) {
      ct += ` SYSTEM "${dt.systemId}"`;
    }
    ct += ">";
  } else if (ch[i].text) {
    // If document doesn't have "doctype" get the childNodes of the doctype
    // Skip past any comment nodes
    while (ch[i].text && (ch[i].text.indexOf("<!--") === 0 || ch[i].text.indexOf("<?xml") === 0)) {
      i++;
    }

    // If the first non-comment node starts with <!doctype, use that as the doctype
    if (isDefined(ch[i].text) && toLowerCase(ch[i].text).indexOf("<!doctype") === 0) {
      ct = ch[i].text;
    }
  }

  return ct;
};

/**
 * Get the computed style of an element.
 * @param {HTMLElement} el The HTML element to inspect.
 * @param {Window} context The Window element that owns this node.
 * @param {String} styleProp The style attribute to get.
 */
Dom.getStyle = (el, context, styleProp) => {
  // Context was null between pages a log.
  if (!context) {
    return "";
  }

  let strValue = "";
  const d = context.document.defaultView;

  // Added 'd.getComputedStyle(el, "")' to IF statement in order to capture edge cases in Firefox where an iframe which has "display:none" in the style evaluates to null using 'd.getComputedStyle(el, "")' (link: https://bugzilla.mozilla.org/show_bug.cgi?id=548397)
  if (d && d.getComputedStyle && d.getComputedStyle(el, "")) {
    strValue = d.getComputedStyle(el, "").getPropertyValue(styleProp);
  } else if (el.currentStyle) {
    styleProp = styleProp.replace(/-(\w)/g, (strMatch, p1) => p1.toUpperCase());
    strValue = el.currentStyle[styleProp];
  }
  return strValue;
};

/**
 * Get the absolute position of an element within its frame.
 * @param {HTMLElement} obj The HTML element to get the position of.
 * @param {Window} context The Window element that owns this node.
 */
Dom.getPosition = (obj, context) => {
  let mytop = 0;
  let myleft = 0;
  const g = Dom.getStyle;

  while (obj) {
    mytop += obj.offsetTop + (parseFloat(g(obj, context, "borderTopWidth")) || 0);
    myleft += obj.offsetLeft + (parseFloat(g(obj, context, "borderLeftWidth")) || 0);
    obj = obj.offsetParent;
  }
  return {
    x: myleft,
    y: mytop,
  };
};

/**
 * Get the absolute position of an element relative to the top window.
 * @param {HTMLElement} obj The HTML element to get the position of
 * @param {Window} context The Window element that owns this node.
 * @param {Boolean} handleScrolling Take into account scrolling.
 */
Dom.getPositionRelativeToMainView = (obj, context, handleScrolling) => {
  let fpos;
  let didTop = false;

  while (!didTop && context) {
    didTop = context.parent == context;
    const pos = Dom.getPosition(obj, context);
    const sp = getScroll(context);
    if (handleScrolling && !didTop) {
      pos.x -= sp.x;
      pos.y -= sp.y;
    }
    if (!fpos) {
      fpos = pos;
    } else {
      fpos.x += pos.x;
      fpos.y += pos.y;
    }
    obj = context.frameElement;
    context = context.parent;
  }
  return fpos;
};

/**
 * Get the document size
 * @param {Document} dom The Document element that supposedly owns this node. Optional.
 */
Dom.getDocSize = doc => {
  const D = doc || window.document;
  const DB = D.body;
  const DD = D.documentElement;
  const m = Math.max;
  return {
    width: m(
      m(DB.scrollWidth, DD.scrollWidth),
      m(DB.offsetWidth, DD.offsetWidth),
      m(DB.clientWidth, DD.clientWidth)
    ),
    height: m(
      m(DB.scrollHeight, DD.scrollHeight),
      m(DB.offsetHeight, DD.offsetHeight),
      m(DB.clientHeight, DD.clientHeight)
    ),
  };
};

/**
 * Get the size of the visual viewport. On browsers that support visualViewport
 * that must be used because inert visual viewport would also be defined.
 */
Dom.getVisualViewportPosition = win => {
  if (win.visualViewport) {
    // this is chrome only (for now), but safari is planning to implement this soon
    return {
      left: win.visualViewport.pageLeft,
      top: win.visualViewport.pageTop,
      width: win.visualViewport.width,
      height: win.visualViewport.height,
    };
  } else {
    return {
      // this is for browsers that don't yet support inert visual viewport
      left: win.pageXOffset, // this could also be win.scrollX but IE 11 is still supported
      top: win.pageYOffset,
      width: win.innerWidth,
      height: win.innerHeight,
    };
  }
};

/**
 * Returns the size of each of the viewports plus the position of the visual viewport
 * in page CSS pixels, rounded to 3 decimal places.
 *
 * For more detailed explanation please see: CC-4221
 */
Dom.getViewportSizePos = win => {
  const visualViewport = Dom.getVisualViewportPosition(win);
  const pageSize = Dom.getDocSize(win.document);
  const dde = win.document.documentElement;
  const layoutWidth = dde.clientWidth;
  const layoutHeight = dde.clientHeight;

  // this reduces the size of payloads to the server
  function round(val) {
    return Math.round(val * 1000) / 1000;
  }

  return {
    // p: content/page width/height
    pw: round(pageSize.width),
    ph: round(pageSize.height),

    // l: layout viewport width/height
    lw: round(layoutWidth),
    lh: round(layoutHeight),

    // v: visual viewport width/height/left/top
    vw: round(visualViewport.width),
    vh: round(visualViewport.height),
    vx: round(visualViewport.left),
    vy: round(visualViewport.top),
  };
};

/**
 * In IE  a standard method for <style> tag mutation is to alter the sheet.cssText property.
 * This property is not synced with the style innerHTML or outerHTML, so DOM serialization will have empty style tags
 * An alternative method is to serialize the CSS of each <style> tag and add it to the replay page,
 * The downside to the alternative is management of the <style> tags mutations (eg, a anonymous style tag has been removed after its content are serialized, so we would need to synchronize this with replay.)
 * Called on before initial page serialize and on before any following DOM_MUTATION_NODE_MODIFIED logs
 * @param htmlNode (HTML element) the DOM scope to check within for <style> tags
 */
Dom.externalizeStyleCSSTextToInnerHTML = elemNode => {
  const recordconfig = getProductConfig("record");
  let elem;
  let styleContentUpdated = false;
  let styleTag;

  // Feature detect and store for additional updates in page
  if (!isDefined(recordconfig.useCSSText)) {
    elem = document.createElement("style");
    elem.setAttribute("type", "text/css");
    recordconfig.useCSSText = isDefined(elem.styleSheet);
  }
  if (recordconfig.useCSSText) {
    elem = elemNode.nodeName == "STYLE" ? [elemNode] : elemNode.querySelectorAll("style");
    for (let i = 0, j = elem.length; i < j; i++) {
      styleTag = elem[i];
      // If innerHTML != sheet.cssText, remove all whitespace to avoid formatting in comparison, use length because multi-class css rules can have the classes swapped between properties
      // EG div.test.flag != div.flag.test
      if (
        styleTag.styleSheet &&
        styleTag.styleSheet.cssText &&
        styleTag.styleSheet.cssText.replace(/\s/gi, "").length !=
          styleTag.innerHTML.replace(/\s/gi, "").length
      ) {
        // Alter innerHTML to be equal to cssText
        styleTag.innerHTML = styleTag.styleSheet.cssText;
        // Set the returned value to true if some style.innerHTML has changed.
        styleContentUpdated = true;
      }
    }
  }
  // Will return false if nothing was modified
  return styleContentUpdated;
};

export { Dom };
