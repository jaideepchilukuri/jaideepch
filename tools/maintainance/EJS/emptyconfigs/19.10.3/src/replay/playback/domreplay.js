/**
 * Module for replaying changes to the domtree
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { DomTree } from "./domtree";
import { AssetPreloader } from "./assetpreloader";

// time to wait for elements to load before producing timeout errors
const LOADING_TIMEOUT = 45000;
const IFRAME_TIMEOUT = 2000;

/**
 * Create a DomTree like object that can sync the DOM to the virtual DOM.
 * @param {*} root of the document (the html tag)
 */
class DomReplay {
  constructor(root) {
    this.root = root;
    this.tree = new DomTree();
    this.idEl = new Map();
    this.loadPromises = [];
    this.initialLoad = true;
  }

  /**
   * Import a tree into the current DOM root
   */
  import(node) {
    this.initialLoad = true;
    this.tree.import(node);

    // attributes
    if (node.a) {
      for (const key in node.a) {
        this.setElAttribute(this.root, key, node.a[key]);
      }
    }

    this.reconstruct(this.root, node);
    this.initialLoad = false;
  }

  /**
   * Get the DOM element of a node id.
   */
  get(id) {
    return this.idEl.get(id);
  }

  /**
   * Add a node and element at a sepecific index of its parent children
   * @param {Number} index index into parent children
   * @param {*} node the node to insert
   */
  insert(index, node) {
    const parent = this.tree.getById(node.p);

    if (!parent) {
      console.warn("Attempt to insert node into unknown parent:", node.p);
      return;
    }

    this.tree.insert(index, node);
    const newEl = this.createElement(node);
    const parentEl = this.get(parent.id);

    try {
      if (!parent.c || index + 1 >= parent.c.length) {
        parentEl.appendChild(newEl);
      } else {
        const sibling = this.get(parent.c[index + 1].id);
        if (!sibling) throw new Error("Sibling not found!");
        parentEl.insertBefore(newEl, sibling);
      }
    } catch (e) {
      console.error("Attempt to insert node into a element that can't contain nodes:", parentEl);
      return;
    }
    this.reconstruct(newEl, node);
  }

  /**
   * Move a node and its element from one place to another.
   *
   * @param {number} id of the node to move
   * @param {number} newParentId new parent for node
   * @param {number} childIndex index in new parent's child list
   */
  move(id, newParentId, childIndex) {
    const el = this.get(id);

    if (!el) {
      console.warn("Attempt to move unknown node:", id);
      return;
    }

    const newParent = this.get(newParentId);

    if (!newParent) {
      console.warn("Attempt to move node to unknown parent node:", newParentId);
      return;
    }

    el.parentNode.removeChild(el);
    if (childIndex >= newParent.childNodes.length) {
      newParent.appendChild(el);
    } else {
      newParent.insertBefore(el, newParent.childNodes[childIndex]);
    }
    this.tree.moveById(id, newParentId, childIndex);
  }

  /**
   * Removes a node and it's decendants from the DOM.
   *
   * @param {Number} id of the node to remove
   */
  remove(id) {
    const el = this.get(id);
    const node = this.tree.getById(id);

    if (!el || !node) {
      console.warn("Attempt to remove node", id, "which doesn't exist!");
      return;
    }

    this.forget(node);
    el.parentNode.removeChild(el);
    this.tree.removeById(id);
  }

  /**
   * Updates the character data (nodeValue) of nodes. Will
   * ensure that load events are handled when changing style tag
   * contents.
   *
   * @param {Number} id of the node to remove
   * @param {string} value of the nodeValue after this
   */
  updateCharData(id, value) {
    const el = this.get(id);
    const node = this.tree.getById(id);

    if (!node || !el) {
      console.warn("Attempt to change text of unknown node:", id);
      return;
    }

    node.v = value;

    // changing the contents of a style tag could load new content
    if (el.nodeType === 3 && el.parentNode.nodeName === "STYLE") {
      // modifying a style tag does not fire a new load/error event
      // instead we need to replace the style tag with a new one
      const container = el.parentNode.parentNode;
      const styleNode = this.tree.getById(node.p);
      this.forget(styleNode);
      const oldStyleTag = el.parentNode;
      const newStyleTag = this.createElement(styleNode);
      this.reconstruct(newStyleTag, styleNode);
      container.replaceChild(newStyleTag, oldStyleTag);
    } else {
      el.nodeValue = value;
    }
  }

