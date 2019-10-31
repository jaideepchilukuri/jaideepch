/**
 * iFrame Binder
 *
 * Inserts our recording code onto iFrames
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white
 *
 */

fs.provide("rec.Capture.FrameBinding");

fs.require("rec.Top");
fs.require("rec.Capture.XDomainFrame");

(function () {

  /**
   * Captures interaction on the page
   */
  var FrameBinding = {
    iFrameXpaths: {}
  };

  /**
   * Bindings to iFrame load event and iFrame readystate == complete
   * @param rec
   */
  FrameBinding.performFrameBindings = function (recParent, nodetarget) {
    // Bomb out if we are not supposed to track iFrames.
    if (!!recordconfig.advancedSettings.skipIframes) {
      /* pragma:DEBUG_START */
      console.log("sr: " + (window === window.top ? '' : '[frm] ') + "skipping iFrame tracking");
      /* pragma:DEBUG_END */
      return;
    }

    // Get all iFrame nodes within fNode context
    var frameList = (nodetarget || recParent.win.document).querySelectorAll("iframe"),
      unloadClbk = function (rec) {
        return function () {
          rec.dispose();
        };
      },
      loadClbk = function (rec) {
        return function (e) {
          FrameBinding.bindToFrameLoad(e, rec);
        };
      },
      i,
      fNode,
      bFlag,
      winRef,
      docRef,
      docReadyState;

    for (i = 0; i < frameList.length; i++) {
      // Reference to current node in array
      fNode = frameList[i];
      bFlag = fNode._fsrB || fNode.getAttribute("_fsrB");

      // Test frame node to see if it is already bound
      if (!bFlag && !FrameBinding.iFrameXpaths[XPath.getMapping(fNode)]) {
        // Understand whether the src of the frame is in the same origin or not
        var validOrigin = this.testFrameOrigin(fNode),
          validSrc = this.testFrameSrc(fNode);


        // Tests for the iFrame for same origin: http://en.wikipedia.org/wiki/Same_origin_policy
        if (validSrc && validOrigin) {
          // Save the xpath
          FrameBinding.iFrameXpaths[XPath.getMapping(fNode)] = true;

          // Sets bindingAlreadyPerformed
          fNode.setAttribute("_fsrB", true);

          /* pragma:DEBUG_START */
          console.log("sr: " + (window === window.top ? '' : '[frm] ') + "setting up same-origin tracking of iframe ", fNode.outerHTML);
          /* pragma:DEBUG_END */

          // Get iFrame window reference and RETURN if there reference is null
          winRef = this.getFrameWindow(fNode);
          if (!winRef) {
            return;
          }

          // Get iFrame window document reference if it is permitted
          docRef = this.getFrameDocument(winRef, false);
          docReadyState = false;
          if (docRef) {
            this.unbindInternalIframes(docRef);

            // If iFrame window document reference readystate == complete(this is done in a try catch for when a permission error is thrown.even after checking for the same origin)
            // Update: removed interactive readystate support because it did not guarantee document.body was ready to have the swf file appended. EX www.harlequin.com in IE8
            try {
              if ("complete, loaded".indexOf(docRef.readyState) > -1) {
                docReadyState = true;
              }
            } catch (e) {
            }
            if (docReadyState) {
              // Fest if the iFrame window reference recorder object is null
              if (!fs.isDefined(winRef.recorder)) {
                winRef.recorder = new Recorder(recParent.stg, recParent.browser, winRef, XPath.getMapping(fNode), recParent, recParent.config);
                recParent.childRecorders.push(winRef.recorder);
                utils.Bind(winRef, "unload", unloadClbk(winRef.recorder));
              } else {
                winRef.recorder.serializeDom();
              }
            }
          }
          // Release the document and window reference
          docRef = null;
          winRef = null;
        } else if (validSrc && !validOrigin) {
          /* pragma:DEBUG_START */
          console.log("sr: " + (window === window.top ? '' : '[frm] ') + "not binding to iFrame due to cross-origin violation: (%c" + fNode.src + "%c)", 'color:green', 'color:black');
          /* pragma:DEBUG_END */
          // Save the xpath
          FrameBinding.iFrameXpaths[XPath.getMapping(fNode)] = true;

          // Sets bindingAlreadyPerformed
          fNode.setAttribute("_fsrB", true);

          /* pragma:DEBUG_START */
          console.log("sr: " + (window === window.top ? '' : '[frm] ') + "setting up cross-origin tracking of iframe ", fNode.outerHTML);
          /* pragma:DEBUG_END */

          XDomainFrame.TrackFrame(XPath.getMapping(fNode), fNode, recParent);
        }

        // Bind to 1st and 3rd party iFrame on load. This is called whenever the url changes.
        utils.BindOnce(fNode, "record:load", loadClbk(recParent));
      }

      // Free up stuff
      fNode = null;
    }
    // Free up stuff
    frameList = null;
    recParent = null;
  };

  /**
   *
   */
  FrameBinding.bindToFrameLoad = function (e, recParent) {
    // Create a new recorder
    var target = e.originalTarget || e.target || e.srcElement,
      winRef;
    if (target && this.testFrameSrc(target) && FrameBinding.testFrameOrigin(target)) {
      winRef = FrameBinding.getFrameWindow(target);
      if (FrameBinding.getFrameDocument(winRef)) {
        if (!fs.isDefined(winRef.recorder)) {
          winRef.recorder = new Recorder(recParent.stg, recParent.browser, winRef, XPath.getMapping(target), recParent, recParent.config, recParent.isIframeMode);
          recParent.childRecorders.push(winRef.recorder);
          winRef.recorder.ready.subscribe(function () {
            utils.Bind(winRef, "unload", this.dispose);
          }.bind(winRef.recorder), true, true);
        }
      }
      winRef = null;
    }
    target = null;
    recParent = null;
    e = null;
  };

  /**
   * Make sure the frame source is a valid source
   * @param frameNode
   * @return {Boolean}
   */
  FrameBinding.testFrameSrc = function (frameNode) {
    // Array containing bad iFrame sources
    // Javascript: is not a valid source, it is used to create a blank iframe in IE
    // shim.gif is a foresee control, having problems trying to capture it, so block

    /* jshint ignore:start */
    var blockedSources = ['javascript:', 'shim.gif', 'about:blank'],
      i;
    for (i = 0; i < blockedSources.length; i++) {
      if (frameNode.src.indexOf(blockedSources[i]) > -1) {
        return false;
      }
    }
    return true;
    /* jshint ignore:end */
  };

  /**
   * Tests if the iFrame is from the same origin as the parent window.
   * @param frameNode
   * @param hostName this parameter is used for unit testing, it sets the page hostname
   * @return {Boolean}
   */
  FrameBinding.testFrameOrigin = function (frameNode, hostName) {
    var srcAttr = frameNode.getAttribute("src");

    // Return false if no src attribute present or src starts with whitespace
    if (!srcAttr || srcAttr.indexOf(" ") === 0) {
      return false;
    }

    // Get the source of the iFrame
    var iFrameSrc = frameNode.src;

    return utils.testSameDomain(hostName || window.location.href, iFrameSrc);
  };

  /**
   * Loops over iFrames within an iFrame and unbinds those iFrames
   * @param frameDoc
   */
  FrameBinding.unbindInternalIframes = function (frameDoc) {
    var frameList = frameDoc.querySelectorAll("iframe[_fsrB='true']"),
      i;
    for (i = 0; i < frameList.length; i++) {
      frameList[i]._fsrB = false;
    }
  };

  /**
   * Get the window reference from the iFrame node abstracting for browsers.
   * @param frameNode
   * @return {cross-browser iFrame window reference}
   */
  FrameBinding.getFrameWindow = function (frameNode) {
    // In IE8 there is a special case where frameNode.contentWindow.top refers to itself. Return null in this case.
    var frameWindow;
    if (frameNode && frameNode.contentWindow) {
      frameWindow = frameNode.contentWindow;
    } else if (frameNode && frameNode.contentDocument && frameNode.contentDocument.defaultView) {
      frameWindow = frameNode.contentDocument.defaultView;
    }
    return (frameWindow && frameWindow != frameWindow.top) ? frameWindow : null;
  };

  /**
   * Check that the document is accessible
   * @param frameNode
   * return iframe document reference is availalble, false if not available
   */
  FrameBinding.getFrameDocument = function (frameWindow) {
    var docRef;
    try {
      // this will fail if the document is not accessible.
      // This is possible if the document.domain does not match the parent window document.domain (homedepot, nordstrom) tom 2/25/2013
      docRef = frameWindow.document;
      return docRef;
    } catch (e) {
      // iFrame "load" binding will catch the iFrame after document.domain changes
      return false;
    }
  };

})();