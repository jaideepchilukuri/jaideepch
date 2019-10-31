/**
 * CS Session Replayer
 *
 * Controls the actual playback in CS Session Replay
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2012-08-02 21:11:25 -0700 (Thu, 02 Aug 2012) $
 * @version $Revision: 15534 $

 * Created: May. 2, 2011
 */

fs.provide("rp.Player");

fs.require("rp.Top");
fs.require("rp.Replay.Playback.EventInfo");

(function () {

  /**
   * @class A class to initiate playback of sessions in a particular window context.
   * @constructor
   */
  Replay.Player = function (winObj) {
    /* pragma:DEBUG_START */
    console.warn("rp: player instantiate v" + Replay.version);
    /* pragma:DEBUG_END */

    // set the window reference
    this.win = winObj;

    // set the document reference
    this.doc = winObj.document;

    // set the global data source
    this.data = window.FSREventData;

    // set the player mode
    this.playerMode = (fs.getParam("player") || "web").toLowerCase();

    // set the browser mode
    this.browserMode = (fs.getParam("browser_mode") || "CHROME").toLowerCase();

    // set the page number
    this.pageNumber = parseInt((fs.getParam("page_number") || 0), 10);

    // indicates for web playback whether to automatically start playing
    this.autoPlay = (fs.getParam("autoplay") || "true").toLowerCase();
    if (this.autoPlay == "true") {
      this.autoPlay = true;
    } else {
      this.autoPlay = false;
    }

    // Remove foresee script tags after they've been loaded
    this.deleteForeseeScriptTags();

    // Extract and cache xpaths
    Replay.Playback.EventInfo.cacheXPaths(this.data.events);

    // Add utility functions to the event stream
    Replay.Playback.EventInfo.addUtilityFunctions(this.data.events);

    // set up the actual player
    switch (this.playerMode) {
      case ("web"):
        // Create the player instance for web playback
        this.player = new Replay.Playback.Web.WebPlayer(this, this.browserMode, this.pageNumber, this.autoPlay);
        break;
      case ("mp4"):
        // Create the player instance for preplayer
        this.player = new Replay.Playback.PrePlay.PrePlayer(this, this.browserMode, this.pageNumber);
        break;
    }
  };

  /**
   * Removes the foresee javascript from the head. These are not needed after initialization and
   * removing them makes head diffing easier.
   */
  Replay.Player.prototype.deleteForeseeScriptTags = function () {
    try {
      var head_tag = document.head,
        i = 0;
      while (i < head_tag.childNodes.length) {
        var curr_node = head_tag.childNodes[i];
        if ((curr_node.src && curr_node.src.indexOf("/replay.js") >= 0) || (curr_node.innerHTML && curr_node.innerHTML.toLowerCase().indexOf("fsreventdata") >= 0)) {
          head_tag.removeChild(curr_node);
        } else {
          i++;
        }
      }
    } catch (e) {
    }
  };

})();