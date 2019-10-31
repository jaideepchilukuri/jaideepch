/**
 * Event Bind
 * @param element
 * @param type
 * @param handler
 * @private
 */
function __eB(element, type, handler) {
  if (element.addEventListener) {
    element.addEventListener(type, handler, false);
  } else {
    element.attachEvent("on" + type, handler);
  }
}

/**
 * Bind to the onload event. Also works if the onload event has already fired
 * @param cb
 */
var winload = function(cb) {
  if (_D.readyState === "complete") {
    nextTick(cb);
  } else {
    __eB(_W, "load", cb);
  }
};
