/**
 * Event stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * The list of bindings
 */
var bindings = {};

/**
 * Prevent the default event behavior the event passed to the function
 * @param prevent {event}
 */
utils.preventDefault = function(prevent) {
  /* pragma:DEBUG_START */
  console.warn("utils: preventing default action");
  /* pragma:DEBUG_END */
  if (prevent && prevent.preventDefault) {
    prevent.preventDefault();
  } else if (window.event && window.event.returnValue) {
    window.eventReturnValue = false;
  } else {
    prevent.returnValue = false;
  }
};

/**
 * These event bindings will fire on unload
 * @type {Array}
 */
var unloadList = [];

/**
 * Extract the basic event information
 * @param eventName
 * @private
 */
var _extractEventNS = function(eventName) {
  var ns = "default";
  if (eventName.indexOf(":") > -1) {
    var bts = eventName.split(":");
    ns = bts[0];
    eventName = bts[1];
  }
  if (!bindings[ns]) {
    bindings[ns] = {};
  }
  if (!bindings[ns][eventName]) {
    bindings[ns][eventName] = [];
  }
  return { ns: ns, en: eventName };
};

/**
 * Bind to a DOM event. Examples:
 *
 * utils.Bind(myElem, 'click', callback);
 * utils.Bind(myElem, 'myNS:click', callback);
 *
 * @param elem
 * @param eventName {String or Array[String]}
 * @param callback
 * @param options {Boolean | Object} Third parameter to addEventListener (capture, or options)
 */
// TODO use options only as an object. (currently 125 occurences) (CC-4284)
utils.Bind = function(elem, eventName, callback, options) {
  if (elem && eventName) {
    if (fs.isArray(eventName)) {
      eventName.forEach(function(evt) {
        utils.Bind.call(utils, elem, evt, callback, options);
      });
      return;
    }
    var eventInfo = _extractEventNS(eventName);
    bindings[eventInfo.ns][eventInfo.en].push({
      elem: elem,
      cb: callback,
      ub: options || false,
    });

    if (eventName.indexOf("unload") > -1 && (elem === window || elem === document)) {
      unloadList.push(callback);
      return;
    }

    // See if the addEventListener function exists on the element
    if (elem._zone$addEventListener) {
      // This fixes an issue with angular/zone.js causing infinite loops
      // where they override addEventListener to do two way data binding
      // -- for angular 3-
      elem._zone$addEventListener(
        eventInfo.en,
        callback,
        typeof options === typeof true || options == null ? !options : options
      );
    } else if (elem.__zone_symbol__addEventListener) {
      // This fixes an issue with angular/zone.js causing infinite loops
      // where they override addEventListener to do two way data binding
      elem.__zone_symbol__addEventListener(
        eventInfo.en,
        callback,
        typeof options === typeof true || options == null ? !options : options
      );
    } else if (eventInfo.en != "propertychange" && elem.addEventListener) {
      // TODO use options only as an object. (currently 125 occurences) (CC-4284)
      // "options" either holds an options object, like standard addEventListener
      // or it holds a Boolean telling to use bubble, which
      // is the opposite of the standard use capture.
      elem.addEventListener(
        eventInfo.en,
        callback,
        typeof options === typeof true || options == null ? !options : options
      );
    } else if (elem.attachEvent) {
      elem.attachEvent("on" + eventInfo.en, callback);
    }
  }
};

/**
 * Bind to a DOM event and unbind on first firing of the event
 * @param elem
 * @param eventName [String or Array[String]]
 * @param callback
 */
utils.BindOnce = function(elem, eventName, callback, usebubblemode) {
  if (elem && eventName) {
    if (fs.isArray(eventName)) {
      eventName.forEach(function(evt) {
        utils.BindOnce.call(utils, elem, evt, callback, usebubblemode);
      });
      return;
    }
    var eventInfo = _extractEventNS(eventName);

    var onceCB = function() {
      utils.Unbind(elem, eventName, onceCB, usebubblemode);
      callback.apply(this, arguments);
    };

    utils.Bind(elem, eventName, onceCB, usebubblemode);
  }
};

