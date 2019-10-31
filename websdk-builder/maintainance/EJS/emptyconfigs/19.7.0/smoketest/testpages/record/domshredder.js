var DomShredder = function (root) {
  this.root = $(root);
};

/**
 * Make a button
 */
DomShredder.prototype.makeButton = function (title, cb) {
  var btn = $("<a href=\"#\"></a>").html(title).click(function (e) { e.stopPropagation(); e.preventDefault(); cb(); });
  return btn;
};

/**
 * Add a node
 */
DomShredder.prototype.simpleAddNode = function (count) {
  while (count > 0) {
    var nd = $("<div></div>").html("How about a little music?");
    var md = createEl("div");
    md.innerHTML = "More junk";
    nd.appendChild.md;
    this.root.append(nd);
    count--;
  }
};

/**
 * Set up
 */
DomShredder.prototype.go = function () {
  var ctx;
  var ctrls = $("<div class=\"controls\"></div>");
  this.changeZone = $("<div className=\"changeZone\"></div>");
  ctrls.append(this.makeButton("Simple add DOM Node", this.simpleAddNode.bind(this)));
  this.root.append(ctrls);
  this.root.append(this.changeZone);
};

function randomColor() {
  var colors = ["red", "green", "black", "blue", "silver", "white", "purple", "orange", "yellow"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function createEl(elType, parentEl) {
  parentEl = parentEl || document
  return parentEl.createElement(elType);
}


DomShredder.prototype.walkDomBFS = function () {
  var queue = new Queue();
  var currentNode;
  var visitedNode = {};
  var count = 0;
  queue.enqueue(document.documentElement);

  while (!queue.isEmpty()) {
    currentNode = queue.dequeue();
    count++;
    if (!currentNode.getAttribute("visted")) {
      currentNode.setAttribute("visited", "true");
      currentNode.setAttribute("data-depth", count);
      visitedNode[count] = currentNode;
      currentNode.style.color = randomColor();
    }

    if (currentNode.children) {
      for (var i = 0; i < currentNode.children.length; i++) {
        queue.enqueue(currentNode.children[i]);
      }
    }
  }
  return true;
}

DomShredder.prototype.walkDomDFS = function (addAttributeCallback) {
  addAttributeCallback = addAttributeCallback || function () { };
  var stack = new Stack();
  var currentNode;
  var visitedNode = {};
  var count = 0;
  stack.pushD(document.documentElement);

  while (!stack.isEmpty()) {
    currentNode = stack.pop();
    if (!currentNode.getAttribute("dfsVis")) {
      count++;
      currentNode.setAttribute("dfsVis", "true");
      currentNode.setAttribute("data-depth", count);
      visitedNode[count] = currentNode;
      currentNode.style.color = randomColor();
      currentNode.style.backgroundColor = randomColor();
      addAttributeCallback(currentNode);
    }

    if (currentNode.children) {
      for (var i = 0; i < currentNode.children.length; i++) {
        stack.pushD(currentNode.children[i]);
      }
    }
  }
  return true;
}

DomShredder.prototype.switchNodes = function (id1, id2) {
  var node1Id = document.getElementById(id1);
  var node2Id = document.getElementById(id2);
  var stack = new Stack();
  var currentNode;
  var nodeStore1;
  var nodeStore2;
  var temp;
  var tempPostion;
  var addOffSetHeight
  stack.pushD(document.documentElement);

  while (!stack.isEmpty() || (!nodeStore1 && !nodeStore2)) {
    currentNode = stack.pop();
    if (currentNode && currentNode === node1Id) {
      nodeStore1 = currentNode;
    } else if (currentNode === node2Id) {
      nodeStore2 = currentNode;
    }
    addOffSetHeight = currentNode.boxoffsetHeight
    currentNode.setAttribute("OffSetHeight", addOffSetHeight);

    if (currentNode.children) {
      for (var i = 0; i < currentNode.children.length; i++) {
        stack.pushD(currentNode.children[i]);
      }
    }
  }

  temp = nodeStore2.parentNode;
  tempSib = nodeStore2.nextElementSibling ? nodeStore2.nextElementSibling : nodeStore2.previousElementSibling;
  nodeStore1.parentNode.replaceChild(nodeStore2, nodeStore1);
  temp.insertBefore(nodeStore1, tempSib);
}

DomShredder.prototype.addRow = function (assetName, count) {
  count = count || 1;
  var addRows = function (assetName, rowLeft) {
    if (rowLeft === 0) {
      return;
    }
    var rowList = document.getElementById("rowList");
    var newRow = createEl("div");
    var imgEl;
    var currentName;
    newRow.classList.add("row");

    for (var i = 1; i < 5; i++) {
      newEl = createEl("div");
      titleEl = createEl("div");
      currentName = assetName + i;
      titleEl.innerText = currentName;
      imgEl = createEl("img");
      newEl.id = currentName;
      newEl.classList.add("shopping_card");
      imgEl.classList.add("clothes_img");
      imgEl.src = "../record/assets/" + currentName + ".png";

      newEl.appendChild(titleEl);
      newEl.appendChild(imgEl);
      newRow.appendChild(newEl);
    }
    rowList.appendChild(newRow);
    addRows(assetName, --rowLeft);
  }
  addRows(assetName, count);
}

DomShredder.prototype.createAndAddForm = function (qNum) {
  var rowList = document.getElementById("rowList");
  var formEl = createEl("form");
  var root = createEl("div");
  var el;
  var inputEl;
  root.id = "root";

  while (qNum) {
    if (qNum === 0) {
      formEl = formEl.appendChild(currentEl);
    }
    el = createEl("div");
    // el.classList.add("shopping_card");
    inputEl = createEl("input");
    inputEl.value = "Coffee is great";
    el.appendChild(inputEl);
    formEl.appendChild(el);
    qNum--;
  }
  rowList.appendChild(formEl);
}



DomShredder.prototype.createCatVideo = function (qNum) {
  var randomCatVideo = ["https://www.youtube.com/embed/tntOCGkgt98", "https://www.youtube.com/embed/E9U9xS4thxU",
    "https://www.youtube.com/embed/QFH747sK200",
    "https://www.youtube.com/embed/9AVG8odajpA"];

  var rowList = document.getElementById("rowList");
  var iframeEl = createEl("iframe");
  iframeEl.src = randomCatVideo[Math.floor(Math.random() * randomCatVideo.length)] + "?autoplay=1"
  iframeEl.width = "560";
  iframeEl.height = "360";
  iframeEl.frameborder = "0";
  rowList.insertBefore(iframeEl, rowList.firstElementChild);
}


DomShredder.prototype.removeInputs = function () {
  var getTags = document.getElementsByTagName("input");
  var pNode;

  for (var i = 0; i < Math.round(getTags.length / 4); i++) {
    pNode = getTags[i].parentNode;
    pNode.removeChild(getTags[i]);
  }
}

DomShredder.prototype.moveNodes = function (replaceNodeCB) {
  var getRows = document.getElementsByClassName("row");
  var firstNode;
  var lastNode;
  var rowCount = 0;
  var currentRow;
  var randomNode = createEl("div");
  randomNode.innerHTML = "<p>Test test Test</p>";

  while (rowCount < getRows.length) {
    currentRow = getRows[rowCount];
    firstNode = currentRow.firstElementChild.nextElementSibling;
    lastNode = currentRow.lastElementChild.previousElementSibling;
    currentRow.insertBefore(firstNode, lastNode);
    currentRow.insertBefore(currentRow.firstElementChild, currentRow.lastElementChild);
    rowCount++;
    replaceNodeCB(randomNode, currentRow.lastElementChild);
  }
};


