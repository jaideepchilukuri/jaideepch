/**
 * CS SessionReplay
 *
 * This is the main entrypoint for Replay code
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2012-04-11 16:05:27 -0700 (Wed, 11 Apr 2012) $
 * @version $Revision: 12461 $

 * Created: May. 2, 2011
 */

// Set up a new browser detector
var browser = new utils.Browser();
var player;

// Set up the replayer on window.load and expose it. This is the main entry point for SessionReplay.
fs.winReady(function() {
  /* pragma:DEBUG_START */
  console.warn("rp: window load");
  /* pragma:DEBUG_END */

  // Make sure we know which browser this is and what kind of device it is.
  browser.ready.subscribe(
    function() {
      /* pragma:DEBUG_START */
      console.warn("rp: player starting v" + Replay.version);
      /* pragma:DEBUG_END */

      var sessionInfo = JSON.parse(atob(fs.embedAttrs["data-sessioninfo"]));

      /* pragma:DEBUG_START */
      console.warn("rp: player session data:", sessionInfo);
      /* pragma:DEBUG_END */

      // Optionally load replay.js in pose mode
      var poseMode = (fs.getParam("pose") || "false") === "true";
      if (poseMode) {
        var poser = new Poser(sessionInfo);
        player = poser;
        fs.nextTick(poser.load.bind(poser));
        return;
      }

      // indicates for web playback whether to automatically start playing
      var autoPlay = (fs.getParam("autoplay") || "true").toLowerCase();
      if (autoPlay == "true") {
        autoPlay = true;
      } else {
        autoPlay = false;
      }

      // video capture parameters
      var videoParams = {
        vwidth: parseInt(fs.getParam("vwidth") || "1280", 10),
        vheight: parseInt(fs.getParam("vheight") || "720", 10),
        framerate: parseInt(fs.getParam("framerate") || "30", 10),
        bitrate: parseInt(fs.getParam("bitrate") || "2500000", 10),
        uploadPort: parseInt(fs.getParam("uploadport") || "0", 10),
      };

      // instantiate player
      window.player = player = new Player(
        sessionInfo.page_number,
        autoPlay,
        videoParams,
        sessionInfo
      );

      player.initialize();

      // kick off loading next tick
      fs.nextTick(player.load.bind(player));
    },
    true,
    true
  );
});
