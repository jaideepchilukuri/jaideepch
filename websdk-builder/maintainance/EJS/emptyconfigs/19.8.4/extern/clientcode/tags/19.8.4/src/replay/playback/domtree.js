/**
 * Module for tracking changes to the dom
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Create a virtual DOM with plain javascript objects that mirrors a
 * real DOM.
 *
 * "Elements" are real DOM elements from the browser.
 * "Nodes" are virtual DOM nodes from DomTree.
 *
 * Nodes have the following format:
 * {
 *   id: the id of the node
 *   p: the parent's id
 *   t: the nodeType of the DOM node
 *   c: an array of child nodes (full nodes, not ids)
 *   v: optional nodeValue (for text, comment, etc nodes) or the value of inputs
 *   n: optional nodeName (will be the tagName uppercased, IE 'DIV')
 *   a: optional attributes an an object
 *   publicId: optional publicId of a doctype node (absent if "")
 *   systemId: optional systemId of a doctype node (absent if "")
 * }
 *
 */
function DomTree() {
  // Index of el to nodes
  this.elIndex = new Map();

  // Index of id to nodes
  this.idIndex = new Map();

  // Used only for removes, to look up el for an id
  this.idEl = new Map();

  // This is the first element scanned/imported after the DomTree is
  // created, assuming that the first thing you do with a DomTree is
  // scan/import the whole DOM. This should be the root of the tree.
  this.root = null;

  // This is the next id for a node added to the tree
  this.nextId = 1;
}

/**
 * Scan a whole DOM tree from scratch.
 *
 * @param el the root of the DOM to scan
 * @returns the virtual DOM node for the element
 */
DomTree.prototype.scan = function(el) {
  var i,
    len,
    children = [],
    node = {
      id: 0, // set in track()
      p: 0, // set later
      t: el.nodeType,
      c: children,
    };

  // Keep track of the root
  if (this.root == null) {
    this.root = node;
  }

  for (i = 0, len = el.childNodes.length; i < len; i++) {
    children.push(this.scan(el.childNodes[i]));
  }
  this._track(el, node);

  // This is the text of a text-like node
  if (el.nodeValue != null) {
    node.v = el.nodeValue;
  }

  // When a node is not a special node (like text or comment, etc)
  if (el.nodeName[0] !== "#") {
    node.n = el.nodeName;

    if (el.hasAttributes && el.hasAttributes()) {
      node.a = {};
      for (i = 0, len = el.attributes.length; i < len; i++) {
        node.a[el.attributes[i].name] = el.attributes[i].value;
      }
    }

    if (el.nodeType === 10) {
      // Handle doctypes
      if (node.publicId) {
        node.publicId = el.publicId;
      }

      if (node.systemId) {
        node.systemId = el.systemId;
      }
    }
  }

  for (i = 0, len = children.length; i < len; i++) {
    // Fix parent pointer retroactively
    children[i].p = node.id;
  }

  return node;
};

/**
 * Import from root node of another DomTree.
 *
 * @param {*} node root node of another DomTree
 * @returns {*} The node passed in
 */
DomTree.prototype.import = function(node) {
  var i, len;

  // Save the root if this is the first import
  if (this.root == null) {
    this.root = node;
  }

  if (node.c) {
    for (i = 0, len = node.c.length; i < len; i++) {
      this.import(node.c[i]);
    }
  }

  this.idIndex.set(node.id, node);

  return node;
};

/**
 * Add nodes to an existing tree, ensuring parent/child relations are
 * properly fixed up.
 *
 * @param el the new element to add
 * @returns the virtual DOM node for the element
 */
DomTree.prototype.add = function(el) {
  var parentEl = el.parentNode,
    parent = this.get(parentEl),
    node,
    index;

  /* pragma:DEBUG_START */
  if (!el) {
    throw new Error("trying to add undefined!");
  }

  if (!parentEl) {
    throw new Error("element has no parent");
  }

  if (!parent) {
    throw new Error("parent not found");
  }

  if (this.get(el)) {
    throw new Error("node already exists in tree");
  }
  /* pragma:DEBUG_END */

  node = this.scan(el);

  index = Array.prototype.indexOf.call(parentEl.childNodes, el);
  parent.c.splice(index, 0, node);

  node.p = parent.id;

  return node;
};

/**
 * Insert a node from another DomTree instance at a specific index
 * @param {Number} index index into parent
 * @param {*} node the node to insert
 * @returns {*} node inserted
 */
DomTree.prototype.insert = function(index, node) {
  var parent = this.getById(node.p);

  this.import(node);
  if (!parent.c) {
    parent.c = [];
  }
  parent.c.splice(index, 0, node);

  return node;
};

/**
 * Moves a node and its children from one place in the tree to another.
 *
 * @param {*} el element being moved
 * @param {*} newParentEl new parent of the el in question
 * @param {*} prevSibling el's new previous sibling
 * @param {*} nextSibling el's new next sibling
 */
