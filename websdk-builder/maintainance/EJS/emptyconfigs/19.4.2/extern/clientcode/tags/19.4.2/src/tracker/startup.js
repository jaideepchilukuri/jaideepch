/**
 * Entry point for Tracker window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Startup");

fs.require("track.Top");
fs.require("track.Tracker");
fs.require("track.Misc.Template");
fs.require("track.Misc.Services");
fs.require("track.Misc.Base64");
fs.require("track.Communicator");

(function (tracker) {

  // Main entry point
  fs.winReady(function () {
    // The close timer
    var killTimer = setTimeout(function() {
      window.close();
    }, 7000);

    /* pragma:DEBUG_START */
    console.log("tracker: window load - stopping kill timer due to debug mode");
    clearTimeout(killTimer);
    /* pragma:DEBUG_END */

    // Set the ice-breaking cookie (Safari)
    document.cookie = 'fsIce=broke';

    // Set up the browser
    var browser = new utils.Browser();

    // Holds the CPP's that may come from the main window
    var cppInfo;

    // Holds the eventual tracker instance
    var trackerInst;

    // Bind to browser ready
    browser.ready.subscribe(function () {
      /* pragma:DEBUG_START */
      console.log("tracker: browser detected", browser);
      /* pragma:DEBUG_END */
      var perType = fs.getParam('stg'),
        comm;

      if (perType == utils.storageTypes.CK || perType == utils.storageTypes.DS) {
        comm = new Comms(browser);
        var syncEvt = new utils.FSEvent(),
          trackerinfo,
          hb_i,
          didDraw = false;

        /* pragma:DEBUG_START */
        console.log("tracker: waiting for a message..");
        /* pragma:DEBUG_END */

        var finishFn = fs.proxy(function (key, val) {
          var _trackerinfo = comm.get('trackerinfo'),
            _hb_i = comm.get('hb_i'),
            cppinfotmp = comm.get('ckcpps'),
            trackercmd = comm.get('trackercmd'),
            defupdate = comm.get('defupdate');

          if (defupdate && trackerInst) {
            trackerInst.data.def.name = defupdate.name;
          }

          // Is there a new survey def and what not
          if (_trackerinfo) {
            trackerinfo = _trackerinfo;
            /* pragma:DEBUG_START */
            console.log("tracker: tracker instance set to", _trackerinfo);
            /* pragma:DEBUG_END */
            if (trackerInst) {
              trackerInst.data = _trackerinfo;
            }
          }

          if (_hb_i) {
            hb_i = _hb_i;
          }

          if (cppinfotmp) {
            cppInfo = cppinfotmp;
            comm.kill('ckcpps');
            /* pragma:DEBUG_START */
            console.log("tracker: received CPP's from main window: ", cppinfotmp);
            /* pragma:DEBUG_END */
            if (trackerInst) {
              trackerInst.ready.subscribe(function () {
                // Set the CPPS
                if (trackerInst) {
                  trackerInst.setCPPS(cppInfo);
                }
              }, true, true);
            }
          }

          if (trackercmd) {
            switch (trackercmd.method) {
              case "close":
                window.close();
                break;
              case "survey":
                if (trackerInst && trackerInst.goToSurvey) {
                  trackerInst.goToSurvey();
                }
                break;
              default:
                break;
            }
          }

          syncEvt.fire();

          if (trackerinfo && hb_i && !didDraw) {
            didDraw = true;
            comm.kill('hb_i');
            comm.kill('trackerinfo');
            clearInterval(checkerTm);

            // When the window loads, fire up the tracker
            trackerInst = new Tracker(browser, {
              onSync: syncEvt,
              get: function (key) {
                // This is simulated, happens only the first time tracker loads
                if (key === 'rid') {
                  return fs.getParam('uid');
                }
                return comm.get(key);
              },
              setUpdateInterval: function () {
              },
              cfg: {
                persistence: perType,
                brain_url: fs.getParam('brain_url')
              }
            }, trackerinfo);

            // Expose it
            window.Tracker = trackerInst;

            // When the tracker is ready to draw itself
            trackerInst.ready.subscribe(function () {
              /* pragma:DEBUG_START */
              console.log("tracker: is ready to draw itself");
              /* pragma:DEBUG_END */

              // Clear the kill timer
              clearTimeout(killTimer);

              // Set any CPPS
              if (cppInfo) {
                trackerInst.setCPPS(cppInfo);
              }

              // Do the rendering of the template
              trackerInst.renderTemplate();
            }, true, false);

            // Start firing sync events regularly
            setInterval(fs.proxy(function () {
              syncEvt.fire();
            }, this), 2000);
          }
        }, this);

        var checkerTm = setInterval(finishFn, 150);
        comm.messageReceived.subscribe(finishFn, false, true);

      } else {
        // This is the server-based way: COOKIELESS or MICROCOOKIE
        var stg = utils.getGlobalStore(browser, fs.getParam('uid'));

        // Wait for storage to be ready
        stg.ready.subscribe(fs.proxy(function () {
          /* pragma:DEBUG_START */
          console.log("tracker: storage is ready");
          /* pragma:DEBUG_END */

          // Set the update interval for storage
          stg.setUpdateInterval(1000);

          // Start checking to see when we get the information for the tracker window
          stg.watchForChanges(['trackerinfo', 'trackercmd'], fs.proxy(function (key, olddata, tcfg) {
            // What time of key is this?
            if (key == 'trackercmd') {
              switch (tcfg.method) {
                case "close":
                  window.close();
                  break;
                case "survey":
                  if (trackerInst && trackerInst.goToSurvey) {
                    trackerInst.goToSurvey();
                  }
                  break;
                default:
                  break;
              }
            }
            /* pragma:DEBUG_START */
            console.warn("tracker: detected tracker data from main page: ", tcfg);
            /* pragma:DEBUG_END */
            // Set the new update interval
            stg.setUpdateInterval(stg.get('hb_i'));
            // When the window loads, fire up the tracker

            if (fs.isDefined(trackerInst)) {
              trackerInst.update(browser, stg, tcfg);
            } else {
              trackerInst = new Tracker(browser, stg, tcfg);
            }

            // Expose it
            window.Tracker = trackerInst;

            trackerInst.ready.subscribe(function () {
              /* pragma:DEBUG_START */
              console.log("tracker: is ready to draw itself");
              /* pragma:DEBUG_END */

              // Remove the kill timer
              clearTimeout(killTimer);

              // Set any CPPS
              if (cppInfo) {
                trackerInst.setCPPS(cppInfo);
              }

              // Do the rendering of the template
              trackerInst.renderTemplate();
            }, true, false);
          }, this), false, true);
        }, this), true, true);
      }
    }, true, true);
  });

})(tracker);