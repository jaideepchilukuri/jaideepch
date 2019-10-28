var Queue = function() {
  this.items = [];
};

Queue.prototype.enqueue = function(obj) {
  this.items.push(obj);
};

Queue.prototype.dequeue = function() {
  return this.items.shift();
};

Queue.prototype.isEmpty = function() {
  return this.items.length === 0;
};

var Stack = function() {
  this.items = [];
};

Stack.prototype.pushD = function(obj) {
  this.items.push(obj);
};

Stack.prototype.pop = function() {
  return this.items.pop();
};

Stack.prototype.isEmpty = function() {
  return this.items.length === 0;
};