/**
 * Do the actual unbinding
 * @param ename
 * @param elem
 * @param callback
 * @private
 */
var _runActualUnBind = function(ename, elem, callback, usebubblemode) {
  // See if the addEventListener function exists on the element
  // window elements also need a special check for .window since they wont have parentNode
  // Document elements (nodeType == 9) are also special
  if (elem && (elem.parentNode || elem.window || elem.nodeType == 9)) {
    if (elem._zone$removeEventListener) {
      // fix for Angular (and zone.js) overriding removeEventListener
      elem._zone$removeEventListener(ename, callback, !usebubblemode);
    } else if (elem.__zone_symbol__removeEventListener) {
      // fix for Angular (and zone.js) overriding removeEventListener
      elem.__zone_symbol__removeEventListener(ename, callback, !usebubblemode);
    } else if (ename != "propertychange" && elem.removeEventListener) {
      elem.removeEventListener(ename, callback, !usebubblemode);
    } else if (elem.detachEvent) {
      elem.detachEvent("on" + ename, callback);
    }
  }
};

/**
 * Unbind to a DOM event. Examples:
 *
 * utils.Unbind(myNode);
 * utils.Unbind(myNode, 'click');
 * utils.Unbind(myNode, 'myNs:click');
 * utils.Unbind(myNode, 'myNs:*');
 * utils.Unbind(myNode, 'click', myCallback);
 * utils.Unbind('myNs:click');
 * utils.Unbind('myNs:*');
 * utils.Unbind(); // do everything
 *
 * @param elem {HTMLElement}
 * @param eventName {string}
 * @param callback {function}
 * @param usebubblemode {boolean}
 */
