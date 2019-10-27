/**
 * Mouse off feature
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez pablo.suarez $
 *
 */

import { ext, supportsDomStorage, toLowerCase } from "../fs/index";
import { Bind, Unbind, now as currentTime } from "../utils/utils";

/**
 * Mouse movement watching that triggers an invite when the user's mouse leaves the window from the top
 * @param {Object} trigger
 * @param {Object} surveydef
 * @param {Object} browser
 * @param {Object} gstg
 * @param {Object} journey
 * @constructor
 */
class MouseOff {
  constructor(trigger, surveydef, browser, gstg, journey) {
    ext(
      this,
      {
        browser,
        gstg,
        journey,
        trigger,
        surveydef,
        mode: toLowerCase(surveydef.mouseoff.mode),
      },
      false
    );

    if (!supportsDomStorage) {
      /* pragma:DEBUG_START */
      console.warn("mouseoff: mode switch to off bc !DomStorage");
      /* pragma:DEBUG_END */
      this.mode = "off";
    } else if (this.mode == "lasttab" && (browser.isIE || browser.browser.name == "Edge")) {
      /* pragma:DEBUG_START */
      console.warn("mouseoff: mode switch to multitab bc IE improperly support SessionStorage");
      /* pragma:DEBUG_END */
      this.mode = "multitab";
    }
  }

  /**
   * Defines the mousemove and mouseleave Event Listeners to use, but doesn't add them yet
   */
  initialize() {
    // The x, y coordinate and time from the previous mousemove event
    let prevX = 0;
    let prevY = 0;
    let nw = currentTime();
    let prevTime = nw;

    // Viewport metrics used to help calculate mouse trajectory
    let x_offset;
    let y_offset;
    let pagewidth;

    // Calculated values, the ultimate goal is to find x_intercept
    let speed;
    let slope;
    let x_intercept;

    /**
     * Helper function that determines if the trajectory of mousemove will intercept x axis
     * at the top of viewport
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     * @return {Boolean} whether the x-intercept is at the top of the viewport
     */
    const topOutTrajectory = (x1, y1, x2, y2) => {
      y_offset = window.pageYOffset;
      x_offset = window.pageXOffset;
      pagewidth = window.innerWidth;
      slope = (y2 - y1) / (x2 - x1);
      x_intercept = (y_offset - (y2 - slope * x2)) / slope - x_offset;

      // If x_intercept is NaN, it is because it is slope is -Infinity (vertical), use current x instead
      if (isNaN(x_intercept)) {
        x_intercept = x2;
      }

      // ES6 debugging
      // console.table({ x1, y1, x2, y2, slope, speed, pagewidth, x_offset, y_offset, x_intercept });
      // console.log('mouseoff: table', { x1: x1, y1: y1, x2: x2, y2: y2, slope: slope, speed: speed, pagewidth: pagewidth, x_offset: x_offset, y_offset: y_offset, x_intercept: x_intercept });

      return y2 < y1 && (x_intercept >= 0 && x_intercept <= pagewidth);
    };

    /**
     * mousemove handler needed to calculate values for:
     * speed, previous x, previous y
     */
    this.mousemoveHandler = e => {
      nw = currentTime();

      // Throttle mousemove to ensure we get different previous x/y values in mouseleave in IE 11
      if (nw - prevTime > 100) {
        speed =
          Math.sqrt(Math.pow(e.pageX - prevX, 2) + Math.pow(e.pageY - prevY, 2)) / (nw - prevTime);
        prevX = e.pageX;
        prevY = e.pageY;
        prevTime = nw;
      }
    };

    /**
     * mouseleave handler
     * If mouseleave happens at the top of viewport, do the following:
     * 1. Dispose Event Listeners
     * 2. Log Journey events
     * 3. Call Success Callback (present invite)
     */
    this.mouseleaveHandler = e => {
      if (document.hasFocus() && topOutTrajectory(prevX, prevY, e.pageX, e.pageY)) {
        /* pragma:DEBUG_START */
        console.warn("mouseoff: mouseleave at top occurred");
        /* pragma:DEBUG_END */

        // For debugging
        // alert('mouseoff: mouse out at top!');
        // return;

        // Stop the Event Listener if our MouseOff conditions are met
        this.dispose();

        // Check Storage again in case an invite occurred in between last updateinterval
        this.gstg._sync(() => {
          if (!this.gstg.get("i")) {
            // Logging
            this.trigger.cpps.set("mouseoff", true);

            this.journey.addEventsDefault("properties", {
              fs_inviteType: ["mouseoff"],
            });
            // mouseoff overrides if need applies
            if (this.surveydef.mouseoff.sp && this.surveydef.mouseoff.sp.reg) {
              this.journey.addEventsDefault("properties", {
                fs_samplePercentage: [this.surveydef.mouseoff.sp.reg],
              });
            }
            // mouseoff overrides if need applies
            if (this.surveydef.mouseoff.lf) {
              this.journey.addEventsDefault("properties", {
                fs_loyaltyFactor: [this.surveydef.mouseoff.lf],
              });
            }

            this.journey.addEventObj({
              name: "fs_mouseoff",
              metrics: {
                fs_mouseoff_speed: speed,
                fs_mouseoff_slope: Math.max(slope, -9999),
                fs_mouseoff_pagewidth: pagewidth,
                fs_mouseoff_xintercept: x_intercept,
                fs_mouseoff_xpercentage: x_intercept / pagewidth,
                fs_mouseoff_pagenumber: this.gstg.get("pv"),
              },
            });

            // Run the success callback (present the invite)
            this.successCb();
          }
        });
      }
    };
  }