  /**
   * Modifies an attribute of a dom node, ensuring if a load would
   * trigger it will capture it.
   *
   * @param {Number} id of the node to remove
   * @param {string} key of the attribute
   * @param {string} value of the attribute
   */
  modifyAttr(id, key, value) {
    const el = this.get(id);
    const node = this.tree.getById(id);

    if (!node || !el || !el.setAttribute) {
      console.warn("Attempt to modify attr of unknown node:", id);
      return;
    }

    node.a = node.a || {};
    node.a[key] = value;

    if (key === "style" && node.redact) {
      // prevent redaction from being overwritten by an attr update
      el.style.filter = "brightness(0)";
    }

    // changing the src or href can trigger loading
    if ((key === "src" || key === "href") && this.willElementLoad(node)) {
      // modifying a link/img tag does not fire a new load/error event
      // instead we need to replace the style tag with a new one
      const container = el.parentNode;
      this.forget(node);
      const newEl = this.createElement(node);
      this.reconstruct(newEl, node);
      container.replaceChild(newEl, el);
    } else {
      el.setAttribute(key, value);
    }
  }

  /**
   * Return a promise that resolves once all recently added nodes have
   * loaded.
   *
   * @returns a promise
   */
  waitForLoad() {
    const promises = this.loadPromises;
    this.loadPromises = [];
    if (promises.length) {
      return Promise.all(promises);
    }
    return Promise.resolve();
  }

  /**
   * Make sure the node's element is registered and its children are
   * created.
   * @private
   */
  reconstruct(el, node) {
    let i;
    let newEl;

    this.idEl.set(node.id, el);

    if (!node.c) {
      return;
    }

    for (i = 0; i < node.c.length; i++) {
      newEl = this.createElement(node.c[i]);
      el.appendChild(newEl);
      this.reconstruct(newEl, node.c[i]);
    }
  }

  /**
   * Create an element to the specifications of node.
   * @private
   */
  createElement(node) {
    let el;
    let key;
    if (node.t === 1) {
      if (this.hasParentSVG(node)) {
        el = document.createElementNS("http://www.w3.org/2000/svg", node.n);
      } else if (node.n.toLowerCase() === "canvas") {
        el = this.createCanvasPlaceHolder(node);
      } else {
        try {
          el = document.createElement(node.n.toLowerCase());
        } catch (e) {
          console.warn(`Attempt to create bad element: ${node.n}`);
          el = document.createElement("badname");
        }
      }

      // listen to load events
      if (this.willElementLoad(node)) {
        this.promiseOnLoad(el);
      }

      // attributes
      if (node.a) {
        for (key in node.a) {
          // hack to get iframes to load faster
          if (node.n === "IFRAME" && key === "src") {
            this.setElAttribute(el, key, "about:blank");
          } else {
            this.setElAttribute(el, key, node.a[key]);
          }
        }
      }

      // implement crude redaction -- this really needs to happen
      // in record's worker somehow, but for now this will suffice
      // with some limitations.
      if (node.redact) {
        el.style.filter = "brightness(0)";
      }

      if (node.n === "IFRAME") {
        this.markIframeNotRecorded(el);
      }
    } else if (node.t === 3) {
      el = document.createTextNode(node.v);
    } else if (node.t === 8) {
      el = document.createComment(node.v);
    } else {
      // TODO: implement more types
      throw new Error(`Unimplemented type: ${node.t}`);
    }

    return el;
  }

  /**
   * Handle non-recorded iframes.
   */
  markIframeNotRecorded(el) {
    // wait for the iframe to load then set it's contents
    // if the iframe is actually used, a PAGE_MARKER will come in to
    // reset its contents anyway and the body element will be deleted then
    const promise = this.loadPromises[this.loadPromises.length - 1] || Promise.resolve();
    promise.then(() => {
      if (el.contentDocument) {
        el.contentDocument.body.innerHTML = "<div>IFrame Not Recorded</div>";
        el.contentDocument.body.style.width = "100%";
        el.contentDocument.body.style.height = "100vh";
        el.contentDocument.body.style.display = "flex";
        el.contentDocument.body.style.justifyContent = "center";
        el.contentDocument.body.style.alignItems = "center";
        el.contentDocument.body.style.backgroundColor = "#bbb";
        el.contentDocument.body.style.overflow = "hidden";
        el.contentDocument.body.style.fontSize = "24px";
        el.contentDocument.body.style.margin = "0";
      }
    });
  }

