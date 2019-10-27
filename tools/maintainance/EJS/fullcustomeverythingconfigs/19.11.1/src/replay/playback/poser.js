/**
 * SessionReplay Poser - This replays the initial DOM state for a page
 * then poses for a screenshot
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

import { AssetPreloader } from "./assetpreloader";
import { DomReplay } from "./domreplay";
import { Player } from "./player";

/**
 * @class Poses for screenshot
 * @constructor
 */
class Poser {
  constructor(sessionData) {
    console.log("rp: starting replay pose mode");

    // info from server about session
    this.sessionData = sessionData;
    this.cachedPageData = {};
  }

  /**
   * Load the initial DOM
   */
  load() {
    // Grab the page data
    return Promise.resolve()
      .then(() => {
        console.log("loading page data");
        return this.loadThisPageData();
      })
      .then(() => this.preloadAll())
      .then(() => this.clearDOM())
      .then(() => this.loadInitialDOM())
      .then(() => this.signalReadyForPicture())
      .catch(e => {
        console.error(e.stack);
      });
  }

  /**
   * Preload most of the assets
   */
  preloadAll() {
    console.log("preloading assets");

    const preloader = new AssetPreloader();
    return preloader.preloadAll([this.data]);
  }

  /**
   * Clear out the DOM
   */
  clearDOM() {
    // delete all DOM elements
    const kids = window.document.documentElement.children;
    while (kids.length > 0) {
      window.document.documentElement.removeChild(kids[0]);
    }
  }

  /**
   * Load the initialDOM
   */
  loadInitialDOM() {
    this.domreplay = new DomReplay(window.document.documentElement);

    // wait for everything to load
    this.domreplay.initialLoad = false;

    this.domreplay.import(this.data.initialDOM);

    console.log("waiting for the DOM to completely load");
    return this.domreplay.waitForLoad();
  }

  /**
   * We are ready to have our picture taken
   */
  signalReadyForPicture() {
    console.log("ready for picture");
  }
}

/**
 * Reuse Player's data loading routines
 */
Poser.prototype.loadThisPageData = Player.prototype.loadThisPageData;
Poser.prototype.loadPageData = Player.prototype.loadPageData;

export { Poser };