DomTree.prototype.move = function(el, newParentEl, prevSibling, nextSibling) {
  var node = this.get(el),
    parent = this.getById(node.p),
    newParent = this.get(newParentEl),
    idx;

  // Change parents by removing from old parent then changing p
  parent.c.splice(parent.c.indexOf(node), 1);
  node.p = newParent.id;

  // Now we need to insert into the new parent's child list somewhere
  if (!prevSibling) {
    // Handle insertion at the beginning of the children

    /* pragma:DEBUG_START */
    if (nextSibling && this.get(nextSibling) !== newParent.c[0]) {
      throw new Error("nextSibling should be first sibling");
    }
    /* pragma:DEBUG_END */

    newParent.c.unshift(node);
  } else if (!nextSibling) {
    // Handle insertion in the middle or end of the children, only being given a reference to the previous sibling

    /* pragma:DEBUG_START */
    if (newParent.c.indexOf(this.get(prevSibling)) < 0) {
      throw new Error("expecting prevSibling to be in parent child list");
    }
    /* pragma:DEBUG_END */

    idx = newParent.c.indexOf(this.get(prevSibling)) + 1;
    if (idx > newParent.c.length) {
      idx = newParent.c.length;
    }
    if (idx < 0) {
      idx = 0;
    }
    newParent.c.splice(idx, 0, node);
  } else {
    // Handle insertion in the middle of the children using the nextSibling

    /* pragma:DEBUG_START */
    if (newParent.c.indexOf(this.get(nextSibling)) < 0) {
      throw new Error("expecting nextSibling to be in parent child list");
    }
    /* pragma:DEBUG_END */

    newParent.c.splice(newParent.c.indexOf(this.get(nextSibling)), 0, node);
  }
};

/**
 * Move a node from one place to another using only ids.
 *
 * @param {number} id of the node to move
 * @param {number} newParentId new parent for node
 * @param {number} childIndex index in new parent's child list
 */
DomTree.prototype.moveById = function(id, newParentId, childIndex) {
  var node = this.getById(id),
    oldParent = this.getById(node.p),
    newParent = this.getById(newParentId);

  // Remove from old parent's child list
  oldParent.c.splice(oldParent.c.indexOf(node), 1);

  if (!newParent.c) {
    newParent.c = [];
  }

  // Add to new parent's child list in the proper location
  newParent.c.splice(childIndex, 0, node);

  // Change parent ids
  node.p = newParent.id;
};

/**
 * Get a virtual DOM node from a real DOM element.
 *
 * @param el the element to look up
 * @returns the virtual DOM node
 */
DomTree.prototype.get = function(el) {
  return this.elIndex.get(el);
};

/**
 * Get a virtual DOM node by its id number
 *
 * @param el the element to look up
 * @returns the virtual DOM node
 */
DomTree.prototype.getById = function(id) {
  return this.idIndex.get(id);
};

/**
 * Remove a real DOM element from the virtual DOM. It assumes the DOM element
 * has already been removed from the DOM, so avoids using el.parentNode
 *
 * @param el the element to remove
 * @returns the removed node (with all children already removed)
 */
DomTree.prototype.remove = function(el) {
  var i,
    node = this.get(el),
    parent;

  /* pragma:DEBUG_START */
  if (!node) {
    throw new Error("removing unknown element");
  }
  /* pragma:DEBUG_END */

  // Remove all children recursively, starting at the end
  for (i = node.c.length - 1; i >= 0; i--) {
    this.remove(this.idEl.get(node.c[i].id));
  }

  // Update indices
  this.elIndex.delete(el);
  this.idIndex.delete(node.id);
  this.idEl.delete(node.id);

  // Remove node from parent children list
  parent = this.getById(node.p);
  parent.c.splice(parent.c.indexOf(node), 1);

  return node;
};

/**
 * Removes a node and it's decendants from the tree.
 *
 * @param {Number} id of the node to remove
 * @returns {*} the removed node
 */
DomTree.prototype.removeById = function(id) {
  var i,
    node = this.getById(id),
    parent = this.getById(node.p);

  // Remove all child nodes starting at the end
  if (node.c) {
    for (i = node.c.length - 1; i >= 0; i--) {
      this.removeById(node.c[i].id);
    }
  }

  // Update the index
  this.idIndex.delete(id);

  // Update parent's children
  parent.c.splice(parent.c.indexOf(node), 1);

  return node;
};

/* pragma:DEBUG_START */
/**
 * Creates a simple structural model for a checksum.
 *
 * @param {*} node
 * @returns {string} the hashable string
 */
DomTree.prototype.structure = function(node) {
  var str = "" + node.id + "[",
    i;

  for (i = 0; i < node.c.length; i++) {
    str += this.structure(node.c[i]);
  }
  return str + "]";
};

/**
 * Calculates an FNV checksum.
 *
 * @param {string} str
 * @param {number} checksum to resume or null to start anew
 * @returns {number} the new checksum
 */
DomTree.prototype.fnv = function(str, checksum) {
  var fnv = checksum || 2166136261,
    len = str.length,
    i;

  for (i = 0; i < len; i++) {
    fnv =
      ((fnv + (((fnv << 1) + (fnv << 4) + (fnv << 7) + (fnv << 8) + (fnv << 24)) | 0)) ^
        (str.charCodeAt(i) & 0xff)) |
      0;
  }
  return fnv;
};

/**
 * Generates a checksum from the structure of the whole tree.
 * This can be used to ensure the DOM and the worker (and the server) stay
 * in sync, at least structurally, and all actions are played back properly.
 *
 * @return {number} the checksum of the tree.
 */
DomTree.prototype.checksum = function() {
  return this.fnv(this.structure(this.root));
};
/* pragma:DEBUG_END */

/**
 * Track a node in the index.
 *
 * @private
 * @param el the DOM element
 * @param node the new virtual DOM node
 */
DomTree.prototype._track = function(el, node) {
  var id = this.nextId;

  this.nextId++;
  node.id = id;

  this.elIndex.set(el, node);
  this.idIndex.set(id, node);
  this.idEl.set(id, el);

  return id;
};

/**
 * Resets to clean slate.
 */
DomTree.prototype.dispose = function() {
  this.elIndex.clear();
  this.idIndex.clear();
  this.idEl.clear();
  this.nextId = 1;
  this.root = null;
};