utils.Unbind = function(elem, eventName, callback, usebubblemode) {
  var eventInfo, nsb, einf, i;

  if (fs.isArray(eventName)) {
    eventName.forEach(function(evt) {
      utils.Unbind.call(utils, elem, evt, callback, usebubblemode);
    });
    return;
  }

  if (eventName && eventName.indexOf("unload") > -1) {
    for (i = 0; i < unloadList.length; i++) {
      if (unloadList[i] == callback) {
        unloadList.splice(i, 1);
        return;
      }
    }
  }

  if (arguments.length === 0) {
    // Unbind everything ************************
    for (var nso in bindings) {
      // Run a blanket namespace unbinding
      utils.Unbind(nso + ":*");
      delete bindings[nso];
    }
  } else if (typeof elem == "string") {
    // Unbind specific event type OR namespace OR both
    eventInfo = _extractEventNS(elem);

    // What type of namespace are we doing?
    if (eventInfo.ns == "default") {
      // do all namespaces
      for (var nsi in bindings) {
        if (bindings.hasOwnProperty(nsi)) {
          nsb = bindings[nsi];
          for (var etype in nsb) {
            if (nsb.hasOwnProperty(etype) && (etype == eventInfo.en || eventInfo.en == "*")) {
              for (i = 0; i < nsb[etype].length; i++) {
                einf = nsb[etype][i];
                // We're removing a specific binding
                _runActualUnBind(etype, einf.elem, einf.cb, einf.ub);
                // Remove it from the list
                nsb[etype].splice(i--, 1);
              }
            }
          }
        }
      }
    } else {
      // Specific namespace
      nsb = bindings[eventInfo.ns];
      for (var etype2 in nsb) {
        if (nsb.hasOwnProperty(etype2) && (etype2 == eventInfo.en || eventInfo.en == "*")) {
          for (i = 0; i < nsb[etype2].length; i++) {
            einf = nsb[etype2][i];
            // We're removing a specific binding
            _runActualUnBind(etype2, einf.elem, einf.cb, einf.ub);
            // Remove it from the list
            nsb[etype2].splice(i--, 1);
          }
        }
      }
    }
  } else if (elem && !eventName) {
    // An element was specified but no event type
    for (var nsi2 in bindings) {
      if (bindings.hasOwnProperty(nsi2)) {
        nsb = bindings[nsi2];
        for (var etype3 in nsb) {
          if (nsb.hasOwnProperty(etype3)) {
            for (i = 0; i < nsb[etype3].length; i++) {
              einf = nsb[etype3][i];
              if (einf.elem === elem) {
                // We're removing a specific binding
                _runActualUnBind(etype3, einf.elem, einf.cb, einf.ub);
                // Remove it from the list
                nsb[etype3].splice(i--, 1);
              }
            }
          }
        }
      }
    }
  } else if (elem && eventName) {
    // There's an element defined and an event type defined, although it might be a wildcard
    eventInfo = _extractEventNS(eventName);

    // Check to see how we are unbinding this
    if (eventInfo.ns == "default") {
      // do all namespaces
      for (var nsi3 in bindings) {
        if (bindings.hasOwnProperty(nsi3)) {
          nsb = bindings[nsi3];
          for (var etype4 in nsb) {
            if (nsb.hasOwnProperty(etype4) && (etype4 == eventInfo.en || eventInfo.en == "*")) {
              for (i = 0; i < nsb[etype4].length; i++) {
                einf = nsb[etype4][i];
                if (einf.elem === elem) {
                  // We're removing a specific binding
                  _runActualUnBind(etype4, einf.elem, !!callback ? callback : einf.cb, einf.ub);
                  // Remove it from the list
                  nsb[etype4].splice(i--, 1);
                }
              }
            }
          }
        }
      }
    } else {
      eventInfo = _extractEventNS(eventName);
      nsb = bindings[eventInfo.ns];
      for (var etype5 in nsb) {
        if (nsb.hasOwnProperty(etype5) && (etype5 == eventInfo.en || eventInfo.en == "*")) {
          for (i = 0; i < nsb[etype5].length; i++) {
            einf = nsb[etype5][i];
            if (einf.elem === elem) {
              // We're removing a specific binding
              _runActualUnBind(etype5, einf.elem, !!callback ? callback : einf.cb, einf.ub);
              // Remove it from the list
              nsb[etype5].splice(i--, 1);
            }
          }
        }
      }
    }
  }
};

/**
 * This is a boolean that keeps track of if we shoud allow the global
 * unload event to fire.
 */
var _suppressUnload = false;

/**
 * @public
 * This is a flag that overrides and prevents unload event from taking place.
 */
utils.preventUnloadFlag = false;

/**
 * @private
 * This is used to avoid an event triggering beforeunload immediately.
 */
utils._preventUnloadFor = function(ms) {
  _suppressUnload = true;
  setTimeout(function() {
    _suppressUnload = false;
  }, ms);
};

/**
 * Run the unload bindings
 */
utils.HandleUnload = function() {
  if (!_suppressUnload && !utils.preventUnloadFlag) {
    for (var i = unloadList.length - 1; i >= 0; i--) {
      try {
        unloadList[i].call();
      } catch (e) {}
    }
    fs.dispose(unloadList);
    utils.Unbind();
  }
};

// Setup the unload stuff
if (document.addEventListener) {
  window.addEventListener("beforeunload", utils.HandleUnload, true);
  window.addEventListener("pagehide", utils.HandleUnload, true);
  document.addEventListener("unload", utils.HandleUnload, true);
} else if (document.attachEvent) {
  window.attachEvent("onunload", utils.HandleUnload);
}

/**
 * Grab the correct keyCode for the event
 */
utils.getKeyCode = function(e) {
  return e.keyCode ? e.keyCode : e.charCode;
};

/**
 * A synthetic event class
 * @constructor
 */
