/**
 * SessionReplay Poser - This replays the initial DOM state for a page
 * then poses for a screenshot
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

fs.provide("rp.Replay.Playback.Poser");

fs.require("rp.Replay.Playback.DomReplay");
fs.require("rp.Replay.Playback.AssetPreloader");
fs.require("rp.Replay.Playback.Player");

(function () {

  /**
   * @class Poses for screenshot
   * @constructor
   */
  function Poser(sessionData) {
    console.log("rp: starting replay pose mode");

    // info from server about session
    this.sessionData = sessionData;
    this.cachedPageData = {};
  }

  /**
   * Load the initial DOM
   */
  Poser.prototype.load = function () {
    // Grab the page data
    return Promise.resolve().
      then(function () {
        console.log("loading page data");
        return this.loadThisPageData();
      }.bind(this)).then(function () {
        return this.preloadAll();
      }.bind(this)).then(function () {
        return this.clearDOM();
      }.bind(this)).then(function () {
        return this.loadInitialDOM();
      }.bind(this)).then(function () {
        return this.signalReadyForPicture();
      }.bind(this)).catch(function (e) {
        console.error(e.stack);
      });
  };

  /**
   * Reuse Player's data loading routines
   */
  Poser.prototype.loadThisPageData = Player.prototype.loadThisPageData;
  Poser.prototype.loadPageData = Player.prototype.loadPageData;

  /**
   * Preload most of the assets
   */
  Poser.prototype.preloadAll = function () {
    console.log("preloading assets");

    var preloader = new AssetPreloader();
    return preloader.preloadAll([this.data]);
  };

  /**
   * Clear out the DOM
   */
  Poser.prototype.clearDOM = function () {
    // delete all DOM elements
    var kids = window.document.documentElement.children;
    while (kids.length > 0) {
      window.document.documentElement.removeChild(kids[0]);
    }
  };

  /**
   * Load the initialDOM
   */
  Poser.prototype.loadInitialDOM = function () {
    this.domreplay = new DomReplay(window.document.documentElement);

    // wait for everything to load
    this.domreplay.initialLoad = false;

    this.domreplay.import(this.data.initialDOM);

    console.log("waiting for the DOM to completely load");
    return this.domreplay.waitForLoad();
  };

  /**
   * We are ready to have our picture taken
   */
  Poser.prototype.signalReadyForPicture = function () {
    console.log("ready for picture");
  };

})();