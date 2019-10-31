/**
 * Mouse off feature
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez pablo.suarez $
 *
 */

fs.provide("mo.mouseoff");

(function () {

  /**
   * Mouse movement watching that triggers an invite when the user's mouse leaves the window from the top
   * @param {Object} trigger 
   * @param {Object} surveydef 
   * @param {Object} browser 
   * @param {Object} gstg 
   * @param {Object} journey 
   * @constructor
   */
  var MouseOff = function (trigger, surveydef, browser, gstg, journey) {
    fs.ext(this, {
      browser: browser,
      gstg: gstg,
      journey: journey,
      trigger: trigger,
      surveydef: surveydef,
      mode: fs.toLowerCase(surveydef.mouseoff.mode)
    }, false);
  };

  /**
   * Defines the mousemove and mouseleave Event Listeners to use, but doesn't add them yet
   */
  MouseOff.prototype.initialize = function () {
    // The x, y coordinate and time from the previous mousemove event
    var prevX = 0;
    var prevY = 0;
    var nw = utils.now();
    var prevTime = nw;

    // Viewport metrics used to help calculate mouse trajectory
    var x_offset;
    var y_offset;
    var pageWidth;

    // Calculated values, the ultimate goal is to find x_intercept
    var speed;
    var slope;
    var x_intercept;

    /**
     * Helper function that determines if the trajectory of mousemove will intercept x axis
     * at the top of viewport
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     * @return {Boolean} whether the x-intercept is at the top of the viewport
     */
    var topOutTrajectory = function (x1, y1, x2, y2) {
      y_offset = window.pageYOffset;
      x_offset = window.pageXOffset;
      pagewidth = window.innerWidth;
      slope = (y2 - y1) / (x2 - x1);
      x_intercept = (y_offset - (y2 - (slope * x2))) / slope - x_offset;

      // If x_intercept is NaN, it is because it is slope is -Infinity (vertical), use current x instead
      if (isNaN(x_intercept)) {
        x_intercept = x2;
      }

      // ES6 debugging
      // console.table({ x1, y1, x2, y2, slope, speed, pagewidth, x_offset, y_offset, x_intercept });
      // console.log('mouseoff: table', { x1: x1, y1: y1, x2: x2, y2: y2, slope: slope, speed: speed, pagewidth: pagewidth, x_offset: x_offset, y_offset: y_offset, x_intercept: x_intercept });

      return y2 < y1 &&
        (x_intercept >= 0 && x_intercept <= pagewidth);
    };

    /**
     * mousemove handler needed to calculate values for:
     * speed, previous x, previous y 
     */
    this.mousemoveHandler = function (e) {
      nw = utils.now();

      // Throttle mousemove to ensure we get different previous x/y values in mouseleave in IE 11
      if (nw - prevTime > 100) {
        speed = Math.sqrt(
          Math.pow(e.pageX - prevX, 2) +
          Math.pow(e.pageY - prevY, 2)
        ) / (nw - prevTime);
        prevX = e.pageX;
        prevY = e.pageY;
        prevTime = nw;
      }
    }.bind(this);

    /**
     * mouseleave handler
     * If mouseleave happens at the top of viewport, do the following:
     * 1. Dispose Event Listeners
     * 2. Log Journey events
     * 3. Call Success Callback (present invite)
     */
    this.mouseleaveHandler = function (e) {
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
        this.gstg._sync(function () {
          if (!this.gstg.get('i')) {

            // Logging
            this.trigger.cpps.set('mouseoff', true);
            this.journey.addEventsDefault('properties', {
              'fs_inviteType': ['mouseoff']
            });

            this.journey.addEventObj({
              'name': 'fs_mouseoff',
              'metrics': {
                'fs_mouseoff_speed': speed,
                'fs_mouseoff_slope': Math.max(slope, -9999),
                'fs_mouseoff_pagewidth': pagewidth,
                'fs_mouseoff_xintercept': x_intercept,
                'fs_mouseoff_xpercentage': x_intercept / pagewidth,
                'fs_mouseoff_pagenumber': this.gstg.get('pv')
              }
            });

            // Run the success callback (present the invite)
            this.successCb();
          }
        }.bind(this));
      }
    }.bind(this);
  };

  /**
   * Chooses which mode to use for MouseOff listening (lasttab or multitab)
   * Starts the appropriate handlers after a timeout
   * @param {Function} startCb - the function to run when the event listeners are added (load the invite assets)
   * @param {Function} successCb - the function to run when the MouseOff conditions are met (present the invite)
   */
  MouseOff.prototype.startListening = function (startCb, successCb) {
    //  Check the timing conditions first, then run the appropriate listening function after a timeout
    var listeningFn;
    var minPage = this.surveydef.mouseoff.minPageTime || 0;
    var minSite = this.surveydef.mouseoff.minSiteTime || 0;
    var totalTimeLeft = this.gstg.get('sst') + minSite - utils.now();
    var delay = Math.max(minPage, totalTimeLeft);

    this.storagePrefix = 'lthb_';
    this.startCb = startCb || function () { };
    this.successCb = successCb || function () { };

    /* pragma:DEBUG_START */
    console.warn('mouseoff: Timeouts -- minPageTime:', minPage, ', minSiteTime:', minSite, ', siteTimeLeft:', totalTimeLeft);
    /* pragma:DEBUG_END */

    if (this.mode === 'multitab') {
      listeningFn = this.startListeningMultiTab;
    } else if (this.mode === 'lasttab' && fs.supportsDomStorage) {
      // Can't use lasttab if the browser doesn't fully support DOM Storage (Safari private)
      this.setupStorageKeys();
      listeningFn = this.startListeningLastTab;
    } else {
      return;
    }

    // Start the event listening on a delay, the larger of minPageTime and minSiteTime
    this.timeout = setTimeout(listeningFn.bind(this), delay);
  };

  /**
   * Adds the mousemove and mouseleave Event Listeners
   * Preloads the invite assets
   */
  MouseOff.prototype.startListeningMultiTab = function () {
    /* pragma:DEBUG_START */
    console.warn('mouseoff: adding Mouse Event Listeners');
    /* pragma:DEBUG_END */

    // Run the start function (load the invite assets)
    this.startCb();
    utils.Bind(document.documentElement, 'mouseoff:mousemove', this.mousemoveHandler, true);
    utils.Bind(document.documentElement, 'mouseoff:mouseleave', this.mouseleaveHandler, true);

    this.setupInviteStatusWatching();
  };

  /**
   * Set up the tab-unique sessionStorage keys as well as the tab-shared localStorage keys
   * This needs to be done immediately, before any delay
   */
  MouseOff.prototype.setupStorageKeys = function () {
    var unloadEvent = this.br === 'safari' ? 'onbeforeunload' : 'unload';
    var tabKey = this.tabKey = sessionStorage.getItem('fsrMouseOff');
    var storagePrefix = this.storagePrefix;

    /**
     * Check if our sessionStorage key already exists in localStorage
     * true implies that we are incorrectly reusing an existing sessionStorage key from another tab
     * @param {String} sskey - sessionStorage key
     */
    var keyExistsInLocalStorage = function (sskey) {
      for (var key in localStorage) {
        if (key === storagePrefix + sskey) {
          return true;
        }
      }
      return false;
    };

    // Set sessionStorage unique key if it doesn't exist, or if the same one already exists in LocalStorage
    // We get duplicates sometimes when tabs are cloned, this ensures uniqueness
    if (!tabKey || keyExistsInLocalStorage(tabKey)) {
      tabKey = Math.round(Math.random() * 1E6);
      sessionStorage.setItem('fsrMouseOff', tabKey);
      /* pragma:DEBUG_START */
      console.warn('mouseoff: new session storage key created');
      /* pragma:DEBUG_END */
    }
    /* pragma:DEBUG_START */
    console.warn('mouseoff: session storage key:', tabKey);
    /* pragma:DEBUG_END */

    // Add it to localStorage so tabs can know about each other
    localStorage.setItem(storagePrefix + tabKey, 1);

    // Remove the tab key if the tab is closed
    utils.Bind(window, 'mouseoff:' + unloadEvent, function () {
      localStorage.removeItem(storagePrefix + tabKey);
    });
  };

  /**
   * Adds the mouseleave and mouseleave Event Listeners
   * Sets up the SessionStorage and LocalStorage tab watching so that we choose to
   * only check for mouseoff events on the last open tab
   * Preloads the invite assets
   */
  MouseOff.prototype.startListeningLastTab = function () {
    var numTabs;
    var activeTabs;
    var lastTab;
    var storagePrefix = this.storagePrefix;

    /**
     * Helper function
     * @return true if there is only one open tab
     */
    var isLastOpenTab = function () {
      numTabs = 0;
      activeTabs = [];
      for (var key in localStorage) {
        if (key.indexOf(storagePrefix) === 0) {
          ++numTabs;
          activeTabs.push(key);
        }
      }
      return numTabs === 1;
    };

    var storageChangeHandler = function (event) {

      // Continue if one of our last-tab keys has been changed
      if (event && event.key.indexOf(storagePrefix) !== 0) {
        return;
      }

      // Check if we are on the last-open tab
      lastTab = isLastOpenTab();

      /* pragma:DEBUG_START */
      console.warn('mouseoff: localStorage change detected, open tabs:', activeTabs);
      /* pragma:DEBUG_END */

      if (!this.gstg.get('i')) {
        if (lastTab && !this.listening) {

          /* pragma:DEBUG_START */
          console.warn('mouseoff: adding Mouse Event Listeners');
          /* pragma:DEBUG_END */

          this.startCb();
          utils.Bind(document.documentElement, 'mouseoff:mousemove', this.mousemoveHandler, true);
          utils.Bind(document.documentElement, 'mouseoff:mouseleave', this.mouseleaveHandler, true);
          this.listening = true;

        } else if (!lastTab) {
          /* pragma:DEBUG_START */
          console.warn('mouseoff: removing Mouse Event Listeners');
          /* pragma:DEBUG_END */

          utils.Unbind(document.documentElement, 'mouseoff:mousemove', this.mousemoveHandler);
          utils.Unbind(document.documentElement, 'mouseoff:mouseleave', this.mouseleaveHandler);
          this.listening = false;

        } else {
          /* pragma:DEBUG_START */
          console.warn('mouseoff: some other condition (some other storage change)');
          /* pragma:DEBUG_END */
        }
      } else {
        /* pragma:DEBUG_START */
        console.warn('mouseoff: the invite appeared somewhere, disposing mouseoff');
        /* pragma:DEBUG_END */
        this.dispose();
      }
    }.bind(this);

    this.setupInviteStatusWatching();

    // Check for tabkeys in other tabs, re-check on new storage changes
    storageChangeHandler();
    utils.Bind(window, 'mouseoff:storage', storageChangeHandler);
  };

  /**
   * Start watching for invite status changes
   * Dispose MouseOff if an invite appears somewhere
   */
  MouseOff.prototype.setupInviteStatusWatching = function () {
    // Stop the mouseoff watching if the invite appears somewhere (some other tab)
    this.gstg.setUpdateInterval(10 * 1000);
    this.gstg.watchForChanges(['i'], function (key, olddata, newdata) {

      // Restore the 60s update interval
      this.gstg.setUpdateInterval(60 * 1000);

      /* pragma:DEBUG_START */
      console.warn('mouseoff: the invite appeared somewhere, disposing mouseoff');
      /* pragma:DEBUG_END */
      this.dispose();

    }.bind(this), true, true);
  };

  /**
   * Removes the Event Listeners, clear timeouts/intervals
   */
  MouseOff.prototype.dispose = function () {
    utils.Unbind('mouseoff:*');
    clearTimeout(this.timeout);
    localStorage.removeItem(this.storagePrefix + this.tabKey);
  };

  return MouseOff;

})();