  /**
   * Handle setting attributes, where the attribute might fail and
   * require a backup plan.
   */
  setElAttribute(el, key, value) {
    try {
      el.setAttribute(key, value);
    } catch (e) {
      // somehow it's possible to create elements with invalid attribute
      // names. This is the only way I can think of to recreate this:
      const d = document.createElement("div");
      d.innerHTML = `<div ${key}="${value}"></div>`;
      const attr = d.childNodes[0].attributes[0].cloneNode();
      el.setAttributeNode(attr);

      // Note: setAttribute fails with an invalid name, so does
      // document.setAttribute. But the above code works where you
      // force the browser to parse the HTML itself. The name
      // in question has double quotes in it: '"select-menu-arrow"'
    }
  }

  createCanvasPlaceHolder(node) {
    const el = document.createElement("DIV");
    el.setAttribute("canvas", "");

    // use background CSS to create a checker-board
    const CSSChecker = [
      "div[canvas] {",
      "  background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%) !important;",
      "  background-size: 2em 2em !important;",
      "  background-position: 0 0, 0 1em, 1em -1em, -1em 0 !important;",
      "}",
    ].join("\n");

    // reach the iframe stylesheets
    const docStyle = this.root.ownerDocument.styleSheets[
      this.root.ownerDocument.styleSheets.length - 1
    ];
    if (!docStyle) {
      console.error("No stylesheet found. Canvas", node.id, "will not render correctly.", el);
    }

    docStyle.insertRule(CSSChecker, docStyle.cssRules.length);

    return el;
  }

  hasParentSVG(node, depth) {
    if (depth > 100) {
      throw new Error("Detected parent cycle!!");
    }
    if (!node.p) {
      return false;
    }
    const parent = this.tree.getById(node.p);
    if (!parent) {
      return false;
    }
    if (node.n && node.n.toUpperCase() === "SVG") {
      return true;
    }
    // console.log(JSON.stringify(node));
    return this.hasParentSVG(parent, (depth || 0) + 1);
  }

  /**
   * Checks if the element being created will perform a loading action that
   * needs to be waited for.
   *
   * @private
   * @param {*} node
   */
  willElementLoad(node) {
    if (node.n === "IMG" && node.a && node.a.src && node.a.src.indexOf("data:") !== 0) {
      return true;
    }
    // TODO: maybe link rel=import too?
    if (
      node.n === "LINK" &&
      node.a &&
      node.a.rel &&
      node.a.rel.indexOf("stylesheet") > -1 &&
      node.a.href
    ) {
      return true;
    }
    if (node.n === "STYLE") {
      // TODO: can check if style body includes urls or imports
      return true;
    }
    if (node.n === "IFRAME") {
      return true;
    }
    // NOTE: PICTURE elements have an img tag inside that gets the load event
    // TODO: could have a style attribute with a url in it
    return false;
  }

  /**
   * Register the load promise of an element. Also listens to the
   * error event in the case that it fails to load for some reason.
   * @private
   */
  promiseOnLoad(el) {
    this.loadPromises.push(
      new Promise(resolve => {
        let timer = null;
        const done = () => {
          if (timer) {
            clearTimeout(timer);
          }

          el.removeEventListener("load", done, false);
          el.removeEventListener("error", error, false);
          resolve();
        };

        const timeout = () => {
          timer = null;
          error();
        };

        function error() {
          if (el.tagName === "LINK" && el.getAttribute("rel") === "stylesheet") {
            console.error(
              `FATAL: failed to load stylesheet: ${AssetPreloader.originalUrl(
                el.getAttribute("href")
              )}`
            );
          } else {
            console.warn(
              `Failed to load ${el.tagName} asset: ${AssetPreloader.originalUrl(
                el.src || el.href || el.srcset
              )}`
            );
          }
          done();
        }

        // either load or error happens
        el.addEventListener("load", done, false);
        el.addEventListener("error", error, false);
        timer = setTimeout(timeout, el.tagName === "IFRAME" ? IFRAME_TIMEOUT : LOADING_TIMEOUT);

        if (el.tagName !== "IFRAME" && !this.initialLoad) {
          // do not wait for loading of non-iframes after the initial
          // page load.
          resolve();
        }
      })
    );
  }

  /**
   * Clear ids out of the element index
   * @private
   * @param {*} node
   */
  forget(node) {
    let i;
    this.idEl.delete(node.id);
    if (node.c) {
      for (i = 0; i < node.c.length; i++) {
        this.forget(node.c[i]);
      }
    }
  }
}

export { DomReplay };