  /**
   * Chooses which mode to use for MouseOff listening (lasttab or multitab)
   * Starts the appropriate handlers after a timeout
   * @param {Function} startCb - the function to run when the event listeners are added (load the invite assets)
   * @param {Function} successCb - the function to run when the MouseOff conditions are met (present the invite)
   */
  startListening(startCb, successCb) {
    //  Check the timing conditions first, then run the appropriate listening function after a timeout
    let listeningFn;
    const minPage = this.surveydef.mouseoff.minPageTime || 0;
    const minSite = this.surveydef.mouseoff.minSiteTime || 0;
    const totalTimeLeft = this.gstg.get("sst") + minSite - currentTime();
    const delay = Math.max(minPage, totalTimeLeft);

    this.storagePrefix = "lthb_";
    this.startCb = startCb || (() => {});
    this.successCb = successCb || (() => {});

    /* pragma:DEBUG_START */
    console.warn(
      "mouseoff: Timeouts -- minPageTime:",
      minPage,
      ", minSiteTime:",
      minSite,
      ", siteTimeLeft:",
      totalTimeLeft
    );
    /* pragma:DEBUG_END */

    if (this.mode === "multitab") {
      listeningFn = this.startListeningMultiTab;
    } else if (this.mode === "lasttab") {
      // Can't use lasttab if the browser doesn't fully support DOM Storage (Safari private)
      this.setupStorageKeys();
      listeningFn = this.startListeningLastTab;
    } else {
      return;
    }

    // Start the event listening on a delay, the larger of minPageTime and minSiteTime
    this.timeout = setTimeout(listeningFn.bind(this), delay);
  }

  /**
   * Adds the mousemove and mouseleave Event Listeners
   * Preloads the invite assets
   */
  startListeningMultiTab() {
    /* pragma:DEBUG_START */
    console.warn("mouseoff: adding Mouse Event Listeners");
    /* pragma:DEBUG_END */

    // Run the start function (load the invite assets)
    this.startCb();
    Bind(document.documentElement, "mouseoff:mousemove", this.mousemoveHandler, true);
    Bind(document.documentElement, "mouseoff:mouseleave", this.mouseleaveHandler, true);

    this.setupInviteStatusWatching();
  }

  /**
   * Set up the tab-unique sessionStorage keys as well as the tab-shared localStorage keys
   * This needs to be done immediately, before any delay
   */
  setupStorageKeys() {
    const unloadEvent = this.br === "safari" ? "onbeforeunload" : "unload";
    let tabKey = (this.tabKey = sessionStorage.getItem("fsrMouseOff"));
    const storagePrefix = this.storagePrefix;

    /**
     * Check if our sessionStorage key already exists in localStorage
     * true implies that we are incorrectly reusing an existing sessionStorage key from another tab
     * @param {String} sskey - sessionStorage key
     */
    const keyExistsInLocalStorage = sskey => {
      for (const key in localStorage) {
        if (key === storagePrefix + sskey) {
          return true;
        }
      }
      return false;
    };

    // Set sessionStorage unique key if it doesn't exist, or if the same one already exists in LocalStorage
    // We get duplicates sometimes when tabs are cloned, this ensures uniqueness
    if (!tabKey || keyExistsInLocalStorage(tabKey)) {
      tabKey = Math.round(Math.random() * 1e6);
      sessionStorage.setItem("fsrMouseOff", tabKey);
      /* pragma:DEBUG_START */
      console.warn("mouseoff: new session storage key created");
      /* pragma:DEBUG_END */
    }
    /* pragma:DEBUG_START */
    console.warn("mouseoff: session storage key:", tabKey);
    /* pragma:DEBUG_END */

    // Add it to localStorage so tabs can know about each other
    localStorage.setItem(storagePrefix + tabKey, 1);

    // Remove the tab key if the tab is closed
    Bind(window, `mouseoff:${unloadEvent}`, () => {
      localStorage.removeItem(storagePrefix + tabKey);
    });
  }

