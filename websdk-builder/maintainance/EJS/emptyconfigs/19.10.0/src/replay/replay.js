/**
 * CS SessionReplay
 *
 * This is the main entrypoint for Replay code
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

import { embedAttrs, getParam, nextTick, winReady, globalConfig } from "../fs/index";
import { Player } from "./playback/player";
import { Poser } from "./playback/poser";
import { Browser } from "../utils/utils";

// Set up a new browser detector
const browser = new Browser();
let player;

// Set up the replayer on window.load and expose it. This is the main entry point for SessionReplay.
winReady(() => {
  /* pragma:DEBUG_START */
  console.warn("rp: window load");
  /* pragma:DEBUG_END */

  // Make sure we know which browser this is and what kind of device it is.
  browser.ready.subscribe(
    () => {
      console.warn(`rp: player starting v${globalConfig.codeVer}`);

      const sessionInfo = JSON.parse(atob(embedAttrs["data-sessioninfo"]));

      /* pragma:DEBUG_START */
      console.warn("rp: player session data:", sessionInfo);
      /* pragma:DEBUG_END */

      // Optionally load replay.js in pose mode
      const poseMode = (getParam("pose") || "false") === "true";
      if (poseMode) {
        const poser = new Poser(sessionInfo);
        player = poser;
        nextTick(poser.load.bind(poser));
        return;
      }

      // indicates for web playback whether to automatically start playing
      let autoPlay = (getParam("autoplay") || "true").toLowerCase();
      if (autoPlay == "true") {
        autoPlay = true;
      } else {
        autoPlay = false;
      }

      // video capture parameters
      const videoParams = {
        vwidth: parseInt(getParam("vwidth") || "1280", 10),
        vheight: parseInt(getParam("vheight") || "720", 10),
        framerate: parseInt(getParam("framerate") || "30", 10),
        bitrate: parseInt(getParam("bitrate") || "2500000", 10),
        uploadPort: parseInt(getParam("uploadport") || "0", 10),
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
      nextTick(player.load.bind(player));
    },
    true,
    true
  );
});