utils.FSEvent = function() {
  // The ID
  this.id = "_" + Math.round(Math.random() * 99999);

  // Set up the subscriptions
  this.subscriptions = [];

  // Indicates whether the event fired
  this.didFire = false;
};

/**
 * Subscribe to an event, passing the function which will be called when the event
 * is fired.
 * @param fn {Function} The function to call when the event is fired
 * @param [once] {Boolean} <code>true</code> for a one-time subscription which will be
 *      removed once fired.
 * @param [stragglers] {Boolean} <code>true</code> to fire the event again for this
 *      callback if it has already fired once.
 */
utils.FSEvent.prototype.subscribe = function(fn, once, stragglers) {
  // Add it to the subscriptions list
  this.subscriptions.push({
    once: !!once,
    cb: fn,
  });

  // Did this already fire and this is a straggler binding?
  if (stragglers && this.didFire) {
    if (this.prevArgs) {
      this.fire.apply(this, this.prevArgs);
    } else {
      this.fire();
    }
  }

  return {
    unsubscribe: (function(ctx, fnref) {
      return function() {
        ctx.unsubscribe(fnref);
      };
    })(this, fn),
  };
};

/**
 * Unsubscribe an event handler.
 * @param fn {Function} The handler which was assigned when the event handler subscribed.
 */
utils.FSEvent.prototype.unsubscribe = function(fn) {
  for (var i = 0; i < this.subscriptions.length; i++)
    if (this.subscriptions[i].cb == fn) {
      this.subscriptions.splice(i, 1);
      // Move the counter down one
      i--;
    }
};

/**
 * Unsubscribe all handlers for this event.
 */
utils.FSEvent.prototype.unsubscribeAll = function() {
  this.subscriptions = [];
};

/**
 * Fire the event, calling each of the handlers.  Event handlers which are a one-time
 * subscription will be removed after this triggering.  Optionally pass data to each handler.
 * The scope of the handler is the object upon which the event is being triggered.
 */
utils.FSEvent.prototype.fire = function() {
  // Set the flag
  this.didFire = true;
  this.prevArgs = arguments;
  for (var i = 0; i < this.subscriptions.length; i++) {
    // Create a quick reference
    var eventObject = this.subscriptions[i];

    // Remove it if its a subscribeOnce deal
    if (eventObject.once) {
      // Don't call unsubscribe because that would remove multiple instances of a binding, instead do it manually
      this.subscriptions.splice(i--, 1);
    }

    // Fire it
    eventObject.cb.apply(this, arguments);
  }
};

/**
 * A puplic page navigation event
 * @type {utils.FSEvent}
 */
utils.pageNavEvent = new utils.FSEvent();

// Bind to history events
if (history && history.pushState) {
  window.addEventListener("popstate", function(e) {
    if (!_suppressUnload) {
      // e.state is equal to the data-attribute of the last image we clicked
      utils.pageNavEvent.fire();
    }
  });
  var oldpush = history.pushState;
  history.pushState = function() {
    oldpush.apply(history, arguments);
    if (!_suppressUnload) {
      utils.pageNavEvent.fire();
    }
  };
}

/**
 * This function chains this event to another received as an argument. This event should be fired whenever the event denoted by evt is fired as well.
 * Usage Example:
 * var a = new utils.FSEvent(),
 *   b = new utils.FSEvent();
 * a.chain(b, false, true); // Fires a when b gets fired.
 * @param {utils.FSEvent} evt An event object to which we need to chain "this" event.
 * @param {Boolean} [once] true for a one-time subscription which will be
 *      removed once fired.
 * @param {Boolean} [stragglers] true to fire the event again for this
 *      callback if it has already fired once.
 */
utils.FSEvent.prototype.chain = function(evt, once, stragglers) {
  if (!!evt && evt.constructor === utils.FSEvent) {
    // Just pass on the other arguments
    evt.subscribe(
      function() {
        this.fire.apply(this, arguments);
      }.bind(this),
      once,
      stragglers
    );
  }
};