  /**
   * Adds the mouseleave and mouseleave Event Listeners
   * Sets up the SessionStorage and LocalStorage tab watching so that we choose to
   * only check for mouseoff events on the last open tab
   * Preloads the invite assets
   */
  startListeningLastTab() {
    let numTabs;
    let activeTabs;
    let lastTab;
    const storagePrefix = this.storagePrefix;

    /**
     * Helper function
     * @return true if there is only one open tab
     */
    const isLastOpenTab = () => {
      numTabs = 0;
      activeTabs = [];
      for (const key in localStorage) {
        if (key.indexOf(storagePrefix) === 0) {
          ++numTabs;
          activeTabs.push(key);
        }
      }
      return numTabs === 1;
    };

    const storageChangeHandler = event => {
      // Continue if one of our last-tab keys has been changed
      if (event && event.key && event.key.indexOf(storagePrefix) !== 0) {
        return;
      }

      // Check if we are on the last-open tab
      lastTab = isLastOpenTab();

      /* pragma:DEBUG_START */
      console.warn("mouseoff: localStorage change detected, open tabs:", activeTabs);
      /* pragma:DEBUG_END */

      if (!this.gstg.get("i")) {
        if (lastTab && !this.listening) {
          /* pragma:DEBUG_START */
          console.warn("mouseoff: adding Mouse Event Listeners");
          /* pragma:DEBUG_END */

          this.startCb();
          Bind(document.documentElement, "mouseoff:mousemove", this.mousemoveHandler, true);
          Bind(document.documentElement, "mouseoff:mouseleave", this.mouseleaveHandler, true);
          this.listening = true;
        } else if (!lastTab) {
          /* pragma:DEBUG_START */
          console.warn("mouseoff: removing Mouse Event Listeners");
          /* pragma:DEBUG_END */

          Unbind(document.documentElement, "mouseoff:mousemove", this.mousemoveHandler);
          Unbind(document.documentElement, "mouseoff:mouseleave", this.mouseleaveHandler);
          this.listening = false;
        } else {
          /* pragma:DEBUG_START */
          console.warn("mouseoff: some other condition (some other storage change)");
          /* pragma:DEBUG_END */
        }
      } else {
        /* pragma:DEBUG_START */
        console.warn("mouseoff: the invite appeared somewhere, disposing mouseoff");
        /* pragma:DEBUG_END */
        this.dispose();
      }
    };

    this.setupInviteStatusWatching();

    // Check for tabkeys in other tabs, re-check on new storage changes
    storageChangeHandler();
    Bind(window, "mouseoff:storage", storageChangeHandler);
  }

  /**
   * Start watching for invite status changes
   * Dispose MouseOff if an invite appears somewhere
   */
  setupInviteStatusWatching() {
    // Stop the mouseoff watching if the invite appears somewhere (some other tab)
    this.gstg.setUpdateInterval(10 * 1000);
    this.gstg.watchForChanges(
      ["i"],
      () => {
        // Restore the 60s update interval
        this.gstg.setUpdateInterval(60 * 1000);

        /* pragma:DEBUG_START */
        console.warn("mouseoff: the invite appeared somewhere, disposing mouseoff");
        /* pragma:DEBUG_END */
        this.dispose();
      },
      true,
      true
    );
  }

  /**
   * Removes the Event Listeners, clear timeouts/intervals
   */
  dispose() {
    Unbind("mouseoff:*");
    clearTimeout(this.timeout);
    localStorage.removeItem(this.storagePrefix + this.tabKey);
  }
}

export default MouseOff;
