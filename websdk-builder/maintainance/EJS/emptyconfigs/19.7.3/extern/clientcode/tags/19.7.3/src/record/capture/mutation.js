/**
 * Module for capturing DOM mutations
 *
 * An extension that captures select DOM mutations .
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("rec.Capture.Mutation");

fs.require("rec.Top");

(function () {
  /**
   * A DOM mutation capture
   * @param recorder The recorder instance
   */
  var Mutation = function (recorder) {
    // Keep track of config
    this.config = recorder.config;

    // Keep a reference to the recorder
    this.recorder = recorder;

    // Note the mutation synonym
    this.mutationSynonym = !!window.MutationObserver ? "MutationObserver" : !!window.WebKitMutationObserver ? "WebKitMutationObserver" : false;

    // Holds the dom method copies
    this.domMethodCopies = [];

    // Holds the rewritten dom methods
    this.domMethodRewrites = [];

    // Handles update throttler
    this.domUpdateThrottler = new ModThrottle(this.recorder);

    // Determine if we support dom prototypes
    this.supportsDomPrototypes = (!Capture._browser.isIE || ((fs.isDefined(recorder.win.Element) || fs.isDefined(recorder.win.HTMLElement)) && !recordconfig.useEleMutation));

    // Check if mutation observers are supported. If not, do the old way
    if (!this.setupMutationObserver(this.recorder, this)) {
      // Set up the element method overrides if they are available
      if (Capture._browser.isIE) {
        // Create a backup of each DOM mutation method, create the rewritten DOM mutation methods
        this.saveDomMutationMethods();

        // Override prototype mutation methods
        if (this.supportsDomPrototypes) {
          this.overrideDomPrototype();
        }

        // Do an initial binding to attribute change events
        // Will also override element level Dom Mutation events if Dom Prototype is not supported
        this.setNodeSpecificBindings(this.recorder.win.document);

        // Bind to the dom updated fn
        this.recorder.DomUpdated.subscribe(function (el) {
          this.setNodeSpecificBindings(el);
          // Free up the element
          el = null;
        }.bind(this));
      }
    }

    // Free up recorder
    recorder = null;
  };

  /**
   * @class Holds the DOM Mutation capture modules.
   * @static
   */
  Mutation.mutatorInfo = {
    ignoreNodeContentsList: "input,select,img,link,meta,title,textarea,br,hr,script".split(','),
    watchNodeList: "html,head,header,h1,h2,h3,h4,h5,article,aside,section,details,footer,figure,nav,body,div,span,ul,li,dd,dt,ol,dl,tr,td,span,form,img,a,area,iframe,fieldset,select,input,textarea,table,label",
    svgWatchNodeList: "svg,defs,g,symbol,use,circle,ellipse,line,polygon,polyline,rect,linearGradient,radialGradient,animate,animateColor,animateMotion,animateTransform,set,stop,a,altGlyphDef,clipPath,color-profile,cursor,filter,font,font-face,foreignObject,image,marker,mask,pattern,switch,text,view,path,clippath",
    domRewriteList: "appendChild,removeChild,removeNode,insertAdjacentHTML,replaceChild,replaceNode,swapNode,insertBefore".split(',')
  };

  // Quickreference the above JS Object
  var mutatorInfo = Mutation.mutatorInfo;

  /**
   * Test for Existence of DOM API Mutation Observer
   * If available, start observation document node
   * With configuration options to watch all attribute and sub-tree modification events from all child nodes
   * Will push data from mutation event into domAttrModifiedHandler or domSubtreeModifiedHandler
   */
  Mutation.prototype.setupMutationObserver = function (ctx, mut) {
    // Determine if Mutation Observers are supported
    var tctx = this,
      mutationSynonym = this.mutationSynonym,
      attrModHandler = mut.domAttrModifiedHandler(ctx, mut, tctx.config, true),
      subTreeHandler = mut.domSubtreeModifiedHandler(ctx, mut, tctx.config, true);
    //addModHandler = mut.domNodesAddedHandler(ctx, mut, tctx.config, true);

    if (mutationSynonym) {
      // Instantiate a mutation observer and bind to it
      mut.mutationObserver = new window[mutationSynonym](function (mutations) {
        // Fire 'onAttrModified' for attribute events; fire 'onSubtreeModified' for subtree events
        mutations.forEach(function (mutation) {
          var eventData;
          switch (mutation.type) {
            case "attributes":
              // Clone data needed by domAttrModifiedHandler
              if (__isValidAttrName(mutation.attributeName, mutation.target.tagName)) {
                eventData = {
                  'target': mutation.target,
                  'attrName': mutation.attributeName,
                  'newValue': mutation.target.getAttribute(mutation.attributeName)
                };
                attrModHandler(eventData);
              }
              eventData = null;
              break;
            case "characterData":
              // Signal that the parent node changed
              eventData = {
                'target': mutation.target.parentNode
              };
              subTreeHandler(eventData);
              break;
            case "childList":
              if (___isWorthWhileMutation(mutation)) {
                // Clone data needed by domSubtreeModifiedHandler
                eventData = {
                  'target': mutation.target
                };
                //if (mutation.removedNodes.length > 0) {
                subTreeHandler(eventData);
                /*} else {
                 eventData.nodes = mutation.addedNodes;
                 addModHandler(eventData);
                 }*/
                eventData = null;
              }
              break;
            default:
          }
        });
      });

      // Start observing. Will observe all attribute changes and subtree changes for all children of the document element.
      this.mutationConfig = { attributes: true, childList: true, subtree: true };
      mut.mutationObserver.observe(ctx.win.document, this.mutationConfig);
      return true;
    }
  };

  /**
   * Is a particular mutation worthwhile to track?
   * @param mutation
   * @private
   */
  var ___isWorthWhileMutation = function (mutation) {
    var i,
      nd;
    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
      for (i = 0; i < mutation.addedNodes.length; i++) {
        nd = mutation.addedNodes[i];
        if (nd.tagName != 'SCRIPT') {
          return true;
        }
      }
    }
    if (mutation.removedNodes && mutation.removedNodes.length > 0) {
      for (i = 0; i < mutation.removedNodes.length; i++) {
        nd = mutation.removedNodes[i];
        if (nd.tagName != 'SCRIPT') {
          return true;
        }
      }
    }

  };

  /**
   * Check if this is a valid attribute name
   * @param attrName
   * @param tagname
   * @returns {boolean}
   */
  var __isValidAttrName = function (attrName, tagname) {
    // Bomb out if the attribute name is bad
    if (!attrName || attrName.substr(0, 1) == "_" || attrName.substr(0, 2) == "on" || attrName == "href" || "script,meta,title".indexOf(tagname) >= 0) {
      return false;
    }

    // Strip sizzle and jQuery attributes
    return (!(attrName.indexOf("siz") === 0 || attrName.indexOf("jQuery") === 0) || attrName.indexOf('_fsrb') === 0);
  };

  /**
   * Handle property change events
   * (IE only)
   * @param node
   */
  Mutation.prototype.propertyChangeHandler = function (evt) {
    // Get a quick reference to the property name
    var propName = evt.propertyName,
      el = evt.srcElement,
      config = this.config;

    // Don't need evt bindings
    if (!__isValidAttrName(propName, el.tagName)) {
      el = null;
      return;
    }

    // In IE, innerHTML, innerText and outerHTML are considered attributes and thus we can capture them and log them as Dom Mutations
    if (propName == "innerHTML" || propName == "innerText" || propName == "outerHTML") {
      // If this is a select box, just get the parent node instead
      if (propName == "outerHTML" || (el.tagName && el.tagName == "SELECT")) {
        el = el.parentNode;
      }

      if (!this.mutationSynonym) {
        this.domUpdateThrottler.push(el, function (ctx, nel) {
          return function (tofs) {
            // Apply masking to this node if necessary, save masking flag to pass to ProcessHTML
            var rec = ctx.recorder,
              maskTarget = rec.masker._tagDynamicMaskNodes(nel, false, rec.win),
              xm = XPath.getMapping(nel),
              gl = rec.getLogger();

            if (gl) {
              gl.log(rec, Logger.EVENT_TYPES.DOM_MUTATION_NODE_MODIFIED, {
                'x': gl.logXPath(rec, xm),
                'h': Serialize.ProcessHTML(nel.innerHTML, rec.win.document, xm, maskTarget, config)
              }, null, tofs);

              // Fire the dom updated evt
              ctx._handleDomUpdateIfNecessary(nel);
            }

            // Free them up
            nel = null;
            ctx = null;
            maskTarget = null;
          };
        }(this, el), false);
      }
      // The rest of the attributes are standard node attributes and are logged as Dom Attributes
    } else if (propName.substring(0, 2) != "on") {
      // Look at the method names we remap and make sure we dont track those
      for (var j = 0; j < mutatorInfo.domRewriteList.length; j++)
        if (propName == mutatorInfo.domRewriteList[j]) {
          return;
        }

      if (fs.toLowerCase(propName.substr(0, 2)) == "on") {
        return;
      }

      // Assume we can get the property this way
      var propValue = el[propName];

      // This is an IE edge case to properly capture style changes
      if (propName.indexOf('style.') > -1) {
        propName = "style";
        propValue = el.getAttribute(propName);
      }

      // Pass this event to the throttler
      if (!this.mutationSynonym) {
        this.domUpdateThrottler.push(el, function (ctx, nel) {
          return function (tofs) {
            // Mask on className change
            ctx.recorder.masker._tagDynamicMaskNodes(nel, false, ctx.recorder.win);

            // TODO: refactor useless code
            // IE7 workaround
            if (propName == "style") {
              var styleObj = nel.getAttribute("style") || nel.style;
              if (styleObj && styleObj.cssText) {
                propValue = styleObj.cssText;
              }
            }

            // Quickreference the xpath
            var gl = ctx.recorder.getLogger(),
              xpgm = XPath.getMapping;

            if (gl) {
              if (propName == "style") {
                if (!propValue || propValue == "null") {
                  propValue = '';
                }

                var xpth = gl.logXPath(ctx, xpgm(nel, null, (propName == "id")));

                // Log it
                var sval = nel.getAttribute("style") || nel.style;
                if (sval)
                  gl.log(ctx.recorder, Logger.EVENT_TYPES.DOM_MUTATION_NODE_ATTR_MODIFIED, {
                    'a': propName,
                    'v': (typeof (sval.cssText) != "undefined" ? sval.cssText : sval + ''),
                    'x': xpth
                  }, null, tofs);

              } else {

                // Get the normalized tagname
                var tname = fs.toLowerCase(nel.tagName);

                // Write the evt
                // Occasionally, due to some compiler issues, we'll try to send an object through as the propValue causing a circular reference in IE
                if (typeof (propValue) != "object" && !(propName == "value" && tname == "input" && nel.type == "hidden") && !(utils.inArray(tname, ["input", "select", "textarea"]) && !utils.inArray(propName, ["className", "cols", "rows", "class", "width", "height", "align"]))) {
                  gl.log(ctx.recorder, Logger.EVENT_TYPES.DOM_MUTATION_NODE_ATTR_MODIFIED, {
                    'a': propName,
                    'v': propValue + '',
                    'x': gl.logXPath(ctx, xpgm(nel, null, (propName == "id")))
                  }, null, tofs);
                }
              }
            }

            ctx = null;
            gl = null;
            nel = null;
          };
        }(this, el), true, propName);
      }
    }

    // Clean up stuff
    el = null;
    evt = null;
  };

  /**
   * Callback function that is passed into 'domSubtreeModified' event (newer browsers only)
   * @param ctx
   * @param mut
   * @param cfg
   * @returns {Function}
   */
  Mutation.prototype.domSubtreeModifiedHandler = function (ctx, mut, cfg) {
    return function (e) {
      // Quickreference stuff
      var target = e.originalTarget || e.target || e.srcElement,
        tname = fs.toLowerCase(target.tagName),
        tempTarget;

      // Use utils.inArray because Stylish Select 0.4.1 can override Array.indexOf to return undefined instead of -1
      if (!utils.inArray(tname, mutatorInfo.ignoreNodeContentsList)) {
        // Specifically do special stuff or SVG elements
        if (cfg.advancedSettings && cfg.advancedSettings.svgCaptureEnabled && utils.inArray(tname, mutatorInfo.svgWatchNodeList.split(","))) {
          // If there is no innerHtml we should recursively jump up the tree to a target that does.
          tempTarget = target;
          while (!tempTarget.innerHTML) {
            if (tempTarget.parentNode) {
              tempTarget = tempTarget.parentNode;
            }
            else {
              break;
            }
          }
          target = tempTarget;
        }

        // Push this event to the ModThrottler
        mut.domUpdateThrottler.push(target, function (ctx, mut) {
          return function (timeDiff) {
            if (mut._doDomUpdateWorkWithLog) {
              mut._doDomUpdateWorkWithLog(ctx, timeDiff);
            }
          };
        }(target, mut), false);
      } else if (tname == "select" && target._fsrTracker !== null) {
        mut.domUpdateThrottler.push(target, function (ctx) {
          return function () {
            if (ctx._fsrTracker) {
              ctx._fsrTracker.serialize();
            }
          };
        }(target), false);
      }
    };
  };

  /**
   * Handles attribute change events
   * @param target
   * @param attr
   * @param newval
   * @param ctx
   * @param mut
   * @param cfg
   * @returns {Function}
   * @private
   */
  var __attrModHandler = function (target, attr, newval, ctx, mut, cfg) {
    return function (timeDiff) {
      var lxp = ctx.getLogger(),
        gm = XPath.getMapping,
        xpath;

      if (lxp) {
        // Check if class was changed to re-apply masking
        if (attr == "class") {
          ctx.masker._tagDynamicMaskNodes(target, true, ctx.win);
        }

        // Check if this was a style change
        if (attr == "style") {
          // Quickreference the xpath
          xpath = lxp.logXPath(ctx, gm(target, null, (attr == "id")));

          // Log it
          var sval = target.getAttribute("style") || target.style;

          // Only log if we have a value and its not a special fsrb attribute (ours)
          if (sval && attr != '_fsrb') {
            lxp.log(ctx, Logger.EVENT_TYPES.DOM_MUTATION_NODE_ATTR_MODIFIED, {
              "a": attr,
              "v": (typeof (sval.cssText) != "undefined" ? sval.cssText : sval + ''),
              "x": xpath
            }, null, timeDiff);
          }
        } else {
          // NOT a style watch

          // Make sure we aren't recording the value attribute of a hidden field
          if (attr != '_fsrb' && !(attr == "value" && target.tagName == "INPUT" && target.type == "hidden") && fs.toLowerCase(attr.substr(0, 2)) != "on") {
            // Quickreference the xpath
            var npth = gm(target, null, (attr == "id"));
            xpath = lxp.logXPath(ctx, npth);

            // Log that we changed an element's attribute
            lxp.log(ctx, Logger.EVENT_TYPES.DOM_MUTATION_NODE_ATTR_MODIFIED, {
              'a': attr,
              'v': newval,
              'x': xpath
            }, null, timeDiff);
          }
        }
      }
    };
  };

  /**
   * Callback function that is used in domAttrModified event
   * (Firefox only)
   * @type {DomAttrModifiedHandler}
   */
  Mutation.prototype.domAttrModifiedHandler = function (ctx, mut, cfg) {
    return function (e) {
      // Quickreference stuff
      var attr = e.attrName,
        newval = e.newValue,
        target = e.originalTarget || e.target || e.srcElement;
      // Don't need event bindings
      if (attr.substr(0, 2) == "on" || "script,meta,title".indexOf(target.tagName) > -1) {
        return;
      }
      // Throttle the update
      mut.domUpdateThrottler.push(target, __attrModHandler(target, attr, newval, ctx, mut, cfg), true, attr);

      // Get rid of leaks
      target = null;
    };
  };

  /**
   * Do all the things we need to do to log something
   * @param target
   */
  Mutation.prototype._doDomUpdateWorkWithLog = function (target, timediff) {
    var ctx = this.recorder;

    // on text nodes, use the parent
    if (target.nodeType == 3) {
      target = target.parentNode;
    }

    // Log that we changed an element
    var xm = XPath.getMapping(target);

    if (xm[0].indexOf("html") === 0) {
      // Apply masking to this node if necessary, save masking flag to pass to ProcessHTML
      var maskTarget = this.recorder.masker._tagDynamicMaskNodes(target, false, ctx.win),
        ihtml = target.innerHTML ? Serialize.ProcessHTML(target.innerHTML, ctx.win.document, xm, maskTarget, this.config) : {},
        gl = ctx.getLogger();

      // It changed, log it
      if (gl) {
        gl.log(ctx, Logger.EVENT_TYPES.DOM_MUTATION_NODE_MODIFIED, {
          'x': gl.logXPath(ctx, xm),
          'h': ihtml
        }, null, timediff);

        // Fire dom update if required
        this._handleDomUpdateIfNecessary(target);
      }
    }
  };

  /**
   * Do a DOM Update if the element itself warrants it
   * @param elm
   */
  Mutation.prototype._handleDomUpdateIfNecessary = function (elm) {
    var tname = fs.toLowerCase(elm.tagName);
    if (elm.nodeType == 1 && !utils.inArray(tname, Mutation.ignoreNodeContentsList)) {
      this.recorder.DomUpdated.fire(elm);
    }
  };

  /**
   * Do any custom binding that we need to with a specific node
   * @param node
   */
  Mutation.prototype.setNodeSpecificBindings = function (node) {
    // Get the list of watch nodes in here
    var nlist = node.querySelectorAll(mutatorInfo.watchNodeList + ", " + mutatorInfo.svgWatchNodeList);

    // This will handle property change events
    var fnToHandlePropchanges = function (ctx) {
      return function (e) {
        ctx.propertyChangeHandler(e);
      };
    }(this);

    for (var i = nlist.length - 1; i >= 0; i--) {
      // Bind to attribute changeEvent
      var el = nlist[i];
      utils.BindOnce(el, "record:propertychange", fnToHandlePropchanges, true, true);
      // Rewrite DOM mutation methods at element level
      if (!this.supportsDomPrototypes) {
        var mName,
          rwa = el.getAttribute("_fsrRewrite");
        if (!rwa) {
          el.setAttribute("_fsrRewrite", "true");
          for (var j = mutatorInfo.domRewriteList.length - 1; j >= 0; j--) {
            // set the element Dom mutation method to the overridden Dom mutation method
            mName = mutatorInfo.domRewriteList[j];
            el[mName] = this.domMethodRewrites[mName];
          }
        }
      }
      el = null;
    }

    // Get rid of stuff
    nlist = null;
    node = null;
    fnToHandlePropchanges = null;
  };

  /**
   * Rewrite a method
   * @param mname
   * @param mut
   */
  Mutation.prototype.methodRewriter = function (mname, mut) {
    // Keep a local copy of config
    var config = this.config;

    // Return a closure
    return function () {
      // Get the parent node
      var pnode = this.parentNode,
        oldcopy = mut.domMethodCopies[mname],
        res;

      if (!oldcopy) {
        return;
      }

      if (this.tagName == "BODY") {
        try {
          res = oldcopy(arguments[0], arguments[1]);
        } catch (e) {
          res = oldcopy.apply(this, arguments);
        }
      } else {
        res = oldcopy.apply(this, arguments);
      }

      // Fire the event
      if (pnode && pnode.nodeType == 1) {
        // Send the node to the throttler
        mut.domUpdateThrottler.push(pnode, function (ctx, nel) {
          return function (tofs) {

            // Apply masking to this node if necessary, save masking flag to pass to ProcessHTML
            var maskTarget = ctx.recorder.masker._tagDynamicMaskNodes(nel, false, ctx.recorder.win),
              xm = XPath.getMapping(nel),
              gl = ctx.recorder.getLogger(),
              tagName,
              tempTarget;

            if (gl) {
              // Specifically do special stuff for SVG elements
              tagName = fs.toLowerCase(nel.tagName);

              if (recordconfig.svgCaptureEnabled && utils.inArray(tagName, mutatorInfo.svgWatchNodeList.split(","))) {
                // If there is no innerHtml we should recursively jump up the tree to a target that does.
                tempTarget = nel;
                while (!tempTarget.innerHTML) {
                  if (tempTarget.parentNode) {
                    tempTarget = tempTarget.parentNode;
                  }
                  else {
                    // If no parentNode, cancel this function
                    return;
                  }
                }
                nel = tempTarget;
              }
              gl.log(ctx.recorder, Logger.EVENT_TYPES.DOM_MUTATION_NODE_MODIFIED, {
                'x': gl.logXPath(ctx.recorder, xm),
                'h': Serialize.ProcessHTML(nel.innerHTML, ctx.recorder.win.document, xm, maskTarget, config)
              }, null, tofs);

              // Fire the dom updated evt
              ctx._handleDomUpdateIfNecessary(nel);
            }
            // Free them up
            nel = null;
            ctx = null;
            maskTarget = null;

          };
        }(mut, pnode), false);
      }

      // Spit out any result
      return res;
    };
  };

  /**
   * Create backup of the Dom Mutation Methods and create the overwritten DOM Mutation Methods
   */
  Mutation.prototype.saveDomMutationMethods = function () {
    var mName,
      i;
    for (i = mutatorInfo.domRewriteList.length - 1; i >= 0; i--) {
      mName = mutatorInfo.domRewriteList[i];
      // backup native Dom mutation methods
      this.domMethodCopies[mName] = this.recorder.win.document.body[mName];
      // save rewritten Dom mutation methods
      this.domMethodRewrites[mName] = this.methodRewriter(mName, this);
    }
  };

  /**
   * Override the DOM prototype
   */
  Mutation.prototype.overrideDomPrototype = function () {
    // Quickreference the window
    var wn = this.recorder.win,
      mName,
      elProt = fs.isDefined(wn.Element) ? wn.Element.prototype : undefined,
      helProt = fs.isDefined(wn.HTMLElement) ? wn.HTMLElement.prototype : undefined,
      i;

    for (i = mutatorInfo.domRewriteList.length - 1; i >= 0; i--) {
      mName = mutatorInfo.domRewriteList[i];
      if (elProt && (elProt[mName] + '').indexOf('native') > -1) {
        elProt[mName] = this.domMethodRewrites[mName];
      }

      if (helProt && (helProt[mName] + '').indexOf('native') > -1) {
        helProt[mName] = this.domMethodRewrites[mName];
      }
    }
  };

  /**
   * Set the DomPrototypeOverrides back to the native function
   */
  Mutation.prototype.removeDomPrototypeOverrides = function () {
    // Quickreference
    var mName,
      wn = this.recorder.win,
      elProt = fs.isDefined(wn.Element) ? wn.Element.prototype : undefined,
      helProt = fs.isDefined(wn.HTMLElement) ? wn.HTMLElement.prototype : undefined,
      i;

    // if the Prototype method exists, delete the Prototype["method"] to reset it to the native function
    for (i = mutatorInfo.domRewriteList.length - 1; i >= 0; i--) {
      mName = mutatorInfo.domRewriteList[i];
      if (elProt && elProt[mName]) {
        delete elProt[mName];
      }
      if (helProt && helProt[mName]) {
        delete helProt[mName];
      }
    }
  };

  /**
   * Dispose of the mutation class
   */
  Mutation.prototype.dispose = function () {
    // First, Accelerate the modthrottler instance if it exists
    if (this.domUpdateThrottler) {
      this.domUpdateThrottler.accelerate();
      this.domUpdateThrottler.dispose();
    }

    fs.dispose(this.domMethodCopies);
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.supportsDomPrototypes && Capture._browser.isIE) {
      this.removeDomPrototypeOverrides();
    }
    this.domMethodCopies = null;
    this.domMethodRewrites = null;
    this.recorder = null;
  };

})();