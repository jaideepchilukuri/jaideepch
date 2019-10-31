/**
 * Cross-domain frame capture
 *
 * Inserts our recording code onto cross-domain iFrames. This works by using PostMessage to communicate
 * with iFrames and work their events into the master log.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white
 *
 */

fs.provide("rec.Capture.XDomainFrame");

fs.require("rec.Top");
fs.require("rec.Capture.EventThrottle");

(function () {

  /**
   * The XDomain Namespace
   * @type {{}}
   */
  var XDomainFrame = {
    // The list of frames we are tracking
    _frames: []
  };

  /**
   * Track a frame
   * @param frameXPath
   * @param frameRef {Dom Node}
   * @param recordRef {Recorder}
   * @constructor
   */
  XDomainFrame.TrackFrame = function (frameXPath, frameRef, recordRef) {
    var existingTrack = XDomainFrame._getFrameByXPath(frameXPath);

    if (!existingTrack) {
      XDomainFrame._frames.push({
        xp: frameXPath,
        nd: frameRef,
        rc: recordRef,
        sid: XDomainFrame._frames.length + '_',
        id: utils.generateGUID(),
        initialized: false
      });
    }
  };

  /**
   * Get a frame by its XPath
   * @param frameXPath
   * @private
   */
  XDomainFrame._getFrameByXPath = function (frameXPath) {
    var frameXPathStr = frameXPath.join('/');
    for (var i = 0; i < XDomainFrame._frames.length; i++) {
      if (XDomainFrame._frames[i].xp.join('/') == frameXPathStr) {
        return XDomainFrame._frames[i];
      }
    }
  };

  /**
   * Get a frame by its id
   * @param id
   * @private
   */
  XDomainFrame._getFrameById = function (id) {
    for (var i = 0; i < XDomainFrame._frames.length; i++) {
      if (XDomainFrame._frames[i].id == id) {
        return XDomainFrame._frames[i];
      }
    }
  };

  /**
   * Start tracking child frames
   * @constructor
   */
  XDomainFrame.BeginTrackingChildFrames = function (recorder) {
    // Periodically send init messages to frames that haven't responded yet
    setInterval(function () {
      for (var i = 0; i < XDomainFrame._frames.length; i++) {
        var frobj = XDomainFrame._frames[i];
        if (!frobj.initialized && frobj.nd.contentWindow) {
          // Send the message
          frobj.nd.contentWindow.postMessage(JSON.stringify({
            cxr: true,
            id: frobj.id,
            xp: frobj.xp,
            sid: frobj.sid,
            sp: Dom.getPosition(frobj.nd, recorder.win)
          }), "*");
        }
      }
    }, 400);

    // Set up listener for messages FROM child frames
    utils.Bind(window, "message", function (ed) {

      //Check if we are unloading iFrame
      if (ed.data.timetounload) {
        for (var r = 0; r < XDomainFrame._frames.length; r++) {
          if (XDomainFrame._frames[r].id === ed.data.frameId) {
            XDomainFrame._frames[r].initialized = false;
          }
        }
      }

      ed.data = ed.data + '';
      if (ed.data && fs.isFunction(ed.data.indexOf) && ed.data.indexOf('_cxrXDS_') > -1) {
        var obj;
        try {
          obj = JSON.parse(ed.data);
        } catch (e) {
          return;
        }
        if (obj) {
          var frobj = XDomainFrame._getFrameById(obj.id);
          if (frobj) {
            // Quick reference the logger
            var lg = recorder.getLogger();
            frobj.initialized = true;
            if (lg._data && lg._data.length > 0) {
              lg._data = lg._data + "," + obj.data;
            } else {
              lg._data = obj.data;
            }
          }
        }
      }
    });

    // Bind to scroll events so we can pass that info to cross-domain frames
    var scrollCapture = new EventThrottler(recorder, recorder.win, "record:scroll", 500, function (evt, subject, rec) {
      var sc = utils.getScroll(recorder.win);
      for (var i = 0; i < XDomainFrame._frames.length; i++) {
        var frobj = XDomainFrame._frames[i];
        if (frobj.initialized && frobj.nd.contentWindow) {
          // Send the message
          frobj.nd.contentWindow.postMessage(JSON.stringify({
            cxsp: true,
            sp: Dom.getPosition(frobj.nd, recorder.win)
          }), "*");
        }
      }
    });
  };

  /**
   * Send data to parent frame
   * @constructor
   */
  XDomainFrame.SendDataToParentFrame = function (parentCtx, frameId, data) {
    parentCtx.postMessage(JSON.stringify({
      _cxrXDS_: true,
      id: frameId,
      data: data
    }), "*");
  };

})();